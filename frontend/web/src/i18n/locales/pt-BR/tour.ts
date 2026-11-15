// Portuguese (Brazil): machine assisted translation, pending native review.
import type en from '../en/tour'

const m: Record<keyof typeof en, string> = {
  'tour.dialogAria': 'Demo guiada, passo {n} de {total}: {title}',
  'tour.heading': 'Demo guiada',
  'tour.autoPause': 'Pausar a reprodução automática',
  'tour.autoStart': 'Reprodução automática: avança a cada poucos segundos',
  'tour.auto': 'Auto',
  'tour.exit': 'Sair da demo (Esc)',
  'tour.stepsAria': 'Passos da demo',
  'tour.stepAria': 'Passo {n}: {title}',
  'tour.back': 'Voltar',
  'tour.finish': 'Concluir',
  'tour.next': 'Próximo',
  'tour.keysHint': '{left}{right} para mudar de passo, {esc} para sair. Ao sair, volta a um dia nominal.',
  'tour.step.crew.title': 'Conheça a tripulação',
  'tour.step.crew.caption': 'Quatro astronautas, cada um comparado com o próprio normal. Cada cartão diz em palavras simples como a pessoa está: Tudo bem, Fique de olho, Agir em breve ou Agir agora.',
  'tour.step.body.title': 'O corpo num relance',
  'tour.step.body.caption':
    'A anatomia 3D está ligada aos dados ao vivo. Órgãos que precisam de atenção acendem na cor do seu estado. O coração bate na frequência cardíaca ao vivo e os pulmões respiram no ritmo respiratório ao vivo.',
  'tour.step.body.hint': 'Clique em qualquer estrutura: o painel mostra os dados dela ou avisa que ela aparece só como referência.',
  'tour.step.acute.title': 'Evento cardíaco agudo',
  'tour.step.acute.caption': 'A frequência cardíaca de ORION dispara enquanto o oxigênio no sangue cai. Em poucos minutos simulados surge um alerta CRITICAL, que é escalonado se ninguém o confirmar.',
  'tour.step.actions.title': 'O que fazer e quem pode fazer',
  'tour.step.actions.caption':
    'Cada ação explica o porquê e se a tripulação pode agir a bordo agora ou precisa do médico de voo. Marcar como feito registra a ação na trilha de auditoria e a simulação mostra uma recuperação hipotética.',
  'tour.step.actions.hint': 'Experimente marcar como feito o protocolo de descanso.',
  'tour.step.comms.title': 'Longe da Terra',
  'tour.step.comms.caption': 'Agora imagine a mesma tripulação perto de Marte, a 22 minutos de distância em cada sentido. Qualquer resposta da Terra leva pelo menos 44 minutos, por isso o AHI coloca as ações a bordo em primeiro lugar e mostra a espera.',
  'tour.step.fatigue.title': 'Mudança lenta: cansaço progressivo',
  'tour.step.fatigue.caption': 'Avanço rápido a 1 hora por segundo. LYRA dorme menos e a variabilidade cardíaca dela cai abaixo do próprio normal. A linha do tempo mostra o estado mudando ao longo dos dias.',
  'tour.step.normal.title': 'O normal dela, não uma média',
  'tour.step.normal.caption': 'A faixa sombreada é o normal pessoal de LYRA. Marcadores no gráfico mostram alertas, ações registradas e check-ins, e o cone tracejado é a previsão.',
  'tour.step.normal.hint': 'O (i) ao lado de "Seu normal" explica como ele foi aprendido.',
  'tour.step.whatif.title': 'E se ela seguir a orientação?',
  'tour.step.whatif.caption': 'Compare as próximas horas com e sem a ação, lado a lado. É uma projeção hipotética, nunca uma promessa de efeito clínico.',
  'tour.step.crewview.title': 'Visão da tripulação: para o astronauta',
  'tour.step.crewview.caption': 'Os mesmos dados para a própria pessoa: palavras simples, as duas principais coisas a fazer, sinais vitais grandes comparados com o próprio normal e um check-in diário de 30 segundos.',
  'tour.step.tools.title': 'Ferramentas da missão',
  'tour.step.tools.caption':
    'O menu Ferramentas reúne a visão geral da missão a longo prazo (orçamento de radiação, exercício, sono), um relatório de passagem para o próximo turno e a origem de cada número. Todos os dados aqui são simulados e identificados.',
}
export default m
