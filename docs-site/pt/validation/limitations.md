---
title: Limitações e problemas conhecidos
description: Limitações científicas, de dados, do motor, do produto e da plataforma da Astronaut Health Intelligence Platform, e problemas conhecidos com contorno.
status: IMPLEMENTED
origin: SIMULATED, REAL_PUBLIC
verified: 2026-11-14
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
| Olhos não monitorados | SANS fora do escopo | Exames periódicos no [roadmap](/pt/resources/roadmap) |

## Motor

| Limitação | Consequência |
| --- | --- |
| Limiares, pesos e tempos são configuração de demo | Nada é limite oficial nem foi calibrado ([Limiares](/pt/intelligence/thresholds)) |
| Avaliação contra o mesmo simulador | Resultados otimistas; consistência interna, não desempenho real |
| Contexto de atividade vem do cronograma | Atividade fora do plano pode ser comparada com o contexto errado |
| Detecção univariada, mais três regras combinadas | Padrões multivariados novos não são vistos |
| Noisy-OR trata regras como independentes | Sinais correlacionados podem somar mais de uma vez |
| Previsão univariada com parâmetros fixos | Cobertura real do intervalo de 80% não medida |
| Efeitos de intervenção e "e se" são hipotéticos | Não provam eficácia |
| Autorrelato simulado é um modelo de respostas | Não representa como pessoas reais respondem |
| Dias antigos da missão são sintetizados | Só os dias recentes vêm do histórico da simulação |
| Correlação não é causalidade | Coocorrências (como CO₂ e respiração) não explicam causa |

## Produto

| Limitação | Consequência |
| --- | --- |
| Interface só em inglês | Decisão de projeto (júri internacional) |
| Pensado para telas de desktop (melhor em 1440x900 ou maior) | Em telas pequenas o layout fica apertado |
| Respostas do médico de voo são simuladas e fixas | Não há fluxo real de revisão |
| Sem notificação fora do app | Alertas só são vistos com o app aberto |
| Sem auditoria formal de acessibilidade nem teste com usuários | Usabilidade e acessibilidade não comprovadas |

## Plataforma

| Limitação | Consequência | Status do caminho |
| --- | --- | --- |
| Sem backend, API ou banco | Nada persiste; recarregar reinicia a simulação | <StatusBadge status="PLANNED" /> |
| Sem autenticação nem controle de acesso | Qualquer pessoa vê tudo | <StatusBadge status="PLANNED" /> |
| Auditoria só em memória | Some ao recarregar | <StatusBadge status="PLANNED" /> |
| Sem testes de componente, 3D ou ponta a ponta | Regressões visuais dependem de checagem manual | <StatusBadge status="PLANNED" /> |
| App sem implantação pública | Avaliadores precisam rodar localmente | Não planejado no repositório |

## Problemas conhecidos

| Sintoma | Causa | Contorno |
| --- | --- | --- |
| A primeira carga demora alguns segundos | Geração do histórico e da geometria 3D | Normal; visitas seguintes usam cache em produção |
| Padrões lentos não aparecem | Velocidade baixa | Use "1 h/s" ou a demo guiada |
| Preferências não ficam salvas | Janela anônima ou armazenamento bloqueado | Esperado: o app funciona sem `localStorage` |
| O corpo 3D não aparece | WebGL ou aceleração de hardware desligados | Ative a aceleração de hardware |
| Relação BUN/creatinina quase vazia no OSD-575 | `NA` na fonte | Exibido como está, sem imputação |
| OSD-575 tem ponto R+194 que a descrição não cita | Divergência na fonte | Exibido como no arquivo e sinalizado no manifesto |
| O model card gerado mostra 100,0% / 0,0% de tempo em LOW / MODERATE | Arredondamento | O valor exato é 99,97% / 0,03% ([Resultados](/pt/validation/results)) |

Mais soluções de problemas em [Configuração, comandos e problemas](/pt/engineering/quick-start#solucao-de-problemas).

## Próximos passos

- [Roadmap](/pt/resources/roadmap): o que resolve cada limitação.
- [Estratégia de validação](/pt/validation/strategy).
- [Model card](/pt/validation/model-card).
