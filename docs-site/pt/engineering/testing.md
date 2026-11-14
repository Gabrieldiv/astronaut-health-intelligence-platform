---
title: Estratégia de testes
description: Os 14 arquivos de teste da Astronaut Health Intelligence Platform, o que cada um cobre, a avaliação do motor, o CI e as lacunas conhecidas.
status: IMPLEMENTED
origin: SIMULATED
code:
  - frontend/web/package.json
  - frontend/web/scripts/evaluate.ts
  - .github/workflows/ci.yml
tests:
  - frontend/web/src/engine/engine.test.ts
  - frontend/web/src/engine/risk.test.ts
verified: 2026-11-14
---

# Estratégia de testes

A Astronaut Health Intelligence Platform (AHI) é testada em três camadas: **testes unitários e de cenário** (vitest), **avaliação reproduzível do motor** (`npm run evaluate`) e **checagens de build** (tipos, build do app e do portal) no CI.

::: info Estado em 14/11/2026
**101 testes em 14 arquivos, todos passando.** Checagem de tipos limpa e build de produção ok. Rode com `npm test` dentro de `frontend/web`.
:::

## Pirâmide atual

| Camada | Ferramenta | O que cobre | Status |
| --- | --- | --- | --- |
| Unitários do motor | vitest | Estatística, baseline, detecção, risco, previsão, alertas, comunicação, check-ins, "e se" | <StatusBadge status="IMPLEMENTED" /> |
| Cenários de ponta a ponta do motor | vitest | Os seis cenários rodando no `HealthEngine` sem interface | <StatusBadge status="IMPLEMENTED" /> |
| Store | vitest | Publicação de fatias e ações | <StatusBadge status="IMPLEMENTED" /> |
| Exportação | vitest | Bundle FHIR R4 | <StatusBadge status="IMPLEMENTED" /> |
| Avaliação do motor | `scripts/evaluate.ts` | Alertas falsos e tempos de detecção em 5 sementes | <StatusBadge status="IMPLEMENTED" /> |
| Componentes de interface | | Nenhum teste de componente React | <StatusBadge status="NOT_IMPLEMENTED" /> |
| Renderização 3D | | Verificação visual com `anatomy-lab.html` | <StatusBadge status="NOT_IMPLEMENTED" /> |
| Ponta a ponta no navegador | Playwright (previsto) | Abrir painel, selecionar astronauta, executar cenário, reconhecer alerta | <StatusBadge status="PLANNED" /> |
| Integração com backend | pytest, httpx (previstos) | API de ingestão, banco, importadores | <StatusBadge status="PLANNED" /> |

## Os 14 arquivos de teste

| Arquivo | Testes | O que cobre |
| --- | --- | --- |
| <CodeLink path="frontend/web/src/engine/stats.test.ts" /> | 8 | Mediana, MAD e quantis; z robusto ignora outlier e respeita o piso; orientação do z pela direção ruim; alpha da EWMA pela meia-vida; EWMA segue um degrau; aleatoriedade semeada reproduzível; ruído OU suave com variância unitária; inclinação linear |
| <CodeLink path="frontend/web/src/engine/baseline.test.ts" /> | 5 | `INSUFFICIENT_DATA` abaixo do mínimo; faixa de mediana ± 2 desvios robustos; robustez a outliers; recorte aos limites físicos; reservatório mantém só os valores recentes |
| <CodeLink path="frontend/web/src/engine/anomaly.test.ts" /> | 8 | Baseline pessoal e `LOW` em dado normal; salto agudo vira CRITICAL; pico isolado filtrado pela mediana de 3; deriva EWMA detecta e escala com persistência; dado ausente ou velho é `NO_DATA`; dado questionável não passa de MODERATE; baseline por contexto no exercício; noites curtas seguidas |
| <CodeLink path="frontend/web/src/engine/risk.test.ts" /> | 14 | Faixas do escore; três MODERATE viram HIGH; cada regra conta uma vez e teto em HIGH sem regra CRITICAL; peso máximo da qualidade do dado; R-CARD-01; R-FAT-01 (2 de 3 e 3 de 3); dado ausente nunca é componente normal; fatores, confiança, limitações e frase; frase sem achados; regiões `NO_DATA`; deduplicação, escalonamento, resolução e histórico de alertas; picos MODERATE não acionáveis; agrupamento por regra combinada; recomendações com revisão humana |
| <CodeLink path="frontend/web/src/engine/forecast.test.ts" /> | 9 | Holt segue tendência amortecida; nulo com poucos pontos; intervalo cresce com o horizonte; janelas irregulares; inelegível sem dados; horizontes de 6 h e 24 h; tempo até sair da faixa; métricas diárias; sem saída anunciada durante recuperação |
| <CodeLink path="frontend/web/src/engine/alerts.test.ts" /> | 5 | CRITICAL escala aos 5 e 15 min; avaliação atrasada pula ao nível certo; HIGH aos 30 e 90 min e MODERATE nunca; para com reconhecimento ou resolução; escalonamento auditado no motor |
| <CodeLink path="frontend/web/src/engine/comms.test.ts" /> | 9 | Entrega após o atraso e resposta após revisão mais atraso; independência da frequência de processamento; relatório sem resposta e respostas não prescritivas; perfil aplicado à missão; um pacote automático por alerta HIGH ou CRITICAL; primeiro passo a bordo em Marte; entrega e respostas auditadas; troca de perfil e envio manual; sem passo a bordo na ISS |
| <CodeLink path="frontend/web/src/engine/checkins.test.ts" /> | 8 | Um check-in por pessoa por manhã; métricas de autorrelato na região do cérebro; novo check-in a cada manhã ao vivo; fadiga progressiva muda as respostas e corrobora R-FAT-01 sem passar de MODERATE; CO₂ torna dor de cabeça mais provável; check-in manual substitui o simulado; autorrelato sozinho chega no máximo a MODERATE e sem alerta; contagem de fadiga alta |
| <CodeLink path="frontend/web/src/engine/intervention.test.ts" /> | 7 | Extensão de sono recupera a HRV (rápido, determinístico, sem mudar estado); métrica e horizonte explícitos; nulo quando não se aplica; nominal com linhas iguais; consulta médica no evento agudo com horizonte curto; ventilação projeta CO₂; ajuste de exercício por sessão |
| <CodeLink path="frontend/web/src/engine/missionDays.test.ts" /> | 6 | Dias 1 até o atual para cada pessoa; valores plausíveis (dose, sono, exercício); síntese determinística; dia atual ao vivo; fadiga e queda de desempenho aparecem nos dias recentes |
| <CodeLink path="frontend/web/src/engine/timeline.test.ts" /> | 3 | 24 h de quadros a cada 15 min na inicialização; quadros ao vivo seguem o risco mesmo com saltos grandes; histórico limitado |
| <CodeLink path="frontend/web/src/engine/engine.test.ts" /> | 11 | Baselines prontas na inicialização; reprodutibilidade com a mesma semente; histórico limitado; nominal sem HIGH em dois dias; evento agudo chega a CRITICAL com um alerta agrupado; alívio após consulta médica; falha de sensor vira `NO_DATA`; fadiga escala em dias; CO₂ sobe e a ventilação baixa; desempenho cai por sessão; reconhecimento auditado |
| <CodeLink path="frontend/web/src/lib/fhir.test.ts" /> | 7 | Bundle `collection` com URLs únicas; pacientes pseudonimizados; LOINC só para vitais conhecidos; origem em cada observação; dado ausente nunca exportado como valor; cabine sem paciente; ids FHIR válidos e UUIDs estáveis |
| <CodeLink path="frontend/web/src/state/store.test.ts" /> | 1 | Fatias v2 publicadas, referências estáveis e ações ligadas |
| **Total** | **101** | |

## Avaliação do motor

`npm run evaluate` roda o motor sem interface sobre os cenários, com 5 sementes, e grava `src/engine/evaluation.json` e `docs/model-card.md`. Ela mede alertas falsos no cenário nominal e tempos de detecção nos outros cenários. Os números estão em [Resultados e evidências](/pt/validation/results).

A avaliação já mudou o motor: ela revelou alertas falsos de pressão arterial no exercício, o que levou à regra de só sinalizar desvio para cima nesse contexto ([Detecção de anomalias](/pt/intelligence/anomaly-detection)).

## CI

O workflow `ci.yml` roda em todo push e pull request para `master`:

| Job | Passos |
| --- | --- |
| App | `npm ci`, `npx tsc -b`, `npm test`, `npx vite build` (Node 22) |
| Portal | `npm ci`, `npm run docs:build` (falha com link interno quebrado) |

## Lacunas e próximos passos

- Sem testes de componente React nem de acessibilidade automatizada.
- Sem teste visual do 3D.
- Sem testes ponta a ponta no navegador (Playwright está no plano).
- Os scripts de importação do OSDR têm checagens próprias (falham com unidade misturada ou sexo divergente), mas não têm testes vitest.
- A avaliação não roda no CI; é executada à mão quando regras ou cenários mudam.

## Próximos passos

- [Resultados e evidências](/pt/validation/results).
- [Estratégia de validação](/pt/validation/strategy).
- [Matriz de rastreabilidade](/pt/validation/traceability).
