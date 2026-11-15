---
title: Estrutura do projeto
description: Pastas e arquivos do repositório da Astronaut Health Intelligence Platform (app web, backend, dados e documentação), com o papel de cada um.
status: IMPLEMENTED
code:
  - frontend/web/src/types/domain.ts
  - frontend/web/src/engine/config.ts
  - frontend/web/src/state/store.ts
  - backend/pyproject.toml
verified: 2026-11-15
---

# Estrutura do projeto

O repositório da Astronaut Health Intelligence Platform (AHI) tem quatro partes: o **app** (`frontend/web`), o **backend** opcional (`backend/`), os **dados reais** com proveniência (`data/`) e a **documentação** (`docs/` e este portal em `docs-site/`).

## Árvore

```text
.
├── CLAUDE.md                 regras do projeto para agentes de código
├── PROJECT_MASTER.md         especificação completa de produto, dados e arquitetura (pt-BR)
├── README.md
├── LICENSE                   MIT
├── docker-compose.yml        PostgreSQL 17 e a AHI API
├── backend/                  AHI API (monólito modular FastAPI, Python 3.12)
├── .github/workflows/
│   ├── ci.yml                lint, tipos, testes e build do app (só quando o app muda)
│   ├── docs-check.yml        build do portal em pull requests (links quebrados reprovam)
│   └── docs-deploy.yml       build e publicação do portal no GitHub Pages
├── data/
│   ├── raw/<OSD>/            arquivos originais do OSDR, byte a byte
│   ├── manifests/            proveniência (SHA-256, URLs, versões) e log de importação
│   └── processed/            formato longo canônico
├── docs/                     demo-script, model-card (gerado), inventário de fontes, guia de dados,
│                             guia dos assets de anatomia, arquitetura do assistente
├── docs-site/                portal VitePress (inglês na raiz, português em /pt/)
└── frontend/web/
    ├── index.html            página do app
    ├── anatomy-lab.html      página de desenvolvimento do corpo 3D
    ├── features-lab.html     página de desenvolvimento das telas v2
    ├── public/
    │   └── anatomy/          atlas 3D: nove *.glb (um por sistema anatômico), manifest.json e
    │                         LICENSE.md (CC BY-SA 4.0). Gerado, nunca editado à mão
    ├── scripts/
    │   ├── evaluate.ts       avaliação do motor (npm run evaluate)
    │   ├── anatomy/          pipeline de assets (npm run anatomy:build): build.mjs, fetch-source.mjs,
    │   │                     export_atlas.py (Blender), build-kidneys.ts, optimize.mjs, validate.mjs,
    │   │                     decode-for-preview.mjs, render_previews.py
    │   └── osdr/             descoberta e importação do NASA OSDR
    ├── .cache/anatomy/       pasta de trabalho do pipeline (fonte, exportação bruta, previews); ignorada pelo git
    └── src/
        ├── app/              App, atalhos, estado de interface
        ├── components/       componentes compartilhados (gráfico, status, sparkline, medidor)
        ├── data/             painéis OSDR compactos, snapshot do DONKI (nasa/) e loaders tipados
        ├── engine/           simuladores, baseline, anomalia, CUSUM, risco, previsão, recomendações
        │   ├── sim/          perfis, cronograma, fisiologia, cabine, exames, cenários, adapters
        │   ├── exams/        cronograma e avaliação dos exames de olhos (SANS) e audição
        │   ├── missions/     perfis de missão, fontes citadas, dose da missão, aviso de clima espacial
        │   └── ml/           Isolation Forest experimental, branqueamento PCA, detector multivariado
        ├── features/         telas: a11y, anatomy, assistant, attention, alerts, timeline, comms,
        │                     checkin, mission, report, whatif, datasources, crewview, tour, topbar...
        ├── lib/              status (cores e rótulos), exportação FHIR, cliente da API, loaders da NASA
        ├── state/            store zustand e relógio da simulação
        └── types/            domain.ts (contrato compartilhado, só mudanças aditivas), nasa.ts,
                              api.gen.ts (gerado a partir de backend/openapi.json)
```

## Backend (`backend`)

```text
backend/
├── app/
│   ├── main.py               create_app(): routers, CORS, logs de requisição, lifespan
│   ├── cli.py                comandos openapi e donki-snapshot
│   ├── core/                 configurações (.env), logs, cache TTL
│   ├── db/                   engine, sessões, migrações na partida
│   └── modules/              health, registry, ingestion, observations, nasa,
│                             assistant, analytics, engine (só o ponto de encaixe)
├── alembic/                  migrações
├── tests/                    pytest (HTTP externo simulado com respx)
├── openapi.json              schema exportado (origem de src/types/api.gen.ts)
├── .env.example              modelo de configuração (copie para .env, nunca faça commit)
└── Dockerfile
```

## Arquivos-chave

| Arquivo ou pasta | Papel | Regra |
| --- | --- | --- |
| `src/types/domain.ts` | Contrato único entre motor, store e interface | **Só mudanças aditivas** |
| `src/engine/config.ts` | Todo número ajustável, versões e limiares fixos | Limiares rotulados como "demo configuration, not an official limit" |
| `src/engine/catalog.ts` | Métricas, regiões, tripulação, missão, cenários, perfis de comunicação | Faixa de exibição não é limite clínico |
| `src/engine/engine.ts` | `HealthEngine`, o orquestrador | |
| `src/engine/evaluation.json` | Resultado da avaliação | Gerado por `npm run evaluate`, não editar à mão |
| `src/state/store.ts` | Implementa `AppState`; `startTicker()` move o relógio | API estável: `useAppStore`, `startTicker` |
| `src/lib/status.ts` | Cores e rótulos de status | Cor nunca sozinha |
| `src/features/anatomy/` | Corpo 3D: `atlas/` (contrato do manifesto, mapeamento de saúde), `viewer/` (visualizador do atlas), `procedural/` (modelo de fallback) | A ligação entre anatomia e saúde fica só em `atlas/health.ts` ([Anatomia 3D](/pt/architecture/anatomy-3d#component-map)) |
| `src/features/attention/` | Painel de atenção, detalhe do sistema, detalhe da estrutura, alertas e sinalizações, Measured by | [Tour do produto](/pt/product/product-tour#selecting-a-structure) |
| `src/engine/missions/`, `src/engine/exams/`, `src/engine/ml/` | Perfis de missão, exames, aprendizado de máquina experimental | [Perfis de missão](/pt/intelligence/mission-profiles), [Saúde ocular e audição](/pt/intelligence/eye-and-hearing), [Detecção de anomalias](/pt/intelligence/anomaly-detection#unusual-combination-experimental) |
| `src/features/a11y/`, `src/features/assistant/` | Sons, audiodescrição, links de salto; Ask AHI | [Acessibilidade](/pt/product/accessibility), [Ask AHI](/pt/product/assistant) |
| `src/lib/api/` | Cliente tipado da API com fallback offline | [Backend e API](/pt/architecture/backend#offline-demo-mode) |
| `backend/app/modules/` | Um módulo por responsabilidade (router, schemas, tabelas) | [Backend e API](/pt/architecture/backend#modules) |
| `public/anatomy/` | Arquivos publicados do atlas | Licença CC BY-SA 4.0 (o código é MIT); gerados por `npm run anatomy:build` ([Assets de anatomia 3D](/pt/data/anatomy-assets)) |
| `scripts/anatomy/` | Pipeline de assets de anatomia | Precisa do Blender 4.5 LTS; `npm run anatomy:validate` confere o resultado |
| `docs/anatomy-assets.md` | Guia completo dos assets de anatomia (proveniência, regras, rebuild) | Versão de site em [Assets de anatomia 3D](/pt/data/anatomy-assets) |
| `docs/model-card.md` | Model card oficial | Gerado por `npm run evaluate` |
| `docs/data-guide.md` | Guia do time de dados (pt-BR) | Versão de site em [Pipeline e qualidade](/pt/data/pipeline-and-quality) |
| `docs/data-source-inventory.md` | Relatórios de adequação de cada fonte | |

## Testes

Os 38 arquivos de teste do app ficam ao lado do código que testam (`*.test.ts` em `src/`). O backend tem 6 arquivos pytest em `backend/tests/`. Lista e cobertura em [Estratégia de testes](/pt/engineering/testing).

## Portal de documentação

```text
docs-site/
├── .vitepress/
│   ├── config.mts            navegação, barra lateral, idiomas, busca, Mermaid
│   └── theme/                tema, CSS e componentes (StatusBadge, OriginBadge, CodeLink, PageMeta)
├── public/                   logo, favicon e capturas de tela reais (screenshots/)
├── *.md, overview/, data/, intelligence/, architecture/, product/, engineering/,
│   validation/, resources/, science/        páginas em inglês
└── pt/                       as mesmas páginas em português, com os mesmos caminhos
```

Detalhes em [Documentação e deploy](/pt/engineering/deployment).

## Próximos passos

- [Padrões, contratos e extensões](/pt/engineering/contributing).
- [Visão geral da arquitetura](/pt/architecture/overview).
- [Estratégia de testes](/pt/engineering/testing).
