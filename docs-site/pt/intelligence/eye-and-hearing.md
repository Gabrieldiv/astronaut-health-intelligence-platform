---
title: Saúde ocular (SANS) e audição
description: Exames oculares periódicos para a síndrome neuro-ocular associada ao voo espacial (SANS) e monitoramento de audição e ruído na Astronaut Health Intelligence Platform, comparados com a baseline pré-voo de cada astronauta.
status: IMPLEMENTED
origin: SIMULATED, DERIVED
code:
  - frontend/web/src/engine/exams/assess.ts
  - frontend/web/src/engine/exams/schedule.ts
  - frontend/web/src/engine/sim/exams.ts
  - frontend/web/src/engine/config.ts
  - frontend/web/src/features/anatomy/viewer/EarMarkers.tsx
tests:
  - frontend/web/src/engine/exams/exams.test.ts
verified: 2026-11-15
---

# Saúde ocular (SANS) e audição

## O que faz {#what-it-does}

Olhos e ouvidos são regiões do corpo monitoradas. Ao contrário da frequência cardíaca ou da SpO₂, eles não são medidos continuamente: a tripulação faz **exames periódicos**. A Astronaut Health Intelligence Platform (AHI) simula esses exames, compara cada medida em voo com a **baseline pré-voo da mesma pessoa (mesmo olho ou mesmo ouvido)** e mostra o resultado no corpo, no detalhe da região com o histórico de exames e nos alertas.

::: warning Apoio à decisão, não diagnóstico
Um alerta significa "revisar com o médico de voo". A AHI não diagnostica SANS nem perda auditiva e não sugere nenhum tratamento. Todos os valores de exame são <OriginBadge origin="SIMULATED" />.
:::

## Olhos: monitoramento de SANS {#eyes-sans-monitoring}

A síndrome neuro-ocular associada ao voo espacial (SANS) é um conjunto de alterações oculares vistas em tripulações de longa duração ([Riscos à saúde em voos espaciais](/pt/science/spaceflight-hazards)). A NASA a acompanha com tomografia de coerência óptica (OCT), ultrassom ocular e acuidade visual, entre outros exames[^e1].

| Exame | Medidas (por olho) | Quando |
| --- | --- | --- |
| OCT | Espessura da retina, dobras de coroide | Pré-voo cerca de 18 meses antes do lançamento; em voo no dia de voo 30, dia de voo 90 e R-30 (30 dias antes do retorno)[^e1] |
| Ultrassom ocular | Diâmetro da bainha do nervo óptico | Pré-voo cerca de 7 meses antes do lançamento; mesmas sessões em voo[^e1] |
| Acuidade visual | logMAR | Junto com as sessões de OCT[^e1] |

| Mudança frente à baseline pré-voo | Status | Origem do número |
| --- | --- | --- |
| Espessura da retina acima de +19,4 µm | Atenção (Watch) | Variabilidade publicada entre testes da medida[^e1] |
| Novas dobras de coroide | Atenção (Watch) | Sinal publicado de SANS[^e1] |
| Bainha do nervo óptico +0,5 mm ou mais | Atenção (Watch) | Configuração de demo, não é limite oficial |
| Acuidade visual +0,1 logMAR ou mais (cerca de uma linha da tabela) | Atenção (Watch) | Configuração de demo, não é limite oficial |
| Dois ou mais dos itens acima na mesma sessão | Aviso (Warning) | Configuração de demo, não é limite oficial |

O cenário **"Eye changes (SANS like)"** (mudanças oculares tipo SANS) faz os exames simulados derivarem ao longo da missão (retina mais espessa, bainha do nervo óptico mais larga, depois novas dobras), para que o alerta possa ser mostrado na demo.

## Ouvidos: audição e ruído {#ears-hearing-and-noise}

| Medida | Regra | Status | Fonte |
| --- | --- | --- | --- |
| Limiar auditivo, agudos (média de 2, 3 e 4 kHz) | Mudança de mais de 10 dB frente ao pré-voo | Atenção (Watch) | Registro de risco de perda auditiva da NASA[^e2] |
| Limiar auditivo, agudos | Mudança de 30 dB ou mais | Aviso (Warning) | Mesmo registro: perdas súbitas de 30 dB ou mais podem afetar as operações da missão[^e2] |
| Limiar auditivo, graves (0,25, 0,5, 1 kHz) | Mesmos critérios | Atenção ou Aviso | Agrupamento de demo do mesmo critério |
| Exposição a ruído, período de trabalho | Acima de 72 dBA LEQ em 16 h | Atenção (Watch) | Regra de voo da ISS citada no registro de risco[^e2] |
| Dose diária de ruído | Acima de 100% (85 dBA por 8 h equivale a 100%) | Aviso (Warning) | NASA-STD-3001 Volume 2, [V2 6115][^e3] |

Calendário: audiometria pré-voo e depois avaliações auditivas em voo a cada 30 dias a partir do dia de voo 15 (a cadência é configuração de demo; o registro confirma as avaliações em voo, não essa cadência)[^e2]. A leitura de ruído é um valor por dia usado pelo tripulante, para que a tendência fique visível (demo); na ISS a dosimetria usada pelo tripulante roda por 24 horas cerca de a cada 60 dias[^e4]. A taxa de troca de 3 dB usada na fórmula da dose é uma suposição de demo que segue a convenção do NIOSH; o technical brief da NASA não a informa.

## Exames ausentes {#missing-exams}

"No exam yet" (ainda sem exame) nunca aparece como normal. Uma medida sem valor, ou sem baseline pré-voo para aquele olho ou ouvido, é `NO_DATA` com um motivo em linguagem simples, por exemplo "No pre-flight baseline on file for the left eye, so the change cannot be judged."

## No corpo 3D {#on-the-3d-body}

- Os **olhos** usam as estruturas do atlas para o olho esquerdo e o direito; selecionar um abre a região dos olhos com o histórico de exames.
- Os **ouvidos** não têm geometria no atlas (o ouvido interno foi excluído do atlas publicado por motivo de licença, veja [Assets de anatomia 3D](/pt/data/anatomy-assets)). Dois pequenos anéis na cor do status, nas laterais da cabeça, marcam os ouvidos. Eles são apenas visuais: a região dos ouvidos é selecionada pelo chip do sistema do corpo, pelo rótulo flutuante ou pelo navegador do corpo pelo teclado.

## Limitações {#limitations}

- Os exames são simulados: os valores são faixas plausíveis, não dados clínicos.
- Bainha do nervo óptico, acuidade e a regra de "dois sinais" são configuração de demo.
- Sem fundoscopia, tela de Amsler ou ressonância, que a NASA também usa[^e1].
- O ruído é um único valor diário, não uma série temporal de dosímetro.

## Status {#status}

<StatusBadge status="IMPLEMENTED" /> Coberto por `exams.test.ts` (calendário, comparação com a baseline por lado, regras de Atenção e Aviso, dose de ruído, casos `NO_DATA`).

## Fontes {#sources}

[^e1]: NASA OCHMO-MTB-001, *Spaceflight Associated Neuro-ocular Syndrome (SANS)*, NASA-STD-3001 Medical Technical Brief, 2024-02-21. <https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf>
[^e2]: NASA Human System Risk Board, *Risk of in-mission and long-term Hearing Loss and Performance Decrements*, registro de risco Rev B. <https://www.nasa.gov/wp-content/uploads/2025/11/hsrb-hearing-loss-risk-record-rev-b-1-web.pdf>
[^e3]: NASA OCHMO-TB-035, *Acoustics*, NASA-STD-3001 Technical Brief, 2023-10-06. <https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-035-acoustics.pdf>
[^e4]: Limardo J., Allen C., Danielson R., *Status: Crewmember Noise Exposures on the ISS*, ICES 2015, NTRS 20150011048. <https://ntrs.nasa.gov/citations/20150011048>

## Próximos passos {#next-steps}

- [Fisiologia monitorada](/pt/science/monitored-physiology)
- [Alertas e escalonamento](/pt/intelligence/alerts)
- [Renderização da anatomia 3D](/pt/architecture/anatomy-3d)
