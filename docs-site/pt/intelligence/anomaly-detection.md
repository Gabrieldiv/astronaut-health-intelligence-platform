---
title: Detecção de anomalias
description: z robusto, deriva EWMA, CUSUM, persistência diária e qualidade do dado, sempre contra a baseline pessoal, e um detector multivariado experimental, na Astronaut Health Intelligence Platform.
status: IMPLEMENTED
origin: DERIVED
code:
  - frontend/web/src/engine/anomaly.ts
  - frontend/web/src/engine/stats.ts
  - frontend/web/src/engine/engine.ts
  - frontend/web/src/engine/config.ts
  - frontend/web/src/engine/cusum.ts
  - frontend/web/src/engine/ml/multivariate.ts
  - frontend/web/src/engine/ml/isolationForest.ts
tests:
  - frontend/web/src/engine/anomaly.test.ts
  - frontend/web/src/engine/stats.test.ts
  - frontend/web/src/engine/engine.test.ts
  - frontend/web/src/engine/cusum.test.ts
  - frontend/web/src/engine/ml/multivariate.test.ts
  - frontend/web/src/engine/ml/engineMultivariate.test.ts
verified: 2026-11-15
---

# Detecção de anomalias

## O que faz

Decide, a cada leitura, se uma métrica está dentro do normal da pessoa, se mudou de repente, se está derivando devagar ou se o dado não é confiável. Cada achado vira um **nível** (`LOW`, `MODERATE`, `HIGH`, `CRITICAL` ou `NO_DATA`) com um **identificador de regra** e uma frase em linguagem simples.

Na Astronaut Health Intelligence Platform (AHI) a detecção roda em fluxo, com custo constante por amostra (`MetricTracker` em `anomaly.ts`).

## Entradas

| Entrada | Origem |
| --- | --- |
| Valor, horário, qualidade e dispositivo da observação | Adapters simulados (<OriginBadge origin="SIMULATED" />) ou check-in (<OriginBadge origin="MANUAL" />) |
| Baseline pessoal pronta do contexto atual | [Linha de base pessoal](/pt/intelligence/personal-baseline) |
| Direção ruim da métrica (para cima, para baixo, ambas) | [Dicionário de dados](/pt/data/data-dictionary) |
| Estado do dispositivo (`ONLINE`, `DEGRADED`, `DATA_STALE`, `OFFLINE`) | Adapters |
| Limiares fixos de demo | [Limiares e limitações](/pt/intelligence/thresholds) |

## Método

### 1. z robusto (mudança aguda)

```text
z     = (mediana das 3 últimas leituras - m) / s
z_mau = z          se a direção ruim é "para cima"
        -z         se é "para baixo"
        |z|        se são "ambas"
```

`m` e `s` são a mediana e a escala robusta da baseline do contexto atual. Usar a mediana de 3 leituras filtra um pico isolado (teste "a single spike is filtered by the 3 reading median").

| `z_mau` | Nível |
| --- | --- |
| 4 ou mais | MODERATE |
| 5,5 ou mais | HIGH |
| 7 ou mais | CRITICAL |

**Ajuste para exercício.** No contexto de exercício (incluindo aquecimento e os 20 minutos de recuperação), métricas de dois lados (frequência cardíaca, pressão, respiração, temperatura da pele) só sinalizam desvio **para cima**. Valores abaixo da mediana de exercício são esperados no aquecimento e no desaquecimento. Esse ajuste foi encontrado pela avaliação (`npm run evaluate`), que mostrou alertas falsos de pressão no cenário nominal.

### 2. Deriva EWMA (mudança lenta)

```text
alpha  = 1 - 0,5 ^ (dt / meia-vida),  meia-vida = 180 min simulados
D_t    = D_(t-1) + alpha x (clamp(z_t, -6, 6) - D_(t-1))
```

`z_t` é o z de cada leitura isolada. `D` é uma média móvel exponencial do z: sobe devagar quando a pessoa se afasta do normal e não se impressiona com um pico. O z é limitado a ± 6 para que uma leitura absurda não domine a média.

| Condição sobre `D` (na direção ruim) | Nível |
| --- | --- |
| 1,0 ou mais, sustentado por 3 h | MODERATE |
| 2,0 ou mais, sustentado por 12 h | HIGH |
| Abaixo de 0,8 | A contagem de tempo zera (histerese) |

A deriva detecta um deslocamento sustentado que nenhum valor isolado sinalizaria (teste "EWMA drift detects a sustained shift").

### CUSUM: deriva pequena e constante {#cusum}

A EWMA precisa de uma deriva de cerca de um desvio robusto por 3 h. Um deslocamento menor que nunca para (por exemplo, a frequência cardíaca de repouso subindo alguns batimentos por minuto ao longo de um dia) pode ficar abaixo dela. Um **CUSUM tabular** (soma acumulada) pega esse caso. O z de cada amostra é limitado a ± 4 e agregado em médias por hora, então a estatística não depende da cadência de amostragem e um pico isolado não simula uma deriva:

```text
S_up   = min(16, max(0, S_up   + m - k))
S_down = min(16, max(0, S_down - m - k))        m = z médio da hora, k = 0,5
```

| Condição | Nível |
| --- | --- |
| O lado na direção ruim da métrica chega a h = 8, acumulando por pelo menos 12 h | MODERATE (Watch), "small but steady drift" |

O CUSUM nunca leva uma métrica acima de MODERATE sozinho. `k = 0,5` significa que médias horárias abaixo de meio desvio robusto nunca acumulam; o teto de 16 limita o tempo até a sinalização sumir depois que o deslocamento termina. Enquanto o CUSUM sinaliza, os valores deslocados ficam fora da baseline (a mesma ideia do filtro de deriva). Todos os valores são configuração de demo em `config.ts` (`CUSUM`), versão `Tabular CUSUM on hourly mean robust z v1`.

### 3. Persistência (métricas diárias)

Sono, desempenho de exercício, tempo de reação e autorrelato chegam uma vez por dia ou por sessão. Para eles conta a sequência de valores fora da faixa (`z_mau` de 2 ou mais):

| Condição | Nível |
| --- | --- |
| 1 valor com `z_mau` de 3 ou mais | MODERATE |
| 2 valores seguidos fora da faixa | MODERATE |
| 3 valores seguidos fora da faixa | HIGH |

A frase usa a unidade natural, por exemplo "2 nights" ou "3 sessions".

### 4. Limiares fixos de demo

Uma pequena lista de limiares fixos (`FIXED_THRESHOLDS`) é aplicada sobre a mediana das 3 últimas leituras, como rede de segurança. Alguns só valem fora do exercício. Os valores ficam só em [Limiares e limitações](/pt/intelligence/thresholds).

### 5. Qualidade do dado

| Regra | Condição | Resultado |
| --- | --- | --- |
| R-DQ-01 | Nenhum valor válido há mais de `staleMin` minutos, ou dispositivo `DATA_STALE` ou `OFFLINE` | Status `NO_DATA`; regra MODERATE |
| R-DQ-02 | 20% ou mais das últimas 15 leituras marcadas `QUESTIONABLE` | Regra MODERATE |
| Limite de nível | O valor atual é questionável | O nível da métrica fica limitado a MODERATE |

O tempo `staleMin` de cada métrica está no [Dicionário de dados](/pt/data/data-dictionary). **Dado ausente nunca é `LOW`** (teste "missing or stale data is NO_DATA, never LOW").

### Combinação por métrica

Para cada métrica fica o pior achado entre os detectores. Métricas de autorrelato têm teto em MODERATE. O resultado vira um `MetricState`: valor, status, z, deriva, persistência, regra e frase.

### Identificadores de regra

R-HR-01 (FC aguda), R-HR-02 (deriva da FC de repouso), R-HR-03 (teto de demo em repouso), R-HRV-01, R-SPO2-01 (contra a faixa pessoal), R-SPO2-02 (piso de demo), R-RR-01, R-BP-01, R-TEMP-01, R-ACT-01, R-HYD-01, R-SLEEP-01, R-SLEEP-02, R-EX-01, R-RT-01, R-RAD-02, R-ENV-CO2-01, R-ENV-TEMP-01, R-ENV-RH-01, R-ENV-RAD-01, R-DQ-01, R-DQ-02 e as regras de autorrelato R-PSY-01 a R-PSY-04. As regras combinadas estão em [Avaliação de risco](/pt/intelligence/risk-assessment). A relação métrica para regra está no [Dicionário de dados](/pt/data/data-dictionary).

### Premissas

- O desvio só tem sentido com uma baseline `READY`. Sem ela, só valem limiares de demo e qualidade.
- A direção ruim de cada métrica está correta.
- O ruído simulado se parece com ruído real de sensor.

### Interpretação

| Achado | Leitura |
| --- | --- |
| z alto, sem deriva | Algo mudou de repente. Pode ser real ou artefato; o painel pede checagem |
| Deriva sem z alto | Mudança pequena, mas persistente. É o padrão típico de fadiga |
| Persistência em métricas diárias | Várias noites ou sessões ruins seguidas |
| `NO_DATA` | O status é desconhecido. Não é bom nem ruim |

## Combinação incomum (experimental) {#unusual-combination-experimental}

<StatusBadge status="EXPERIMENTAL" /> Experimental, aprendizado de máquina.

Todas as regras acima olham uma métrica por vez. Algumas situações aparecem primeiro como uma **mistura incomum**: frequência cardíaca um pouco alta enquanto a respiração está um pouco baixa, cada uma dentro da própria faixa. Um **Isolation Forest** por astronauta (Liu, Ting e Zhou 2008[^if1]) aprende quais combinações são habituais para aquela pessoa.

| Etapa | Detalhe |
| --- | --- |
| Variáveis | O z robusto de 7 sinais vitais contra a baseline da própria pessoa no contexto atual: frequência cardíaca, VFC, SpO₂, frequência respiratória, pressão sistólica e diastólica, temperatura da pele |
| Janela de treino | Os últimos 5 dias da própria pessoa, um vetor a cada 5 minutos simulados (o mesmo período da baseline), admitidos com os filtros da baseline (sem z alto, sem deriva ativa), para que um problema em curso não vire "habitual" |
| Descorrelação | Branqueamento por PCA ajustado na mesma janela |
| Modelo | 100 árvores, 256 amostras por árvore, com semente (determinístico); escrito em TypeScript e executado no navegador; retreinado no máximo a cada 6 h simuladas e só quando uma baseline mudou |
| Limiar pessoal | O maior entre 0,6 e o percentil 99,5 dos escores de treino da pessoa |
| Sinalização | Escore acima do limiar por 30 minutos simulados **e** pelo menos 2 sinais contribuintes cuja deriva EWMA aponta para o mesmo lado |

**Proteções.** O detector **nunca muda um status nem o escore de risco**. Ele só acrescenta uma nota "Unusual combination" na área Why do painel de atenção, com os 3 sinais que mais contribuíram, a versão do modelo (`ahi-iforest-ts v1 (experimental, PCA whitened)`) e as palavras "Experimental, machine learning", e grava uma entrada informativa na trilha de auditoria. Entradas ausentes dão `NO_DATA`, nunca "típico". Todos os parâmetros são configuração de demo (`MULTIVARIATE` em `config.ts`).

**Observado nos cenários simulados** (uma rodada da equipe, dados simulados, não é validação): nenhuma sinalização em dias nominais; o cenário cardiovascular agudo sinalizado após cerca de 45 min; o cenário de CO2 da cabine sinalizou 3 dos 4 tripulantes; a fadiga progressiva sinalizada após cerca de 48 h. Os testes unitários verificam os casos nominal e agudo.

**Caminho de paridade no servidor.** `POST /api/v1/analytics/multivariate` no [backend](/pt/architecture/backend) roda a mesma ideia com scikit-learn (branqueamento PCA, `IsolationForest` com semente, mesma pontuação sensível ao intervalo) para pontuação em lote e comparação de modelos. O app usa o detector do navegador, que funciona offline.

[^if1]: Liu F. T., Ting K. M., Zhou Z.-H. 2008. Isolation Forest. *Proceedings of the 8th IEEE International Conference on Data Mining*, 413-422. <https://doi.org/10.1109/ICDM.2008.17>

## Saídas

`MetricState` por pessoa e métrica, `Anomaly` registrada com método (`ROBUST_Z`, `EWMA`, `PERSISTENCE`, `COMBINED` ou `DATA_QUALITY`; limiares fixos são registrados como `PERSISTENCE`) e explicação não diagnóstica, e as regras disparadas que alimentam o [escore de risco](/pt/intelligence/risk-assessment). Origem: <OriginBadge origin="DERIVED" />.

## Limitações

- As regras de status são univariadas: a relação entre métricas entra pelas três regras combinadas e, só como informação, pela nota multivariada experimental. O detector multivariado só foi testado em dados simulados.
- Os níveis de z e os tempos de deriva foram ajustados no simulador, não em dados reais.
- A regra IQR, citada no plano do projeto, **não foi implementada**. A mediana com MAD cumpre papel equivalente ([Status dos métodos](/pt/intelligence/overview#methods-status)).

## Status

<StatusBadge status="IMPLEMENTED" /> Coberto por `anomaly.test.ts` (8 testes: baseline estável, salto agudo, pico isolado, deriva, `NO_DATA`, teto de dado questionável, contexto de exercício, noites curtas seguidas), `stats.test.ts`, os cenários de `engine.test.ts`, `cusum.test.ts` (folga, acumulação, independência da cadência, teto, limite de pico, uma pequena deriva da frequência cardíaca de repouso abaixo da regra EWMA) e os testes multivariados (silêncio no nominal, sinalização no agudo sem tocar o escore de risco, `NO_DATA` quando a camiseta para). Requisitos do plano: US-018, US-019.

## Próximos passos

- [Avaliação de risco](/pt/intelligence/risk-assessment): como os achados viram escore e nível.
- [Limiares e limitações](/pt/intelligence/thresholds).
- [Resultados e evidências](/pt/validation/results): tempos de detecção por cenário.
