---
title: Visão geral da arquitetura
description: Contexto e contêineres da Astronaut Health Intelligence Platform em estilo C4. Hoje tudo roda no navegador; o backend é plano.
status: IMPLEMENTED
origin: SIMULATED, DERIVED, REAL_PUBLIC
code:
  - frontend/web/src/app/App.tsx
  - frontend/web/src/state/store.ts
  - frontend/web/src/engine/engine.ts
  - frontend/web/src/types/domain.ts
verified: 2026-11-14
---

# Visão geral da arquitetura

Hoje a Astronaut Health Intelligence Platform (AHI) é um **aplicativo web que roda inteiro no navegador**. Simuladores, motor de análise, estado e interface 3D vivem no mesmo bundle. Não há backend, API REST, banco de dados nem autenticação. Isso deixa a demo rápida, reproduzível e capaz de rodar offline depois da instalação.

O desenho alvo com backend está em [Arquitetura alvo](/pt/architecture/target-architecture) e é **conceitual**.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Interface | React 19 + TypeScript |
| Build e servidor de desenvolvimento | Vite 8 |
| Estilo | Tailwind CSS v4 |
| 3D | three.js + react-three-fiber (com drei e postprocessing) |
| Estado | zustand |
| Gráficos | Recharts |
| Ícones | lucide-react |
| Testes | vitest |
| Lint | oxlint |
| Documentação | VitePress (este portal) |

Restrições de TypeScript: `erasableSyntaxOnly` (sem `enum` e sem parameter properties; enumerações são uniões de strings) e `noUnusedLocals`.

## Nível 1: contexto

```mermaid
flowchart LR
    CREW[Tripulação<br/>Crew view, check-in]
    FS[Médico de voo<br/>Ground view, relatório]
    MC[Mission Control<br/>alertas, cabine]
    RES[Pesquisador<br/>Data and model]
    AHI[Astronaut Health Intelligence Platform<br/>app web no navegador]
    OSDR[(NASA OSDR<br/>datasets públicos)]
    FILE[Arquivo FHIR R4<br/>exportação]
    CREW --> AHI
    FS --> AHI
    MC --> AHI
    RES --> AHI
    OSDR -. importação offline por script .-> AHI
    AHI -. download .-> FILE
```

- A ligação com o OSDR **não acontece em tempo de execução**: os scripts de importação rodam uma vez, e os painéis compactos são empacotados no app. Veja [Catálogo de datasets](/pt/data/dataset-catalog).
- Não há sistema externo conectado: nem ISS, nem equipamentos, nem serviços de IA.

## Nível 2: contêineres

```mermaid
flowchart TB
    subgraph Browser["Navegador"]
      UI[Interface React<br/>features, components]
      STORE[Store zustand<br/>AppState, relógio]
      ENG[HealthEngine<br/>simuladores e análise, TypeScript puro]
      W[Web Workers<br/>geometria 3D]
      IDB[(IndexedDB<br/>cache da geometria)]
      LS[(localStorage<br/>preferências)]
      DATA[(Painéis OSDR<br/>JSON empacotado)]
    end
    UI <--> STORE
    STORE <--> ENG
    UI --> W
    W --> IDB
    UI --> LS
    UI --> DATA
```

| Contêiner | Responsabilidade | Página |
| --- | --- | --- |
| Interface React | Telas, interação, 3D, gráficos | [Frontend e estado](/pt/architecture/frontend) |
| Store zustand | Implementa `AppState`, move o relógio, publica fatias que mudaram | [Frontend e estado](/pt/architecture/frontend) |
| HealthEngine | Simulação, baseline, anomalias, risco, previsão, recomendações, alertas, comunicação | [Motor e simulação](/pt/architecture/engine-and-simulation) |
| Web Workers | Constroem a geometria do corpo fora da thread principal | [Anatomia 3D](/pt/architecture/anatomy-3d) |
| Armazenamento local | Preferências e cache da geometria; nada de dados de saúde | [Governança e privacidade](/pt/data/governance-and-privacy) |

## Fluxo em tempo de execução

```mermaid
flowchart LR
    SIM[Simuladores e adapters] --> OBS[HealthObservation<br/>SIMULATED]
    OBS --> TRK[MetricTracker<br/>baseline, z robusto, EWMA]
    TRK --> EVAL[evaluate<br/>regras, risco, regiões,<br/>previsões, alertas, recomendações]
    EVAL --> STORE[Store zustand<br/>publica só o que mudou]
    STORE --> UI[Interface React<br/>e anatomia 3D]
    UI -->|ações: cenário, Mark done,<br/>check-in, mensagens| STORE
```

1. **Adapters** leem o estado simulado e emitem `HealthObservation` com origem, qualidade e contexto.
2. Um **MetricTracker** por pessoa e métrica mantém baseline e detectores, com custo constante por amostra.
3. **`evaluate()`** calcula status, regras, risco, regiões, previsões, alertas, recomendações e auditoria.
4. O **store** publica para a interface só as fatias que mudaram.
5. Ações do usuário voltam ao store e ao motor.

## Contrato central

Tudo gira em torno de `frontend/web/src/types/domain.ts`, compartilhado por motor, store e interface. **Só mudanças aditivas** são permitidas. Detalhes em [Modelo de dados e contratos](/pt/architecture/data-model).

## Decisões de arquitetura

| Decisão | Motivo | Consequência |
| --- | --- | --- |
| Tudo no navegador, sem backend | Demo rápida, offline e reproduzível para o hackathon | Sem persistência, sem multiusuário, sem autenticação |
| Motor em TypeScript puro, separado da interface | Testável com vitest sem DOM | 101 testes rodam sem navegador |
| Simulação semeada | Reprodutibilidade de cenários e avaliação | Mesmos dados com a mesma semente |
| Contrato de adapters | Trocar simulação por fonte real sem mudar a interface | Um backend futuro entra pelo mesmo contrato |
| 3D procedural, sem arquivos de modelo | Sem licenças de modelos, controle total de regiões e cores | Geração em Web Workers e cache |
| Estatística e regras, sem ML | Explicável e testável | Veja [IA e análise](/pt/intelligence/ai-and-analytics) |

## Próximos passos

- [Frontend e estado](/pt/architecture/frontend).
- [Motor e simulação](/pt/architecture/engine-and-simulation).
- [Arquitetura alvo](/pt/architecture/target-architecture): como um backend real se encaixaria.
