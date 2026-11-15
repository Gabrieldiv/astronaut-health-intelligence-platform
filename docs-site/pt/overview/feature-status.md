---
title: Matriz de status das funcionalidades
description: Cada capacidade da Astronaut Health Intelligence Platform com status de implementação, origem dos dados, código e documentação.
verified: 2026-11-15
---

# Matriz de status das funcionalidades

Esta página é a lista única do que a Astronaut Health Intelligence Platform (AHI) **faz hoje**, do que é **plano** e do que **não existe de propósito**. Cada linha foi conferida contra o código em `frontend/web/src` e `backend/` em 15/11/2026.

## Como ler

| Status | Significado |
| --- | --- |
| <StatusBadge status="IMPLEMENTED" /> | Presente no código e em uso no protótipo |
| <StatusBadge status="EXPERIMENTAL" /> | Implementado, mas heurístico ou sem validação externa; pode mudar |
| <StatusBadge status="PLANNED" /> | No backlog ou roadmap; ainda não existe no código |
| <StatusBadge status="CONCEPTUAL" /> | Proposta de desenho, não implementação |
| <StatusBadge status="NOT_IMPLEMENTED" /> | Ausente de propósito; citado só para evitar confusão |

| Origem | Significado |
| --- | --- |
| <OriginBadge origin="SIMULATED" /> | Gerado pelos simuladores. Não é evidência clínica |
| <OriginBadge origin="MANUAL" /> | Digitado por uma pessoa na interface |
| <OriginBadge origin="DERIVED" /> | Calculado pela plataforma a partir de outros dados |
| <OriginBadge origin="REAL_PUBLIC" /> | Dado público real da NASA, com proveniência |

Definições completas em [Origens e proveniência dos dados](/pt/data/data-origins).

## Dados e simulação

| Capacidade | Status | Origem | Código | Documentação |
| --- | --- | --- | --- | --- |
| Adapters de dispositivos simulados (camiseta Bio-Monitor, actigrafia, CEVIS, ARED, T2, cabine, dosímetros, teste de reação, registro de ingestão) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | <CodeLink path="frontend/web/src/engine/sim/adapters.ts" /> | [Simulação](/pt/intelligence/scenario-simulation) |
| Pausa e retomada de dispositivo pelo operador (`PAUSED`, leituras `NO_DATA`, auditoria) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | <CodeLink path="frontend/web/src/features/vitals/DevicesIndicator.tsx" /> | [Simulação](/pt/intelligence/scenario-simulation#pausing-a-device) |
| Exames periódicos de olhos (SANS) e audição, leitura diária de ruído | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | <CodeLink path="frontend/web/src/engine/sim/exams.ts" /> | [Saúde ocular e audição](/pt/intelligence/eye-and-hearing) |
| Sete cenários roteirizados (incluindo "Eye changes (SANS like)") | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | <CodeLink path="frontend/web/src/engine/sim/scenarios.ts" /> | [Simulação](/pt/intelligence/scenario-simulation) |
| Relógio semeado e reproduzível | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | <CodeLink path="frontend/web/src/state/store.ts" /> | [Motor e simulação](/pt/architecture/engine-and-simulation) |
| Modelo canônico `HealthObservation` | <StatusBadge status="IMPLEMENTED" /> | todas | <CodeLink path="frontend/web/src/types/domain.ts" /> | [Modelo de dados](/pt/architecture/data-model) |
| Datasets reais OSD-569 e OSD-575 (Inspiration4) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="REAL_PUBLIC, DERIVED" /> | <CodeLink path="frontend/web/src/data/osdr.ts" /> | [Catálogo de datasets](/pt/data/dataset-catalog) |
| Clima espacial do NASA DONKI: ao vivo pela API, snapshot real embutido offline | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="REAL_PUBLIC" /> | <CodeLink path="backend/app/modules/nasa/donki.py" /> | [Fontes da NASA](/pt/data/sources#donki-space-weather) |
| Busca de estudos do NASA OSDR ao vivo (só com a API) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="REAL_PUBLIC" /> | <CodeLink path="backend/app/modules/nasa/osdr.py" /> | [Fontes da NASA](/pt/data/sources#live-study-search) |
| API de ingestão (`POST /api/v1/observations`, idempotente, proveniência conferida) | <StatusBadge status="IMPLEMENTED" /> | todas | <CodeLink path="backend/app/modules/ingestion/service.py" /> | [Backend e API](/pt/architecture/backend#ingestion-rules) |
| Scripts de descoberta e importação do OSDR | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="REAL_PUBLIC" /> | <CodeLink path="frontend/web/scripts/osdr/import.mjs" /> | [Pipeline e qualidade](/pt/data/pipeline-and-quality) |
| Pipeline de assets de anatomia (`npm run anatomy:build`: exportação no Blender sem interface, glTF Transform, validação) | <StatusBadge status="IMPLEMENTED" /> | asset de terceiros, CC BY-SA 4.0 | <CodeLink path="frontend/web/scripts/anatomy/build.mjs" /> | [Assets de anatomia 3D](/pt/data/anatomy-assets) |
| Replay real do ambiente da ISS (NASA EDA) | <StatusBadge status="PLANNED" /> | | | [Fontes da NASA](/pt/data/sources) |
| Série real de dose de radiação (EDA, RadLab) | <StatusBadge status="PLANNED" /> | | | [Fontes da NASA](/pt/data/sources) |
| Conexão com a ISS ou com equipamentos reais | <StatusBadge status="NOT_IMPLEMENTED" /> | | | [Limitações](/pt/validation/limitations) |

## Inteligência de saúde

| Capacidade | Status | Origem | Código | Documentação |
| --- | --- | --- | --- | --- |
| Baseline pessoal robusta por contexto (mediana, MAD, p05, p95) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/baseline.ts" /> | [Linha de base pessoal](/pt/intelligence/personal-baseline) |
| z robusto agudo, deriva EWMA, persistência diária | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/anomaly.ts" /> | [Detecção de anomalias](/pt/intelligence/anomaly-detection) |
| Qualidade do dado (`NO_DATA`, sinal questionável) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/anomaly.ts" /> | [Detecção de anomalias](/pt/intelligence/anomaly-detection) |
| Regras combinadas (R-CARD-01, R-FAT-01, R-ENV-CO2-02) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/risk.ts" /> | [Avaliação de risco](/pt/intelligence/risk-assessment) |
| Escore de risco 0 a 100 (noisy-OR) e confiança | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/risk.ts" /> | [Avaliação de risco](/pt/intelligence/risk-assessment) |
| CUSUM para deriva pequena e constante (só Atenção) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/cusum.ts" /> | [Detecção de anomalias](/pt/intelligence/anomaly-detection#cusum) |
| Avaliação de olhos (SANS) e audição frente à baseline pré-voo | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/exams/assess.ts" /> | [Saúde ocular e audição](/pt/intelligence/eye-and-hearing) |
| Perfis de missão com valores de referência citados, dose da missão frente ao limite de carreira da NASA | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/missions/profiles.ts" /> | [Perfis de missão](/pt/intelligence/mission-profiles) |
| Aviso de clima espacial por perfil de missão | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="REAL_PUBLIC" /> | <CodeLink path="frontend/web/src/engine/missions/spaceWeather.ts" /> | [Perfis de missão](/pt/intelligence/mission-profiles#space-weather-advisory) |
| Previsão Holt amortecida com intervalo de 80% | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/forecast.ts" /> | [Previsão](/pt/intelligence/forecasting) |
| Horizontes de previsão 24 h, 36 h, 72 h, 7 dias, 15 dias com regra de histórico | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/features/attention/HorizonPicker.tsx" /> | [Previsão](/pt/intelligence/forecasting#selectable-horizons) |
| Catálogo de recomendações com autonomia | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/recommendations.ts" /> | [Recomendações](/pt/intelligence/recommendations) |
| Projeção "e se" sem ruído | <StatusBadge status="EXPERIMENTAL" /> | <OriginBadge origin="SIMULATED" /> | <CodeLink path="frontend/web/src/engine/intervention.ts" /> | [Recomendações](/pt/intelligence/recommendations) |
| Alertas, deduplicação, resolução automática e escalonamento | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/alerts.ts" /> | [Alertas](/pt/intelligence/alerts) |
| Check-in diário (simulado e digitado) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, MANUAL" /> | <CodeLink path="frontend/web/src/engine/checkins.ts" /> | [Autorrelato e link com a Terra](/pt/intelligence/self-report-and-earth-link) |
| Comunicação com atraso e respostas simuladas da Terra | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | <CodeLink path="frontend/web/src/engine/comms.ts" /> | [Autorrelato e link com a Terra](/pt/intelligence/self-report-and-earth-link) |
| Avaliação reproduzível do motor (`npm run evaluate`) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | <CodeLink path="frontend/web/scripts/evaluate.ts" /> | [Resultados](/pt/validation/results) |
| Assistente Ask AHI (demo com a Claude API, streaming, voz de entrada, leitura em voz alta) | <StatusBadge status="EXPERIMENTAL" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/features/assistant/AssistantPanel.tsx" /> | [Ask AHI](/pt/product/assistant) |
| Assistente offline a bordo (modelo local) | <StatusBadge status="CONCEPTUAL" /> |  |  | [Ask AHI](/pt/product/assistant#the-onboard-target) |
| Isolation Forest "Unusual combination" (por astronauta, só informativo) | <StatusBadge status="EXPERIMENTAL" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/engine/ml/multivariate.ts" /> | [Detecção de anomalias](/pt/intelligence/anomaly-detection#unusual-combination-experimental) |
| Endpoint de pontuação multivariada (caminho de paridade em scikit-learn) | <StatusBadge status="EXPERIMENTAL" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="backend/app/modules/analytics/service.py" /> | [Backend e API](/pt/architecture/backend) |
| ARIMA, XGBoost, SHAP, análise de sobrevivência | <StatusBadge status="NOT_IMPLEMENTED" /> | | | [IA e análise](/pt/intelligence/ai-and-analytics) |
| Regra IQR | <StatusBadge status="NOT_IMPLEMENTED" /> | | | [Visão geral dos métodos](/pt/intelligence/overview) |
| Reconhecimento de atividade por sensor (hoje o contexto vem do cronograma) | <StatusBadge status="CONCEPTUAL" /> | | | [Limitações](/pt/validation/limitations) |
| Treinamento de modelo clínico, RAG ou agentes em tempo de execução | <StatusBadge status="NOT_IMPLEMENTED" /> | | | [IA e análise](/pt/intelligence/ai-and-analytics) |

## Interface e produto

| Capacidade | Status | Origem | Código | Documentação |
| --- | --- | --- | --- | --- |
| "Ground view" (tripulação, corpo, atenção, linha do tempo, vitais) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | <CodeLink path="frontend/web/src/app/App.tsx" /> | [Tour do produto](/pt/product/product-tour) |
| "Crew view" para o astronauta, com os cartões "Your body systems" | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | <CodeLink path="frontend/web/src/features/crewview/CrewView.tsx" /> | [Tour do produto](/pt/product/product-tour) |
| Seletor de perfil de missão e diálogo de contexto da missão | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED, REAL_PUBLIC" /> | <CodeLink path="frontend/web/src/features/mission/MissionContext.tsx" /> | [Perfis de missão](/pt/intelligence/mission-profiles) |
| Visualizador do atlas anatômico (Z-Anatomy, 250 estruturas, destaques de status, coração e pulmões ao vivo) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | <CodeLink path="frontend/web/src/features/anatomy/viewer/AtlasViewer.tsx" /> | [Anatomia 3D](/pt/architecture/anatomy-3d) |
| Zoom em direção ao ponteiro (roda, trackpad, pinça) | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/features/anatomy/viewer/zoom.ts" /> | [Anatomia 3D](/pt/architecture/anatomy-3d#navigation-and-preset-views) |
| Modos Monitor e Explore | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/features/anatomy/viewer/interaction.ts" /> | [Anatomia 3D](/pt/architecture/anatomy-3d#monitor-and-explore) |
| Navegador do corpo pelo teclado com anúncios falados | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/features/anatomy/a11y/KeyboardNavigator.tsx" /> | [Anatomia 3D](/pt/architecture/anatomy-3d#keyboard-body-navigator) |
| Faixa de varredura do corpo (sem draw call extra) | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/features/anatomy/viewer/scan.ts" /> | [Anatomia 3D](/pt/architecture/anatomy-3d#body-scan) |
| Regiões dos olhos no atlas, anéis de status dos ouvidos | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | <CodeLink path="frontend/web/src/features/anatomy/viewer/EarMarkers.tsx" /> | [Saúde ocular e audição](/pt/intelligence/eye-and-hearing#on-the-3d-body) |
| Camadas por sistema, vistas predefinidas e opacidade da pele | <StatusBadge status="IMPLEMENTED" /> | | <CodeLink path="frontend/web/src/features/anatomy/viewer/SystemControls.tsx" /> | [Anatomia 3D](/pt/architecture/anatomy-3d#interaction) |
| Seleção de estrutura e painel da estrutura (monitorada ou só contexto) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | <CodeLink path="frontend/web/src/features/attention/StructureDetail.tsx" /> | [Tour do produto](/pt/product/product-tour#selecting-a-structure) |
| Mapeamento da anatomia para a saúde (estrutura, região, métricas) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/features/anatomy/atlas/health.ts" /> | [Modelo de dados](/pt/architecture/data-model#anatomy-to-health-mapping) |
| Alertas e sinalizações estatísticas por sistema do corpo no painel de detalhe | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/features/attention/RegionEvents.tsx" /> | [Tour do produto](/pt/product/product-tour#detalhe-da-regiao) |
| Carga sob demanda do atlas por sistema (um GLB por sistema, cache de sessão, 4 tentativas com espera crescente, botão de nova tentativa) | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/features/anatomy/viewer/retry.ts" /> | [Anatomia 3D](/pt/architecture/anatomy-3d#fallback) |
| Corpo procedural de fallback quando o atlas não está disponível | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | <CodeLink path="frontend/web/src/features/anatomy/procedural/ProceduralViewer.tsx" /> | [Anatomia 3D](/pt/architecture/anatomy-3d#fallback) |
| Modelo feminino de referência | <StatusBadge status="PLANNED" /> | | | [Roadmap](/pt/resources/roadmap#anatomy-next-steps). Hoje há um único modelo de referência para todos |
| Texturas na anatomia | <StatusBadge status="PLANNED" /> | | | [Roadmap](/pt/resources/roadmap#anatomy-next-steps). O modelo de origem não tem texturas |
| Geometria de rim do BodyParts3D | <StatusBadge status="PLANNED" /> |  |  | [Roadmap](/pt/resources/roadmap#anatomy-next-steps). Rins procedurais hoje |
| Measured by: dispositivos por trás de cada região e estrutura | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | <CodeLink path="frontend/web/src/features/attention/MeasuredBy.tsx" /> | [Simulação](/pt/intelligence/scenario-simulation#measured-by) |
| Anatomia por astronauta (exames, tamanho do corpo) | <StatusBadge status="NOT_IMPLEMENTED" /> | | | [Anatomia 3D](/pt/architecture/anatomy-3d#limitations) |
| Gaveta de alertas, banner crítico e trilha de auditoria | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED, MANUAL" /> | <CodeLink path="frontend/web/src/features/alerts/Alerts.tsx" /> | [Tour do produto](/pt/product/product-tour) |
| Sons de alerta por severidade com repetição e escalonamento | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/features/a11y/alarmSchedule.ts" /> | [Acessibilidade](/pt/product/accessibility#alert-sounds) |
| Audiodescrição (D, Shift+D), links de salto, regiões ao vivo | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/features/a11y/describe.ts" /> | [Acessibilidade](/pt/product/accessibility#audio-description) |
| Linha do tempo de status da tripulação | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/features/timeline/index.tsx" /> | [Tour do produto](/pt/product/product-tour) |
| Visão de longo prazo da missão (dias antigos sintetizados) | <StatusBadge status="EXPERIMENTAL" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | <CodeLink path="frontend/web/src/engine/missionDays.ts" /> | [Recursos da missão](/pt/product/mission-features) |
| Relatório de passagem de turno | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED, MANUAL" /> | <CodeLink path="frontend/web/src/features/report/index.tsx" /> | [Recursos da missão](/pt/product/mission-features) |
| Exportação FHIR R4 (Bundle em arquivo) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, MANUAL" /> | <CodeLink path="frontend/web/src/lib/fhir.ts" /> | [Recursos da missão](/pt/product/mission-features) |
| Diálogo "Data and model" | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="REAL_PUBLIC, DERIVED" /> | <CodeLink path="frontend/web/src/features/datasources/DataModelDialog.tsx" /> | [Recursos da missão](/pt/product/mission-features) |
| Demo guiada de 10 passos | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | <CodeLink path="frontend/web/src/features/tour/steps.ts" /> | [Cenários e demo](/pt/product/demo-scenarios) |
| Modo apresentação, atalhos de teclado, modo compacto | <StatusBadge status="IMPLEMENTED" /> | | <CodeLink path="frontend/web/src/app/shortcuts.tsx" /> | [Design system](/pt/product/design-system) |
| Cenários da missão atrás do corpo 3D, com fatos citados dos perfis e paralaxe | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/features/mission/backdrops/MissionBackdrop.tsx" /> | [Perfis de missão](/pt/intelligence/mission-profiles#mission-backdrops) |
| Painéis com a imagem primeiro (medidor de faixa, barra de mudança, relógio de atraso, frases atrás de "Details") | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/components/viz/BandGauge.tsx" /> | [Design system](/pt/product/design-system#visual-first-panels) |
| Estados "Paused by operator", "Waiting for data" e "Signal lost", com "Resume" no lugar | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | <CodeLink path="frontend/web/src/features/attention/feedState.ts" /> | [Tour do produto](/pt/product/product-tour#live-vitals-cabin-and-devices) |
| Regra da rotação em repouso do corpo 3D | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/features/anatomy/viewer/autoRotate.ts" /> | [Anatomia 3D](/pt/architecture/anatomy-3d#navigation-and-preset-views) |
| Ponto de status na aba do navegador enquanto há alerta crítico aberto | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | <CodeLink path="frontend/web/src/app/useStatusFavicon.ts" /> | [Tour do produto](/pt/product/product-tour#alerts-drawer) |
| Parada da fala e anúncio curto numa troca de idioma | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/features/a11y/languageSpeech.ts" /> | [Acessibilidade](/pt/product/accessibility#audio-description) |
| Tradução do texto do motor por mensagens estruturadas (cobertura parcial) | <StatusBadge status="EXPERIMENTAL" /> |  | <CodeLink path="frontend/web/src/i18n/engineText.ts" /> | [Texto do motor](/pt/product/accessibility#engine-text) |
| Pseudo idioma `qps` e script de varredura i18n (ferramentas de desenvolvimento) | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/i18n/pseudo.ts" /> | [Encontrar texto sem tradução](/pt/product/accessibility#finding-untranslated-text) |
| Escala de z-index para toda sobreposição | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/index.css" /> | [Design system](/pt/product/design-system#z-index-scale) |
| Idiomas opcionais da interface (pt-BR, es, ja, de; inglês padrão) | <StatusBadge status="EXPERIMENTAL" /> | | <CodeLink path="frontend/web/src/i18n/index.ts" /> | Tradução com apoio de máquina, aguardando revisão nativa ([Idiomas](/pt/product/accessibility#languages)) |
| Fluxo real de revisão do médico de voo | <StatusBadge status="PLANNED" /> | | | [Roadmap](/pt/resources/roadmap) |

## Plataforma e engenharia

| Capacidade | Status | Origem | Código | Documentação |
| --- | --- | --- | --- | --- |
| Testes unitários e de cenário (web: 375 testes em 38 arquivos; backend: 44 testes pytest em 6 arquivos) | <StatusBadge status="IMPLEMENTED" /> | | <CodeLink path="frontend/web/src/engine/engine.test.ts" /> | [Estratégia de testes](/pt/engineering/testing) |
| CI no GitHub Actions (lint, tipos, testes e build do app; build do portal em pull requests) | <StatusBadge status="IMPLEMENTED" /> | | <CodeLink path=".github/workflows/ci.yml" /> | [Documentação e deploy](/pt/engineering/deployment) |
| Portal de documentação bilíngue no GitHub Pages | <StatusBadge status="IMPLEMENTED" /> | | <CodeLink path=".github/workflows/docs-deploy.yml" /> | [Documentação e deploy](/pt/engineering/deployment) |
| Modo demo offline: o app roda inteiro no navegador, `VITE_API_URL=off` para hospedagem estática | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/lib/api/client.ts" /> | [Backend e API](/pt/architecture/backend#offline-demo-mode) |
| Chave online e offline ("Automatic", "Online", "Offline") com chip de conexão na barra superior | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="frontend/web/src/lib/api/connectivity.ts" /> | [Backend e API](/pt/architecture/backend#online-and-offline-switch) |
| Backend: monólito modular em FastAPI (health, registry, ingestion, observations, nasa, assistant, analytics) | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="backend/app/main.py" /> | [Backend e API](/pt/architecture/backend) |
| Banco de dados: SQLite por padrão, PostgreSQL com Docker Compose, migrações Alembic | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="docker-compose.yml" /> | [Backend e API](/pt/architecture/backend#storage-and-migrations) |
| Schema OpenAPI e tipos gerados para o frontend (`npm run api:types`) | <StatusBadge status="IMPLEMENTED" /> |  | <CodeLink path="backend/openapi.json" /> | [Backend e API](/pt/architecture/backend#generated-types) |
| Motor de saúde em Python (port do motor TypeScript) | <StatusBadge status="PLANNED" /> |  | <CodeLink path="backend/app/modules/engine/__init__.py" label="só a interface" /> | [Roadmap](/pt/resources/roadmap) |
| Autenticação e perfis de acesso | <StatusBadge status="PLANNED" /> |  |  | [Roadmap](/pt/resources/roadmap) |
| Partes ainda conceituais da arquitetura alvo (jobs em segundo plano, Redis, serviços do motor no servidor) | <StatusBadge status="CONCEPTUAL" /> |  |  | [Arquitetura alvo](/pt/architecture/target-architecture) |
| Implantação publicada do app | <StatusBadge status="PLANNED" /> | | | O app roda localmente por enquanto; só o portal é publicado ([Roadmap](/pt/resources/roadmap)) |

::: tip DICA
Para ver cada capacidade ligada a código, testes, dados e método, use a [Matriz de rastreabilidade](/pt/validation/traceability).
:::

## Próximos passos

- [Matriz de rastreabilidade](/pt/validation/traceability): capacidade, código, testes, dados e método.
- [Limitações e problemas conhecidos](/pt/validation/limitations).
- [Roadmap](/pt/resources/roadmap): o que vem a seguir.
