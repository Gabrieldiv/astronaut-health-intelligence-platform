---
title: Padrões, contratos e extensões
description: Como preparar o ambiente, os contratos que não podem quebrar, as convenções e o passo a passo para adicionar métrica, adapter, cenário ou dataset à Astronaut Health Intelligence Platform.
status: IMPLEMENTED
code:
  - frontend/web/src/types/domain.ts
  - frontend/web/src/engine/config.ts
  - frontend/web/src/engine/catalog.ts
  - frontend/web/src/engine/sim/adapters.ts
  - CLAUDE.md
verified: 2026-11-14
---

# Padrões, contratos e extensões

Como preparar o ambiente e como estender a Astronaut Health Intelligence Platform (AHI) sem quebrar os contratos.

## Setup

```bash
git clone https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform.git
cd astronaut-health-intelligence-platform/frontend/web
npm install
npm run dev        # http://localhost:5173
```

Antes de abrir um pull request, rode dentro de `frontend/web`:

```bash
npx tsc -b         # tipos
npm test           # testes do motor (vitest)
npx vite build     # build de produção
npm run lint       # oxlint
```

Se mudou regras, limiares ou cenários, rode também `npm run evaluate` para regenerar `src/engine/evaluation.json` e `docs/model-card.md`.

Leia antes de mexer na análise: `PROJECT_MASTER.md`, seções 1, 6, 9 e 13.

O mapa de pastas está em [Estrutura do projeto](/pt/engineering/project-structure).

## Contratos

- **`domain.ts` só aceita mudanças aditivas.** Nunca renomeie nem remova campos usados por outros módulos. Campos novos costumam ser opcionais, com comentário dizendo em que versão entraram.
- **Toda observação de dispositivo simulado** carrega `data_origin: 'SIMULATED'`, e a interface mostra o selo `SIMULATED`.
- **Dado ausente nunca é normal:** use `null` e qualidade `MISSING`, e deixe o motor produzir `NO_DATA` ou `DATA_STALE`.
- **Limiares fixos** só em `src/engine/config.ts`, rotulados como "demo configuration, not an official limit". A faixa pessoal define o status primeiro. Veja [Limiares e limitações](/pt/intelligence/thresholds).
- **Sem diagnóstico, sem medicamento, sem "limites oficiais da NASA"** inventados, em código, textos ou documentação.
- **Sem LLM ou modelo treinado no núcleo de decisão.** Qualquer camada de IA generativa segue as regras de [IA e análise](/pt/intelligence/ai-and-analytics).

## Convenções

| Tema | Regra |
| --- | --- |
| Idioma da interface | Inglês (júri internacional). Linguagem simples primeiro, termo técnico depois |
| Travessão e meia-risca | **Proibidos** em qualquer texto: interface, documentação, comentários, commits. Use ponto, vírgula, dois-pontos ou parênteses |
| TypeScript | `erasableSyntaxOnly` (sem `enum`, sem parameter properties; use uniões de strings) e `noUnusedLocals` |
| Status | Nunca só cor: sempre cor, ícone e palavra (`src/lib/status.ts`) |
| Desempenho | Nada de recalcular por tick o que pode ser incremental; o store só publica fatias que mudaram |
| Reprodutibilidade | Ruído sempre pelo gerador semeado; nada de `Math.random` na simulação |
| Testes | Toda regra nova ganha teste unitário; todo cenário novo entra na avaliação ([Estratégia de testes](/pt/engineering/testing)) |

## Como adicionar uma métrica

1. **Contrato:** acrescente o código à união `MetricCode` em `src/types/domain.ts`.
2. **Catálogo:** adicione a definição em `METRIC_CATALOG` (`src/engine/catalog.ts`): rótulo, rótulo curto, unidade canônica, região do corpo (ou `environment`), casas decimais, direção ruim, frase em linguagem simples e faixa de exibição do gráfico (não é limite clínico).
3. **Regras:** adicione a entrada em `METRIC_RULES` (`src/engine/config.ts`): tipo (contínua ou evento), baseline por contexto, piso de escala, detecção aguda e de deriva, tempo até virar `NO_DATA`, cadência, identificadores de regra. Inclua a métrica em `ASTRONAUT_METRICS` ou `CABIN_METRICS` e, se fizer sentido, em `FORECAST_METRICS`.
4. **Fonte:** faça um adapter emitir a métrica (veja abaixo).
5. **Recomendação:** ligue as novas regras a uma ação não prescritiva no catálogo de `src/engine/recommendations.ts`.
6. **Exportação:** em `src/lib/fhir.ts`, use código LOINC **só** se for bem estabelecido; caso contrário a métrica fica no sistema local `urn:ahi:metric`.
7. **Testes e avaliação:** testes unitários, `npm test` e `npm run evaluate` para conferir que o cenário nominal continua sem alertas falsos.

## Como adicionar um adapter

1. Se for um novo tipo de equipamento, acrescente-o a `DeviceKind` em `domain.ts` e um rótulo em `DEVICE_KIND_LABEL` (`src/features/topbar/ProvenancePopover.tsx`).
2. Implemente a interface `DeviceAdapter` em `src/engine/sim/adapters.ts`: `read(simNow)` devolve `HealthObservation[]`, `readEvents(from, to)` (opcional) preenche métricas diárias, `status(simNow)` informa estado, bateria, sinal, última leitura e um detalhe em linguagem simples.
3. Use `makeObservation` para garantir os campos canônicos, a origem e a qualidade (`VALID`, estimado ou `QUESTIONABLE`).
4. Descreva o equivalente real e o caminho para dado real na aba "Simulated devices" (`src/features/datasources/DevicesTab.tsx`). Não afirme acesso a API ou equipamento que não existe.
5. Um adapter de **fonte real** (por exemplo, importação de arquivo do EDA) segue o mesmo contrato e marca `data_origin: 'REAL_PUBLIC'` com `source_reference` preenchido.

## Como adicionar um cenário

1. Acrescente o identificador a `ScenarioId` em `domain.ts`.
2. Registre nome, descrição e alvo em `SCENARIOS` (`src/engine/catalog.ts`).
3. Modele a evolução da severidade e o alívio das intervenções em `src/engine/sim/scenarios.ts`. O cenário começa às 08:00 UTC do tempo simulado.
4. Inclua o cenário na avaliação (`scripts/evaluate.ts`), com duração e grade adequadas, e rode `npm run evaluate`.
5. Escreva testes que confirmem a detecção esperada e que o cenário nominal não mudou.
6. Se for útil para apresentação, considere um passo na demo guiada (`src/features/tour/steps.ts`).

## Como adicionar um dataset

Siga [Pipeline, normalização e qualidade](/pt/data/pipeline-and-quality) e o processo usado no OSDR:

1. **Descoberta e avaliação:** fonte oficial e pública, URL estável, unidade e período identificáveis, população verificada nos metadados.
2. **Script reproduzível** em `frontend/web/scripts/<fonte>/`, acessando só hosts permitidos. Arquivos baixados são dados não confiáveis: só hash e parse como texto.
3. **Arquivos:** original em `data/raw/<ACCESSION>/`, manifesto em `data/manifests/<ACCESSION>.json` (com SHA-256, data de download, licença ou "not stated", versão do parser), formato longo em `data/processed/<ACCESSION>.observations.json` e versão compacta em `frontend/web/src/data/<ACCESSION>.json`.
4. **Qualidade:** passe no checklist (esquema, unidade, timestamps, ausentes, duplicados, faixa plausível, proveniência, coerência, população, licença).
5. **Interface:** exiba como referência histórica, com `REAL_PUBLIC`, nunca como a tripulação atual.
6. **Inventário:** registre o relatório de adequação em `docs/data-source-inventory.md`.

## Documentação

- Toda página nova existe nos dois idiomas, com o mesmo caminho (`docs-site/` e `docs-site/pt/`).
- Páginas de funcionalidade usam o frontmatter de status (`status`, `origin`, `code`, `tests`, `verified`).
- Cada fato tem uma página canônica: limiares em [Limiares](/pt/intelligence/thresholds), proveniência em [Catálogo de datasets](/pt/data/dataset-catalog), métricas em [Dicionário de dados](/pt/data/data-dictionary). As outras páginas apontam para elas.
- Capturas de tela só reais, em `docs-site/public/screenshots/`.

## Commits e pull requests

- Mensagens curtas e descritivas, sem travessão.
- Explique no PR o que mudou para o usuário, quais testes rodaram e se `evaluation.json` mudou.
- O CI precisa passar: tipos, testes, build do app e build do portal (que falha com link interno quebrado).

## Próximos passos

- [Roadmap](/pt/resources/roadmap): itens para pegar.
- [Modelo de dados e contratos](/pt/architecture/data-model): o contrato em detalhe.
- [Estratégia de testes](/pt/engineering/testing).
