---
title: Roadmap
description: O que a Astronaut Health Intelligence Platform entregou no NASA Space Apps 2026 e o que vem a seguir, da migração do motor para Python e de um fluxo de revisão clínica a autenticação e controle de acesso, dados reais de cabine da NASA e os próximos passos da anatomia 3D.
status: PLANNED
verified: 2026-11-15
---

# Roadmap

A Astronaut Health Intelligence Platform (AHI) é um protótipo com dados de dispositivos simulados, dados públicos reais da NASA como contexto de missão e um backend opcional. Esta página separa o que está **pronto** do que vem **a seguir**, em ordem aproximada de prioridade. **São planos, não promessas de data.** Status atual de cada capacidade: [Matriz de status das funcionalidades](/pt/overview/feature-status).

## Pronto {#done}

<StatusBadge status="IMPLEMENTED" />

| Área | O que existe |
| --- | --- |
| Simulação | Dispositivos da tripulação e cabine, cenários roteirizados (incluindo "Eye changes (SANS like)"), pausa e retomada de dispositivos |
| Motor de saúde | Baselines pessoais, z robusto, deriva EWMA, CUSUM, persistência, risco, previsões com horizontes de 24 h a 15 dias, recomendações, alertas; com testes unitários e avaliado em dados simulados |
| Aprendizado de máquina experimental | Isolation Forest por astronauta que sinaliza uma "Unusual combination" (combinação incomum) sem mudar status ou risco ([Detecção de anomalias](/pt/intelligence/anomaly-detection#unusual-combination-experimental)) |
| Contexto de missão | Quatro perfis de missão citados (lançamento, ISS, Lua, trânsito para Marte), dose da missão frente ao limite de carreira da NASA, aviso de clima espacial a partir de eventos reais do NASA DONKI ([Perfis de missão](/pt/intelligence/mission-profiles)) |
| Olhos e ouvidos | Exames oculares periódicos de SANS e monitoramento de audição e ruído frente à baseline pré-voo ([Saúde ocular e audição](/pt/intelligence/eye-and-hearing)) |
| Interface | Ground view e Crew view (com cartões dos sistemas do corpo), demo guiada, Measured by, link com a Terra, check-in, visão da missão, relatório de passagem de turno com exportação FHIR R4, what-if |
| Anatomia 3D | Atlas Z-Anatomy com 250 estruturas, zoom em direção ao ponteiro, modos Monitor e Explore, downloads com nova tentativa, navegador do corpo pelo teclado, varredura do corpo, fallback procedural |
| Acessibilidade e idiomas | Sons de alerta com escalonamento, audiodescrição, links de salto, regiões ao vivo; idiomas opcionais da interface (pt-BR, es, ja, de) com inglês como padrão ([Acessibilidade](/pt/product/accessibility)) |
| Acabamento da entrega final | Cenários da missão com fatos citados dos perfis, painéis com a imagem primeiro (medidores, barras de mudança, relógio de atraso, frases atrás de "Details"), estados "Paused by operator", "Waiting for data" e "Signal lost" com "Resume" no lugar, ponto vermelho na aba do navegador com alerta crítico aberto, regra da rotação em repouso, uma única escala de z-index, parada da fala numa troca de idioma, chave online e offline, mensagens estruturadas do motor para tradução, pseudo idioma e script de varredura i18n |
| Backend | Monólito modular em FastAPI: cadastro, ingestão idempotente, observações, conectores NASA DONKI e OSDR, assistente, análise experimental; SQLite ou PostgreSQL; modo demo offline no app ([Backend e API](/pt/architecture/backend)) |
| Assistente | Demo do Ask AHI com a Claude API, arquitetura offline a bordo documentada ([Ask AHI](/pt/product/assistant)) |
| Dados reais da NASA | Painéis OSDR OSD-569 e OSD-575 como referência, eventos DONKI como contexto de missão |
| Testes | Testes unitários e de cenário com vitest, pytest no backend, testes ponta a ponta do roteiro da demo e testes visuais dos painéis com Playwright, todos no CI ([Estratégia de testes](/pt/engineering/testing)) |
| Documentação | Este portal no GitHub Pages (EN e PT-BR) |

## A seguir {#next}

<StatusBadge status="PLANNED" />

### 1. Migrar o motor de saúde para Python {#port-the-health-engine-to-python}

O motor roda em TypeScript no navegador para que o app funcione offline. O backend já tem a interface (`app/modules/engine`, um protocolo `HealthEngine`). Próximo passo: portar módulo por módulo (baseline primeiro), reaproveitar os fixtures do vitest como casos do pytest para que os dois motores respondam às mesmas entradas, rodar depois da ingestão e expor endpoints de baseline, anomalia, risco, previsão e recomendação. O motor TypeScript continua como fallback offline.

### 2. Fluxo de revisão clínica {#clinical-review-flow}

Uma fila de revisão para itens de Aviso e Crítico: atribuir, comentar, aprovar ou rejeitar uma recomendação, com cada passo na trilha de auditoria e armazenamento persistente. Hoje as respostas simuladas do médico de voo são templates, e o sinal multivariado e os alertas de olhos e audição terminam em "revisar com o médico de voo" sem um fluxo por trás.

### 3. Autenticação e controle de acesso por papel {#access-profiles}

**Não implementado nesta versão.** A demo não tem login nem papéis: quem abre a página vê todos os astronautas, e a API aceita qualquer requisição sem autenticação. Isso é aceitável para um protótipo simulado e não é aceitável para dados reais de tripulação. Uma implantação real precisa de login (SSO) e de controle de acesso por papel (RBAC) **aplicado no servidor, no backend FastAPI**, nunca apenas na interface.

Esboço de desenho (uma proposta, nada disso existe no código ainda):

| Peça | Proposta |
| --- | --- |
| Login | Single sign on com OpenID Connect (OIDC) no provedor de identidade da organização. Tokens de curta duração; a AHI não guarda senhas |
| Papéis | **Tripulante**: só os próprios dados (a Crew view). **Médico de voo**: a tripulação das missões atribuídas, com direito de revisar e reconhecer. **Mission Control**: status operacional, alertas e comunicações das missões que apoia. **Administrador**: usuários, papéis e configuração, sem acesso a dados de saúde por padrão |
| Aplicação das regras | Uma dependência do FastAPI confere o token e o papel em cada rota e filtra as linhas por astronauta e missão. A interface esconde o que um papel não pode usar, mas quem controla é o servidor |
| Auditoria | Toda leitura e escrita de dado de saúde registra quem, o quê e quando, em um armazenamento persistente e à prova de adulteração (o mesmo de que o fluxo de revisão clínica precisa) |

Quais campos o Mission Control vê, e sob quais regras, é uma decisão de política das partes interessadas, não técnica. Este item depende do armazenamento persistente do item 2.

### 4. Replay real da cabine da ISS e séries de radiação (NASA EDA) {#real-iss-cabin-replay-and-radiation-series-nasa-eda}

Substituir o simulador de cabine por um replay `REAL_PUBLIC` de um período real da ISS (CO₂, temperatura, umidade das Data Tables do EDA) e importar as séries de dose do EDA (GCR, SAA, dose acumulada), rotuladas como dados históricos da ISS, não desta tripulação.

### 5. Fundamentação científica e revisão nativa de idiomas {#scientific-grounding-and-native-language-review}

- Fundamentar em uma fonte citável cada limiar de demo que restar, ou manter o rótulo de demo.
- Calibrar os simuladores com faixas publicadas e documentá-las no model card.
- Ter falantes nativos revisando qualquer idioma da interface além do inglês antes de apresentá-lo.
- Manter cada frase do motor em uma mensagem estruturada para que seja traduzida (notas de exame, de previsão, dos aparelhos e textos dos perfis de missão já são; a passagem de turno em texto puro e os pacotes à Terra ficam em inglês de propósito) ([Texto do motor](/pt/product/accessibility#engine-text)).

### 6. Anatomia 3D: próximos passos {#anatomy-next-steps}

| Item | Por quê |
| --- | --- |
| **Texturas** | A fonte só tem cores chapadas, então todo o detalhe vem da geometria e dos materiais. Texturas dão detalhe de superfície, ao custo de mais download |
| **Modelo feminino de referência** | Hoje um único modelo de referência (fonte adulta masculina, virilha neutra) representa todos os tripulantes. Um segundo modelo precisa de licença compatível e dos mesmos ids de estrutura |
| **Rim do BodyParts3D** | Os rins são formas procedurais simples porque o modelo de rim dentro do Z-Anatomy tem licença não comercial. O BodyParts3D, a base em que o Z-Anatomy se apoia, é uma fonte candidata de geometria real de rim; os termos da licença precisam ser conferidos antes |
| **Testes visuais automatizados do canvas 3D** | Os testes visuais do Playwright cobrem os painéis, mas o canvas é mascarado porque seus quadros dependem da GPU. A renderização do corpo em si ainda é conferida à mão na página de laboratório |

Fora dos planos: anatomia por astronauta (exames ou tamanho do corpo). O corpo é anatomia de referência por decisão de projeto.

### 7. Mais importações do OSDR {#more-osdr-imports}

OSD-656 (painel de inflamação na urina), os painéis multiplex do OSD-575, cortisol ou marcadores imunes com unidade clínica, e dados de sono ou cognição de análogos, cada um rotulado pelo que é.

### 8. Assistente a bordo {#onboard-assistant}

Trocar o modelo na nuvem da demo pelo alvo a bordo: um modelo pequeno de pesos abertos no computador da espaçonave, fala para texto local, salvaguardas e um fallback por template ([Ask AHI](/pt/product/assistant#the-onboard-target)).

### 9. Deploy {#deployment}

Hospedar o app web estático (`VITE_API_URL=off`) para que os jurados possam abri-lo sem instalar nada; depois, a stack do Docker Compose.

## Também considerado {#also-considered}

- Reconhecimento de atividade por sensor em vez de contexto pelo cronograma.
- Comparar o Isolation Forest do navegador com o caminho em scikit-learn em dados reais quando eles existirem.

## Próximos passos {#next-steps}

- [Limitações e problemas conhecidos](/pt/validation/limitations): o que o roadmap resolve.
- [Pipeline, normalização e qualidade](/pt/data/pipeline-and-quality): prioridades do time de dados.
- [Fontes de dados da NASA](/pt/data/sources): a situação de cada fonte da NASA.
