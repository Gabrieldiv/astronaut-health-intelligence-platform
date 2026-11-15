---
title: Acessibilidade, som e idiomas
description: Sons de alerta, audiodescrição, uso do corpo 3D pelo teclado, links de salto e regiões ao vivo na Astronaut Health Intelligence Platform, além da política de idiomas da interface.
status: IMPLEMENTED
code:
  - frontend/web/src/features/a11y/alarmSchedule.ts
  - frontend/web/src/features/a11y/earcons.ts
  - frontend/web/src/features/a11y/describe.ts
  - frontend/web/src/features/a11y/A11ySettings.tsx
  - frontend/web/src/features/a11y/SkipLinks.tsx
  - frontend/web/src/features/anatomy/a11y
  - frontend/web/src/i18n/index.ts
  - frontend/web/src/features/topbar/LanguageMenu.tsx
  - frontend/web/src/features/a11y/languageSpeech.ts
  - frontend/web/src/i18n/engineText.ts
  - frontend/web/src/engine/msg.ts
  - frontend/web/src/i18n/pseudo.ts
  - frontend/web/scripts/i18n-sweep.mjs
  - frontend/web/src/components/viz/Details.tsx
  - frontend/web/src/app/useStatusFavicon.ts
tests:
  - frontend/web/src/features/a11y/alarmSchedule.test.ts
  - frontend/web/src/features/a11y/describe.test.ts
  - frontend/web/src/i18n/i18n.test.ts
  - frontend/web/src/i18n/engineText.test.ts
  - frontend/web/src/features/a11y/languageSpeech.test.ts
  - frontend/web/src/app/useStatusFavicon.test.ts
verified: 2026-11-15
---

# Acessibilidade, som e idiomas

Um monitor de saúde é usado com os olhos e as mãos ocupados: durante o exercício, durante um procedimento, do outro lado de um módulo. Por isso a Astronaut Health Intelligence Platform (AHI) diz as coisas importantes de mais de um jeito: cor mais ícone mais palavras, som para alertas que pedem ação, fala sob demanda e um caminho completo pelo teclado, inclusive no corpo 3D.

Todas as preferências ficam em **Tools > Accessibility and sound** e são lembradas por dispositivo.

## Sons de alerta {#alert-sounds}

| Regra | Comportamento |
| --- | --- |
| O que toca | Alertas **críticos** abertos (não reconhecidos, não resolvidos); **avisos** também, se "Also for warnings" estiver ligado |
| Padrão | Som para alertas críticos **ligado**, avisos desligados |
| Som | Um padrão curto de tons (earcon) por severidade, gerado com a Web Audio API: sem arquivos de áudio |
| Repetição | A cada 30 s enquanto um alerta crítico fica aberto; a cada 2 min para um aviso |
| Escalonamento | Um alerta crítico ainda não reconhecido depois de 2 min (ou escalonado pelo motor) passa para um som mais urgente que se repete a cada 15 s |
| Um som por vez | O alerta aberto mais urgente decide o som; cinco alertas abertos nunca fazem cinco sons |
| Histórico em silêncio | Alertas criados antes de a página carregar ou antes de o cenário reiniciar nunca tocam |
| Áudio bloqueado | Se o navegador bloquear o som até um clique, aparece o aviso **Enable sound** |

As regras seguem o espírito da orientação de alarmes IEC 60601-1-8 (evitar fadiga de alarme, escalonar o que é ignorado). Os intervalos são configuração de demo, não limite oficial. As repetições contam tempo real, não tempo de simulação, então uma simulação acelerada não faz o app apitar mais rápido.

## Audiodescrição {#audio-description}

Explicações faladas com a síntese de fala embutida no navegador. **Desligada por padrão.** Nada é enviado para lugar nenhum.

| Tecla | Ação |
| --- | --- |
| `D` | Descreve a tela (pressione de novo para parar) |
| `Shift` + `D` | Liga ou desliga a audiodescrição |
| `Esc` | Para de falar |

Quando ligada, ela lê novos alertas críticos e altos, mudanças de status e o que você seleciona. A velocidade da voz vai de 0,6x a 1,6x. Todo resumo de saúde falado diz que os dados são simulados, e dados ausentes são falados como "no data" (sem dados), nunca como normais. Quem usa leitor de tela pode não precisar dela: os mesmos eventos são anunciados por regiões `aria-live`.

**Uma voz por vez numa troca de idioma.** Trocar o idioma cancela todas as vozes: a síntese de fala e todas as filas do app (audiodescrição, descrever a tela, leitura em voz alta do assistente), para que nada continue falando no idioma antigo. A descrição na tela também fecha, porque o texto dela está no idioma antigo. Com a audiodescrição ligada, a AHI diz então uma frase curta no novo idioma (em inglês: "Speaking English now."), depois de uma pausa de 150 ms, porque alguns motores de fala descartam uma fala enfileirada logo depois de um cancelamento.

## Teclado e o corpo 3D {#keyboard-and-the-3d-body}

O visualizador 3D tem um caminho pelo teclado, o **navegador do corpo** ("body navigator", [Anatomia 3D](/pt/architecture/anatomy-3d#keyboard-body-navigator)):

| Tecla | Ação |
| --- | --- |
| `Tab` | Chega ao navegador do corpo |
| `Up` / `Down` | Região monitorada anterior ou seguinte |
| `Left` / `Right` | Estrutura anterior ou seguinte da região |
| `Home` / `End` | Primeira ou última |
| `Enter` | Seleciona |
| `Esc` | Limpa a seleção |

Cada movimento é anunciado, por exemplo "Heart region. Status: Nominal." Uma região sem leituras é anunciada como "no data".

Os atalhos globais (`1` a `4`, `V`, `P`, `A`, `Space`, `?` e outros) estão listados no app com `?` e em [Design system](/pt/product/design-system).

## Links de salto e regiões ao vivo {#skip-links-and-live-regions}

- Dois links de salto são os primeiros elementos focáveis: **Skip to main content** (pular para o conteúdo principal) e **Skip to what needs attention** (pular para o que precisa de atenção: o painel de atenção na Ground view, o cartão de ações na Crew view).
- Regiões `aria-live` anunciam alertas, mudanças de status e o navegador do corpo; a conversa do assistente é uma região `log`.
- O status nunca depende só da cor; `prefers-reduced-motion` deixa a varredura do corpo lenta e fraca e desliga as animações.
- Os painéis mostram primeiro a imagem e guardam as frases atrás do botão **"Details"**. Fechado, o texto só fica escondido visualmente (`sr-only`), então leitores de tela e a audiodescrição continuam lendo. Os medidores têm um rótulo acessível com o valor, o normal pessoal e o status em palavras.
- Um alerta CRITICAL aberto também põe um ponto vermelho no ícone da aba do navegador, um sinal que funciona com a aba escondida.
- O cenário da missão é decorativo (`aria-hidden`); a paralaxe e as animações param com movimento reduzido.

## Idiomas {#languages}

**O inglês é o padrão** e o idioma de referência para o júri internacional; ele é idêntico com ou sem a camada de idiomas. A linguagem simples vem primeiro e o termo técnico depois (por exemplo "Breathing rate" antes de "respiratory rate").

Quatro outros idiomas são **opcionais**: Português (Brasil), Español, 日本語 e Deutsch. Escolha um em **Tools > Language**.

| Regra | Comportamento |
| --- | --- |
| Situação das traduções | **Feitas com apoio de máquina, aguardando revisão nativa.** Cada idioma além do inglês diz isso na dica do seletor; só o inglês está revisado |
| Padrão | Inglês. O idioma do navegador nunca é aplicado sozinho; a escolha fica guardada no dispositivo |
| Carregamento | O inglês vem no pacote principal; os outros idiomas são arquivos separados, baixados só quando escolhidos. O japonês carrega uma fonte japonesa sob demanda |
| Caminho de volta | Fora do inglês o item do menu mostra "Language" nos dois idiomas, para qualquer pessoa conseguir voltar |
| O que não é traduzido | `SIMULATED`, `REAL_PUBLIC`, códigos de métrica, ids de regra e unidades; mensagens e relatórios enviados à Terra ficam em inglês |
| Fala | A descrição em áudio usa uma voz do idioma escolhido quando o sistema tem uma |

Um teste unitário verifica que cada idioma tem exatamente as chaves do inglês, nenhum texto vazio, os mesmos marcadores, nenhum travessão e os termos protegidos sem tradução. <StatusBadge status="EXPERIMENTAL" /> até a revisão nativa.

### Texto do motor {#engine-text}

O motor de saúde escreve suas frases em inglês (manchetes de risco, fatores, recomendações, alertas, resumos de região). Ao lado de cada frase ele anexa uma mensagem estruturada: um id estável mais parâmetros (`src/engine/msg.ts`). A interface mostra o texto do motor por `src/i18n/engineText.ts`, nunca o campo em inglês cru:

- Em inglês, a frase do próprio motor volta sem mudança.
- Em outro idioma, a mensagem é montada a partir das chaves `eng.*`; nomes de métricas e regiões, unidades e durações vêm do catálogo.
- Se falta a mensagem ou uma das chaves, aparece a frase em inglês, nunca uma frase traduzida pela metade.
- Quem só tem o texto em inglês ainda recebe a tradução: o motor lembra cada frase que produziu junto com a sua mensagem.

`engineText.test.ts` verifica que o inglês fica idêntico e que as mensagens traduzidas são montadas. Hoje estão cobertos: manchetes de risco, fatores, recomendações, alertas, resumos de região, notas de exame, notas de previsão, notas de pausa e de sinal dos aparelhos e a orientação de autonomia; os textos dos perfis de missão e os nomes dos perigos são montados pelo mesmo arquivo. A passagem de turno em texto puro e os pacotes enviados à Terra ficam em inglês de propósito. Uma frase que não carrega mensagem estruturada aparece em inglês, e a pseudolocale abaixo torna esse texto visível.

### Encontrar texto sem tradução {#finding-untranslated-text}

Duas ferramentas de desenvolvimento, fora do produto:

| Ferramenta | O que faz |
| --- | --- |
| Pseudo idioma `qps` | Só em builds de desenvolvimento. Abra o app com `?lang=qps` (ou defina `ahi.pseudo.v1` no armazenamento local); `?lang=en` desliga. Todo texto traduzido aparece entre ⟦ ⟧, então um inglês sem colchetes na tela escapou da camada de tradução. Datas, números e o seletor continuam em inglês. Nunca aparece no seletor de idiomas nem em builds de produção |
| `node scripts/i18n-sweep.mjs` | Rode dentro de `frontend/web` (`--json` para saída em JSON). Lista textos JSX e valores literais de `title`, `aria-label`, `placeholder`, `label` e `alt` em `src/features` que não passam por `t()`. É uma heurística: revise cada ocorrência antes de traduzir |

## Limitações {#limitations}

- Ainda não foi feita uma auditoria WCAG formal nem um teste estruturado com leitor de tela.
- A qualidade da síntese e do reconhecimento de fala depende do navegador e das vozes do sistema operacional.
- Os earcons foram desenhados para serem distintos, não validados contra um conjunto padrão de sons de alarme.
- Frases do motor sem mensagem estruturada, e a passagem de turno em texto puro e os pacotes à Terra, ficam em inglês com outro idioma escolhido ([Texto do motor](#engine-text)).

## Status {#status}

<StatusBadge status="IMPLEMENTED" /> O agendamento de alarmes (`alarmSchedule.test.ts`), o texto falado (`describe.test.ts`), a parada da fala numa troca de idioma (`languageSpeech.test.ts`), a montagem do texto do motor (`engineText.test.ts`) e a regra do ícone da aba (`useStatusFavicon.test.ts`) têm testes unitários.

## Próximos passos {#next-steps}

- [Design system](/pt/product/design-system)
- [Tour do produto](/pt/product/product-tour)
- [Limitações e problemas conhecidos](/pt/validation/limitations)
