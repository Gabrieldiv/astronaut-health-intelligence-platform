---
title: Limitações e problemas conhecidos
description: Limitações científicas, de dados, da anatomia 3D, do motor, do produto e da plataforma da Astronaut Health Intelligence Platform, e problemas conhecidos com contorno.
status: IMPLEMENTED
origin: SIMULATED, REAL_PUBLIC
verified: 2026-11-15
---

# Limitações e problemas conhecidos

Esta página reúne o que a Astronaut Health Intelligence Platform (AHI) **não consegue fazer bem hoje**, por área. Ela complementa o [Uso responsável](/pt/overview/responsible-use), que diz o que a AHI **não deve** fazer.

## Ciência e dados

| Limitação | Consequência | Caminho |
| --- | --- | --- |
| Toda leitura de dispositivo é simulada | Nenhum resultado é evidência clínica | Replay real do EDA para a cabine e radiação ([Fontes da NASA](/pt/data/sources)) |
| Não existe telemetria fisiológica contínua pública de astronautas | Vitais continuam simulados mesmo no futuro próximo | Calibrar o simulador com faixas publicadas |
| Modelo fisiológico simplificado e não calibrado | Padrões reais podem ser diferentes | Calibração com literatura (P1) |
| Datasets reais: 4 pessoas, voo de 3 dias, sem amostras em voo | Não representam missões longas; não permitem afirmação estatística | Ampliar com outros estudos, sempre rotulados ([Catálogo](/pt/data/dataset-catalog)) |
| Licença dos datasets do OSDR não informada | Uso registrado como "not stated" | Acompanhar a fonte |
| NASA RadLab fora do ar (HTTP 500 em 14/11/2026) | Sem série real de dosimetria | Usar doses do EDA |
| Exames de olhos e audição são simulados; alguns níveis de mudança são configuração de demo | Os sinais de SANS e audição mostram o fluxo, não desempenho clínico | [Saúde ocular e audição](/pt/intelligence/eye-and-hearing#limitations) |
| A dose da missão é uma aproximação (dose absorvida vezes uma razão de qualidade de referência) | Não é o método de dose efetiva da NASA | [Perfis de missão](/pt/intelligence/mission-profiles#mission-radiation-dose) |
| Eventos do DONKI são só contexto da missão | O clima espacial nunca muda um status pessoal; o aviso lê só o tipo de evento e a classe da erupção | [Perfis de missão](/pt/intelligence/mission-profiles#space-weather-advisory) |

## Anatomia 3D

| Limitação | Consequência | Caminho |
| --- | --- | --- |
| Um único modelo de referência, em uma única escala, para todos os tripulantes. A fonte é um modelo adulto masculino; só a região da virilha foi neutralizada, então a constituição, as proporções e o tórax continuam os da fonte | O corpo nunca mostra anatomia individual, sexo, altura ou composição corporal. Não é um exame do astronauta | [Roadmap](/pt/resources/roadmap#anatomy-next-steps) (modelo feminino de referência) |
| Os indicadores se relacionam a um sistema do corpo, não a uma estrutura | A cor de status em uma estrutura marca o sistema dela; nunca é um achado naquela estrutura | [Mapeamento da anatomia para a saúde](/pt/architecture/data-model#anatomy-to-health-mapping) |
| 34 das 250 estruturas são só de contexto (dentes, medula espinhal e nervos, ureteres e bexiga, órgãos digestivos, glândulas, timo, baço) | Podem ser exploradas, mas não mostram informação de saúde | [Mapeamento da anatomia para a saúde](/pt/architecture/data-model#anatomy-to-health-mapping) |
| Os indicadores do cérebro são comportamentais e de autorrelato (sono, tempo de reação, check-in) | São indicadores relacionados de alerta e recuperação, nunca medidas neurológicas | [Mapeamento da anatomia para a saúde](/pt/architecture/data-model#anatomy-to-health-mapping) |
| O índice de hidratação mostrado com os rins vem dos registros de ingestão de líquidos | Não é uma medida da função renal | [Mapeamento da anatomia para a saúde](/pt/architecture/data-model#anatomy-to-health-mapping) |
| Rins são formas procedurais simples; sem geometria de ouvido (dois anéis de status representam os ouvidos) e sem estruturas reprodutivas; sem linfonodos, fáscias, ligamentos ou meninges | O atlas não é anatomicamente completo | [Assets de anatomia 3D](/pt/data/anatomy-assets#exclusions) |
| Sem texturas; malhas decimadas e estruturas pequenas agrupadas por região | Menos detalhe de superfície que a fonte; vértebras, costelas e dentes não podem ser selecionados um a um | [Assets de anatomia 3D](/pt/data/anatomy-assets#limitations) |
| Os rins ficam atrás dos intestinos na vista frontal | A região dos rins é mostrada pelas costas | [Anatomia 3D](/pt/architecture/anatomy-3d#limitations) |
| Não existe hover em telas de toque | No toque, um toque seleciona; pelo teclado, use o navegador do corpo | [Anatomia 3D](/pt/architecture/anatomy-3d#keyboard-body-navigator) |
| Se o atlas não carrega, aparece um corpo procedural simplificado | Os sistemas do corpo continuam funcionando; as estruturas isoladas, não | [Anatomia 3D](/pt/architecture/anatomy-3d#fallback) |
| Os arquivos de anatomia usam CC BY-SA 4.0, não MIT | Reutilizar exige atribuição e a mesma licença | [Assets de anatomia 3D](/pt/data/anatomy-assets#license-and-attribution) |

## Motor

| Limitação | Consequência |
| --- | --- |
| Limiares, pesos e tempos são configuração de demo | Nada é limite oficial nem foi calibrado ([Limiares](/pt/intelligence/thresholds)) |
| Avaliação contra o mesmo simulador | Resultados otimistas; consistência interna, não desempenho real |
| Contexto de atividade vem do cronograma | Atividade fora do plano pode ser comparada com o contexto errado |
| As regras de status são univariadas, mais três regras combinadas; o detector multivariado é experimental e informativo | Outros padrões multissinal só aparecem como nota, nunca como status |
| Noisy-OR trata regras como independentes | Sinais correlacionados podem somar mais de uma vez |
| Previsão univariada com parâmetros fixos | Cobertura real do intervalo de 80% não medida; horizontes longos (7 e 15 dias) são só tendência aproximada |
| Efeitos de intervenção e "e se" são hipotéticos | Não provam eficácia |
| Autorrelato simulado é um modelo de respostas | Não representa como pessoas reais respondem |
| Dias antigos da missão são sintetizados | Só os dias recentes vêm do histórico da simulação |
| Correlação não é causalidade | Coocorrências (como CO₂ e respiração) não explicam causa |

## Produto

| Limitação | Consequência |
| --- | --- |
| Interface em inglês | Decisão de projeto (júri internacional); a documentação também existe em português ([Idiomas](/pt/product/accessibility#languages)) |
| Pensado para telas de desktop (melhor em 1440x900 ou maior) | Em telas pequenas o layout fica apertado |
| Respostas do médico de voo são simuladas e fixas | Não há fluxo real de revisão |
| Sem notificação fora do app | Alertas só são vistos com o app aberto |
| Sem auditoria formal de acessibilidade nem teste com usuários | Usabilidade e acessibilidade não comprovadas ([Acessibilidade](/pt/product/accessibility#limitations)) |
| O assistente de demo usa um modelo em nuvem | Inaceitável em uma missão real (atraso, privacidade, certificação) ([Ask AHI](/pt/product/assistant#the-onboard-target)) |

## Plataforma

| Limitação | Consequência | Status do caminho |
| --- | --- | --- |
| O motor roda no navegador; o backend guarda observações mas ainda não roda o motor | O estado do app some ao recarregar | <StatusBadge status="PLANNED" /> porte do motor para Python ([Roadmap](/pt/resources/roadmap)) |
| Sem autenticação nem perfis de acesso | Qualquer pessoa com a página ou a API vê tudo | <StatusBadge status="PLANNED" /> |
| Auditoria só em memória | Some ao recarregar | <StatusBadge status="PLANNED" /> |
| Sem testes de componente nem de pixels da renderização 3D (a camada de dados e a lógica do visualizador são testadas) | Regressões visuais dependem de checagem manual ou de testes no navegador | <StatusBadge status="PLANNED" /> |
| Desempenho observado em um único notebook | Não é benchmark; outras máquinas, navegadores e telas não foram medidos | [Resultados](/pt/validation/results#desempenho-observado) |
| App sem implantação pública | Avaliadores precisam rodar localmente | Não planejado no repositório |

## Problemas conhecidos

| Sintoma | Causa | Contorno |
| --- | --- | --- |
| A primeira carga demora alguns segundos | Geração do histórico e download da anatomia 3D (cerca de 3 MB na vista padrão) | Normal |
| O corpo aparece simplificado, com o aviso "Reference atlas unavailable" | O atlas não carregou e o app usou o modelo de fallback | Confira `public/anatomy/` e rode `npm run anatomy:validate` |
| Padrões lentos não aparecem | Velocidade baixa | Use "1 h/s" ou a demo guiada |
| Preferências não ficam salvas | Janela anônima ou armazenamento bloqueado | Esperado: o app funciona sem `localStorage` |
| O corpo 3D não aparece ("3D body view unavailable") | Em geral, WebGL ou aceleração de hardware desligados | Ative a aceleração de hardware |
| Relação BUN/creatinina quase vazia no OSD-575 | `NA` na fonte | Exibido como está, sem imputação |
| OSD-575 tem ponto R+194 que a descrição não cita | Divergência na fonte | Exibido como no arquivo e sinalizado no manifesto |
| O model card gerado mostra 100,0% / 0,0% de tempo em LOW / MODERATE | Arredondamento | O valor exato é 99,97% / 0,03% ([Resultados](/pt/validation/results)) |

Mais soluções de problemas em [Configuração, comandos e problemas](/pt/engineering/quick-start#solucao-de-problemas).

## Próximos passos

- [Roadmap](/pt/resources/roadmap): o que resolve cada limitação.
- [Estratégia de validação](/pt/validation/strategy).
- [Model card](/pt/validation/model-card).
