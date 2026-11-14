---
title: Modelo de dados e contratos
description: O modelo canônico HealthObservation, as entidades do contrato TypeScript, o diagrama de relacionamento e as enumerações da Astronaut Health Intelligence Platform.
status: IMPLEMENTED
origin: SIMULATED, MANUAL, DERIVED, REAL_PUBLIC
code:
  - frontend/web/src/types/domain.ts
  - frontend/web/src/engine/sim/adapters.ts
tests:
  - frontend/web/src/state/store.test.ts
  - frontend/web/src/lib/fhir.test.ts
verified: 2026-11-14
---

# Modelo de dados e contratos

Na Astronaut Health Intelligence Platform (AHI), todo dado, de qualquer equipamento ou fonte, vira uma **observação canônica** antes de chegar ao motor. A fonte da verdade é `frontend/web/src/types/domain.ts`, que segue a seção 6 do `PROJECT_MASTER.md`.

::: info Regra do contrato
`domain.ts` é compartilhado por motor, store e interface. Só são permitidas **mudanças aditivas**: nunca renomeie nem remova campos usados por outros módulos.
:::

## HealthObservation

Uma linha por medida. Vale para sinais vitais, ambiente da cabine (`subject_id: "CABIN"`), laboratório e autorrelato.

```json
{
  "observation_id": "uuid ou chave idempotente da origem",
  "subject_id": "AST-01",
  "mission_id": "MISSION-001",
  "device_id": "DEV-BIO-AST-01",
  "metric_code": "HEART_RATE",
  "value": 72.4,
  "unit": "bpm",
  "measured_at": "2026-11-13T14:30:00Z",
  "received_at": "2026-11-13T14:30:02Z",
  "data_origin": "SIMULATED",
  "source_reference": {
    "repository": null,
    "dataset_accession": null,
    "file_name": null,
    "record_reference": null
  },
  "quality": { "status": "VALID", "confidence": 1.0, "is_estimated": false },
  "context": { "mission_phase": "IN_FLIGHT", "activity": "REST" },
  "metadata": {}
}
```

| Campo | Obrigatório | Tipo | Regras |
| --- | --- | --- | --- |
| `observation_id` | sim | string | Único. Use uma chave idempotente da origem para deduplicar |
| `subject_id` | sim | string | Pseudônimo (`AST-01`...). `"CABIN"` para ambiente |
| `mission_id` | recomendado | string | Missão ou estudo |
| `device_id` | recomendado | string | Dispositivo ou instrumento lógico |
| `metric_code` | sim | enum | Um dos códigos do catálogo |
| `value` | sim | number ou null | **`null` quando ausente, nunca 0** |
| `unit` | sim | string | Unidade canônica após normalização |
| `measured_at` | sim | ISO 8601 UTC | Sempre UTC |
| `received_at` | recomendado | ISO 8601 UTC | Momento da ingestão |
| `data_origin` | sim | enum | `REAL_PUBLIC`, `DERIVED`, `SIMULATED`, `MANUAL` |
| `source_reference` | sim se importado | objeto | Repositório, accession, arquivo, registro |
| `quality.status` | sim | enum | `VALID`, `QUESTIONABLE`, `INVALID`, `MISSING` |
| `quality.confidence` | recomendado | 0 a 1 | Menor para valores estimados ou duvidosos |
| `quality.is_estimated` | recomendado | boolean | `true` para valores derivados ou interpolados |
| `context.mission_phase` | recomendado | enum | `PRE_FLIGHT`, `IN_FLIGHT`, `POST_FLIGHT` |
| `context.activity` | recomendado | enum | `SLEEP`, `REST`, `WORK`, `EXERCISE`, `EVA` |
| `metadata` | opcional | objeto | Valor e unidade originais, rótulo do ponto de coleta, tipo de população |

Regras do modelo:

- timestamps em UTC, preservando o fuso de origem quando relevante;
- normalizar unidades **sem apagar o valor original**;
- nunca substituir valor ausente por zero;
- registrar qualidade, ausências e método de cálculo;
- registrar fonte e dataset de todo dado importado;
- deduplicar por `observation_id` ou chave idempotente.

## Entidades

As principais entidades do contrato TypeScript:

| Entidade | Responsabilidade |
| --- | --- |
| `Astronaut` | Perfil pseudonimizado (id, callsign, função, idade, sexo, dia de missão) |
| `Mission` | Missão, veículo, fase, início e atraso de comunicação só de ida |
| `Device` | Equipamento lógico: tipo, pessoa, estado, bateria, sinal, última leitura, métricas |
| `HealthObservation` | Medida individual (acima) |
| `Baseline` | Faixa pessoal por métrica: mediana, MAD, p05, p95, faixa baixa e alta, janela, versão |
| `MetricState` | Estado atual de uma métrica: valor, status, z robusto, deriva, persistência, explicação |
| `Anomaly` | Desvio detectado, com método e explicação não diagnóstica |
| `RiskAssessment` | Nível, escore 0 a 100, fatores, regras, confiança, versão do modelo, limitações, frase de status |
| `Prediction` | Projeção com pontos, intervalo, horizonte, tempo até sair da faixa e aviso |
| `Recommendation` | Ação sugerida: título, motivo, prioridade, público, revisão humana, autonomia |
| `Intervention` | Ação registrada ("Mark done") |
| `Alert` | Notificação com reconhecimento, resolução e escalonamento |
| `AuditEvent` | Trilha de auditoria |
| `RegionState` | Status de um sistema do corpo e resumo em linguagem simples |
| `CommMessage` | Mensagem entre nave e Terra, com envio, chegada e estado |
| `CheckIn` | Check-in diário (humor, fadiga, estresse, sono, sintomas) |
| `MissionDaySummary` | Resumo de um dia de missão (sono, exercício, FC de repouso, HRV, dose, nível) |
| `StatusFrame` | Quadro da linha do tempo (status de cada pessoa e da cabine) |
| `InterventionComparison` | Trajetórias com e sem uma ação ("e se") |
| `DatasetRecord` | Registro de proveniência de um dataset real |

### Diagrama de relacionamento

```mermaid
erDiagram
    MISSION ||--o{ ASTRONAUT : tripula
    ASTRONAUT ||--o{ DEVICE : usa
    DEVICE ||--o{ HEALTH_OBSERVATION : emite
    ASTRONAUT ||--o{ HEALTH_OBSERVATION : "subject_id"
    ASTRONAUT ||--o{ BASELINE : "uma por métrica e contexto"
    ASTRONAUT ||--o{ ANOMALY : tem
    ASTRONAUT ||--|| RISK_ASSESSMENT : "avaliação atual"
    ASTRONAUT ||--o{ PREDICTION : tem
    ASTRONAUT ||--o{ RECOMMENDATION : recebe
    RECOMMENDATION ||--o{ INTERVENTION : "registrada como"
    ASTRONAUT ||--o{ ALERT : "astronautId (null = cabine)"
    ALERT ||--o{ COMM_MESSAGE : "relatedAlertId"
    RECOMMENDATION ||--o{ COMM_MESSAGE : "relatedRecommendationId"
    ASTRONAUT ||--o{ CHECK_IN : responde
    ASTRONAUT ||--o{ MISSION_DAY_SUMMARY : "um por dia"
    DATASET_RECORD ||--o{ HEALTH_OBSERVATION : "source_reference"
```

As ligações são por identificador (`astronautId`, `subject_id`, `recommendationId`, `relatedAlertId`). Não há banco de dados nem chaves estrangeiras: as entidades vivem em memória no navegador. A cabine usa `subject_id: "CABIN"` e alertas de cabine têm `astronautId: null`.

## Enumerações

| Tipo | Valores |
| --- | --- |
| `DataOrigin` | `REAL_PUBLIC`, `DERIVED`, `SIMULATED`, `MANUAL` |
| `QualityStatus` | `VALID`, `QUESTIONABLE`, `INVALID`, `MISSING` |
| `RiskLevel` | `LOW`, `MODERATE`, `HIGH`, `CRITICAL` (nível de atenção do protótipo, não classificação médica) |
| `Status` | `RiskLevel` mais `NO_DATA` (cobre dado velho e dispositivo desligado) |
| `MissionPhase` | `PRE_FLIGHT`, `IN_FLIGHT`, `POST_FLIGHT` |
| `ActivityContext` | `SLEEP`, `REST`, `WORK`, `EXERCISE`, `EVA` |
| `BodyRegionId` | `brain`, `heart`, `lungs`, `kidneys`, `muscles`, `bones`, `skin` |
| `DeviceKind` | `BIO_MONITOR`, `ACTIGRAPHY`, `BP_MONITOR`, `EXERCISE_CEVIS`, `EXERCISE_ARED`, `EXERCISE_T2`, `ENV_SENSOR`, `DOSIMETER` |
| `DeviceState` | `ONLINE`, `DEGRADED`, `DATA_STALE`, `OFFLINE` |
| `ScenarioId` | `NOMINAL`, `PROGRESSIVE_FATIGUE`, `ENVIRONMENTAL_CO2`, `PERFORMANCE_DECLINE`, `SENSOR_FAILURE`, `ACUTE_CARDIO` |
| `InterventionKind` | `REST_PROTOCOL`, `SLEEP_EXTENSION`, `HYDRATION`, `EXERCISE_ADJUSTMENT`, `SENSOR_CHECK`, `CABIN_VENTILATION`, `MEDICAL_CONSULT` |
| `CommProfileId` | `ISS`, `MOON`, `MARS_NEAR`, `MARS_FAR` |
| Autonomia da recomendação | `ONBOARD`, `GROUND_REVIEW` |
| Público da recomendação | `CREW`, `FLIGHT_SURGEON`, `MISSION_CONTROL` |

São uniões de strings em TypeScript (o projeto não usa `enum`).

## Regras do contrato

- **`domain.ts` só aceita mudanças aditivas.** Campos novos costumam ser opcionais, com comentário dizendo em que versão entraram (por exemplo "Additive (v2)").
- O `AppState` (estado da aplicação) estende `AppStateV2` sem quebrar a versão anterior.
- Toda observação de dispositivo simulado usa `data_origin: 'SIMULATED'`; ausência é `null` com qualidade `MISSING`.
- Métricas, unidades e regiões: [Dicionário de dados](/pt/data/data-dictionary). Proveniência de datasets (`DatasetRecord`): [Origens e proveniência](/pt/data/data-origins#modelo-de-proveniencia).

## Contrato de adapters

Cada fonte implementa a interface `DeviceAdapter` (`src/engine/sim/adapters.ts`):

| Método | Devolve |
| --- | --- |
| `read(simNow)` | `HealthObservation[]` do instante |
| `readEvents(from, to)` (opcional) | Métricas diárias de um intervalo, para preencher histórico |
| `status(simNow)` | Estado, bateria, sinal, última leitura e um detalhe em linguagem simples |

O contrato Python previsto no documento mestre tem os mesmos papéis (`connect`, `disconnect`, `read_observations`, `normalize`, `get_device_status`). Ele está em [Arquitetura alvo](/pt/architecture/target-architecture).

## Próximos passos

- [Dicionário de dados](/pt/data/data-dictionary): as 21 métricas.
- [Motor e simulação](/pt/architecture/engine-and-simulation): o que acontece com cada observação.
- [Padrões, contratos e extensões](/pt/engineering/contributing): como estender o contrato.
