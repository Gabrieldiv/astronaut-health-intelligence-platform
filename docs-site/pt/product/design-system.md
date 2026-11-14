---
title: Design system e acessibilidade
description: Cores, tipografia, status com cor, ícone e palavra, layout adaptável, modo apresentação, decisões de UX e acessibilidade da Astronaut Health Intelligence Platform.
status: IMPLEMENTED
code:
  - frontend/web/src/index.css
  - frontend/web/src/lib/status.ts
  - frontend/web/src/components/Status.tsx
  - frontend/web/src/app/uiStore.ts
  - frontend/web/src/app/shortcuts.tsx
verified: 2026-11-14
---

# Design system e acessibilidade

A interface da Astronaut Health Intelligence Platform (AHI) segue uma ideia: **em um olhar, quem precisa de atenção, o quê e o que fazer**. Esta página reúne as decisões visuais e de interação, e onde elas vivem no código.

## Princípios de UX

| Princípio | Como aparece |
| --- | --- |
| Ordem de leitura fixa | Tripulação (quem) à esquerda, corpo e frase (o quê) no centro, "What needs attention" (por quê e o que fazer) à direita |
| Linguagem simples primeiro | "All good", "Keep an eye", "Act soon", "Act now", "Signal lost" antes do termo técnico |
| Cor nunca é a única pista | Cada status tem cor, ícone e palavra |
| Dado ausente nunca parece normal | Cinza, contorno tracejado e "Signal lost" |
| Calma por padrão | Paleta fria no estado saudável; cores quentes só quando algo pede atenção |
| Menos é mais para a tripulação | "Crew view" mostra no máximo duas ações |
| Origem sempre visível | Selo `SIMULATED` fixo na barra superior |
| Interface em inglês | Júri internacional; termo técnico depois da linguagem simples |

## Status: cor, ícone e palavra

Fonte única: `STATUS_META` em `src/lib/status.ts` e `STATUS_ICON` em `src/components/Status.tsx`. O corpo 3D usa as mesmas cores para os níveis de atenção.

| Nível interno | Rótulo técnico | Rótulo para a tripulação | Cor | Ícone (lucide) |
| --- | --- | --- | --- | --- |
| `LOW` | Nominal | "All good" | verde `#34d399` | círculo com check |
| `MODERATE` | Watch | "Keep an eye" | âmbar `#fbbf24` | olho |
| `HIGH` | Warning | "Act soon" | laranja `#fb923c` | triângulo de alerta |
| `CRITICAL` | Critical | "Act now" | vermelho `#f43f5e` | octógono de alerta |
| `NO_DATA` | No data | "Signal lost" | cinza `#94a3b8`, contorno tracejado | Wi-Fi cortado |

Em HIGH e CRITICAL, o ponto de status pulsa (mais rápido em CRITICAL). Quando o usuário pede menos movimento (`prefers-reduced-motion`), a animação dos valores numéricos é desligada.

## Tokens

Definidos em `@theme` no `src/index.css` (Tailwind CSS v4).

| Grupo | Tokens |
| --- | --- |
| Fundo ("space") | `space-950` `#04070d` a `space-600` `#22324f` |
| Texto ("ink") | `ink-100` `#e8eefc`, `ink-300` `#a9b6cf`, `ink-500` `#7d8ba6` |
| Destaque | `accent` `#5eead4`, `accent-strong` `#2dd4bf` |
| Status | `nominal`, `watch`, `warning`, `critical`, `nodata` (mesmos valores da tabela acima) |
| Tipografia | Inter (texto) e JetBrains Mono (números e código), do Google Fonts |
| Superfícies | `glass` e `glass-strong` (vidro translúcido com desfoque) |
| Foco | `focus-ring`: contorno de 2 px na cor de destaque |

A interface é escura por padrão, pensada para salas de controle e projetores.

## Layout adaptável

O layout se ajusta sem configuração, só com CSS:

| Modo | Quando | O que muda |
| --- | --- | --- |
| `short` | Largura de 1024 px ou mais e altura de até 820 px (por exemplo 1366x768, ou 1280x720 com escala de 150%) | Linha do tempo vira faixa fina que se expande ao passar o mouse, ao receber foco ou ao toque; vitais perdem a minicurva; cartões da tripulação ficam compactos |
| `roomy` | 1680x1000 ou mais | Painel da direita mais largo, linha do tempo mais alta, previsões expandidas |
| Barra superior | Pela largura medida | Recolhe itens em ordem fixa: rótulos primeiro, depois reinício e seletor de visão vão para "Tools"; "Start demo" vira "Demo" e depois só ícone; o sino de alertas nunca some |
| Rótulos dos vitais | Abaixo de 1440 px ou tela baixa | Siglas (HR, HRV, SpO₂); o nome completo fica no título e no nome acessível |

**Decisão de layout medida.** A faixa de alerta CRITICAL passou a ser sobreposta ao cabeçalho do corpo, em vez de empurrar o conteúdo. Em 1280x720 com alerta ativo, a altura do corpo 3D subiu de 247 para 359 px.

## Modo apresentação

Tecla `P` ou menu "Tools". Aumenta fontes (piso de 13 px em qualquer texto), rótulos do 3D (1,3 vez) e eixos dos gráficos, e esconde detalhes secundários. Pensado para projetores e telas de palco. A preferência fica salva no navegador.

## Acessibilidade

| Recurso | Detalhe |
| --- | --- |
| Link de pular | "Skip to what needs attention", visível ao receber foco |
| Teclado | Atalhos globais (`1` a `4`, `V`, `P`, `A`, `Space`, `Esc`, `?`), ignorados ao digitar em campos; lista completa no [Tour do produto](/pt/product/product-tour#atalhos-de-teclado) |
| Diálogos | `role="dialog"` com `aria-modal`; `Esc` fecha |
| Abas e menus | Padrão WAI-ARIA em "Tools", gaveta de alertas e "Data and model" (`tablist`, `tab`, `tabpanel`, `menuitem`) |
| Anúncios | Faixa CRITICAL com `role="alert"` e `aria-live="assertive"`; frase da "Crew view" com `aria-live="polite"` |
| Gráficos | `role="img"` com descrição em texto da tendência |
| Linha do tempo | Navegável por setas; Enter abre o marcador |
| Movimento | Respeita `prefers-reduced-motion` nos valores animados |
| Armazenamento | Funciona sem `localStorage` (janela anônima): só não lembra preferências |

::: warning ATENÇÃO
Não houve auditoria formal de acessibilidade (por exemplo WCAG com leitor de tela) nem teste com usuários reais. Contraste e navegação foram verificados pelo autor durante o desenvolvimento.
:::

## Decisões de UX registradas

| Decisão | Motivo |
| --- | --- |
| Corpo 3D no centro | Leitura imediata do sistema afetado, sem ler números |
| Faixa pessoal sombreada em todo gráfico | Mostrar "seu normal", não um limite populacional |
| Lacunas não preenchidas nos gráficos | "Gaps mean no data": ausência fica visível |
| Selo de autonomia em cada ação | Com a Terra longe, quem pode agir importa tanto quanto o quê |
| Som de alerta desligado por padrão | Evitar alarme sonoro inesperado em demonstrações |
| Duas visões sobre o mesmo estado | Públicos diferentes, uma fonte de verdade |

## Próximos passos

- [Tour do produto](/pt/product/product-tour).
- [Frontend e estado](/pt/architecture/frontend).
- [Renderização da anatomia 3D](/pt/architecture/anatomy-3d).
