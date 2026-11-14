---
title: Glossário e siglas
description: Termos e siglas usados na interface, no código e na documentação da Astronaut Health Intelligence Platform.
verified: 2026-11-14
---

# Glossário e siglas

Termos usados na interface, no código e nesta documentação da Astronaut Health Intelligence Platform. Os rótulos da interface ficam em inglês, como aparecem na tela. Cada termo aponta, quando útil, para a página que o explica em detalhe.

## Produto e interface

| Termo | Significado |
| --- | --- |
| AHI | Sigla de Astronaut Health Intelligence Platform, o nome oficial do projeto |
| Apoio à decisão | Sistema que organiza e explica informação para pessoas decidirem. A AHI não decide nem diagnostica |
| "Ground view" | Visão do médico de voo e do Mission Control: tripulação inteira, corpo 3D, motivos e previsões |
| "Crew view" | Visão do astronauta: uma pessoa, linguagem simples, duas ações principais, check-in |
| "What needs attention" | Painel da direita: status, motivos, ações recomendadas e previsões |
| "Earth link" | Comunicação simulada com a Terra, com atraso por perfil (ISS, Lua, Marte) |
| "Mark done" | Registra uma intervenção na auditoria e aplica na simulação um efeito hipotético |
| "Acknowledge" | Reconhecer um alerta; interrompe o escalonamento |
| "Start demo" | Demo guiada de 10 passos |
| Modo apresentação | Fontes maiores e menos detalhes para projetores (tecla `P`) |
| MET | Mission elapsed time, o tempo decorrido de missão |
| Callsign | Nome de chamada fictício da pessoa (ORION, LYRA, VEGA, ATLAS) |

## Status e risco

| Termo | Significado |
| --- | --- |
| `LOW` | Nominal, "All good" |
| `MODERATE` | Watch, "Keep an eye" |
| `HIGH` | Warning, "Act soon" |
| `CRITICAL` | Critical, "Act now" |
| `NO_DATA` | Sem dado recente, "Signal lost". Nunca tratado como normal |
| Nível de atenção | Nível operacional do protótipo (`LOW` a `CRITICAL`). Não é classificação médica |
| Escore de risco | Número de 0 a 100 obtido por noisy-OR dos pesos das regras disparadas. Veja [Avaliação de risco](/pt/intelligence/risk-assessment) |
| Noisy-OR | Forma de combinar pesos: `1 - produto(1 - w)`. Várias regras moderadas somam sem passar de 1 |
| Confiança | Quanto o status pode ser confirmado; cai com dado ausente ou questionável |
| Regra | Condição com identificador (por exemplo R-HR-01, R-FAT-01) que gera status, fator e recomendação |
| Regra combinada | Regra que olha várias métricas juntas (R-CARD-01, R-FAT-01, R-ENV-CO2-02) |
| Escalonamento | Subida de nível de um alerta não reconhecido depois de um tempo configurado |
| Autonomia | Quem pode agir: `ONBOARD` (a bordo, agora) ou `GROUND_REVIEW` (médico de voo na Terra) |
| Limiar de demo | Número fixo em `config.ts` para a demo funcionar. Não é limite oficial. Veja [Limiares](/pt/intelligence/thresholds) |

## Estatística e análise

| Termo | Significado |
| --- | --- |
| Baseline (linha de base) pessoal | Faixa normal de cada pessoa, calculada com o histórico dela. A AHI compara cada um consigo mesmo. Veja [Linha de base pessoal](/pt/intelligence/personal-baseline) |
| Faixa pessoal ("Your normal") | Mediana mais ou menos 2 desvios robustos |
| Mediana | Valor do meio; resistente a picos |
| MAD | Desvio absoluto mediano: quanto a pessoa costuma variar, ignorando picos isolados |
| Desvio robusto | 1,4826 x MAD, com piso por métrica |
| z robusto | Distância de um valor até a mediana, medida em desvios robustos |
| EWMA | Média móvel com peso exponencial; usada para detectar deriva persistente |
| Deriva | Desvio pequeno, mas persistente, na mesma direção |
| Persistência | Vários valores diários seguidos fora da faixa |
| Contexto de atividade | Sono, repouso, trabalho, exercício (ou EVA). Cada contexto tem sua baseline |
| Holt amortecido | Método de suavização exponencial com tendência que perde força no horizonte; usado na previsão |
| Intervalo de 80% | Faixa onde a projeção deve cair em 80% dos casos, se as condições recentes continuarem |
| Cone de previsão | Desenho do intervalo no gráfico; alarga com o horizonte |
| Coocorrência | Dois sinais mudando ao mesmo tempo. Não prova causa |
| "E se" ("What if") | Comparação hipotética de trajetórias com e sem uma ação |

## Dados e proveniência

| Termo | Significado |
| --- | --- |
| `data_origin` | Selo de origem: `REAL_PUBLIC`, `DERIVED`, `SIMULATED` ou `MANUAL` |
| `HealthObservation` | Modelo canônico: uma linha por medida |
| Adapter | Componente que lê um equipamento ou arquivo e devolve observações canônicas |
| Accession | Identificador do estudo no repositório (por exemplo OSD-569) |
| ISA | Formato de metadados (Investigation, Study, Assay) usado no OSDR |
| L-n / R+n | n dias antes do lançamento / n dias depois do retorno |
| Replay | Reprodução de uma série histórica real no app, sempre identificada como histórica |
| Análogo | Estudo em solo que imita o voo (HERA, repouso no leito, confinamento). Não é dado de astronauta |
| SHA-256 | Impressão digital do arquivo, usada para provar que é o mesmo baixado |
| Manifesto | Arquivo de proveniência de um dataset (`data/manifests/`) |
| FHIR R4 | Padrão HL7 de interoperabilidade em saúde; usado só para exportação |
| LOINC | Sistema de códigos de observações clínicas; usado só para os vitais bem estabelecidos |
| UCUM | Sistema de códigos de unidades de medida |

## Espaço e fontes

| Termo | Significado |
| --- | --- |
| Médico de voo (flight surgeon) | Médico responsável pela saúde da tripulação, em solo |
| Oficial médico de bordo | Tripulante treinado para cuidados médicos a bordo (crew medical officer) |
| Mission Control | Equipe de controle da missão em solo |
| EVA | Atividade extraveicular (caminhada espacial) |
| ISS | Estação Espacial Internacional |
| HRP | Human Research Program da NASA; define os cinco perigos do voo espacial humano |
| OSDR | Open Science Data Repository da NASA |
| EDA | Environmental Data Application: telemetria ambiental da ISS em missões de pesquisa |
| RadLab | Portal de dados de dosimetria da NASA |
| NLSP | NASA Life Sciences Portal |
| Standard Measures | Conjunto padronizado de medidas que a NASA coleta antes, durante e depois das missões |
| Inspiration4 | Missão comercial de 3 dias (2021) de onde vêm os datasets OSD-569 e OSD-575 |
| GCR / SAA | Raios cósmicos galácticos / Anomalia do Atlântico Sul (fontes de dose na ISS) |
| SANS | Síndrome neuro-ocular associada ao voo espacial. Fora do MVP; está no roadmap |
| Bio-Monitor / Astroskin | Camiseta inteligente da Agência Espacial Canadense usada na ISS (simulada na AHI) |
| Actiwatch | Relógio de actigrafia usado em estudos de sono (simulado na AHI) |
| CEVIS, ARED, T2 | Cicloergômetro, aparelho de exercício resistido e esteira da ISS. Equipamentos de exercício, não monitores médicos |
| HRV (RMSSD) | Variabilidade da frequência cardíaca; queda em relação ao normal costuma acompanhar estresse ou recuperação ruim |
| SpO₂ | Saturação de oxigênio no sangue |

## Siglas de engenharia e IA

| Sigla | Significado |
| --- | --- |
| API | Interface de programação. A AHI ainda não tem API REST: está [planejada](/pt/architecture/target-architecture) |
| C4 | Modelo de diagramas de arquitetura em níveis (contexto, contêineres, componentes) |
| CI | Integração contínua (GitHub Actions) |
| IA | Inteligência artificial. Veja [Abordagem de IA e análise de dados](/pt/intelligence/ai-and-analytics) |
| IQR | Intervalo interquartil. Citado no plano, **não implementado** |
| CUSUM | Soma cumulativa para detectar pequenas mudanças. **Não implementado** |
| LLM | Modelo de linguagem de grande porte. **Não há LLM em tempo de execução**; uma camada de explicação está planejada |
| ML | Aprendizado de máquina. Nenhum modelo de ML é treinado ou executado hoje |
| RAG | Geração aumentada por recuperação. **Não usada** na plataforma |
| RBAC | Controle de acesso por papel. Planejado |
| SHAP | Método de explicação de modelos de ML. Planejado junto com eventuais modelos |
| SDF | Campo de distância com sinal, usado para gerar a anatomia 3D |
| MVP | Produto mínimo viável |

## Próximos passos

- [Introdução](/pt/overview/introduction).
- [Visão geral dos métodos](/pt/intelligence/overview).
- [Dicionário de dados](/pt/data/data-dictionary).
