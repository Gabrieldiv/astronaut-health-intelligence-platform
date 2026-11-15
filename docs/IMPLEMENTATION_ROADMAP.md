# Roadmap de implementação do AHI

| | |
| --- | --- |
| Data | 14/11/2026 |
| Base | [AUDIT.md](AUDIT.md) (os códigos C, T e U abaixo referem-se aos achados da auditoria) |
| Estado | **Proposta. Aguarda aprovação antes de qualquer mudança estrutural.** |

## Princípios

1. Preservar o que funciona: o motor, os testes e o contrato `types/domain.ts` (mudanças apenas aditivas).
2. Priorizar o que o avaliador vê em 4 minutos: OBSERVE, UNDERSTAND, DETECT, PREDICT, RECOMMEND.
3. Não inventar dados, limites ou integrações. Todo dado novo entra com origem e proveniência.
4. Etapas pequenas, cada uma entregável sozinha, com `lint`, `tsc`, `test` e `build` verdes.

## Visão geral

| Etapa | Objetivo | Prioridade | Tamanho | Mudança arquitetural |
| --- | --- | --- | --- | --- |
| 0 | Higiene e documentação coerente | P0 | Pequeno | Não |
| 1 | Aplicativo publicado | P0 | Pequeno | Não |
| 2 | As cinco etapas visíveis na demo | P0 | Médio | Não |
| 3 | Acabamento da tela de demonstração | P0 | Pequeno | Não |
| 4 | Dado real da cabine da ISS no fluxo | P1 | Médio a grande | Pequena (novo adaptador) |
| 5 | Fundamentação científica | P1 | Médio | Não |
| 6 | Rede de segurança da demo | P1 | Pequeno | Não |
| 7 | Backend e persistência | P2 (pós-entrega) | Grande | **Sim, requer aprovação** |

Tamanho: pequeno é até meio dia, médio até dois dias, grande mais que isso.

---

## Etapa 0. Higiene e documentação coerente

**História:** como membro da equipe, quero que a documentação descreva o que existe, para não prometer ao avaliador algo que o código não faz.

Tarefas:

- 0.1 Adicionar ao topo de `PROJECT_MASTER.md` uma nota de estado: a implementação atual é só no navegador; backend, API e Docker são arquitetura alvo (T5). Marcar a lista da seção 20 conforme a auditoria.
- 0.2 Atualizar `docs/demo-script.md`: remover "real NASA OSDR datasets" dos próximos passos e alinhar com o tour atual (T4).
- 0.3 Tirar `nasa-tech-report/tmp/` do controle de versão e incluí-la no `.gitignore` (T6).
- 0.4 Trocar o `as never` de `vite.config.ts` por `defineConfig` de `vitest/config` (T7).
- 0.5 Resolver os 24 avisos de lint de regras do React (imutabilidade, refs durante a renderização e estado em efeito), concentrados em `AnatomyScene.tsx`, `TopBar.tsx`, `timeline/index.tsx` e `usePriorityCollapse.ts`, ou justificar cada um com comentário.

Critérios de aceite:

- Nenhum documento afirma como existente algo classificado como Ausente na auditoria.
- `git ls-files nasa-tech-report/tmp` retorna vazio.
- `npm run lint` sem avisos das regras `react(immutability)` e `react(refs)`, ou com justificativa registrada.
- CI verde.

## Etapa 1. Aplicativo publicado

**História:** como avaliador, quero abrir a demonstração por um link, sem instalar nada.

Tarefas:

- 1.1 Configurar `base` no Vite para servir o app em um subcaminho (por exemplo `/app/`).
- 1.2 Estender `docs-deploy.yml` para também construir `frontend/web` e publicar o resultado dentro do mesmo artefato do Pages. Acionar o workflow também quando `frontend/web/**` mudar.
- 1.3 Colocar o link "Open the live demo" no README e na página inicial do portal.
- 1.4 Medir o tempo de primeira carga em uma máquina comum e registrar o número (U4).

Critérios de aceite:

- O link público abre o app, o tour roda do passo 1 ao 10 e o selo SIMULATED aparece.
- O portal de documentação continua funcionando no endereço atual.
- O tempo de primeira carga medido está documentado.

Dependência: acesso às configurações do repositório remoto (o Pages já usa GitHub Actions).

## Etapa 2. As cinco etapas visíveis na demo

**História:** como avaliador, quero ver em que etapa do raciocínio o sistema está (observar, entender, detectar, prever, recomendar), para perceber o diferencial sem explicação oral.

Tarefas:

- 2.1 Definir em um único lugar o mapa etapa para painel: OBSERVE (sinais ao vivo, cabine, dispositivos), UNDERSTAND (corpo 3D, faixa pessoal), DETECT (status, "Why", alertas), PREDICT (previsão, "e se"), RECOMMEND (ações, a bordo ou Terra).
- 2.2 Adicionar ao tour um indicador de etapa (cinco marcadores, o atual destacado) e reordenar os passos para um único fio condutor: um cenário percorrido de OBSERVE a RECOMMEND, depois os demais como variações.
- 2.3 Reescrever as legendas dos passos em linguagem simples, citando a etapa.
- 2.4 Atualizar `docs/demo-script.md`, a página de cenários do portal e o diagrama "How it works" do README com os mesmos cinco nomes.

Critérios de aceite:

- Cada passo do tour pertence a exatamente uma etapa e a exibe.
- O cenário principal passa pelas cinco etapas em ordem, em até 2 minutos no modo automático.
- Nenhuma lógica do motor é alterada; os 101 testes continuam passando.
- Textos da interface em inglês, sem travessões.

Risco: baixo. É mudança de apresentação, sem tocar no motor.

## Etapa 3. Acabamento da tela de demonstração

**História:** como apresentador, quero que a tela principal caiba em 1440x900 sem sobreposições, para projetar sem ajustes.

Tarefas:

- 3.1 Corrigir a sobreposição dos nomes na linha do tempo e o corte do painel de previsão (U3).
- 3.2 Dar um atalho visível aos dados reais da NASA na tela principal, hoje dentro de "Tools" (U7).
- 3.3 Exibir uma mensagem clara quando o WebGL não estiver disponível, mantendo os painéis de dados utilizáveis (U5).
- 3.4 Refazer as capturas de tela afetadas.

Critérios de aceite:

- Em 1440x900 e 1920x1080, nenhum texto se sobrepõe ou é cortado na visão Ground.
- Os dados reais são alcançados em um clique a partir da tela principal.
- Com WebGL desativado, o app mostra o aviso e o restante da tela funciona.

## Etapa 4. Dado real da cabine da ISS no fluxo

**História:** como avaliador, quero ver o motor analisando um dado real da NASA, e não só exibindo, para confiar que o sistema funciona fora do simulador.

Esta etapa começa por uma verificação. **Se a tarefa 4.1 falhar, a etapa é cancelada e registrada como limitação; nenhum dado é fabricado.**

Tarefas:

- 4.1 Verificação (meio dia, com limite fixo): confirmar que o NASA EDA oferece CO2, temperatura e umidade da ISS para download público, em que formato, unidade e período. Registrar o resultado em `docs/data-source-inventory.md`.
- 4.2 Script de importação no padrão de `scripts/osdr`: arquivo bruto, manifesto com SHA-256 e arquivo processado no modelo canônico (`subject_id: "CABIN"`, `data_origin: 'REAL_PUBLIC'`).
- 4.3 Novo adaptador de reprodução que implementa o mesmo contrato dos adaptadores simulados e substitui o sensor de cabine quando o modo "ISS replay" está ativo.
- 4.4 Novo cenário "ISS cabin replay (historical)", com selo REAL_PUBLIC na cabine e aviso de que os dados descrevem a ISS em outro período, não esta tripulação.
- 4.5 Testes: leitura do arquivo, unidades, lacunas viram `NO_DATA`, e o cenário nominal simulado não muda.

Critérios de aceite:

- O painel da cabine mostra valores reais com selo REAL_PUBLIC e data de origem.
- O hash do arquivo bruto confere com o manifesto.
- Os números do model card para os seis cenários existentes não mudam.
- A interface nunca apresenta a reprodução como telemetria ao vivo.

Justificativa da mudança: acrescenta um adaptador e um cenário, sem alterar o contrato nem o motor. É o maior ganho de credibilidade identificado (C5).

## Etapa 5. Fundamentação científica

**História:** como avaliador com formação científica, quero saber de onde vem cada número, para distinguir o que é referência do que é escolha de demonstração.

Tarefas:

- 5.1 Tabela métrica por dispositivo por fonte pública: para cada uma das 21 métricas, o equipamento real que a mede e o documento que comprova. Resolver C3 (diastólica na camisa) e C4 (índice de hidratação): mover, renomear ou marcar como experimental.
- 5.2 Para cada limite fixo de `engine/config.ts`: citar documento, seção e versão, ou manter o rótulo "demo configuration". Sem fonte, o rótulo fica.
- 5.3 Registrar faixas publicadas (com DOI) usadas para conferir o simulador, e os pontos em que ele diverge.
- 5.4 Esclarecer mGy e mSv na visão de missão (C6).
- 5.5 Acrescentar à tabela de cenários do README a frase de que os tempos medem coerência interna do simulador (C2).

Critérios de aceite:

- Toda métrica tem dispositivo e fonte, ou está marcada como experimental na interface e no dicionário de dados.
- Nenhum limite é chamado de oficial sem documento e seção citados.
- `npm run evaluate` regenera o model card sem edição manual.

Dependência: revisão por quem responde pela parte científica da equipe.

## Etapa 6. Rede de segurança da demo

**História:** como equipe, queremos saber antes da apresentação se uma mudança quebrou a demonstração.

Tarefas:

- 6.1 Um teste ponta a ponta (Playwright) que abre o app, percorre o tour e verifica: selo SIMULATED, banner CRITICAL no cenário agudo, órgãos cinza na falha de sensor.
- 6.2 Rodar esse teste no CI.
- 6.3 Teste que garante que `src/data/OSD-*.json` e `data/processed/` vêm da mesma importação (T8).
- 6.4 Dividir os blocos de 1 MB só se a medição da tarefa 1.4 mostrar problema.

Critérios de aceite:

- O teste ponta a ponta passa localmente e no CI em menos de 3 minutos.
- Uma alteração que remova o selo SIMULATED faz o CI falhar.

## Etapa 7. Backend e persistência (pós-entrega)

**Requer aprovação explícita. Não iniciar antes das etapas 0 a 3.**

**História:** como médico de voo, quero que alertas, decisões e a trilha de auditoria persistam e tenham controle de acesso.

Escopo proposto, na ordem:

- 7.1 Persistência local da trilha de auditoria e das intervenções (IndexedDB), sem servidor. Mudança pequena e reversível.
- 7.2 API de ingestão (`POST /api/v1/observations`) em FastAPI, atrás do contrato de adaptador existente, conforme a seção 7 de `PROJECT_MASTER.md`.
- 7.3 PostgreSQL, autenticação e papéis, fila de revisão do médico de voo.

Justificativa para adiar: não altera o que o avaliador vê, é o item mais caro do plano e traz risco de regressão para uma demonstração que hoje funciona offline e de forma reproduzível.

Critérios de aceite (7.1): recarregar a página preserva a trilha de auditoria; um botão "Reset demo" a apaga.

---

## Ordem sugerida e decisões pendentes

Ordem: 0, 1, 2, 3, depois 4 e 5 em paralelo, depois 6. A etapa 7 fica para depois da entrega.

Decisões que dependem da equipe:

1. **`PROJECT_CONTEXT.md`:** o arquivo não está no repositório. Se existir, deve ser adicionado para que este plano seja conferido contra ele.
2. **Nome do produto:** manter "AHI" ou adotar "ASTRA Intelligence". A troca afeta interface, documentação, relatório técnico e capturas de tela.
3. **Etapa 4:** prosseguir só se a verificação 4.1 confirmar o acesso ao dado.
4. **Etapa 7:** aprovar ou não o início do backend.
