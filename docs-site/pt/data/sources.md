---
title: Fontes de dados da NASA
description: As fontes públicas da NASA usadas ou investigadas pela Astronaut Health Intelligence Platform (clima espacial do DONKI, OSDR, EDA, RadLab, NLSP, Standard Measures, Artemis II) e o status de cada uma.
status: IMPLEMENTED
origin: REAL_PUBLIC
code:
  - frontend/web/scripts/osdr/discover.mjs
  - frontend/web/scripts/osdr/import.mjs
  - backend/app/modules/nasa/donki.py
  - backend/app/modules/nasa/osdr.py
  - frontend/web/src/data/nasa/donki-snapshot.json
  - frontend/web/src/lib/nasa/spaceWeather.ts
verified: 2026-11-15
---

# Fontes de dados da NASA

Esta página descreve as fontes públicas da NASA que a Astronaut Health Intelligence Platform (AHI) investigou, o que cada uma oferece e o status de uso. O detalhe dos dois datasets importados (arquivos, hashes, população, qualidade) fica no [Catálogo de datasets](/pt/data/dataset-catalog).

::: info Data da consulta
As consultas ao OSDR, EDA e RadLab foram feitas ao vivo em **14/11/2026 (UTC)**; o snapshot do DONKI foi obtido em **15/11/2026**. Nenhuma delas precisa de chave de API nem de autenticação. A disponibilidade pode mudar.
:::

::: warning ATENÇÃO
**Todo dado de dispositivo da tripulação no painel é `SIMULATED`.** Todo registro real da NASA na AHI é `REAL_PUBLIC` e serve como **contexto da missão ou referência**: os dois datasets do OSDR (OSD-569 e OSD-575) e os eventos de clima espacial do DONKI não são medidas desta tripulação, não calibram baselines, não treinam modelos, não definem limiares e não geram status nem alertas.
:::

## Status das fontes em 14/11/2026

| Fonte | Status | Uso na AHI |
| --- | --- | --- |
| [NASA DONKI](#donki-space-weather) | No ar, no novo host do CCMC (consulta em 15/11/2026) | <StatusBadge status="IMPLEMENTED" /> aviso de clima espacial, ao vivo pela AHI API ou por um snapshot empacotado |
| NASA OSDR | Validado, em uso | OSD-569 e OSD-575 importados como `REAL_PUBLIC`; busca de estudos ao vivo pela AHI API |
| NASA EDA | Validado, ainda não importado | Prioridade P0: replay real do ambiente da ISS |
| NASA RadLab | Fora do ar (HTTP 500) | Usar doses do EDA enquanto isso |
| NASA Life Sciences Portal (NLSP) | Portal no ar, acesso por recurso | Possível caminho para sono e cognição de estudos análogos |
| NASA Standard Measures | Referência de domínio, não é dataset | Justificar o catálogo de métricas |
| Artemis II Standard Measures | Referência do que está planejado | Não assumir dados abertos |
| NASA HRP (cinco perigos) | Referência | Enquadrar cada domínio de dado em um perigo |

## Clima espacial do DONKI {#donki-space-weather}

O DONKI (Space Weather Database Of Notifications, Knowledge, Information) é mantido pelo Community Coordinated Modeling Center (CCMC), no NASA Goddard. A AHI usa quatro dos seus feeds para montar o [aviso de clima espacial](/pt/intelligence/mission-profiles#space-weather-advisory).

| Item | Valor |
| --- | --- |
| Endpoints | `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{FLR,SEP,CME,GST}?startDate=yyyy-MM-dd&endDate=yyyy-MM-dd` (erupções solares, partículas solares energéticas, ejeções de massa coronal, tempestades geomagnéticas) |
| Host novo | O CCMC desativou o antigo host `kauai.ccmc.gsfc.nasa.gov`; os caminhos depois de `/DONKI/` não mudaram. O backend usa o host novo |
| Chave | Não precisa |
| Caminho ao vivo | `GET /api/v1/space-weather?days=30` na [AHI API](/pt/architecture/backend), com cache de 15 min; se qualquer um dos quatro feeds falhar, responde 502, nunca uma lista parcial que pareceria "sem tempestades" |
| Caminho offline | Snapshot real empacotado em `frontend/web/src/data/nasa/donki-snapshot.json` |
| Atualização | `python -m app.cli donki-snapshot` em `backend` |

**O snapshot empacotado** tem **105 eventos reais**, obtidos em 15/11/2026 às 04:06 UTC para os 30 dias anteriores: 90 ejeções de massa coronal, 14 erupções solares, 1 tempestade geomagnética (Kp 6) e 0 eventos de partículas solares energéticas. O app diz se mostra o snapshot ou dados ao vivo e quando os dados foram obtidos.

## NASA OSDR (Open Science Data Repository)

Principal repositório de ciências da vida espacial: estudos, arquivos, metadados ISA, missões, sujeitos e biospecimens.

- Portal: https://osdr.nasa.gov/bio/repo/
- Documentação da API: https://www.nasa.gov/osdr-api/

### Como a descoberta foi feita

| Etapa | Endpoint | Observações |
| --- | --- | --- |
| Busca | `https://osdr.nasa.gov/osdr/data/search?term=<termo>&type=cgene&from=0&size=100` | 14 termos, resultados deduplicados por accession |
| Metadados do estudo | `https://osdr.nasa.gov/osdr/data/osd/meta/<n>` | Metadados ISA: descrição, fatores, protocolos, amostras, sexo, missão |
| Lista de arquivos | `https://osdr.nasa.gov/osdr/data/osd/files/<n>` | Nomes, tamanhos, categorias, caminho de download |
| Conferência | `https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/<OSD>/` e `.../files/` | A Biological Data API devolve os mesmos metadados e URLs |
| Política de acesso | `https://science.nasa.gov/reference/osdr-faq/` | Veja [Licença e acesso](/pt/data/dataset-catalog#licenca-e-acesso) |

Outros endpoints úteis: `https://osdr.nasa.gov/geode-py/ws/api/{missions,payloads,hardware,subjects,biospecimens,experiments}`.

Contagem de resultados informada pela API: human 227, astronaut 68, Inspiration4 8, crew 87, spaceflight 395, physiology 23, sleep 3, cardiovascular 28, immune 74, blood 146, "Homo sapiens" 120, "complete blood count" 6, "metabolic panel" 0, cytokine 7. Nos 100 primeiros resultados de cada termo: **367 estudos únicos, 110 com organismo Homo sapiens**. A maioria são culturas de células, organoides, tissue chips ou análogos de solo, não astronautas.

::: tip DICA
**A busca do OSDR não indexa tudo.** OSD-575 e OSD-656 não apareceram em nenhuma busca, embora existam e sejam públicos. Foram achados pela lista de "related studies" nas descrições do OSD-569 e do OSD-575. Sempre leia as descrições.
:::

Não foram encontrados: sinais fisiológicos contínuos de astronautas (ECG, FC, SpO₂), arquivos de sono ou actigrafia de astronautas, nem telemetria de cabine como dado humano.

OSD-569 e OSD-575 foram escolhidos e importados. Os motivos, os candidatos rejeitados e as regras do parser estão no [Catálogo de datasets](/pt/data/dataset-catalog).

### Busca de estudos ao vivo {#live-study-search}

Com a AHI API rodando, o diálogo Data and model pode buscar estudos humanos do OSDR ao vivo (`GET /api/v1/nasa/osdr/studies?q=`, apoiado em `https://osdr.nasa.gov/osdr/data/search` filtrado para *Homo sapiens*). Ele devolve accession, título, link do estudo, tipo de projeto, missão e data de publicação. No modo demo offline a busca não aparece.

## NASA EDA (Environmental Data Application)

Telemetria ambiental real da cabine da ISS (CO₂, temperatura, umidade) e dose de radiação, nos períodos de missões de pesquisa da ISS.

- Portal: https://visualization.osdr.nasa.gov/eda/
- API: `https://visualization.osdr.nasa.gov/eda/api/missions/` lista **24 missões de payload**:
  - Rodent Research: RR-1, RR-3 a RR-10, RR-12, RR-17 a RR-20, RR-22, RR-23, RR-25, RR-28;
  - APEX-03-1, APEX-03-2, APEX-04;
  - VEG-01A, VEG-01B, VEG-01C.
- Cada registro da API traz **só metadados** (`name`, `title`, `description`, `link`). **Não há série temporal pela API.**
- A telemetria sai pela interface, na aba **Data Tables**, com download em CSV (a página cita "EDA_Telemetry_data").
- Campos vistos na página: `CO2_ppm_ISS` e `CO2_ppm_Ground` (cabine e controle em solo), temperatura, umidade e doses de radiação (GCR e SAA, mais a dose acumulada, "doses in water").

Cuidados:

- Nem toda missão tem CO₂. A página informa a disponibilidade por missão (por exemplo APEX-03-1, APEX-03-2, APEX-04, RR-18, VEG-01A e VEG-01C).
- As missões são de **roedores e plantas**: o dado é da cabine da ISS naquele período, válido como referência ambiental real, **não é dado de tripulação**.
- `CO2_ppm_Ground` é controle em solo: não deve ser importado como cabine.

## NASA RadLab

- Portal: https://visualization.osdr.nasa.gov/radlab/gui/overview/
- **Status em 14/11/2026: HTTP 500** em `/radlab/`, `/radlab/gui/` e `/radlab/api/`.
- O RadLab reúne dados de dosimetria de vários instrumentos e agências, com seleção de instrumento e período. Quando voltar, falta verificar instrumentos com cobertura da ISS, unidade e formato de download. Enquanto isso, a referência são as doses do EDA.

## NASA Life Sciences Portal (NLSP)

- Portal: https://nlsp.nasa.gov/
- Portal de descoberta de dados históricos de ciências da vida e saúde humana (LSDA, HRP), inclusive estudos análogos.
- Uso: busca manual por sono, actigrafia, cognição, HERA e repouso no leito. **Não se assume API.** Muitos datasets exigem pedido formal; esses ficam registrados como "acesso sob pedido", sem baixar nada restrito.

## NASA Standard Measures e Artemis II

- Standard Measures: https://www.nasa.gov/reference/standard-measures/
- O conjunto padronizado de medidas que a NASA coleta antes, durante e depois das missões: atividade e luz por sensor de pulso, relatos de sono, amostras ligadas a dieta e nutrição, saliva e função imune, testes cognitivos, testes sensório-motores e de equilíbrio, força e microbioma.
- Uso na AHI: **justificar o catálogo de métricas**. Não é um dataset. O contexto científico das medidas está em [Monitoramento de saúde em missões](/pt/science/health-monitoring-in-missions).
- Artemis II Standard Measures: https://www.nasa.gov/reference/artemis-ii-standard-measures/ (mostra o que está planejado; não se assume dado aberto).

## NASA HRP: os cinco perigos

Referência: https://www.nasa.gov/hrp/hazards/. A ciência de cada perigo está em [Riscos à saúde em voos espaciais](/pt/science/spaceflight-hazards).

Uso na AHI: enquadrar cada domínio de dado em um perigo. O mapeamento perigo para funcionalidade está na [Introdução](/pt/overview/introduction#o-problema).

## Próximos passos

- [Catálogo de datasets](/pt/data/dataset-catalog): OSD-569 e OSD-575 em detalhe.
- [Pipeline, normalização e qualidade](/pt/data/pipeline-and-quality): como um dataset novo entra no app.
- [Recursos da NASA e técnicos](/pt/resources/nasa-resources): todos os links oficiais.
