//
// ATLAS TECNOLOGIA — Disparo de outbound
// Google Apps Script vinculado à planilha de contatos.
//
// PLANILHA (aba "Contatos"), primeira linha = cabeçalho:
//   A  email
//   B  nome
//   C  status        preenchido pelo script
//   D  enviado_em    preenchido pelo script
//   E  thread_id     preenchido pelo script
//   F  etapa         1 = e-mail 1 · 2 = follow-up · 3 = encerramento
//   G  observacao    motivo de pulo ou erro
//
// O TEMPLATE não fica aqui dentro. Fica num RASCUNHO do Gmail, para você
// editar o HTML no próprio Gmail sem mexer em código. O script lê o rascunho
// pelo assunto definido em ASSUNTO_RASCUNHO.
//
// Use {{nome}} no corpo do rascunho. O script troca pelo PRIMEIRO nome.
//

// ============================== CONFIGURAÇÃO ==============================

var CFG = {
  ABA: 'Contatos',

  // Assunto exato do rascunho no Gmail que serve de template.
  ASSUNTO_RASCUNHO: 'TEMPLATE Atlas Outbound',

  // Assunto real que vai para o destinatário.
  ASSUNTO_ENVIO: 'O dado existe. A decisão é que demora.',

  // Teto por execução manual pelo menu. O automático usa a rampa abaixo.
  MAX_POR_EXECUCAO: 20,

  // Intervalo entre envios, em segundos. Evita rajada.
  PAUSA_SEGUNDOS: 8,

  // --- agendamento automático ---
  // Só dispara de segunda a sexta. Fim de semana não gera resposta B2B
  // e concentra reclamação de spam.
  // Deixe vazio se o script foi criado por Extensões → Apps Script de dentro
  // da planilha. Preencha com o ID da URL (entre /d/ e /edit) se o projeto
  // for avulso — sem isso, getActiveSpreadsheet() devolve null.
  PLANILHA_ID: '',

  SOMENTE_DIAS_UTEIS: true,

  // Janela de envio, hora cheia. 9 às 17 = nove execuções por dia.
  HORA_INICIO: 9,
  HORA_FIM: 17,

  // Rampa de aquecimento: teto POR DIA em cada semana de campanha.
  // Domínio novo em disparo frio queima rápido; subir devagar é o que
  // protege a reputação. Depois da última faixa, mantém o último valor.
  RAMPA_DIARIA: [20, 40, 60, 100],

  // Relatório diário no fim da janela.
  ENVIAR_RELATORIO: true,

  DIAS_FOLLOWUP_1: 3,
  DIAS_FOLLOWUP_2: 7,

  // Intervalo mínimo entre DOIS e-mails para o mesmo contato.
  // Impede que follow-up 1 e 2 saiam colados quando a campanha
  // ficou parada e a régua de D+3 / D+7 já venceu.
  INTERVALO_MINIMO_DIAS: 3,

  // Anexo. Prefira deixar false e usar link no corpo.
  ANEXAR_PDF: false,
  ID_PDF_DRIVE: '',           // id do arquivo no Drive, se ANEXAR_PDF = true

  NOME_REMETENTE: 'Sérgio Lavezo',

  // Prefixos de caixa compartilhada: não têm dono, não respondem.
  PREFIXOS_GENERICOS: [
    'contato', 'comercial', 'sac', 'atendimento', 'vendas', 'suporte',
    'financeiro', 'rh', 'marketing', 'info', 'faleconosco', 'no-reply',
    'noreply', 'newsletter', 'cobranca', 'juridico'
  ]
};

var COL = { EMAIL: 1, NOME: 2, STATUS: 3, ENVIADO: 4, THREAD: 5, ETAPA: 6, OBS: 7 };

// ================================ MENU ====================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Atlas Outbound')
    .addItem('1. Validar planilha (não envia)', 'validarPlanilha')
    .addItem('2. Conferir links do template', 'conferirLinks')
    .addItem('3. Enviar lote agora', 'enviarLote')
    .addItem('4. Enviar follow-ups agora', 'enviarFollowUps')
    .addSeparator()
    .addItem('▶  Ligar automação', 'criarGatilhos')
    .addItem('⏸  Pausar automação', 'pausarAutomacao')
    .addSeparator()
    .addItem('Ver status da campanha', 'verStatus')
    .addItem('Ver quota restante hoje', 'mostrarQuota')
    .addToUi();
}

function mostrarQuota() {
  avisar_(
    'Quota do Gmail\n\n' + MailApp.getRemainingDailyQuota() +
    ' e-mails restantes hoje nesta conta.'
  );
}

// ============================== VALIDAÇÃO =================================

// Percorre a planilha, marca o que seria pulado e por quê. Não envia nada.
function validarPlanilha() {
  var aba = planilha_();
  var dados = aba.getDataRange().getValues();
  var ok = 0, pulados = 0;

  for (var i = 1; i < dados.length; i++) {
    var linha = i + 1;
    var email = String(dados[i][COL.EMAIL - 1] || '').trim();
    var nome = String(dados[i][COL.NOME - 1] || '').trim();
    var motivo = motivoParaPular_(email, nome);

    if (motivo) {
      aba.getRange(linha, COL.STATUS).setValue('PULADO');
      aba.getRange(linha, COL.OBS).setValue(motivo);
      pulados++;
    } else {
      aba.getRange(linha, COL.OBS).setValue('ok · ' + primeiroNome_(nome));
      ok++;
    }
  }

  avisar_(
    'Validação concluída\n\n' + ok + ' prontos para envio\n' +
    pulados + ' pulados (veja a coluna observacao)'
  );
}

// Retorna o motivo do pulo, ou string vazia se a linha está boa.
function motivoParaPular_(email, nome) {
  if (!email) return 'e-mail vazio';
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return 'e-mail inválido';
  if (!nome) return 'nome vazio — sairia começando com vírgula';
  if (ehGenerico_(email)) return 'caixa genérica';
  if (nome.length < 2) return 'nome muito curto';
  if (/^\d+$/.test(nome)) return 'nome é número';
  return '';
}

function ehGenerico_(email) {
  var prefixo = email.split('@')[0].toLowerCase().replace(/[._-]/g, '');
  return CFG.PREFIXOS_GENERICOS.some(function (p) {
    return prefixo === p || prefixo.indexOf(p) === 0;
  });
}

//
// "EMERSON SILVA RODRIGUES" -> "Emerson"
// "maria  de souza"         -> "Maria"
// Preserva acentuação.
//
function primeiroNome_(nome) {
  var primeiro = String(nome).trim().split(/\s+/)[0];
  if (!primeiro) return '';
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') +
         primeiro.slice(1).toLocaleLowerCase('pt-BR');
}

// ============================== ENVIO ======================================

//
// Execução automática, de hora em hora dentro da janela.
// Calcula quanto ainda cabe hoje pela rampa e envia só a fatia daquela hora.
// Rodar fora da janela ou no fim de semana não faz nada.
//
function enviarLoteAutomatico() {
  if (!dentroDaJanela_()) {
    Logger.log('Fora da janela de envio. Nada a fazer.');
    return;
  }
  var limite = vagasDestaHora_();
  if (limite <= 0) {
    Logger.log('Cota do dia já cumprida.');
    return;
  }
  enviarLote(limite);
}

function enviarLote(limitePersonalizado) {
  var aba = planilha_();
  var template = pegarTemplate_();
  var anexos = pegarAnexos_();
  var dados = aba.getDataRange().getValues();

  var teto = limitePersonalizado || CFG.MAX_POR_EXECUCAO;
  var enviados = 0, pulados = 0, erros = 0;
  var quota = MailApp.getRemainingDailyQuota();

  for (var i = 1; i < dados.length && enviados < teto; i++) {
    var linha = i + 1;
    var email = String(dados[i][COL.EMAIL - 1] || '').trim();
    var nome = String(dados[i][COL.NOME - 1] || '').trim();
    var status = String(dados[i][COL.STATUS - 1] || '').trim();

    if (status === 'ENVIADO' || status === 'PULADO' || status === 'RESPONDEU' ||
        status === 'REMOVER') continue;

    if (enviados >= quota - 5) {
      registrar_(aba, linha, 'AGUARDANDO', 'quota diária quase no fim');
      break;
    }

    var motivo = motivoParaPular_(email, nome);
    if (motivo) {
      registrar_(aba, linha, 'PULADO', motivo);
      pulados++;
      continue;
    }

    try {
      var corpoHtml = template.html.replace(/\{\{nome\}\}/g, primeiroNome_(nome));
      var corpoTexto = htmlParaTexto_(corpoHtml);

      GmailApp.sendEmail(email, CFG.ASSUNTO_ENVIO, corpoTexto, {
        htmlBody: corpoHtml,
        name: CFG.NOME_REMETENTE,
        attachments: anexos
      });

      // A API não devolve a thread; localizamos logo depois para os follow-ups.
      Utilities.sleep(1500);
      var threadId = acharThreadId_(email);

      aba.getRange(linha, COL.STATUS).setValue('ENVIADO');
      aba.getRange(linha, COL.ENVIADO).setValue(new Date());
      aba.getRange(linha, COL.THREAD).setValue(threadId || '');
      aba.getRange(linha, COL.ETAPA).setValue(1);
      aba.getRange(linha, COL.OBS).setValue('');
      SpreadsheetApp.flush();

      enviados++;
      Utilities.sleep(CFG.PAUSA_SEGUNDOS * 1000);

    } catch (e) {
      registrar_(aba, linha, 'ERRO', String(e).slice(0, 200));
      erros++;
    }
  }

  Logger.log('enviados=%s pulados=%s erros=%s', enviados, pulados, erros);
  notificar_('Lote concluído', enviados + ' enviados · ' + pulados +
             ' pulados · ' + erros + ' erros');
}

// ============================= FOLLOW-UPS ==================================

function enviarFollowUps() {
  if (CFG.SOMENTE_DIAS_UTEIS) {
    var diaSemana = Number(Utilities.formatDate(new Date(), TZ, 'u'));
    if (diaSemana > 5) { Logger.log('Fim de semana. Follow-ups não saem.'); return; }
  }
  var aba = planilha_();
  var dados = aba.getDataRange().getValues();
  var hoje = new Date();
  var enviados = 0;

  for (var i = 1; i < dados.length && enviados < CFG.MAX_POR_EXECUCAO; i++) {
    var linha = i + 1;
    var status = String(dados[i][COL.STATUS - 1] || '').trim();
    var threadId = String(dados[i][COL.THREAD - 1] || '').trim();
    var enviadoEm = dados[i][COL.ENVIADO - 1];
    var etapa = Number(dados[i][COL.ETAPA - 1] || 0);
    var nome = String(dados[i][COL.NOME - 1] || '').trim();

    if (status !== 'ENVIADO' || !threadId || !(enviadoEm instanceof Date)) continue;
    if (etapa >= 3) continue;

    var dias = Math.floor((hoje - enviadoEm) / 86400000);

    var thread;
    try {
      thread = GmailApp.getThreadById(threadId);
    } catch (e) {
      registrar_(aba, linha, 'ERRO', 'thread não encontrada');
      continue;
    }
    if (!thread) continue;

    // Alguém respondeu? A sequência para aqui.
    var resposta = verificarResposta_(thread);
    if (resposta === 'REMOVER') {
      registrar_(aba, linha, 'REMOVER', 'pediu remoção — não contatar');
      continue;
    }
    if (resposta === 'RESPONDEU') {
      registrar_(aba, linha, 'RESPONDEU', 'respondeu — sequência interrompida');
      continue;
    }

    // Quanto tempo desde o ÚLTIMO e-mail desta thread — não desde o primeiro.
    // Como já confirmamos acima que ninguém respondeu, a última mensagem da
    // thread é necessariamente nossa. Sem esta guarda, um contato que ficou
    // parado em etapa 1 por duas semanas receberia o follow-up 1 hoje e o
    // encerramento amanhã, porque os dois prazos já teriam vencido.
    var diasDesdeUltimo = Math.floor(
      (hoje - thread.getLastMessageDate()) / 86400000);
    if (diasDesdeUltimo < CFG.INTERVALO_MINIMO_DIAS) continue;

    var corpo = null;
    if (etapa === 1 && dias >= CFG.DIAS_FOLLOWUP_1) {
      corpo = followUp1_(primeiroNome_(nome));
    } else if (etapa === 2 && dias >= CFG.DIAS_FOLLOWUP_2) {
      corpo = encerramento_(primeiroNome_(nome));
    }
    if (!corpo) continue;

    try {
      thread.reply(corpo, { htmlBody: textoParaHtml_(corpo), name: CFG.NOME_REMETENTE });
      aba.getRange(linha, COL.ETAPA).setValue(etapa + 1);
      aba.getRange(linha, COL.OBS).setValue('follow-up ' + (etapa + 1) + ' em ' +
        Utilities.formatDate(hoje, 'America/Sao_Paulo', 'dd/MM'));
      SpreadsheetApp.flush();
      enviados++;
      Utilities.sleep(CFG.PAUSA_SEGUNDOS * 1000);
    } catch (e) {
      registrar_(aba, linha, 'ERRO', String(e).slice(0, 200));
    }
  }

  notificar_('Follow-ups', enviados + ' enviados');
}

function followUp1_(nome) {
  return nome + ', tudo bem?\n\n' +
    'Voltando ao e-mail anterior com uma pergunta mais direta:\n\n' +
    'quando a diretoria pede um número que cruza duas áreas, quanto tempo leva ' +
    'até a resposta chegar — e quantas pessoas precisam ser acionadas?\n\n' +
    'Se a resposta for "depende de quem está disponível", o gargalo não é de ' +
    'ferramenta. É de arquitetura.\n\n' +
    'É exatamente o tipo de coisa que a gente mapeia numa conversa de 30 minutos. ' +
    'Sem compromisso e sem proposta no final se não fizer sentido.\n\n' +
    'Abraço,\nSérgio';
}

function encerramento_(nome) {
  return nome + ',\n\n' +
    'Como não tive retorno, assumo que não é prioridade agora — o que é ' +
    'completamente justo.\n\n' +
    'Encerro o contato por aqui. Se em algum momento o assunto voltar à mesa, ' +
    'é só responder este e-mail que retomo de onde paramos.\n\n' +
    'Deixo uma coisa que pode ser útil independente da Atlas: antes de decidir ' +
    'qualquer arquitetura de dados, vale responder quatro perguntas.\n\n' +
    '1. Que dado você tem — só tabela de sistema, ou também log, texto e arquivo?\n' +
    '2. Quem vai consumir — analista num dashboard, ou cientista num notebook?\n' +
    '3. Precisa reprocessar o passado se descobrir um erro de regra em seis meses?\n' +
    '4. Quem mantém isso depois que o projeto acabar?\n\n' +
    'Responde essas quatro e a escolha de tecnologia quase se faz sozinha.\n\n' +
    'Abraço,\nSérgio';
}

// ============================= AUXILIARES ==================================

//
// Devolve a aba de contatos.
//
// getActiveSpreadsheet() devolve null quando o projeto não está vinculado a
// uma planilha (criado avulso em script.google.com em vez de Extensões →
// Apps Script). Por isso preferimos openById quando CFG.PLANILHA_ID estiver
// preenchido — openById funciona em qualquer contexto, inclusive gatilho.
//
function planilha_() {
  var ss = null;
  if (CFG.PLANILHA_ID) {
    ss = SpreadsheetApp.openById(CFG.PLANILHA_ID);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error(
        'Nenhuma planilha ativa. Este projeto não está vinculado a uma ' +
        'planilha. Preencha CFG.PLANILHA_ID com o ID que aparece na URL ' +
        'da planilha, entre /d/ e /edit.');
    }
  }
  var aba = ss.getSheetByName(CFG.ABA);
  if (!aba) throw new Error('Aba "' + CFG.ABA + '" não encontrada em ' + ss.getName() + '.');
  return aba;
}

// Lê o rascunho do Gmail que serve de template.
function pegarTemplate_() {
  var rascunhos = GmailApp.getDrafts();
  for (var i = 0; i < rascunhos.length; i++) {
    var msg = rascunhos[i].getMessage();
    if (msg.getSubject().trim() === CFG.ASSUNTO_RASCUNHO) {
      var html = limparUrls_(msg.getBody());
      if (html.indexOf('{{nome}}') === -1) {
        throw new Error('O rascunho não contém {{nome}}. Adicione a variável antes de enviar.');
      }
      return { html: html };
    }
  }
  throw new Error('Rascunho "' + CFG.ASSUNTO_RASCUNHO + '" não encontrado no Gmail.');
}

//
// O Gmail reescreve todo link de mensagem armazenada para
// https://www.google.com/url?q=<destino>&source=gmail&...
//
// Num disparo em massa isso derruba entregabilidade: redirecionador de
// terceiro é padrão de phishing para os filtros. Não adianta limpar no
// rascunho — o Gmail reembrulha. Então desfazemos aqui, no envio.
//
function limparUrls_(html) {
  return html.replace(
    /https:\/\/www\.google\.com\/url\?q=([^&"'<>\s]+)((?:&amp;|&)[^"'<>\s]*)?/g,
    function (original, destino) {
      try {
        return decodeURIComponent(destino).replace(/&/g, '&amp;');
      } catch (e) {
        return original;   // URL malformada: preserva em vez de quebrar
      }
    }
  );
}

// Mostra como os links vão sair depois da limpeza. Não envia nada.
function conferirLinks() {
  var html = pegarTemplate_().html;
  var encontrados = html.match(/href="([^"]+)"/g) || [];
  var sobrouWrapper = html.indexOf('google.com/url') !== -1;

  avisar_(
    'Links do template\n\n' +
    encontrados.map(function (h) {
      return h.replace('href="', '').replace('"', '');
    }).join('\n\n') +
    '\n\n' +
    (sobrouWrapper
      ? '⚠ AINDA HÁ google.com/url — avise antes de disparar.'
      : '✓ Nenhum redirecionador do Google. Pode disparar.')
  );
}

function pegarAnexos_() {
  if (!CFG.ANEXAR_PDF || !CFG.ID_PDF_DRIVE) return [];
  return [DriveApp.getFileById(CFG.ID_PDF_DRIVE).getAs(MimeType.PDF)];
}

// Localiza a thread recém-enviada para poder responder nela depois.
function acharThreadId_(email) {
  var threads = GmailApp.search(
    'to:' + email + ' subject:"' + CFG.ASSUNTO_ENVIO + '" newer_than:1d', 0, 5);
  return threads.length ? threads[0].getId() : '';
}

//
// Verifica se o destinatário respondeu, e se pediu remoção.
// Retorna 'REMOVER', 'RESPONDEU' ou ''.
//
function verificarResposta_(thread) {
  var meu = Session.getActiveUser().getEmail().toLowerCase();
  var msgs = thread.getMessages();
  for (var i = 0; i < msgs.length; i++) {
    var de = msgs[i].getFrom().toLowerCase();
    if (de.indexOf(meu) !== -1) continue;       // mensagem minha, ignora
    var corpo = msgs[i].getPlainBody().toLowerCase();
    if (/\bremover\b|\bdescadastr|\bunsubscribe\b|não.{0,15}contat/.test(corpo)) {
      return 'REMOVER';
    }
    return 'RESPONDEU';
  }
  return '';
}

function registrar_(aba, linha, status, obs) {
  aba.getRange(linha, COL.STATUS).setValue(status);
  aba.getRange(linha, COL.OBS).setValue(obs);
  SpreadsheetApp.flush();
}

//
// Converte o HTML em texto puro.
//
// Os links viram URL completa e explícita. Sem isso, a âncora
// "atlas-partner.com" virava texto solto e o cliente de e-mail
// auto-linkava como http:// (sem o s) — o que dispara aviso de
// site não seguro em parte dos leitores.
//
function htmlParaTexto_(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      function (tudo, href, texto) {
        var rotulo = texto.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (/^(mailto:|tel:)/i.test(href)) return rotulo || href.replace(/^\w+:/, '');
        if (!rotulo) return href;
        // rótulo que já é o próprio endereço: mostra só a URL completa
        var nu = rotulo.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
        var hu = href.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
        if (hu.indexOf(nu) === 0) return href;
        return rotulo + ': ' + href;
      })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h1|h2|h3|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textoParaHtml_(texto) {
  var esc = texto
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;' +
         'line-height:22px;color:#222">' + esc.replace(/\n/g, '<br>') + '</div>';
}

//
// Alerta em caixa de diálogo. Cai no log quando não há interface — é o que
// acontece em toda execução por gatilho.
//
function avisar_(texto) {
  try {
    SpreadsheetApp.getUi().alert(texto);
  } catch (e) {
    Logger.log(texto);
  }
}

function notificar_(titulo, msg) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, titulo, 8);
  } catch (e) {
    Logger.log(titulo + ': ' + msg);
  }
}

// ========================== RITMO DA CAMPANHA ==============================

var TZ = 'America/Sao_Paulo';

// Hoje é dia útil e estamos dentro da janela de envio?
function dentroDaJanela_() {
  var agora = new Date();
  var dia = Number(Utilities.formatDate(agora, TZ, 'u'));   // 1=seg ... 7=dom
  var hora = Number(Utilities.formatDate(agora, TZ, 'H'));

  if (CFG.SOMENTE_DIAS_UTEIS && dia > 5) return false;
  return hora >= CFG.HORA_INICIO && hora < CFG.HORA_FIM;
}

//
// Data em que a campanha começou. Guardada na primeira execução e usada
// para saber em que semana da rampa estamos.
//
function inicioDaCampanha_() {
  var props = PropertiesService.getScriptProperties();
  var iso = props.getProperty('INICIO_CAMPANHA');
  if (!iso) {
    iso = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    props.setProperty('INICIO_CAMPANHA', iso);
  }
  var p = iso.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

// Teto de envios para hoje, conforme a semana da rampa.
function limiteDiarioHoje_() {
  var dias = Math.floor((new Date() - inicioDaCampanha_()) / 86400000);
  var semana = Math.floor(dias / 7);
  var r = CFG.RAMPA_DIARIA;
  return semana < r.length ? r[semana] : r[r.length - 1];
}

// Quantos já saíram hoje, lendo a coluna enviado_em.
function enviadosHoje_() {
  var hoje = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var dados = planilha_().getDataRange().getValues();
  var n = 0;
  for (var i = 1; i < dados.length; i++) {
    var d = dados[i][COL.ENVIADO - 1];
    if (d instanceof Date && Utilities.formatDate(d, TZ, 'yyyy-MM-dd') === hoje) n++;
  }
  return n;
}

//
// Quantos cabem nesta execução. Divide o que falta do dia pelas horas que
// ainda restam na janela, para os envios saírem espalhados em vez de em
// rajada — rajada é o padrão que os filtros reconhecem como robô.
//
function vagasDestaHora_() {
  var falta = limiteDiarioHoje_() - enviadosHoje_();
  if (falta <= 0) return 0;
  var hora = Number(Utilities.formatDate(new Date(), TZ, 'H'));
  var janelasRestantes = Math.max(1, CFG.HORA_FIM - hora);
  return Math.max(1, Math.ceil(falta / janelasRestantes));
}

// Situação da campanha, sem enviar nada.
function verStatus() {
  var dados = planilha_().getDataRange().getValues();
  var conta = {};
  for (var i = 1; i < dados.length; i++) {
    var s = String(dados[i][COL.STATUS - 1] || 'PENDENTE').trim() || 'PENDENTE';
    conta[s] = (conta[s] || 0) + 1;
  }
  var linhas = Object.keys(conta).sort().map(function (k) {
    return '  ' + k + ': ' + conta[k];
  }).join('\n');

  avisar_(
    'Campanha\n\n' +
    'Início: ' + Utilities.formatDate(inicioDaCampanha_(), TZ, 'dd/MM/yyyy') + '\n' +
    'Teto de hoje: ' + limiteDiarioHoje_() + ' e-mails\n' +
    'Enviados hoje: ' + enviadosHoje_() + '\n' +
    'Quota do Gmail: ' + MailApp.getRemainingDailyQuota() + '\n\n' +
    'Planilha:\n' + linhas
  );
}

// Resumo do dia por e-mail. Roda uma vez, no fim da janela.
function relatorioDiario() {
  if (!CFG.ENVIAR_RELATORIO) return;
  var dia = Number(Utilities.formatDate(new Date(), TZ, 'u'));
  if (CFG.SOMENTE_DIAS_UTEIS && dia > 5) return;

  var dados = planilha_().getDataRange().getValues();
  var conta = {};
  var pendentes = 0;
  for (var i = 1; i < dados.length; i++) {
    var s = String(dados[i][COL.STATUS - 1] || '').trim();
    if (!s) { pendentes++; continue; }
    conta[s] = (conta[s] || 0) + 1;
  }

  var corpo =
    'Enviados hoje: ' + enviadosHoje_() + ' de ' + limiteDiarioHoje_() + '\n' +
    'Ainda na fila: ' + pendentes + '\n\n' +
    Object.keys(conta).sort().map(function (k) {
      return k + ': ' + conta[k];
    }).join('\n') + '\n\n' +
    'Quota restante do Gmail: ' + MailApp.getRemainingDailyQuota() + '\n\n' +
    'Planilha: ' + planilha_().getParent().getUrl();

  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    'Outbound Atlas · resumo de ' + Utilities.formatDate(new Date(), TZ, 'dd/MM'),
    corpo
  );
}

// ============================== GATILHOS ===================================

// Cria os gatilhos diários. Rode uma vez.
function criarGatilhos() {
  removerGatilhos_();

  // Envio: de hora em hora. A própria função ignora fim de semana e
  // horário fora da janela, então não precisa de gatilho por hora cheia.
  ScriptApp.newTrigger('enviarLoteAutomatico').timeBased()
    .everyHours(1).create();

  // Follow-ups: uma vez por dia, no meio da tarde.
  ScriptApp.newTrigger('enviarFollowUps').timeBased()
    .atHour(14).nearMinute(40).everyDays(1)
    .inTimezone(TZ).create();

  // Resumo no fim da janela.
  if (CFG.ENVIAR_RELATORIO) {
    ScriptApp.newTrigger('relatorioDiario').timeBased()
      .atHour(CFG.HORA_FIM).nearMinute(50).everyDays(1)
      .inTimezone(TZ).create();
  }

  inicioDaCampanha_();   // fixa a data de início da rampa

  avisar_(
    'Automação ligada\n\n' +
    'Envio: de hora em hora, das ' + CFG.HORA_INICIO + 'h às ' + CFG.HORA_FIM + 'h' +
    (CFG.SOMENTE_DIAS_UTEIS ? ', só em dias úteis' : '') + '\n' +
    'Follow-ups: dias úteis às 14h40\n' +
    (CFG.ENVIAR_RELATORIO ? 'Resumo: todo dia às ' + CFG.HORA_FIM + 'h50\n' : '') +
    '\nRampa de aquecimento por semana:\n  ' +
    CFG.RAMPA_DIARIA.map(function (v, i) {
      return 'semana ' + (i + 1) + ': ' + v + '/dia';
    }).join('\n  ') + '\n  depois: ' +
    CFG.RAMPA_DIARIA[CFG.RAMPA_DIARIA.length - 1] + '/dia\n\n' +
    'Teto de hoje: ' + limiteDiarioHoje_() + ' e-mails.\n' +
    'Horário de Brasília. Para parar, use Pausar automação.'
  );
}

// Desliga tudo. A planilha e o histórico ficam intactos.
function pausarAutomacao() {
  var n = removerGatilhos_();
  avisar_(
    'Automação pausada\n\n' + n + ' gatilho(s) removido(s).\n\n' +
    'Nenhum envio automático vai acontecer. O menu continua funcionando ' +
    'para envio manual, e a rampa retoma de onde parou quando você religar.'
  );
}

function removerGatilhos_() {
  var meus = ['enviarLote', 'enviarLoteAutomatico', 'enviarFollowUps',
                'relatorioDiario'];
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (meus.indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
      n++;
    }
  });
  return n;
}
