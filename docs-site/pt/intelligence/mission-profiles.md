---
title: Perfis de missão, radiação e clima espacial
description: Os quatro perfis de missão citados da Astronaut Health Intelligence Platform (lançamento, ISS, Lua, trânsito para Marte), a estimativa de dose de radiação da missão frente ao limite de carreira da NASA e o aviso de clima espacial baseado em eventos reais do NASA DONKI.
status: IMPLEMENTED
origin: SIMULATED, DERIVED, REAL_PUBLIC
code:
  - frontend/web/src/engine/missions/profiles.ts
  - frontend/web/src/engine/missions/sources.ts
  - frontend/web/src/engine/missions/dose.ts
  - frontend/web/src/engine/missions/spaceWeather.ts
  - frontend/web/src/features/mission/MissionContext.tsx
  - frontend/web/src/features/mission/backdrops/facts.ts
  - frontend/web/src/features/mission/backdrops/MissionBackdrop.tsx
tests:
  - frontend/web/src/engine/missions/missions.test.ts
  - frontend/web/src/state/missionProfile.test.ts
verified: 2026-11-15
---

# Perfis de missão, radiação e clima espacial

## O que faz {#what-it-does}

A mesma tripulação, os mesmos dispositivos e o mesmo motor podem ser lidos em quatro cenários de missão. Um **perfil de missão** diz onde a tripulação está: quanta radiação a cabine recebe, qual a gravidade, a que distância está a Terra, quanto tempo uma mensagem leva e quem precisa agir primeiro. O perfil muda a taxa do dosímetro simulado, a estimativa de dose acumulada, o texto de autonomia e o aviso de clima espacial. Ele não muda as baselines pessoais, as regras de anomalia nem a fórmula de risco.

Os perfis são **independentes dos cenários** ([Cenários de demo](/pt/product/demo-scenarios)): um cenário roteiriza o que acontece com um tripulante, um perfil define o ambiente ao redor.

::: info Onde encontrar no app
O seletor de perfil fica na barra superior. A visão de **contexto da missão** ("mission context") mostra os perigos do perfil, valores de referência com fontes, a barra de dose da missão e o aviso de clima espacial. O palco 3D também mostra um [cenário](#mission-backdrops) do perfil ativo.
:::

## Os quatro perfis {#the-four-profiles}

Cada valor abaixo está guardado em `profiles.ts` com o id da sua fonte; a lista de fontes (com a frase curta exata usada) está em `sources.ts` e no fim desta página.

| Perfil | Referência de radiação | Gravidade | Distância e atraso de ida | Duração típica | Quem age primeiro |
| --- | --- | --- | --- | --- | --- |
| Lançamento e subida | Desprezível nos minutos de subida | Até cerca de 3 g (+3 Gx) na subida, depois imponderabilidade[^m10] | Da plataforma à órbita baixa, atraso perto de zero | Cerca de 8,5 min de voo propulsado[^m9] | Mission Control em tempo quase real |
| ISS (órbita baixa) | Até 286 µGy/dia absorvidos, 647 µSv/dia de dose equivalente (DOSIS 3D, Columbus, maio de 2016)[^m3] | Imponderabilidade | Cerca de 400 km, tempo quase real[^m5] | Cerca de seis meses[^m6] | Mission Control em tempo quase real: a tripulação pode perguntar antes de agir |
| Lua (classe Artemis) | 13,2 µGy/h absorvidos, 1369 µSv/dia de dose equivalente na superfície lunar (Chang'E 4 LND)[^m4] | 0,165 g na superfície[^m7] | Cerca de 384.400 km em média, cerca de 1,3 s[^m7] | Cerca de 9 dias (Artemis II: 9 d 1 h 32 min)[^m8] | Atraso curto: o solo apoia, mas a ajuda está a dias de distância |
| Trânsito para Marte | 481 µGy/dia absorvidos, 1,8 mSv/dia de dose equivalente em cruzeiro (MSL RAD)[^m1][^m2] | Imponderabilidade | Cerca de 4 a 24 min de ida[^m11] | 253 dias de ida (cruzeiro do MSL)[^m2] | A tripulação age primeiro; o solo revisa depois |

Os tempos de luz de ida para a ISS e a Lua são calculados a partir da distância (o código diz isso ao lado do valor). O atraso de Marte vem da página de comunicações da NASA[^m11].

## Dose de radiação da missão {#mission-radiation-dose}

Os dosímetros pessoal e de área simulados seguem o perfil:

- **ISS:** a forma orbital do modelo de cabine (modulação por latitude e passagens pela Anomalia do Atlântico Sul) escalada para que a média de longo prazo seja a referência da ISS.
- **Lua e trânsito para Marte:** os raios cósmicos galácticos são estáveis no espaço profundo, então a taxa é a média de referência com uma oscilação lenta e um pouco de ruído (configuração de demo).
- **Lançamento:** uma ordem de grandeza do fundo de radiação em solo (configuração de demo).

A **dose acumulada da missão** é mostrada frente ao **limite oficial de carreira da NASA: dose efetiva total de carreira abaixo de 600 mSv, igual para todas as idades e sexos** (NASA-STD-3001 Volume 1 Revisão C, requisito [V1 4030])[^m12]. O limite por evento de partículas solares (abaixo de 250 mSv, [V1 4031]) é citado do technical brief de radiação[^m13].

::: warning Aproximação, não o método da NASA
A dose efetiva mostrada é a **dose absorvida vezes a razão de qualidade de referência do perfil** (dose equivalente dividida pela dose absorvida da mesma medição publicada). É uma aproximação para apoio à decisão. O método de dose efetiva da NASA usa o modelo Q da NASA e um fantoma de referência; a AHI não o implementa.
:::

Dose típica da missão (taxa de referência vezes a duração típica, arredondada, a partir dos valores citados acima):

| Perfil | Dose típica da missão | Parcela do limite de carreira de 600 mSv |
| --- | --- | --- |
| Lançamento e subida | Desprezível | cerca de 0% |
| ISS, cerca de 182 dias | cerca de 118 mSv | cerca de 20% |
| Lua, cerca de 9 dias | cerca de 12 mSv | cerca de 2% |
| Trânsito para Marte, ida, 253 dias | cerca de 455 mSv | cerca de 76% |

Esses números são aritmética sobre médias publicadas, não uma previsão para uma tripulação real. A faixa publicada de dose efetiva diária de tripulações da ISS é de cerca de 0,2 a 0,5 mSv ou mais por dia[^m14], o que engloba o número da ISS.

## Aviso de clima espacial {#space-weather-advisory}

O aviso lê **eventos públicos reais do NASA DONKI** ([Fontes de dados da NASA](/pt/data/sources#donki-space-weather)) no contexto do perfil ativo. É contexto de missão: nunca alimenta uma baseline pessoal, um status ou um alerta.

| Condição | Lançamento | ISS | Lua | Trânsito para Marte |
| --- | --- | --- | --- | --- |
| Um evento de partículas energéticas solares (SEP) ou uma erupção classe X[^m15] começou nas últimas 72 h (janela de demo) | Nota de clima espacial pré-lançamento para a equipe de lançamento | Nota de monitoramento: o campo magnético da Terra blinda a maior parte, siga o controle de voo | **Ir para o abrigo contra tempestade de radiação** ("Move to the radiation storm shelter"; ação a bordo, não espera a Terra) | **Ir para o abrigo contra tempestade de radiação** |
| Nenhum evento significativo | Calmo | Calmo | Calmo | Calmo |
| Ainda sem dados | "Desconhecido" | "Desconhecido" | "Desconhecido" | "Desconhecido" |

A falta de dados de clima espacial nunca aparece como "tudo certo". Cada aviso aponta para o evento DONKI mais recente que o disparou e informa quando os dados foram obtidos e se vieram da API ao vivo ou do snapshot embutido.

A janela de 72 horas e o corte "classe X" são configuração de demo em `config.ts` (`SPACE_WEATHER`), não limites oficiais. O texto do abrigo segue o procedimento geral de tripulação descrito pela NASA; não é uma instrução médica.

## Cenários da missão {#mission-backdrops}

Atrás do corpo 3D, o palco mostra uma cena do perfil ativo: a plataforma de lançamento com a pluma da subida, a Terra vista da órbita baixa, a superfície lunar, ou o arco de transferência da Terra a Marte com a nave. É contexto e decoração; nunca carrega um status de saúde. Um chip compacto mostra o nome do perfil e dois ou três fatos. **Todo número do chip é lido da tabela citada dos perfis acima** (`facts.ts`); o cenário não acrescenta nenhum valor de referência novo.

| Perfil | Fatos do chip | Elemento extra |
| --- | --- | --- |
| Lançamento e subida | Até 3 g, 8,5 min de voo propulsado[^m9][^m10] | Medidor do pico de g: o pico de referência citado, não uma leitura ao vivo |
| ISS | 400 km de altitude, sem peso, 0,65 mSv/dia[^m3][^m5] | Progresso da órbita no relógio simulado, período de cerca de 92 min (derivado, veja abaixo) |
| Lua | 0,165 g, 384.400 km da Terra, atraso de 1,3 s[^m7] | nenhum |
| Trânsito para Marte | 1,8 mSv/dia, atraso de 4 a 24 min[^m2][^m11] | Posição da nave no arco: o dia de missão simulado sobre o trânsito citado de 253 dias[^m2] |

O período orbital da ISS é **derivado**, não citado: uma órbita circular na altitude citada de 400 km, com a terceira lei de Kepler, o raio médio da Terra (6371 km) e o parâmetro gravitacional da Terra (398.600 km³/s²)[^m16], dá cerca de 92 minutos. O atraso da Lua é a distância média dividida pela velocidade da luz. Os números seguem o idioma escolhido na interface. Como o cenário é desenhado: [Anatomia 3D](/pt/architecture/anatomy-3d#mission-backdrop).

### O que o perfil altera

O chip é um botão: abre o painel Missão e link com a Terra, que agora começa com **O que o perfil de missão altera**. O perfil altera apenas o lado do ambiente e da comunicação na simulação:

- a **radiação** lida pelos dosímetros e a dose da missão em relação ao limite de carreira da NASA;
- o **link com a Terra**: o atraso das mensagens e quem decide primeiro (tripulação ou solo);
- as **recomendações**: frases de contexto extras onde o ambiente torna uma regra mais relevante;
- o **aviso de clima espacial**: abrigo na Lua e em trânsito a Marte, monitoramento na ISS, a partir de eventos reais do NASA DONKI;
- o **cenário e o chip** no palco 3D.

Ele **não** altera os sinais vitais, o sono nem o exercício simulados dos astronautas: eles seguem o cenário de demonstração escolhido e a linha de base de cada pessoa.

## Limitações {#limitations}

- Um valor de referência por perfil; as taxas reais variam com o ciclo solar, a blindagem e o local no veículo.
- A dose efetiva é uma aproximação (veja o aviso acima).
- O aviso olha só o tipo de evento e a classe da erupção, não previsões de fluxo de partículas.
- Os perfis não mudam a fisiologia: a tripulação simulada responde aos cenários, não ao nível de gravidade.

## Status {#status}

<StatusBadge status="IMPLEMENTED" /> Perfis, dose e aviso são cobertos por `missions.test.ts` (valores citados presentes, limite de carreira, aritmética da dose, aviso por perfil, caso sem dados) e `missionProfile.test.ts` (ligação com o store).

## Fontes {#sources}

[^m1]: Zeitlin C. et al. 2013. Measurements of Energetic Particle Radiation in Transit to Mars on the Mars Science Laboratory. *Science* 340(6136):1080-1084. <https://doi.org/10.1126/science.1235989>. Taxa de dose absorvida em cruzeiro de 481 µGy/dia (como citada por Guo et al. 2015, <https://arxiv.org/abs/1503.06631>, que a reavalia para 458 µGy/dia).
[^m2]: Southwest Research Institute 2013, comunicado de imprensa do MSL RAD: 1,8 mSv/dia de dose equivalente média de GCR em cruzeiro, viagem de 253 dias. <https://www.swri.org/newsroom/press-releases/swri-led-team-calculates-the-radiation-exposure-associated-trip-mars>
[^m3]: Berger T. et al. 2017. DOSIS & DOSIS 3D: radiation measurements with the DOSTEL instruments onboard the Columbus Laboratory of the ISS in the years 2009-2016. *J. Space Weather Space Clim.* 7, A8. <https://elib.dlr.de/111501>
[^m4]: Zhang S. et al. 2020. First measurements of the radiation dose on the lunar surface. *Science Advances* 6(39):eaaz1334. <https://doi.org/10.1126/sciadv.aaz1334>
[^m5]: NASA, Why do research on the International Space Station. <https://www.nasa.gov/missions/station/iss-research/why-do-research-on-the-international-space-station/>
[^m6]: NASA, FAQ: the real story about astronaut health care in space. <https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/>
[^m7]: NASA NSSDC, Moon Fact Sheet (gravidade na superfície, distância média de 384.400 km). <https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html>
[^m8]: NASA, página da missão Artemis II. <https://www.nasa.gov/mission/artemis-ii/>
[^m9]: NASA, motores principais do Space Shuttle (cerca de 8,5 minutos de voo propulsado). <https://www.nasa.gov/space-shuttle-recordation/engines/>
[^m10]: Bagian J. P. et al. 1993, NASA Technical Reports Server 19940019731 (aceleração na subida até cerca de +3 Gx). <https://ntrs.nasa.gov/citations/19940019731>
[^m11]: NASA, Space Communications: 7 Things You Need to Know (atraso de Marte de cerca de 4 a 24 minutos). <https://www.nasa.gov/solar-system/space-communications-7-things-you-need-to-know/>
[^m12]: NASA-STD-3001 Volume 1 Revisão C, Crew Health, requisito [V1 4030]. <https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf>
[^m13]: NASA OCHMO-TB-020 Rev. E, Design for Ionizing Radiation Protection ([V1 4031], limite por evento de partículas solares). <https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf>
[^m14]: Shavers M. et al. 2024. Space agency-specific standards for crew dose and risk assessment of ionising radiation exposures for the International Space Station. *Z Med Phys* 34(1):14-30. <https://pmc.ncbi.nlm.nih.gov/articles/PMC10919966>
[^m15]: NOAA Space Weather Prediction Center, Solar flares (radio blackouts): letras de classe das erupções pelo pico de fluxo de raios X. <https://www.spaceweather.gov/phenomena/solar-flares-radio-blackouts>
[^m16]: NASA NSSDC, Earth Fact Sheet (raio médio volumétrico de 6371 km, GM de 0,39860 x 10^6 km³/s²). <https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html>

## Próximos passos {#next-steps}

- [Radiação e ambiente da cabine](/pt/science/radiation-and-environment): a ciência por trás dos perigos.
- [Fontes de dados da NASA](/pt/data/sources): o DONKI e o snapshot embutido.
- [Recomendações, autonomia e what-if](/pt/intelligence/recommendations): quem pode agir e quando.
