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
tests:
  - frontend/web/src/features/a11y/alarmSchedule.test.ts
  - frontend/web/src/features/a11y/describe.test.ts
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

## Idiomas {#languages}

A interface é escrita em **inglês**, o idioma padrão e de referência para a avaliação internacional. A linguagem simples vem primeiro e o termo técnico depois (por exemplo "Breathing rate" antes de "respiratory rate").

## Limitações {#limitations}

- Ainda não foi feita uma auditoria WCAG formal nem um teste estruturado com leitor de tela.
- A qualidade da síntese e do reconhecimento de fala depende do navegador e das vozes do sistema operacional.
- Os earcons foram desenhados para serem distintos, não validados contra um conjunto padrão de sons de alarme.

## Status {#status}

<StatusBadge status="IMPLEMENTED" /> O agendamento de alarmes (`alarmSchedule.test.ts`) e o texto falado (`describe.test.ts`) têm testes unitários.

## Próximos passos {#next-steps}

- [Design system](/pt/product/design-system)
- [Tour do produto](/pt/product/product-tour)
- [Limitações e problemas conhecidos](/pt/validation/limitations)
