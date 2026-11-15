---
title: Cenários e demo guiada
description: Os sete cenários roteirizados da Astronaut Health Intelligence Platform, o que observar em cada um, a demo guiada de 10 passos e um roteiro de pitch de 4 a 5 minutos.
status: IMPLEMENTED
origin: SIMULATED
code:
  - frontend/web/src/engine/sim/scenarios.ts
  - frontend/web/src/engine/catalog.ts
  - frontend/web/src/features/tour/steps.ts
  - frontend/web/src/features/tour/Tour.tsx
  - frontend/web/src/features/topbar/ScenarioControl.tsx
tests:
  - frontend/web/src/engine/engine.test.ts
verified: 2026-11-15
---

# Cenários e demo guiada

A Astronaut Health Intelligence Platform (AHI) traz sete cenários roteirizados para mostrar o motor em ação. Escolha o cenário no player da barra superior ("Scenario"). Cada um pede uma velocidade diferente, porque alguns padrões levam minutos e outros levam dias.

::: info
Todos os cenários usam dados **simulados**. Como cada um é modelado está em [Simulação de dispositivos e cenários](/pt/intelligence/scenario-simulation). Os tempos de detecção medidos (primeiro alerta, HIGH, CRITICAL, pico) estão em [Resultados e evidências](/pt/validation/results#deteccao-por-cenario): medem as regras do protótipo em dados simulados, não desempenho clínico.
:::

## Qual cenário usar

| Cenário (interface) | Quem | Velocidade sugerida | Ritmo | O que demonstra |
| --- | --- | --- | --- | --- |
| "Nominal day" | Todos | qualquer | | Tela calma, sem alarme falso |
| "Acute cardio event" | ORION (AST-01) | "1 min/s" | minutos | Alerta rápido, CRITICAL, escalonamento |
| "Sensor failure" | VEGA (AST-03) | "1 min/s" | minutos | Dado ausente nunca é normal |
| "Cabin CO₂ rise" | Cabine (todos) | "10 min/s" | horas | Ambiente e coocorrência |
| "Progressive fatigue" | LYRA (AST-02) | "1 h/s" | dias | Deriva lenta contra o normal pessoal |
| "Exercise performance decline" | ATLAS (AST-04) | "1 h/s" | dias | Persistência em métricas diárias |
| "Eye changes (SANS like)" | ORION (AST-01) | qualquer | meses de missão | Exames oculares simulados se afastam da linha de base pré-voo: retina mais espessa, bainha do nervo óptico mais larga, depois dobras novas. O exame do dia de voo 30 já mostra Watch quando o cenário começa (dia 44 da missão); o do dia de voo 90 mostra Warning |

Padrões lentos ficam limitados a HIGH **por projeto**: pedem revisão, não resposta de emergência. Só o evento cardíaco agudo chega a CRITICAL.

## O que observar

### Nominal day

A tela calma é o ponto. Sem alarme falso, o painel diz "No actions needed right now." Na avaliação, o cenário nominal teve zero alertas da tripulação em 60 dias-tripulante simulados.

### Acute cardio event

![Alerta crítico durante o evento cardíaco agudo](/screenshots/critical-alert.png)

- a faixa vermelha CRITICAL sobre o cabeçalho do corpo;
- o coração e os pulmões acendendo em vermelho no 3D, visíveis através do tórax sem nenhum clique;
- as ações recomendadas, com revisão do médico de voo sinalizada;
- "Mark done" no protocolo de repouso: a intervenção vai para a auditoria e a simulação mostra uma recuperação hipotética;
- o escalonamento se ninguém reconhecer o alerta.

### Sensor failure

Os órgãos ficam cinza, o coração para de animar, o cartão diz "Signal lost" e a recomendação é checar o ajuste do sensor. O pico é MODERATE: status desconhecido, nunca "normal".

### Cabin CO₂ rise

A tripulação inteira se desloca um pouco ao mesmo tempo. A regra R-ENV-CO2-02 mostra a **coocorrência** entre CO₂ e sinais da tripulação e lembra que correlação não é causalidade. A ação sugerida é ventilar o módulo e checar o removedor de CO₂.

### Progressive fatigue

![Linha do tempo durante a fadiga progressiva](/screenshots/timeline-fatigue.png)

- cérebro e coração passando de âmbar a laranja;
- o gráfico de HRV saindo da faixa pessoal sombreada, com o cone de previsão;
- a linha do tempo mostrando a raia de LYRA mudando ao longo dos dias;
- a mensagem central: o sistema não espera um número cruzar uma linha arbitrária, ele observa padrão, persistência e contexto contra o normal de cada pessoa.

### Exercise performance decline

A região dos músculos ganha a cor do status e a camada muscular aparece sozinha no 3D. A ação sugere ajustar carga e recuperação com o treinador.

### Eye changes, SANS like (ORION)

- Clique no chip "Eyes": o histórico de exames contra a linha de base pré-voo, por olho. Um espessamento da retina além da variabilidade publicada de 19,4 µm é Watch.
- Os outros tripulantes seguem nominais; o detalhe dos olhos deles mostra quando o próximo exame (dia de voo 90) está previsto.
- Ação sugerida: revisar com o médico de voo. Nada aqui é diagnóstico ([Saúde ocular e audição](/pt/intelligence/eye-and-hearing)).

Os cenários são independentes do **perfil de missão**: qualquer cenário roda em "Launch", "ISS", "Moon" ou "Mars transit" ([Perfis de missão](/pt/intelligence/mission-profiles)).

## Demo guiada ("Start demo")

![Demo guiada](/screenshots/guided-demo.png)

O botão **"Start demo"** inicia uma história de cerca de 2 minutos em 10 passos (no modo automático). Cada passo destaca uma área da tela e prepara a cena sozinho (cenário, velocidade, pessoa, região). Há reprodução automática, e as setas `←` e `→` navegam. `Esc` sai. Ao terminar, o app volta a "Nominal day", "1 min/s", perfil ISS e ORION selecionado.

| # | Título (interface) | O que mostra |
| --- | --- | --- |
| 1 | "Meet the crew" | Quatro astronautas, cada um comparado com o próprio normal |
| 2 | "The body at a glance" | A anatomia 3D ligada aos dados: o que pede atenção acende na cor do status, coração e pulmões ao vivo. Dica: clicar em qualquer estrutura (o painel mostra os dados dela, ou diz que é só referência) |
| 3 | "Acute cardio event" | ORION: frequência cardíaca sobe, oxigênio cai, faixa CRITICAL e escalonamento |
| 4 | "What to do, and who can do it" | Ações com motivo e autonomia; experimente "Mark done" no protocolo de repouso |
| 5 | "Far from Earth" | Perfil "Mars (farthest)": qualquer resposta da Terra leva pelo menos 44 minutos |
| 6 | "Slow drift: progressive fatigue" | LYRA em "1 h/s"; a demo avança a simulação para cerca de 48 h |
| 7 | "Her normal, not an average" | Gráfico de HRV com faixa pessoal, marcadores e cone de previsão |
| 8 | "What if she follows the advice?" | Comparação com e sem a ação, como projeção hipotética |
| 9 | "Crew view: for the astronaut" | A visão da tripulação e o check-in de 30 segundos |
| 10 | "Mission tools" | O menu "Tools": visão de missão, relatório de turno, origem dos dados |

::: tip DICA
Para avaliadores, a demo guiada é o caminho mais curto: não é preciso escolher cenário nem velocidade, e os padrões lentos já aparecem prontos.
:::

## Roteiro de pitch (cerca de 4 a 5 minutos) {#four-minute-pitch-script}

O roteiro completo está em <CodeLink path="docs/demo-script.md" />. Todos os dados dos aparelhos são simulados; diga isso uma vez no começo. O clima espacial do NASA DONKI e os painéis do OSDR são dados públicos reais, mostrados só como contexto.

**Preparação.** Rode `npm run dev` em `frontend/web`, abra `http://localhost:5173` em tela cheia (1440x900 ou maior), cenário "Nominal day", velocidade "1 min/s", perfil "ISS". Opcional: o backend com uma chave em `backend/.env` para dados da NASA ao vivo e o Ask AHI. Clique uma vez na página para o navegador liberar o som de alerta.

| Tempo | Momento | O que fazer e dizer |
| --- | --- | --- |
| 0:00 a 0:20 | **Problema** | Cinco perigos das missões longas; muitos aparelhos em ritmos diferentes; suporte médico longe. |
| 0:20 a 0:50 | **A tela em 10 segundos** | Cartões da tripulação em palavras simples, o corpo 3D com a varredura, "What needs attention", vitais ao vivo, o selo `SIMULATED`. |
| 0:50 a 1:10 | **Modo Monitor e zoom** | Role sobre o coração (zoom no ponteiro), clique nele: leituras, faixa pessoal, **"Measured by"**. O modo Monitor mantém o foco no que é medido. |
| 1:10 a 2:00 | **Evento agudo, som, decisão rápida** | "Acute cardio event" em ORION: faixa CRITICAL e som de alerta. **"Mark done"** na ação de repouso, reconheça o alerta (o som para). Aperte `D` para a descrição falada. |
| 2:00 a 2:40 | **Perfis de missão e clima espacial** | Troque para **"Mars transit"**, abra o contexto da missão: taxa de dose citada, atraso de 4 a 24 min, dose da missão contra o limite de carreira de 600 mSv da NASA, cartão de clima espacial do DONKI (aviso de abrigo se houve um flare X ou SEP recente; senão calmo; nunca "tudo certo" sem dados). |
| 2:40 a 3:20 | **Deriva lenta** | "Progressive fatigue" em LYRA a "1 h/s": HRV abaixo da faixa dela; escolha o horizonte de 7 dias e mostre a faixa se alargando. |
| 3:20 a 3:50 | **Olhos** | "Eye changes (SANS like)": os olhos mostram Watch pelo exame do dia de voo 30; histórico de exames contra a linha de base pré-voo. |
| 3:50 a 4:10 | **Crew view** | `V`: palavra de status grande, duas ações, cartões **"Your body systems"**, check-in. |
| 4:10 a 4:30 | **Ask AHI** (se houver chave) | "How is ORION doing?": resposta em streaming terminando com "Based on:". Só demo; uma missão precisa de um modelo a bordo. |
| 4:30 a 4:45 | **Impacto** | Feche com a frase abaixo. |

Frase central (no app e no pitch, em inglês): *"We turn physiological and environmental signals into one integrated, explainable view of each astronaut's health, spotting trends before they become operational problems."*

::: details Momentos reserva se sobrar tempo
- **Falha de sensor** (VEGA, "1 min/s"): os órgãos ficam cinza e o coração para de animar. Dado ausente nunca é normal.
- **Pausar um aparelho**: "Devices" na faixa de vitais, pause a camiseta: "Paused by operator", sem dados, sem alarme de falha de sensor.
- **Aumento de CO₂ na cabine** ("10 min/s"): toda a tripulação muda um pouco; o app mostra coocorrência e lembra que correlação não é causalidade.
:::

Próximos passos para citar: o porte do motor para Python, um fluxo de revisão clínica, perfis de acesso e dados reais da cabine da ISS pelo NASA EDA. Veja o [roadmap](/pt/resources/roadmap).

## Próximos passos

- [Resultados e evidências](/pt/validation/results): tempos de detecção medidos.
- [Tour do produto](/pt/product/product-tour): cada área da tela.
- [Configuração, comandos e problemas](/pt/engineering/quick-start): preparar a máquina da apresentação.
