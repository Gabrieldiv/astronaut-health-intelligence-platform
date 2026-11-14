---
title: Renderização da anatomia 3D
description: Como o corpo 3D procedural da Astronaut Health Intelligence Platform é gerado (SDF, Surface Nets, decimação), animado com os vitais ao vivo e mantido rápido.
status: IMPLEMENTED
origin: SIMULATED, DERIVED
code:
  - frontend/web/src/features/anatomy/AnatomyViewer.tsx
  - frontend/web/src/features/anatomy/AnatomyScene.tsx
  - frontend/web/src/features/anatomy/anatomy.worker.ts
  - frontend/web/src/features/anatomy/loader.ts
  - frontend/web/src/features/anatomy/geometry/sdf.ts
  - frontend/web/src/features/anatomy/geometry/mesh.ts
  - frontend/web/src/features/anatomy/geometry/simplify.ts
  - frontend/web/src/features/anatomy/regions.ts
verified: 2026-11-14
---

# Renderização da anatomia 3D

O corpo 3D é o centro da interface da Astronaut Health Intelligence Platform (AHI): em um olhar, mostra quais sistemas da pessoa precisam de atenção. Ele é **totalmente procedural**: não há arquivo de modelo externo. Toda a geometria é gerada em código TypeScript, de forma determinística, a cada carregamento (ou lida do cache).

Código: `frontend/web/src/features/anatomy/`. As cores de Watch, Warning, Critical e No data vêm do mesmo `STATUS_META` da interface ([Design system](/pt/product/design-system)); o estado saudável usa uma paleta fria própria.

![Corpo 3D com detalhe de região](/screenshots/body-detail.png)

## Geometria procedural

### Campos de distância com sinal (SDF)

Cada estrutura é descrita como um **campo de distância com sinal** (SDF): uma função que diz, para qualquer ponto, a que distância ele está da superfície. Formas simples (elipsoides, cones arredondados, cilindros, toros, "lofts" de seções elípticas) são combinadas com união e subtração suaves.

Um **rig anatômico** compartilhado (`geometry/rig.ts`) define articulações, coluna e mãos para que pele, músculos, esqueleto, órgãos e vasos fiquem alinhados. Unidades em metros, origem entre os pés, proporções de um adulto de 1,75 m. A variante feminina usa o mesmo esqueleto em escala 0,94, com ombros e cintura mais estreitos e pelve mais larga.

### Da função à malha

| Etapa | Como funciona |
| --- | --- |
| Poligonização | **Surface Nets** em grade esparsa por blocos (alternativa ao marching cubes): só avalia blocos de 8x8x8 nós perto da superfície, e só com as formas que tocam cada bloco. Um corpo inteiro com resolução de 5 mm sai em algumas centenas de milissegundos |
| Normais | Analíticas, a partir do gradiente do campo |
| Resolução | Pele do corpo em grade de 5,5 mm; mãos em 2,8 mm para separar os dedos, unidas ao corpo por um corte exato no pulso |
| Simplificação | Decimação por erro quádrico (Garland e Heckbert, colapso de meia-aresta). Áreas planas perdem a maior parte dos triângulos sem mudança visível. Tolerância padrão: 12% do passo da grade. No total, cerca de 842 mil triângulos gerados viram cerca de 200 mil desenhados por quadro |
| Variante leve | Uma pele mais leve é usada quando o corpo aparece pequeno na tela |

### Workers e cache

- A construção é dividida em **8 grupos de custo parecido**, gerados em **Web Workers em paralelo**. A thread principal continua responsiva.
- Se um worker falha, o grupo é gerado na thread principal, com pausas para a página conseguir desenhar.
- As geometrias ficam em cache na sessão como `BufferGeometry` do three.js.
- **Em produção**, a geometria também vai para o **IndexedDB** (banco `ahi-anatomy`, versão `ahi-anatomy-v2`), então visitas seguintes pulam a construção. Em desenvolvimento esse cache fica desligado para não mascarar mudanças.
- A variante do outro sexo é pré-carregada em segundo plano, para a troca de astronauta ser instantânea.

## Camadas

| Camada | Visual | Padrão |
| --- | --- | --- |
| "Skin" | Casca holográfica com borda fresnel, linhas de varredura finas e expansão do tórax na respiração | ligada |
| "Muscles" | Camada translúcida estriada (grupos superficiais) | **automática**: aparece quando o sistema muscular não está nominal ou está selecionado |
| "Skeleton" | Visual de raio X aditivo (crânio, coluna com 24 vértebras, caixa torácica, cinturas, ossos dos membros) | ligada |
| "Organs" | Volume translúcido iluminado: cérebro com giros, coração com coronárias, pulmões com árvore brônquica, rins | ligada |
| "Vessels" | Grandes artérias com brilho aditivo e onda de pressão saindo do coração | ligada |

Os controles de camadas ficam em uma pílula na base do visualizador; em painéis estreitos viram um único botão "Layers". Há também "Reset view".

## Regiões e cores de status

Sete regiões monitoradas: cérebro, coração, pulmões, rins, músculos, esqueleto e pele.

- **Estado saudável (LOW):** paleta fria (ciano, azul, lilás). Assim, qualquer cor quente chama atenção.
- **Watch, Warning, Critical:** a região assume âmbar, laranja ou vermelho, com intensidade maior. Na pele, o alarme vai para a **silhueta** (borda pulsante na cor do status e uma hachura discreta), para a frente do corpo continuar limpa e os órgãos legíveis.
- **Sem dado:** cinza ardósia. O órgão para de animar.
- **Pulso de varredura:** quando o status de uma região muda (não no primeiro carregamento nem na troca de pessoa), uma onda chama o olhar para ela.

::: warning ATENÇÃO
Os **olhos** existem na geometria (com nervos ópticos), mas são **anatomia passiva**: desenhados como órgãos de contexto e não clicáveis. Não há aparelho de medição ocular no MVP. O acompanhamento da SANS a partir de exames periódicos (OCT, ultrassom ocular) é extensão futura.
:::

## Animação ao vivo

O visualizador lê a frequência cardíaca e a respiratória atuais da pessoa selecionada a cada quadro, sem assinar o store (para não disparar renderizações).

| Elemento | Comportamento |
| --- | --- |
| Coração | Ciclo "lub-dub": primeira bulha e segunda bulha a cerca de 30% do período, no ritmo da FC ao vivo |
| Pulmões | Cerca de 40% do ciclo inspirando e 60% expirando, no ritmo da respiração ao vivo; o tórax da pele acompanha |
| Artérias | Onda de pressão viajando a partir da válvula aórtica, sincronizada com a FC |
| Brônquios | Fluxo durante a inspiração |
| Sem dado | Coração e pulmões param |

Também há uma varredura que sobe pelo corpo a cada cerca de 5 segundos, o corpo "materializa" a partir do chão quando a geometria fica pronta, e o cenário tem disco holográfico no chão, plano de varredura e partículas.

## Interação

- **Clique** em um órgão ou sistema para selecioná-lo: o painel da direita abre o detalhe da região e a câmera voa até um enquadramento próprio daquela região.
- **Passe o mouse** para ver um tooltip com o nome do sistema e o valor-chave.
- **Arraste** para orbitar. Parado, o corpo gira devagar sozinho (o giro para quando há seleção ou mouse em cima).
- **"Reset view"** volta ao corpo inteiro, que ocupa cerca de 88% da altura livre e é reenquadrado quando o painel muda de tamanho.

## Rótulos e legenda

- **Rótulos flutuantes** aparecem para cada região que não está nominal e para a região em foco. Mostram ícone, cor e palavra (nunca só cor) e um valor-chave, por exemplo a FC.
- Os rótulos são **DOM puro** sobre o canvas, com texto nítido. Um projetor dentro da cena calcula a posição a cada quadro, empilha os rótulos por lado para nunca se sobreporem e grava as posições direto nos elementos, sem renderização React por quadro.
- **Legenda de status** recolhível no canto inferior esquerdo, com forma, cor e palavra. Abre sozinha quando o visualizador tem mais de 820 px de largura.
- No **modo apresentação**, rótulos, tooltip e legenda crescem 1,3 vez.

## Desempenho

Medidas observadas pelo autor no notebook de desenvolvimento (não são benchmarks formais): 58 a 60 fps a 60x de velocidade e cerca de 45 fps a 3600x. Com um alerta CRITICAL ativo em 1280x720, a altura do corpo 3D passou de 247 para 359 px depois que a faixa de alerta virou sobreposição.

| Decisão | Efeito |
| --- | --- |
| Geração em Web Workers paralelos | Thread principal livre durante a construção |
| Cache em memória e IndexedDB | Visitas seguintes sem reconstrução |
| Decimação por erro quádrico | Muito menos triângulos, sem perda visível |
| Pele com nível de detalhe | Malha leve quando o corpo aparece pequeno |
| Uniforms globais compartilhados | Uma escrita por quadro atualiza todos os materiais |
| Rótulos posicionados no DOM | Sem renderização React por quadro |
| Canvas memorizado | O 3D não re-renderiza por estado da página |
| Leitura de vitais sem assinatura | Animação ao vivo sem tempestade de renderizações |

Para inspecionar estados visuais em desenvolvimento, use `anatomy-lab.html` (servida pelo `vite`), que força status e vitais e informa os triângulos desenhados.

## Status

<StatusBadge status="IMPLEMENTED" /> Não há testes automatizados da renderização 3D: a verificação é visual, com a página `anatomy-lab.html`. Essa lacuna está em [Estratégia de testes](/pt/engineering/testing).

## Próximos passos

- [Tour do produto](/pt/product/product-tour): como o corpo se encaixa na tela.
- [Frontend e estado](/pt/architecture/frontend).
- [Roadmap](/pt/resources/roadmap): SANS e outras extensões.
