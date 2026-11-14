---
title: Configuração, comandos e problemas
description: Como clonar, instalar e rodar a Astronaut Health Intelligence Platform, os comandos do projeto e a solução dos problemas mais comuns.
status: IMPLEMENTED
code:
  - frontend/web/package.json
  - frontend/web/vite.config.ts
verified: 2026-11-14
---

# Configuração, comandos e problemas

Em poucos minutos você tem a Astronaut Health Intelligence Platform (AHI) rodando no seu computador. Não há backend nem chave de API: toda a simulação roda no navegador e a demo funciona offline depois da instalação.

## Requisitos

| Item | Versão |
| --- | --- |
| Node.js | 20 ou mais recente (o CI usa o 22) |
| npm | o que vem com o Node |
| Navegador | moderno, com WebGL (Chrome, Edge, Firefox ou Safari atuais) |
| Tela | melhor em 1440x900 ou maior |

## Clonar, instalar e rodar

```bash
git clone https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform.git
cd astronaut-health-intelligence-platform/frontend/web
npm install
npm run dev
```

Abra `http://localhost:5173`.

::: tip DICA
Na primeira visita, o corpo 3D é gerado de forma procedural em Web Workers. No build de produção a geometria fica em cache no navegador (IndexedDB), então as visitas seguintes abrem mais rápido.
:::

## Comandos

Todos rodam dentro de `frontend/web`.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento Vite (porta 5173) |
| `npm test` | Testes unitários e de cenário (vitest): 101 testes em 14 arquivos |
| `npx tsc -b` | Checagem de tipos (também `npm run typecheck`) |
| `npx vite build` | Build de produção em `dist/` (`npm run build` roda `tsc -b` e depois o build) |
| `npm run evaluate` | Roda o motor sem interface sobre os cenários e regenera `src/engine/evaluation.json` e `docs/model-card.md` |
| `npm run lint` | Lint com oxlint |
| `npm run preview` | Serve o build de produção localmente |

Scripts de dados reais (Node 20+, sem dependências extras):

```bash
node scripts/osdr/discover.mjs   # busca no NASA OSDR e lista candidatos
node scripts/osdr/import.mjs     # baixa, calcula SHA-256, faz parse e grava manifestos
```

Detalhes em [Catálogo de datasets](/pt/data/dataset-catalog#importacao-e-reprodutibilidade).

## Os primeiros 2 minutos

1. **Olhe o selo `SIMULATED`** ao lado do logo. Clique nele para ver de onde vem cada dado.
2. **Leia a lista da tripulação** à esquerda. Cada cartão diz em palavras simples como a pessoa está: "All good", "Keep an eye", "Act soon", "Act now" ou "Signal lost".
3. **Clique em um órgão** no corpo 3D (por exemplo, o coração). O painel da direita abre o detalhe com gráfico, faixa pessoal e previsão.
4. **Troque o cenário** no player do topo: escolha "Acute cardio event" e veja o alerta CRITICAL surgir em minutos simulados.
5. **Clique em "Start demo"** para a [demo guiada](/pt/product/demo-scenarios) de 10 passos. Use as setas para avançar e Esc para sair.
6. **Aperte `?`** para ver todos os atalhos de teclado.

::: info
O cenário inicial é "Nominal day" na velocidade "1 min/s" (1 minuto simulado por segundo real). O relógio simulado começa às 08:00 UTC de 14/11/2026, no dia 44 da missão.
:::

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| `npm install` falha com erro de sintaxe ou engine | Node antigo | Instale o Node 20 ou mais recente (`node -v`) |
| O Vite abriu em outra porta | A 5173 já está em uso | Use a URL que o Vite imprime no terminal, ou feche o processo que ocupa a porta |
| O corpo 3D não aparece | WebGL desativado ou aceleração de hardware desligada | Ative a aceleração de hardware no navegador e recarregue |
| A primeira carga demora alguns segundos | Geração do histórico (5 dias por minuto) e da geometria 3D | Normal: cerca de 1,2 s com cache aquecido e 2 a 3 s a frio em um notebook, mais a geometria |
| Layout apertado em notebook | Tela baixa ou escala do sistema em 150% | O app entra sozinho no modo compacto (linha do tempo vira uma faixa fina). Aumente a janela ou reduza o zoom |
| Os padrões lentos não aparecem | Velocidade baixa | Fadiga e queda de desempenho levam dias simulados: use "1 h/s" ou a demo guiada, que avança a simulação |
| Preferências não ficam salvas | Janela anônima ou armazenamento bloqueado | Esperado: o app funciona sem `localStorage`, só não lembra a visão nem o modo apresentação |

## Rodar este portal de documentação

```bash
cd docs-site
npm install
npm run docs:dev      # servidor local do VitePress
npm run docs:build    # build estático; falha com links internos quebrados
```

Detalhes em [Documentação e deploy](/pt/engineering/deployment).

## Próximos passos

- [Tour do produto](/pt/product/product-tour): cada área da tela.
- [Estrutura do projeto](/pt/engineering/project-structure): onde fica cada coisa.
- [Estratégia de testes](/pt/engineering/testing): o que os testes cobrem.
