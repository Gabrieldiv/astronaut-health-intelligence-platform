# Auditoria do repositório AHI

| | |
| --- | --- |
| Data | 14/11/2026 |
| Commit auditado | `ba03eb0` (branch `develop`) |
| Escopo | Código (`frontend/web`), dados (`data/`), documentação (`README.md`, `PROJECT_MASTER.md`, `docs/`, `docs-site/`), CI (`.github/workflows`) e o relatório técnico (`nasa-tech-report/`, somente estrutura) |
| Plano decorrente | [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) |

## 0. Ressalvas desta auditoria

1. **`PROJECT_CONTEXT.md` não existe no repositório.** A comparação de requisitos (seção 4) usou `PROJECT_MASTER.md`, que é a especificação presente. Se `PROJECT_CONTEXT.md` trouxer requisitos diferentes, a seção 4 e o roadmap precisam ser revistos.
2. **O nome "ASTRA Intelligence" não aparece em nenhum arquivo.** O nome oficial em todo o repositório é "Astronaut Health Intelligence (AHI)". Nada foi renomeado.
3. **A sequência OBSERVE, UNDERSTAND, DETECT, PREDICT, RECOMMEND não aparece no código nem na documentação.** As cinco capacidades existem, mas não são apresentadas com esses nomes (seção 3.1).
4. **A interface não foi operada ao vivo nesta auditoria.** A avaliação de interface (seção 7) vem do código, do roteiro do tour e das 12 capturas de tela em `docs-site/public/screenshots/`.
5. O relatório LaTeX (`nasa-tech-report/`) não foi conferido linha a linha contra o código.

## 1. Resumo executivo

O projeto é um protótipo executado inteiramente no navegador, com qualidade de engenharia acima do usual para hackathon. O ponto fraco não é o código: é a distância entre a especificação original e o que foi construído, a dependência quase total de dados simulados e a ausência de um endereço público para a demonstração.

| Verificação executada | Resultado |
| --- | --- |
| `npm run lint` (oxlint) | 0 erros, 47 avisos (20 de exportação mista, 15 de imutabilidade e 6 de refs do React, 3 de dependências de hooks, 3 de estado em efeito) |
| `npx tsc -b` | sem erros |
| `npm test` | 101 testes em 14 arquivos, todos passam (7,5 s) |
| `npx vite build` | sucesso; dois blocos de JavaScript de cerca de 1 MB cada (295 kB e 302 kB comprimidos) |
| `npm audit` | 0 vulnerabilidades |
| `npm run evaluate` | reproduz exatamente os números publicados no model card e no README |
| SHA-256 dos dois arquivos NASA brutos | idênticos aos registrados nos manifestos |

Principais conclusões:

- **O motor analítico está implementado e testado**: baseline pessoal, detecção, risco, previsão, recomendações e alertas.
- **Só há dado real em um ponto**: dois painéis de exames de sangue do Inspiration4 (OSD-569 e OSD-575), exibidos como referência. Eles não alimentam o motor.
- **Backend, banco, API, autenticação e Docker não existem.** A especificação os descreve como MVP; a documentação atual os trata como planejados.
- **O aplicativo não está hospedado.** Só o portal de documentação é publicado; os avaliadores precisam instalar e rodar localmente.
- **A documentação é honesta sobre os limites**, com poucas inconsistências pontuais (seção 5).

## 2. Arquitetura e stack

### 2.1 Arquitetura atual

Aplicação de página única, sem servidor e sem chamadas de rede em tempo de execução.

```
adaptadores de dispositivos simulados (engine/sim/adapters.ts)
  -> HealthObservation canônica (data_origin, qualidade, contexto)
  -> MetricTracker por pessoa e métrica (engine/anomaly.ts): baseline pessoal, z robusto, EWMA
  -> evaluate() (engine/engine.ts): status, regras combinadas, risco, previsões, alertas, recomendações, auditoria
  -> store zustand (state/store.ts): publica só as fatias que mudaram
  -> UI React (features/*) e corpo 3D procedural (features/anatomy)
```

- O relógio da simulação avança em `startTicker()`; as análises são publicadas no máximo a cada 250 ms reais.
- O motor roda na thread principal. A geometria 3D é gerada em Web Workers e guardada em cache.
- A simulação tem semente fixa e é reproduzível.

### 2.2 Stack

| Camada | Tecnologia |
| --- | --- |
| UI | React 19, TypeScript 7, Tailwind CSS v4, lucide-react, recharts |
| 3D | three.js 0.187, react-three-fiber, drei, postprocessing |
| Estado | zustand 5 |
| Build e testes | Vite 8, vitest 5, oxlint, tsx |
| Documentação | VitePress 1.6 (inglês e pt-BR, 51 páginas em cada idioma) |
| CI | GitHub Actions: lint, typecheck, testes e build do app; verificação e publicação do portal no GitHub Pages |
| Dados | Scripts Node (`scripts/osdr`) que baixam do NASA OSDR e gravam manifestos com SHA-256 |

Tamanho: cerca de 23 mil linhas em `frontend/web/src`. O maior arquivo é `engine/engine.ts` (1.297 linhas).

## 3. Funcionalidades existentes

### 3.1 Mapa pelas cinco etapas

Classificação: **Implementado** (no código e em uso), **Simulado** (implementado sobre dados ou efeitos inventados), **Conceitual** (só descrito), **Ausente**.

| Etapa | Capacidade | Estado | Onde |
| --- | --- | --- | --- |
| OBSERVE | Adaptadores de dispositivos (camisa Bio-Monitor, actigrafia, CEVIS, ARED, T2, dosímetros, sensor de cabine, teste de reação, registro de ingestão) | Simulado | `engine/sim/adapters.ts` |
| OBSERVE | Modelo canônico com origem e qualidade do dado | Implementado | `types/domain.ts` |
| OBSERVE | Check-in diário (humor, fadiga, estresse, sintomas) | Implementado (respostas digitadas) e Simulado (respostas automáticas) | `engine/checkins.ts` |
| OBSERVE | Exames reais do Inspiration4 (OSD-569, OSD-575) | Implementado, somente como referência | `scripts/osdr`, `src/data` |
| OBSERVE | Ambiente real da ISS (NASA EDA), dose real (RadLab) | Ausente | planejado |
| OBSERVE | API de ingestão, conexão com dispositivos | Ausente | planejado |
| UNDERSTAND | Baseline pessoal por contexto (mediana, MAD) | Implementado | `engine/baseline.ts` |
| UNDERSTAND | Corpo 3D com status por sistema | Implementado | `features/anatomy` |
| UNDERSTAND | Explicação em linguagem simples ("Why") | Implementado | `engine/risk.ts`, `engine/text.ts` |
| UNDERSTAND | Contexto de atividade | Simulado (vem da agenda, não de sensores) | `engine/sim/schedule.ts` |
| DETECT | z robusto, deriva EWMA, persistência diária, qualidade de dado | Implementado | `engine/anomaly.ts` |
| DETECT | Três regras combinadas (R-CARD-01, R-FAT-01, R-ENV-CO2-02) | Implementado | `engine/risk.ts` |
| DETECT | Pontuação de risco 0 a 100 e confiança | Implementado (não é probabilidade calibrada) | `engine/risk.ts` |
| DETECT | Alertas, deduplicação, escalonamento | Implementado | `engine/alerts.ts` |
| DETECT | Detecção multivariada (Isolation Forest), CUSUM, IQR | Ausente | |
| PREDICT | Previsão Holt amortecida com intervalo de 80% | Implementado (intervalo não calibrado) | `engine/forecast.ts` |
| PREDICT | Tempo até sair da faixa normal | Implementado | `engine/forecast.ts` |
| PREDICT | Comparação "e se" com e sem ação | Simulado (efeitos inventados, rotulados) | `engine/intervention.ts` |
| PREDICT | ARIMA, XGBoost, SHAP | Ausente | |
| RECOMMEND | Catálogo versionado de recomendações, a bordo ou Terra | Implementado | `engine/recommendations.ts` |
| RECOMMEND | Atraso de comunicação (ISS, Lua, Marte) | Implementado | `engine/comms.ts` |
| RECOMMEND | Respostas do médico de voo | Simulado (modelos de texto) | `engine/comms.ts` |
| RECOMMEND | Fila de revisão do médico de voo | Ausente | planejado |
| RECOMMEND | Explicação por modelo de linguagem | Ausente | planejado |

### 3.2 Demais funcionalidades

Implementadas: visão Ground e visão Crew, linha do tempo de status, visão geral da missão, relatório de passagem de turno com exportação FHIR R4, diálogo "Data and model", tour guiado de 10 passos, modo apresentação e atalhos de teclado.

Os dias antigos da missão são sintetizados (`engine/missionDays.ts`): só os 5 dias recentes vêm do histórico da simulação.

## 4. Estado atual frente à especificação (`PROJECT_MASTER.md`)

### 4.1 Lista de entrega do MVP (seção 20 da especificação)

| Item | Estado |
| --- | --- |
| Repositório e Docker Compose funcionais | Parcial: repositório sim, Docker não existe |
| Frontend e backend executáveis | Parcial: só frontend |
| PostgreSQL e migrations | Ausente |
| Cadastro de astronauta e missão fictícios | Parcial: tripulação fixa em `engine/catalog.ts`, sem cadastro |
| Inventário de datasets NASA | Feito (`docs/data-source-inventory.md`) |
| Um dataset público importado e documentado | Feito (dois) |
| Modelo canônico e proveniência | Feito |
| Simuladores (camisa, sono e atividade, ambiente) | Feito |
| Dashboard, histórico e baseline | Feito |
| Detecção de anomalias, risco explicável | Feito |
| Previsão com incerteza | Feito |
| Recomendações por regras | Feito |
| Cenário de demo | Feito (seis; a especificação pedia quatro) |
| Selo REAL, DERIVED, SIMULATED | Feito |
| Testes automatizados | Parcial: motor e FHIR; sem testes de UI nem ponta a ponta |
| Roteiro de apresentação | Feito, porém desatualizado (seção 5.2) |
| Fontes e limitações documentadas | Feito |

A caixa de seleção de todos esses itens continua desmarcada em `PROJECT_MASTER.md`.

### 4.2 Divergência arquitetural

A especificação (seção 7) define um monólito modular em Python com FastAPI, PostgreSQL, Redis e Docker Compose, e uma API interna (seção 10). O que existe é um motor em TypeScript dentro do navegador.

A decisão tomada está documentada (`docs-site/architecture/target-architecture.md`) e é defensável para a demonstração: instalação trivial, funcionamento offline e reprodutibilidade. O custo é que nada persiste (a trilha de auditoria se perde ao recarregar) e não há controle de acesso.

### 4.3 Além da especificação

Corpo 3D procedural, atraso de comunicação com a Terra, check-in diário, comparação "e se", visão de missão, exportação FHIR e portal de documentação bilíngue não estavam no MVP original.

## 5. Inconsistências

### 5.1 Científicas

| # | Achado | Gravidade |
| --- | --- | --- |
| C1 | **Nenhum parâmetro do simulador ou limite do motor tem fonte citada.** Tudo está rotulado como configuração de demonstração, o que é honesto, mas enfraquece o argumento científico. | Alta |
| C2 | **A avaliação usa o mesmo simulador que gera os dados.** "0 alertas falsos em 60 dias-tripulante" mede coerência interna, não sensibilidade real. O model card diz isso; a tabela de cenários do README não. | Média |
| C3 | **Pressão diastólica atribuída à camisa Bio-Monitor** (`adapters.ts`, linha 165). Convém confirmar na documentação pública do equipamento se ele fornece diastólica; se não, a métrica deve ir para outro dispositivo ou sair. Não verificado nesta auditoria. | Média |
| C4 | **"Hydration index" é um índice inventado** (0 a 100, derivado de um registro de ingestão simulado), mas aparece ao lado de sinais vitais e colore os rins. | Média |
| C5 | **Os dados reais não participam da análise.** Os exames do Inspiration4 (4 pessoas, voo de 3 dias, sem coleta em voo) são só exibidos. | Média |
| C6 | **Dose em mGy (dose absorvida)** com "orçamento" de 100 mGy. Limites de carreira costumam ser expressos em dose efetiva (mSv). Está rotulado como demo, mas a unidade pode confundir um avaliador. | Baixa |
| C7 | A taxa de dose simulada (13 a 18 µGy/h, com picos) e o CO2 nominal (2.600 ppm) são ordens de grandeza plausíveis, sem referência. | Baixa |

Pontos positivos verificados: dado ausente vira `NO_DATA`; autorrelato é limitado a MODERATE; padrões lentos são limitados a HIGH; correlação é descrita como coocorrência; o eGFR com equação baseada em raça foi excluído da interface.

### 5.2 Técnicas e de documentação

| # | Achado |
| --- | --- |
| T1 | README dizia "calibrated to plausible ranges", enquanto `limitations.md` diz que o simulador não é calibrado. **Corrigido nesta auditoria.** |
| T2 | README pedia "Node.js 20 or newer"; o Vite 8 exige `^20.19.0` ou `>=22.12.0`. **Corrigido.** |
| T3 | README não listava `npm run lint`, que o CI executa. **Corrigido.** |
| T4 | `docs/demo-script.md` lista "real NASA OSDR datasets" como próximo passo, embora já estejam importados, e não cobre atraso de comunicação, check-in nem "e se". |
| T5 | `PROJECT_MASTER.md` descreve backend, API e estrutura de pastas que não existem, sem aviso no topo de que a implementação divergiu. |
| T6 | `nasa-tech-report/tmp/` (22 arquivos de build do LaTeX) está versionado; o `.gitignore` não cobre a pasta. |
| T7 | `vite.config.ts` usa `as never` para aceitar a chave `test`, em vez de importar `defineConfig` de `vitest/config`. |
| T8 | Os dados processados existem em dois lugares (`data/processed/` e `frontend/web/src/data/`), em formatos diferentes por desenho. Nenhum teste garante que os dois vêm da mesma importação. |

## 6. Integrações com dados NASA

| Fonte | Estado real | Evidência |
| --- | --- | --- |
| OSDR, OSD-569 (hemograma, Inspiration4) | **Funcional.** Baixado da API pública, com manifesto e hash conferido. | `data/manifests/OSD-569.json`; SHA-256 recalculado nesta auditoria |
| OSDR, OSD-575 (painel metabólico, Inspiration4) | **Funcional.** Idem. | `data/manifests/OSD-575.json` |
| OSDR, descoberta de estudos | **Funcional** como script offline. | `scripts/osdr/discover.mjs`, `data/manifests/osdr-discovery.json` |
| NASA EDA (CO2, temperatura, umidade, dose da ISS) | **Ausente.** Só planejado. | nenhum código |
| NASA RadLab | **Ausente.** A documentação registra erro HTTP 500 em 14/11/2026. | nenhum código |
| NASA Standard Measures, NLSP | **Conceitual.** Citados como referência. | `docs/data-guide.md` |
| Telemetria fisiológica de astronautas | **Não existe publicamente.** Corretamente não reivindicada. | |

Observações:

- A importação é um passo manual de desenvolvimento (`node scripts/osdr/import.mjs`). O aplicativo em execução não acessa a NASA.
- A licença dos dois estudos não é declarada na fonte; o manifesto registra `license: null`.
- Os scripts de importação não foram reexecutados contra a rede nesta auditoria.

## 7. Interface e experiência de demonstração

Pontos fortes:

- A tela principal responde em segundos a "quem precisa de atenção, por quê e o que fazer".
- O selo SIMULATED e o aviso "Decision support only" ficam sempre visíveis.
- O tour guiado prepara cada cena sozinho e avança a simulação quando o cenário é lento (fadiga em 48 h simuladas).
- Linguagem simples primeiro, termo técnico depois.

Problemas:

| # | Achado | Impacto na demo |
| --- | --- | --- |
| U1 | **Aplicativo sem endereço público.** | Alto: avaliadores precisam de Node e de instalar dependências |
| U2 | **A história do tour segue funcionalidades, não as cinco etapas.** O diferencial não fica nomeado na tela. | Alto |
| U3 | Em 1440x900, os nomes da tripulação na linha do tempo se sobrepõem e o painel de previsão fica cortado (`ground-view.png`). | Médio |
| U4 | Dois blocos de cerca de 1 MB, mais a geração da geometria e de 5 dias de histórico na primeira carga. O README fala em "alguns segundos"; não há medição. | Médio |
| U5 | Depende de WebGL e de GPU razoável; não há alternativa 2D se o 3D falhar. | Médio |
| U6 | Apenas desktop; sem auditoria de acessibilidade. | Baixo |
| U7 | Os dados reais ficam dentro de um diálogo em "Tools", fora do fluxo principal. | Médio |

## 8. Segurança, qualidade e organização

### 8.1 Segurança

- Nenhum segredo, chave ou variável de ambiente sensível no código.
- A única requisição de rede em execução é o carregamento de fontes do Google Fonts em `index.html` (com fontes de reserva no CSS). Não há `fetch`, `XMLHttpRequest` nem WebSocket no código. Correção feita depois da primeira versão desta auditoria, que afirmava "nenhuma chamada de rede". Também não há `eval`, `innerHTML` ou `dangerouslySetInnerHTML`.
- `localStorage` guarda só preferências de interface.
- Workflows do GitHub com permissões mínimas.
- Dados da tripulação são fictícios e pseudonimizados. Os dados reais são públicos e identificados por códigos (C001 a C004).
- Sem autenticação nem papéis: aceitável para um protótipo estático, bloqueante para qualquer uso real.
- O atributo de depuração `window.__ahiScene` só existe em modo de desenvolvimento.

### 8.2 Qualidade

- Tipagem estrita; sem `any`, `@ts-ignore` ou marcadores TODO no código.
- 101 testes cobrem o motor, os cenários, a store e o FHIR. **Nenhum teste de componente ou ponta a ponta.**
- 47 avisos de lint: 20 de exportação mista (atualização rápida em desenvolvimento), 15 de imutabilidade e 6 de leitura de refs durante a renderização (React), 3 de dependências de hooks e 3 de estado definido dentro de efeito. Os do React (24 no total) merecem revisão, pois podem causar renderização inconsistente. A primeira versão desta auditoria dizia 15 avisos, contagem feita só sobre o fim da saída do lint e portanto errada.
- `engine/engine.ts` concentra 1.297 linhas e várias responsabilidades.

### 8.3 Organização

- Estrutura clara por funcionalidade; contrato único em `types/domain.ts`.
- Artefatos de build do LaTeX versionados (T6).
- `anatomy-lab.html` e `features-lab.html` são páginas de laboratório na raiz do app, sem menção no README.
- O repositório remoto pertence a outro membro da equipe; a publicação do Pages depende de configuração nesse repositório.

## 9. Recomendações

Em ordem de prioridade; o detalhamento está no roadmap.

1. Publicar o aplicativo (GitHub Pages, junto do portal).
2. Tornar as cinco etapas visíveis no tour e na tela.
3. Trazer um dado real para dentro do fluxo analítico (reprodução da cabine da ISS via NASA EDA), se o acesso se confirmar.
4. Dar fonte citável aos limites ou manter o rótulo de demo, caso a caso; resolver C3 e C4.
5. Atualizar o roteiro de demonstração e avisar a divergência no topo de `PROJECT_MASTER.md`.
6. Corrigir os problemas de layout em 1440x900 e adicionar um teste de fumaça ponta a ponta.
7. Higiene: `.gitignore` do LaTeX, `vitest/config`, avisos de lint do React.

**Não recomendado antes da entrega:** construir o backend FastAPI com PostgreSQL. Ele não muda o que o avaliador vê, consome o tempo restante e põe em risco o que já funciona. Deve permanecer como arquitetura alvo documentada.
