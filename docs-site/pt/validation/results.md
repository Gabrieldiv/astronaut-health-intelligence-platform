---
title: Resultados e evidências
description: Resultados medidos da Astronaut Health Intelligence Platform. Avaliação do motor (evaluation.json), testes, desempenho observado e checagens de fontes, com o que cada número significa.
status: IMPLEMENTED
origin: SIMULATED
code:
  - frontend/web/src/engine/evaluation.json
  - frontend/web/scripts/evaluate.ts
tests:
  - frontend/web/src/engine/engine.test.ts
verified: 2026-11-14
---

# Resultados e evidências

Esta é a página canônica dos números medidos da Astronaut Health Intelligence Platform (AHI). Cada número indica de onde veio.

::: warning ATENÇÃO
Todos os resultados do motor vêm de **dados simulados** e medem as regras do protótipo contra o **mesmo simulador** que gerou os dados. Mostram consistência interna, **não desempenho clínico**. Veja [Estratégia de validação](/pt/validation/strategy).
:::

## Resumo

| Evidência | Resultado | Fonte |
| --- | --- | --- |
| Testes automatizados | 101 testes em 14 arquivos, todos passando | `npm test` em 14/11/2026 |
| Checagem de tipos | Limpa | `npx tsc -b` |
| Build de produção | Ok | `npx vite build` |
| Alertas falsos no cenário nominal | 0 por dia-tripulante, em 60 dias-tripulante | `evaluation.json` |
| Detecção dos 5 cenários anormais | Todos detectados, com o nível de pico esperado | `evaluation.json` |

## Avaliação do motor

Gerada por `npm run evaluate` (`frontend/web/scripts/evaluate.ts`) em `2026-11-14T12:17:47.455Z`, motor `ahi-engine 2.0.0`. Grava `src/engine/evaluation.json` e `docs/model-card.md`.

### Alertas falsos no cenário nominal

No cenário nominal não há problema simulado, então **todo alerta seria falso**.

| Medida | Valor |
| --- | --- |
| Sementes | 5 (`20261114` a `20261118`) |
| Tempo simulado | 72 h por semente, 4 pessoas: 1440 horas-tripulante, ou 60 dias-tripulante |
| Grade da análise | A cada 15 min simulados |
| Alertas da tripulação em HIGH ou acima por dia-tripulante | **0** |
| Alertas da tripulação em MODERATE ou acima por dia-tripulante | **0** |
| Alertas por regra | nenhum |
| Alertas da cabine | 0 |
| Maior nível de atenção atingido | MODERATE |
| Tempo em LOW / MODERATE / HIGH / CRITICAL | 99,97% / 0,03% / 0% / 0% |

O model card gerado arredonda o tempo para 100,0% e 0,0%. O nível MODERATE de 0,03% do tempo vem de status, não de alerta.

### Detecção por cenário

Minutos a partir do início do cenário (08:00 UTC simulado), medidos na grade da avaliação.

| Cenário | Alvo | Grade | Primeiro alerta (regra) | HIGH | CRITICAL | Pico (escore) | Duração simulada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ACUTE_CARDIO` | AST-01 | 1 min | 7 min (R-HR-01) | 7 min | 7 min | CRITICAL (100) | 3 h |
| `SENSOR_FAILURE` | AST-03 | 1 min | 14 min (R-DQ-02) | não atinge | não atinge | MODERATE (20) | 3 h |
| `ENVIRONMENTAL_CO2` | cabine | 5 min | 90 min (R-ENV-CO2-01) | 140 min (2,3 h) | não atinge | HIGH (77) | 12 h |
| `PROGRESSIVE_FATIGUE` | AST-02 | 15 min | 1905 min (31,8 h, R-FAT-01) | 2010 min (33,5 h) | não atinge | HIGH (79) | 96 h |
| `PERFORMANCE_DECLINE` | AST-04 | 15 min | 1650 min (27,5 h, R-EX-01) | 4530 min (75,5 h) | não atinge | HIGH (45) | 120 h |

No cenário de cabine, o nível é o pior entre o status da cabine e o da tripulação.

### Como ler

- **Padrões lentos ficam em HIGH por projeto.** CRITICAL exige uma regra aguda CRITICAL; fadiga e queda de desempenho pedem revisão, não emergência.
- **A falha de sensor deve parar em MODERATE.** É um caso de qualidade do dado: status desconhecido, nunca "normal".
- **Autorrelato nunca dispara alerta**, então não aparece nesta tabela.
- **A grade importa.** Um tempo de 7 min numa grade de 1 min é mais preciso que 1905 min numa grade de 15 min.

## Testes automatizados

101 testes em 14 arquivos, todos passando em 14/11/2026. A lista arquivo por arquivo está em [Estratégia de testes](/pt/engineering/testing).

## Desempenho observado

Medidas observadas pelo autor no notebook de desenvolvimento. **Não são benchmarks formais** nem foram repetidas em outras máquinas.

| Medida | Valor |
| --- | --- |
| Quadros por segundo a 60x | 58 a 60 fps |
| Quadros por segundo a 3600x | cerca de 45 fps |
| Primeira carga em desenvolvimento | cerca de 2 a 4 s |
| Geração do histórico inicial | cerca de 1,2 s com cache aquecido; 2 a 3 s a frio |
| Triângulos do corpo 3D | cerca de 842 mil gerados, cerca de 200 mil desenhados por quadro |
| Geometria | construída em 8 Web Workers e guardada em cache no navegador |
| Projeção "e se" | menos de 5 ms por chamada |
| Altura do corpo 3D com alerta CRITICAL em 1280x720 | de 247 para 359 px depois da faixa sobreposta |

## Checagem das fontes da NASA

Consultas ao vivo em 14/11/2026, sem chave de API:

| Fonte | Resultado |
| --- | --- |
| NASA OSDR | APIs acessíveis; OSD-569 e OSD-575 importados com SHA-256 |
| NASA EDA | API lista 24 missões de payload (só metadados); telemetria em CSV pela aba "Data Tables", com campos como `CO2_ppm_ISS` e `CO2_ppm_Ground` e doses GCR e SAA |
| NASA RadLab | HTTP 500 em todas as rotas testadas |
| NLSP, Standard Measures, Artemis II Standard Measures, perigos do HRP | Páginas acessíveis |

Detalhes em [Fontes de dados da NASA](/pt/data/sources).

## O que não foi medido

- Sensibilidade e especificidade em dados reais.
- Cobertura real do intervalo de 80% da previsão.
- Usabilidade com tripulantes ou médicos de voo.
- Desempenho em outras máquinas, navegadores ou telas.

## Próximos passos

- [Model card](/pt/validation/model-card).
- [Limitações e problemas conhecidos](/pt/validation/limitations).
- [Matriz de rastreabilidade](/pt/validation/traceability).
