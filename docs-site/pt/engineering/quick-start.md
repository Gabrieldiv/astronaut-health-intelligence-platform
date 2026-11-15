---
title: Configuração, comandos e problemas
description: Como rodar a Astronaut Health Intelligence Platform (só o app, app mais backend ou Docker Compose), os comandos do projeto e a solução dos problemas mais comuns.
status: IMPLEMENTED
code:
  - frontend/web/package.json
  - frontend/web/vite.config.ts
  - backend/.env.example
  - docker-compose.yml
verified: 2026-11-15
---

# Configuração, comandos e problemas

Em poucos minutos você tem a Astronaut Health Intelligence Platform (AHI) rodando no seu computador. O app web roda inteiro no navegador: simulação, motor e visualizador 3D. Depois do `npm install` a demo funciona offline (**modo demo offline**). O backend opcional acrescenta dados da NASA ao vivo, a busca de estudos no OSDR e o assistente Ask AHI ([Backend e API](/pt/architecture/backend)).

## Requisitos

| Item | Versão |
| --- | --- |
| Node.js | 20 ou mais recente (o CI usa o 22) |
| npm | o que vem com o Node |
| Navegador | moderno, com WebGL (Chrome, Edge, Firefox ou Safari atuais) |
| Tela | melhor em 1440x900 ou maior |
| Python | 3.12 ou mais recente, só para o backend opcional |
| Docker | só para o Docker Compose opcional |

## Clonar, instalar e rodar

```bash
git clone https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform.git
cd astronaut-health-intelligence-platform/frontend/web
npm install
npm run dev
```

Abra `http://localhost:5173`.

## App mais backend

Em um segundo terminal:

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS ou Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:create_app --factory --reload --port 8000
```

A documentação da API fica em `http://localhost:8000/docs`. Recarregue o app: **Data and model, NASA context** passa a mostrar "Connected to AHI API" e o clima espacial vem ao vivo do NASA DONKI. O SQLite é o padrão, sem configuração.

### Docker Compose

Na raiz do repositório, `docker compose up --build` sobe o PostgreSQL 17 e a API na porta 8000 (as migrações rodam na partida). O app web continua com `npm run dev`.

### A chave do assistente

O Ask AHI precisa de uma chave da Claude API em `backend/.env` (ignorado pelo git; nunca faça commit):

```bash
ANTHROPIC_API_KEY=sua-chave-aqui
```

Sem ela a API responde 503 para o assistente e o app mostra "Assistant offline"; todo o resto funciona. Detalhes em [Ask AHI](/pt/product/assistant).

### Hospedagem estática

Faça o build com `VITE_API_URL=off` para pular a checagem da API (por exemplo no GitHub Pages).

::: tip DICA
Ao abrir, o corpo 3D baixa os arquivos de anatomia do próprio app (cerca de 3 MB para a vista padrão) e mostra um cartão de progresso. Os arquivos já estão no repositório: não é preciso ter o Blender para rodar o app.
:::

## Comandos

Todos rodam dentro de `frontend/web`.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento Vite (porta 5173) |
| `npm test` | Testes unitários e de cenário (vitest): 430 testes em 48 arquivos |
| `npx tsc -b` | Checagem de tipos (também `npm run typecheck`) |
| `npx vite build` | Build de produção em `dist/` (`npm run build` roda `tsc -b` e depois o build) |
| `npm run evaluate` | Roda o motor sem interface sobre os cenários e regenera `src/engine/evaluation.json` e `docs/model-card.md` |
| `npm run lint` | Lint com oxlint |
| `npm run e2e` | Testes ponta a ponta do Playwright no Chromium (os testes visuais precisam de imagens de referência commitadas, veja [Estratégia de testes](/pt/engineering/testing#end-to-end-and-visual-tests)). Na primeira vez: `npx playwright install chromium` |
| `npm run e2e:update` | Regenera as capturas visuais desta plataforma |
| `npm run preview` | Serve o build de produção localmente |
| `npm run anatomy:validate` | Confere o atlas 3D publicado (`public/anatomy/`) contra o contrato do manifesto |
| `npm run anatomy:build` | Reconstrói o atlas 3D a partir da fonte Z-Anatomy. Precisa do Blender 4.5 LTS (`BLENDER_BIN`) e leva cerca de 5 minutos. Não é necessário para rodar o app ([Assets de anatomia 3D](/pt/data/anatomy-assets#rebuild)) |
| `npm run api:types` | Regenera `src/types/api.gen.ts` a partir de `backend/openapi.json` |

Comandos do backend, dentro de `backend`:

| Comando | O que faz |
| --- | --- |
| `uvicorn app.main:create_app --factory --reload --port 8000` | Roda a API |
| `python -m pytest` | Testes do backend (HTTP externo simulado) |
| `python -m app.cli openapi` | Exporta `backend/openapi.json` |
| `python -m app.cli donki-snapshot` | Atualiza o snapshot do DONKI empacotado em `frontend/web/src/data/nasa/` |
| `alembic upgrade head` | Roda as migrações à mão |

Scripts de dados reais (Node 20+, sem dependências extras):

```bash
node scripts/osdr/discover.mjs   # busca no NASA OSDR e lista candidatos
node scripts/osdr/import.mjs     # baixa, calcula SHA-256, faz parse e grava manifestos
```

Detalhes em [Catálogo de datasets](/pt/data/dataset-catalog#importacao-e-reprodutibilidade).

## Os primeiros 2 minutos

1. **Olhe o selo `SIMULATED`** ao lado do logo. Clique nele para ver de onde vem cada dado.
2. **Leia a lista da tripulação** à esquerda. Cada cartão diz em palavras simples como a pessoa está: "All good", "Keep an eye", "Act soon", "Act now" ou "Signal lost".
3. **Clique no chip "Heart"** ao lado do corpo. O painel da direita abre o detalhe do sistema, com gráfico, faixa pessoal e previsão. Depois **clique em qualquer parte do corpo 3D**, por exemplo o crânio: a câmera vai até a estrutura e o painel diz o que ela é e com qual sistema do corpo é monitorada. Estruturas que nada mede, como os intestinos, aparecem como "Context only", sem status.
4. **Troque o cenário** no player do topo: escolha "Acute cardio event" e veja o alerta CRITICAL surgir em minutos simulados, com o som de alerta (desligue em Tools > Accessibility and sound).
5. **Abra o controle Mission and Earth link** na barra do topo e escolha um perfil de missão, por exemplo **Mars transit**: riscos, valores de referência citados, a dose da missão e o aviso de clima espacial.
6. **Clique em "Start demo"** para a [demo guiada](/pt/product/demo-scenarios) de 10 passos. Use as setas para avançar e Esc para sair.
7. **Aperte `?`** para ver todos os atalhos de teclado.

::: info
O cenário inicial é "Nominal day" na velocidade "1 min/s" (1 minuto simulado por segundo real). O relógio simulado começa às 08:00 UTC de 14/11/2026, no dia 44 da missão.
:::

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| `npm install` falha com erro de sintaxe ou engine | Node antigo | Instale o Node 20 ou mais recente (`node -v`) |
| O Vite abriu em outra porta | A 5173 já está em uso | Use a URL que o Vite imprime no terminal, ou feche o processo que ocupa a porta |
| O corpo 3D não aparece ("3D body view unavailable") | Nem o atlas nem o modelo de fallback conseguiram renderizar; em geral, WebGL desativado ou aceleração de hardware desligada | Ative a aceleração de hardware no navegador e recarregue. O resto do painel continua funcionando |
| O corpo aparece simplificado, com o aviso "Reference atlas unavailable" | O app não conseguiu carregar o atlas (`public/anatomy/manifest.json` ou um dos `*.glb` obrigatórios) e trocou para o modelo procedural de fallback | Confira se `frontend/web/public/anatomy/` tem o `manifest.json` e nove arquivos `.glb` e rode `npm run anatomy:validate`. Sistemas, chips e alertas continuam funcionando; só não dá para selecionar estruturas isoladas ([Anatomia 3D](/pt/architecture/anatomy-3d#fallback)) |
| A primeira carga demora alguns segundos | Geração do histórico (5 dias por minuto) e download da anatomia 3D | Normal: cerca de 1,2 s com cache aquecido e 2 a 3 s a frio em um notebook para o histórico, mais o download da anatomia |
| Layout apertado em notebook | Tela baixa ou escala do sistema em 150% | O app entra sozinho no modo compacto (linha do tempo vira uma faixa fina). Aumente a janela ou reduza o zoom |
| Os padrões lentos não aparecem | Velocidade baixa | Fadiga e queda de desempenho levam dias simulados: use "1 h/s" ou a demo guiada, que avança a simulação |
| O app diz "Offline demo mode" com o backend rodando | A checagem em `http://localhost:8000/api/v1/health` falhou | Confira se a API responde nesse endereço, se `CORS_ORIGINS` em `backend/.env` inclui a origem do app (a 5173 está no exemplo) e se o build não usou `VITE_API_URL=off`. Recarregue o app depois de subir a API |
| Uma camada do corpo mostra "retry" | O arquivo dela falhou quatro vezes seguidas (por exemplo durante um reinício do servidor) | Clique nela para tentar de novo; o resto do corpo continua funcionando |
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
