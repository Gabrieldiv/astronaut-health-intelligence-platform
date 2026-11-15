---
title: Estratégia de testes
description: Os 48 arquivos vitest com 430 testes, os testes ponta a ponta e visuais do Playwright e a suíte pytest do backend da Astronaut Health Intelligence Platform, o que cada um cobre, a avaliação do motor, o CI e as lacunas conhecidas.
status: IMPLEMENTED
origin: SIMULATED
code:
  - frontend/web/package.json
  - frontend/web/scripts/evaluate.ts
  - .github/workflows/ci.yml
  - .github/workflows/docs-check.yml
  - backend/tests
  - frontend/web/playwright.config.ts
tests:
  - frontend/web/src/engine/engine.test.ts
  - frontend/web/src/engine/risk.test.ts
  - frontend/web/src/features/anatomy/atlas/health.test.ts
  - frontend/web/src/features/anatomy/atlas/manifest.contract.test.ts
  - frontend/web/src/state/selection.test.ts
verified: 2026-11-15
---

# Estratégia de testes

A Astronaut Health Intelligence Platform (AHI) é testada em três camadas: **testes unitários e de cenário** (vitest), **avaliação reproduzível do motor** (`npm run evaluate`) e **checagens de build** (tipos, build do app e do portal) no CI.

::: info Estado em 15/11/2026
**430 testes web em 48 arquivos, todos passando**, mais **14 testes ponta a ponta e 6 testes visuais do Playwright** (`npm run e2e`). Checagem de tipos limpa e build de produção ok. Rode com `npm test` dentro de `frontend/web`. O backend tem **44 testes pytest em 6 arquivos** (`python -m pytest` em `backend`), com o HTTP externo simulado (respx): as fontes da NASA e a Claude API nunca são chamadas.
:::

## Pirâmide atual

| Camada | Ferramenta | O que cobre | Status |
| --- | --- | --- | --- |
| Unitários do motor | vitest | Estatística, baseline, detecção, risco, previsão, alertas, comunicação, check-ins, "e se" | <StatusBadge status="IMPLEMENTED" /> |
| Cenários de ponta a ponta do motor | vitest | Os sete cenários rodando no `HealthEngine` sem interface | <StatusBadge status="IMPLEMENTED" /> |
| Store | vitest | Publicação de fatias e ações; seleção de estrutura, região e métrica (14 testes em 3 arquivos) | <StatusBadge status="IMPLEMENTED" /> |
| Camada de dados da anatomia | vitest | Mapeamento de estrutura para região, visão de saúde da estrutura, contrato do manifesto contra os arquivos GLB reais (29 testes em 2 arquivos) | <StatusBadge status="IMPLEMENTED" /> |
| Assets de anatomia | `scripts/anatomy/validate.mjs` | `npm run anatomy:validate` nos arquivos publicados ([Assets de anatomia 3D](/pt/data/anatomy-assets#rebuild)) | <StatusBadge status="IMPLEMENTED" /> |
| Exportação | vitest | Bundle FHIR R4 | <StatusBadge status="IMPLEMENTED" /> |
| Avaliação do motor | `scripts/evaluate.ts` | Alertas falsos e tempos de detecção em 5 sementes | <StatusBadge status="IMPLEMENTED" /> |
| Componentes de interface | | Nenhum teste de componente React | <StatusBadge status="NOT_IMPLEMENTED" /> |
| Lógica do visualizador | vitest | Matemática do zoom, modos de interação, política de nova tentativa, tempo da varredura, enquadramento do corpo inteiro, rotação em repouso, navegação pelo teclado (48 testes em 7 arquivos) | <StatusBadge status="IMPLEMENTED" /> |
| Renderização 3D | | Estados visuais, picking, carga e fallback: verificação visual com `anatomy-lab.html`, sem teste de pixels | <StatusBadge status="NOT_IMPLEMENTED" /> |
| Ponta a ponta no navegador | Playwright | O roteiro da demo: abrir o painel, selecionar astronauta, executar cenário, reconhecer alerta e a trilha de auditoria ([detalhes](#end-to-end-and-visual-tests)); 14 testes, rodam no CI | <StatusBadge status="IMPLEMENTED" /> |
| Regressão visual de painéis | Playwright | Capturas de seis painéis; 6 testes, ainda sem imagens de referência commitadas, pulados no CI | <StatusBadge status="PLANNED" /> |
| Integração com backend | pytest | Health e cadastro, ingestão e observações, conectores NASA, assistente, análise, schema OpenAPI (44 testes) | <StatusBadge status="IMPLEMENTED" /> |

## Arquivos de teste do app

| Arquivo | Testes | O que cobre |
| --- | --- | --- |
| <CodeLink path="frontend/web/src/engine/stats.test.ts" /> | 8 | Mediana, MAD e quantis; z robusto ignora outlier e respeita o piso; orientação do z pela direção ruim; alpha da EWMA pela meia-vida; EWMA segue um degrau; aleatoriedade semeada reproduzível; ruído OU suave com variância unitária; inclinação linear |
| <CodeLink path="frontend/web/src/engine/baseline.test.ts" /> | 5 | `INSUFFICIENT_DATA` abaixo do mínimo; faixa de mediana ± 2 desvios robustos; robustez a outliers; recorte aos limites físicos; reservatório mantém só os valores recentes |
| <CodeLink path="frontend/web/src/engine/anomaly.test.ts" /> | 8 | Baseline pessoal e `LOW` em dado normal; salto agudo vira CRITICAL; pico isolado filtrado pela mediana de 3; deriva EWMA detecta e escala com persistência; dado ausente ou velho é `NO_DATA`; dado questionável não passa de MODERATE; baseline por contexto no exercício; noites curtas seguidas |
| <CodeLink path="frontend/web/src/engine/risk.test.ts" /> | 14 | Faixas do escore; três MODERATE viram HIGH; cada regra conta uma vez e teto em HIGH sem regra CRITICAL; peso máximo da qualidade do dado; R-CARD-01; R-FAT-01 (2 de 3 e 3 de 3); dado ausente nunca é componente normal; fatores, confiança, limitações e frase; frase sem achados; regiões `NO_DATA`; deduplicação, escalonamento, resolução e histórico de alertas; picos MODERATE não acionáveis; agrupamento por regra combinada; recomendações com revisão humana |
| <CodeLink path="frontend/web/src/engine/forecast.test.ts" /> | 17 | Holt segue tendência amortecida; nulo com poucos pontos; intervalo cresce com o horizonte; janelas irregulares; inelegível sem dados; horizontes de 6 h e 24 h; tempo até sair da faixa; métricas diárias; sem saída anunciada durante recuperação; horizontes selecionáveis até 15 dias e a regra de histórico ("Not enough history for this horizon") |
| <CodeLink path="frontend/web/src/engine/alerts.test.ts" /> | 5 | CRITICAL escala aos 5 e 15 min; avaliação atrasada pula ao nível certo; HIGH aos 30 e 90 min e MODERATE nunca; para com reconhecimento ou resolução; escalonamento auditado no motor |
| <CodeLink path="frontend/web/src/engine/comms.test.ts" /> | 9 | Entrega após o atraso e resposta após revisão mais atraso; independência da frequência de processamento; relatório sem resposta e respostas não prescritivas; perfil aplicado à missão; um pacote automático por alerta HIGH ou CRITICAL; primeiro passo a bordo em Marte; entrega e respostas auditadas; troca de perfil e envio manual; sem passo a bordo na ISS |
| <CodeLink path="frontend/web/src/engine/checkins.test.ts" /> | 8 | Um check-in por pessoa por manhã; métricas de autorrelato na região do cérebro; novo check-in a cada manhã ao vivo; fadiga progressiva muda as respostas e corrobora R-FAT-01 sem passar de MODERATE; CO₂ torna dor de cabeça mais provável; check-in manual substitui o simulado; autorrelato sozinho chega no máximo a MODERATE e sem alerta; contagem de fadiga alta |
| <CodeLink path="frontend/web/src/engine/intervention.test.ts" /> | 7 | Extensão de sono recupera a HRV (rápido, determinístico, sem mudar estado); métrica e horizonte explícitos; nulo quando não se aplica; nominal com linhas iguais; consulta médica no evento agudo com horizonte curto; ventilação projeta CO₂; ajuste de exercício por sessão |
| <CodeLink path="frontend/web/src/engine/missionDays.test.ts" /> | 6 | Dias 1 até o atual para cada pessoa; valores plausíveis (dose, sono, exercício); síntese determinística; dia atual ao vivo; fadiga e queda de desempenho aparecem nos dias recentes |
| <CodeLink path="frontend/web/src/engine/timeline.test.ts" /> | 3 | 24 h de quadros a cada 15 min na inicialização; quadros ao vivo seguem o risco mesmo com saltos grandes; histórico limitado |
| <CodeLink path="frontend/web/src/engine/engine.test.ts" /> | 11 | Baselines prontas na inicialização; reprodutibilidade com a mesma semente; histórico limitado; nominal sem HIGH em dois dias; evento agudo chega a CRITICAL com um alerta agrupado; alívio após consulta médica; falha de sensor vira `NO_DATA`; fadiga escala em dias; CO₂ sobe e a ventilação baixa; desempenho cai por sessão; reconhecimento auditado |
| <CodeLink path="frontend/web/src/lib/fhir.test.ts" /> | 7 | Bundle `collection` com URLs únicas; pacientes pseudonimizados; LOINC só para vitais conhecidos; origem em cada observação; dado ausente nunca exportado como valor; cabine sem paciente; ids FHIR válidos e UUIDs estáveis |
| <CodeLink path="frontend/web/src/state/store.test.ts" /> | 1 | Fatias v2 publicadas, referências estáveis e ações ligadas |
| <CodeLink path="frontend/web/src/state/selection.test.ts" /> | 13 | Nada selecionado no início; `selectStructure` define estrutura e região em uma única atualização e limpa a métrica; estrutura só de contexto limpa a região; `selectStructure(null)` limpa tudo; `selectRegion` limpa a estrutura; `selectAstronaut` limpa estrutura, região e métrica; `selectMetric` mantém as duas; um tick do relógio nunca mexe na seleção; `focusTarget` (botões "View" dos alertas) limpa a estrutura de outra região, mantém a da mesma região, troca de astronauta primeiro e ignora alvos de cabine; `clearSelection` volta à visão geral |
| <CodeLink path="frontend/web/src/features/anatomy/atlas/health.test.ts" /> | 21 | Cada sistema anatômico mapeado por regra; só as estruturas do encéfalo vão para a região do cérebro e só os rins para a região dos rins (mantendo a origem procedural); órgãos digestivos, glândulas, órgãos linfoides e dos sentidos ficam só de contexto; ids obrigatórios; estrutura principal de uma região; contagens do atlas; métricas relacionadas vêm só do catálogo e nunca incluem métricas de cabine; status `null` para só contexto, `NO_DATA` (nunca normal) quando falta o estado de saúde, senão o status da região; alertas da região por gravidade e depois por hora; anomalias dentro de uma janela; valor observado em um instante, nunca inventado; visão de saúde de estruturas monitoradas e só de contexto; textos em linguagem simples nunca afirmam diagnóstico nem medida neurológica e não contêm travessão nem meia-risca |
| <CodeLink path="frontend/web/src/features/anatomy/atlas/manifest.contract.test.ts" /> | 8 | Lê o `public/anatomy` real: leitor do bloco JSON do GLB; formato de topo, fonte e licença; estruturas válidas com ids únicos; os sete ids obrigatórios mapeados para as suas regiões; estruturas pares no lado que o id indica; estruturas reais mapeadas pelas regras de saúde; uma entrada de arquivo por sistema, com contagens coerentes; todos os GLB presentes, com um nó de malha com o nome de cada id de estrutura |
| <CodeLink path="frontend/web/src/engine/cusum.test.ts" /> | 7 | Não acumula dentro da folga; acumula (m - k) por hora até h; independe da cadência de amostragem; teto e limpeza em tempo limitado; corte de picos; uma deriva pequena da frequência cardíaca de repouso abaixo da regra EWMA; `LOW` em dado estável |
| <CodeLink path="frontend/web/src/engine/devicePause.test.ts" /> | 6 | Estado e detalhe do aparelho pausado; métricas `NO_DATA` com "Paused by operator", nunca normais; nenhum alarme de falha de sensor; entradas de auditoria; ao retomar, espera a primeira leitura |
| <CodeLink path="frontend/web/src/engine/exams/exams.test.ts" /> | 19 | Cronograma de exames oculares da SANS (pré-voo, FD 30, FD 90, R-30); cadência dos testes de audição; regra da retina de 19,4 µm; só dobras novas; níveis de demo para bainha do nervo óptico e acuidade; desvio de audição do HSRB; dose de ruído e regra de 72 dBA; dado ausente nunca normal; cenário SANS com Watch e depois Warning |
| <CodeLink path="frontend/web/src/engine/missions/missions.test.ts" /> | 18 | Quatro perfis com fontes https; valores de referência publicados; link com a Terra por perfil; taxas de dose por perfil; limite de carreira de 600 mSv; aviso de clima espacial por perfil, casos calmos e sem dados; autonomia pelo atraso; sem travessões |
| <CodeLink path="frontend/web/src/engine/ml/isolationForest.test.ts" /> | 5 | Normalização padrão c(n); determinístico por semente; pontos distantes pontuam mais; atributos constantes e poucos dados tratados |
| <CodeLink path="frontend/web/src/engine/ml/whitening.test.ts" /> | 3 | O branqueamento PCA descorrelaciona e mantém o piso de variância |
| <CodeLink path="frontend/web/src/engine/ml/multivariate.test.ts" /> | 7 | Limiar pessoal; sinaliza só quando o escore persiste e as regras de deriva concordam; contribuições; texto da explicação |
| <CodeLink path="frontend/web/src/engine/ml/engineMultivariate.test.ts" /> | 3 | Quieto em um dia nominal; sinaliza o cenário agudo sem mexer no escore de risco; `NO_DATA` quando a camiseta para |
| <CodeLink path="frontend/web/src/state/missionProfile.test.ts" /> | 1 | Ligação do perfil de missão no store |
| <CodeLink path="frontend/web/src/lib/api/client.test.ts" /> | 6 | `VITE_API_URL` e `off`; conectado quando `/health` responde como a AHI API; offline nos outros casos |
| <CodeLink path="frontend/web/src/lib/nasa/spaceWeather.test.ts" /> | 7 | O snapshot empacotado é dado DONKI REAL_PUBLIC válido; checagem do contrato; backend usado quando responde; volta ao snapshot quando o backend está fora, o DONKI cai (502), a resposta é inesperada ou a chamada expira |
| <CodeLink path="frontend/web/src/features/a11y/alarmSchedule.test.ts" /> | 15 | Quais alertas tocam, intervalos de repetição, escalonamento após 2 min, um som por vez, intervalo mínimo, histórico nunca toca |
| <CodeLink path="frontend/web/src/features/a11y/describe.test.ts" /> | 9 | Status, leituras e unidades faladas; dado ausente falado como sem dados; dado simulado declarado |
| <CodeLink path="frontend/web/src/features/assistant/assistant.test.ts" /> | 11 | Snapshot fundamentado; separação da linha "Based on:"; texto para fala sem markdown; leitura do stream |
| <CodeLink path="frontend/web/src/features/anatomy/atlas/examRegions.test.ts" /> | 11 | Regiões de olhos e ouvidos no atlas; posição dos marcadores dos ouvidos; métricas de exame por região |
| <CodeLink path="frontend/web/src/features/anatomy/a11y/keyboardNav.test.ts" /> | 12 | Ordem de regiões e estruturas; setas, Home e End; anúncios com status e sem dados |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/zoom.test.ts" /> | 10 | Zoom em direção ao ponteiro mantém o ponto mirado; limites de distância; nada se move no limite |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/interaction.test.ts" /> | 5 | Monitor e Explore: quais estruturas são interativas; modo guardado com fallback seguro |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/retry.test.ts" /> | 8 | Espera de 0,6, 1,8 e 5,4 s; 4 tentativas; o erro guarda a última causa; erros que não valem nova tentativa |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/scan.test.ts" /> | 6 | Tempo da varredura; uma passada por ciclo; movimento reduzido fica lento e fraco |
| <CodeLink path="frontend/web/src/i18n/i18n.test.ts" /> | 60 | Cinco idiomas, inglês primeiro e único revisado; cada idioma tem exatamente as chaves do inglês, sem textos vazios, com os mesmos marcadores, sem travessões e com os termos protegidos sem tradução; palavras de status e rótulos do catálogo seguem o idioma |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/autoRotate.test.ts" /> | 3 | Rotação em repouso: gira parada e habilitada, para durante o arrasto e volta 3 s após a última interação, fica parada com algo selecionado ou sob o ponteiro e durante o voo da câmera |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/framing.test.ts" /> | 4 | O enquadramento do corpo inteiro ocupa a altura livre, é limitado pela largura em telas estreitas, cresce quando as faixas reservadas diminuem, e um close nunca fica mais longe que o plano do corpo inteiro |
| <CodeLink path="frontend/web/src/features/attention/feedState.test.ts" /> | 2 | "Paused" (não "Signal lost") com o aparelho pausado, "Waiting" na carência da retomada, depois "Live"; leitura ausente sem aparelho saudável continua "Signal lost" |
| <CodeLink path="frontend/web/src/features/stage/indicators.test.ts" /> | 4 | Contagem de indicadores: todos normais, os sinalizados primeiro e o pior primeiro, leitura sem valor atual nunca contada como normal, vazio antes da primeira avaliação |
| <CodeLink path="frontend/web/src/features/stage/indicatorBreakdown.test.ts" /> | 3 | O detalhamento por sistema do corpo conta cada indicador, põe o grupo mais urgente primeiro e mantém dado ausente fora dos normais |
| <CodeLink path="frontend/web/src/components/viz/scale.test.ts" /> | 8 | Escala do medidor, mudança frente à mediana pessoal (dado ausente nunca lido como mudança nem como normal), fração do limite, largura da barra de mudança, fração do relógio de atraso |
| <CodeLink path="frontend/web/src/app/useStatusFavicon.test.ts" /> | 2 | Ponto vermelho no ícone da aba só com alerta CRITICAL aberto; o ícone é uma data URL SVG |
| <CodeLink path="frontend/web/src/features/a11y/languageSpeech.test.ts" /> | 3 | Trocar de idioma cancela a voz antiga e anuncia uma vez no novo idioma; uma segunda troca rápida fala só o último; silêncio com a audiodescrição desligada |
| <CodeLink path="frontend/web/src/lib/api/connectivity.test.ts" /> | 7 | Automático, Online e Offline: escolha guardada, `VITE_API_URL=off` vence, chip da barra superior, armazenamento bloqueado, Offline nunca toca a rede, Online avisa que a API está inacessível e ainda serve o snapshot empacotado |
| <CodeLink path="frontend/web/src/i18n/engineText.test.ts" /> | 14 | Frases do motor por mensagens estruturadas: inglês byte a byte, toda frase amostrada traduzida em cada idioma, perfis de missão e títulos das regras de exame, toda chave do motor existe em inglês |
| **Total** | **430** | |

## Ponta a ponta e testes visuais {#end-to-end-and-visual-tests}

O Playwright (só Chromium) dirige o app real em um navegador. Configuração: <CodeLink path="frontend/web/playwright.config.ts" />. Rode com `npm run e2e` dentro de `frontend/web` (precisa de um Chromium que rode WebGL).

| Suíte | Testes | O que cobre |
| --- | --- | --- |
| <CodeLink path="frontend/web/e2e/demo-script.spec.ts" /> | 14 | O roteiro da demo como um usuário: a Ground view com o selo SIMULATED, fadiga progressiva, evento cardíaco agudo com a trilha de auditoria, falha de sensor (sem dado, nunca normal), pausar e retomar um aparelho, horizontes de previsão, orientação do trânsito para Marte, cartões de sistemas do corpo da Crew view, link de salto, o navegador do corpo pelo teclado, Ask AHI offline e fechar com Esc, a aba de contexto da NASA no modo offline, trocar o idioma para japonês e voltar |
| <CodeLink path="frontend/web/e2e/visual.spec.ts" /> | 6 | Capturas de painéis estáveis: barra superior, lista da tripulação, painel de atenção, painel de aparelhos, coluna lateral da Crew view, painel Mission and Earth link. O canvas 3D é mascarado |

- Os testes sobem o próprio servidor de desenvolvimento na porta 5190 e sempre rodam no modo demo offline: o endereço da API aponta para uma porta em que nada escuta, e toda requisição para ela é abortada.
- A simulação tem semente e fica pausada em um instante simulado fixo, então as capturas são repetíveis.
- **As imagens de referência dos testes visuais ainda não estão commitadas.** As capturas dependem da plataforma (`e2e/__screenshots__/<plataforma>/`). Gere-as com `npm run e2e:update` na máquina que vai compará-las. Para Linux (CI), envie um branch chamado `visual/baselines`: o workflow `.github/workflows/visual-baselines.yml` roda os testes visuais com `E2E_VISUAL=1` e publica as capturas como artefato para commitar em `frontend/web/e2e/__screenshots__/linux/`. Até lá os testes visuais são pulados no Linux (use `E2E_VISUAL=1` para rodá-los).

## Avaliação do motor

`npm run evaluate` roda o motor sem interface sobre os cenários, com 5 sementes, e grava `src/engine/evaluation.json` e `docs/model-card.md`. Ela mede alertas falsos no cenário nominal e tempos de detecção nos outros cenários. Os números estão em [Resultados e evidências](/pt/validation/results).

A avaliação já mudou o motor: ela revelou alertas falsos de pressão arterial no exercício, o que levou à regra de só sinalizar desvio para cima nesse contexto ([Detecção de anomalias](/pt/intelligence/anomaly-detection)).

## CI

Os workflows rodam só quando os arquivos que eles verificam mudam:

| Workflow | Quando roda | Passos |
| --- | --- | --- |
| `ci.yml`, job App | Push para `master` e pull request para `master` ou `develop` que alteram `frontend/web/**` | `npm ci`, `npm run lint`, `npx tsc -b`, `npm test`, `npx vite build` (Node 22) |
| `ci.yml`, job End to end | Os mesmos gatilhos | `npm ci`, instala o Chromium, `npm run e2e` (só os testes funcionais; os visuais são pulados no Linux) |
| `backend.yml` | Mudanças em `backend/**` | Testes do backend |
| `visual-baselines.yml` | Push em branches `visual/**` (manual) | Gera as imagens de referência visuais para Linux e as publica como artefato |
| `docs-check.yml` (portal) | Pull request para `master` ou `develop` que altera `docs-site/**` | `npm ci`, `npm run docs:build` (falha com link interno quebrado) |

Em `master`, o build do portal acontece uma vez só, dentro do deploy ([Documentação e deploy](/pt/engineering/deployment)).

## Lacunas e próximos passos

- Sem testes de componente React nem de acessibilidade automatizada.
- Sem teste de pixels do 3D (o canvas é mascarado nos testes visuais). A anatomia é testada como dado, não como pixels: o mapeamento de estruturas para regiões, as regras de seleção e o manifesto são TypeScript puro e rodam em node. O teste de contrato lê os arquivos GLB publicados, então um atlas reconstruído que quebre um id do qual o app depende reprova o `npm test`.
- As imagens de referência dos testes visuais dos painéis ainda precisam ser geradas e commitadas (Windows com `npm run e2e:update`, Linux pelo workflow `visual-baselines.yml`).
- Os scripts de importação do OSDR têm checagens próprias (falham com unidade misturada ou sexo divergente), mas não têm testes vitest.
- A avaliação não roda no CI; é executada à mão quando regras ou cenários mudam.

## Próximos passos

- [Resultados e evidências](/pt/validation/results).
- [Estratégia de validação](/pt/validation/strategy).
- [Matriz de rastreabilidade](/pt/validation/traceability).
