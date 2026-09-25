/**
 * ATLAS TECNOLOGIA — Disparo de outbound
 * Google Apps Script vinculado à planilha de contatos.
 *
 * PLANILHA (aba "Contatos"), primeira linha = cabeçalho:
 *   A  email
 *   B  nome
 *   C  status        preenchido pelo script
 *   D  enviado_em    preenchido pelo script
 *   E  thread_id     preenchido pelo script
 *   F  etapa         1 = e-mail 1 · 2 = follow-up · 3 = encerramento
 *   G  observacao    motivo de pulo ou erro
 *
 * O TEMPLATE não fica aqui dentro. Fica num RASCUNHO do Gmail, para você
 * editar o HTML no próprio Gmail sem mexer em código. O script lê o rascunho
 * pelo assunto definido em ASSUNTO_RASCUNHO.
 *
 * Use {{nome}} no corpo do rascunho. O script troca pelo PRIMEIRO nome.
 */

// ============================== CONFIGURAÇÃO ==============================

const CFG = {
  ABA: 'Contatos',

  // Assunto exato do rascunho no Gmail que serve de template.
  ASSUNTO_RASCUNHO: 'TEMPLATE Atlas Outbound',

  // Assunto real que vai para o destinatário.
  ASSUNTO_ENVIO: 'O dado existe. A decisão é que demora.',

  // Teto por execução. Comece em 20 e suba semana a semana.
  MAX_POR_EXECUCAO: 20,

  // Intervalo entre envios, em segundos. Evita rajada.
  PAUSA_SEGUNDOS: 8,

  DIAS_FOLLOWUP_1: 3,
  DIAS_FOLLOWUP_2: 7,

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

const COL = { EMAIL: 1, NOME: 2, STATUS: 3, ENVIADO: 4, THREAD: 5, ETAPA: 6, OBS: 7 };

// ================================ MENU ====================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Atlas Outbound')
    .addItem('1. Validar planilha (não envia)', 'validarPlanilha')
    .addItem('2. Enviar lote', 'enviarLote')
    .addItem('3. Enviar follow-ups', 'enviarFollowUps')
    .addSeparator()
    .addItem('Ver quota restante hoje', 'mostrarQuota')
    .addItem('Criar gatilhos diários', 'criarGatilhos')
    .addToUi();
}

function mostrarQuota() {
  SpreadsheetApp.getUi().alert(
    'Quota do Gmail\n\n' + MailApp.getRemainingDailyQuota() +
    ' e-mails restantes hoje nesta conta.'
  );
}

// ============================== VALIDAÇÃO =================================

/** Percorre a planilha, marca o que seria pulado e por quê. Não envia nada. */
function validarPlanilha() {
  const aba = planilha_();
  const dados = aba.getDataRange().getValues();
  let ok = 0, pulados = 0;

  for (let i = 1; i < dados.length; i++) {
    const linha = i + 1;
    const email = String(dados[i][COL.EMAIL - 1] || '').trim();
    const nome = String(dados[i][COL.NOME - 1] || '').trim();
    const motivo = motivoParaPular_(email, nome);

    if (motivo) {
      aba.getRange(linha, COL.STATUS).setValue('PULADO');
      aba.getRange(linha, COL.OBS).setValue(motivo);
      pulados++;
    } else {
      aba.getRange(linha, COL.OBS).setValue('ok · ' + primeiroNome_(nome));
      ok++;
    }
  }

  SpreadsheetApp.getUi().alert(
    'Validação concluída\n\n' + ok + ' prontos para envio\n' +
    pulados + ' pulados (veja a coluna observacao)'
  );
}

/** Retorna o motivo do pulo, ou string vazia se a linha está boa. */
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
  const prefixo = email.split('@')[0].toLowerCase().replace(/[._-]/g, '');
  return CFG.PREFIXOS_GENERICOS.some(function (p) {
    return prefixo === p || prefixo.indexOf(p) === 0;
  });
}

/**
 * "EMERSON SILVA RODRIGUES" -> "Emerson"
 * "maria  de souza"         -> "Maria"
 * Preserva acentuação.
 */
function primeiroNome_(nome) {
  const primeiro = String(nome).trim().split(/\s+/)[0];
  if (!primeiro) return '';
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') +
         primeiro.slice(1).toLocaleLowerCase('pt-BR');
}

// ============================== ENVIO ======================================

function enviarLote() {
  const aba = planilha_();
  const template = pegarTemplate_();
  const anexos = pegarAnexos_();
  const dados = aba.getDataRange().getValues();

  let enviados = 0, pulados = 0, erros = 0;
  const quota = MailApp.getRemainingDailyQuota();

  for (let i = 1; i < dados.length && enviados < CFG.MAX_POR_EXECUCAO; i++) {
    const linha = i + 1;
    const email = String(dados[i][COL.EMAIL - 1] || '').trim();
    const nome = String(dados[i][COL.NOME - 1] || '').trim();
    const status = String(dados[i][COL.STATUS - 1] || '').trim();

    if (status === 'ENVIADO' || status === 'PULADO' || status === 'RESPONDEU' ||
        status === 'REMOVER') continue;

    if (enviados >= quota - 5) {
      registrar_(aba, linha, 'AGUARDANDO', 'quota diária quase no fim');
      break;
    }

    const motivo = motivoParaPular_(email, nome);
    if (motivo) {
      registrar_(aba, linha, 'PULADO', motivo);
      pulados++;
      continue;
    }

    try {
      const corpoHtml = template.html.replace(/\{\{nome\}\}/g, primeiroNome_(nome));
      const corpoTexto = htmlParaTexto_(corpoHtml);

      GmailApp.sendEmail(email, CFG.ASSUNTO_ENVIO, corpoTexto, {
        htmlBody: corpoHtml,
        name: CFG.NOME_REMETENTE,
        attachments: anexos
      });

      // A API não devolve a thread; localizamos logo depois para os follow-ups.
      Utilities.sleep(1500);
      const threadId = acharThreadId_(email);

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
  const aba = planilha_();
  const dados = aba.getDataRange().getValues();
  const hoje = new Date();
  let enviados = 0;

  for (let i = 1; i < dados.length && enviados < CFG.MAX_POR_EXECUCAO; i++) {
    const linha = i + 1;
    const status = String(dados[i][COL.STATUS - 1] || '').trim();
    const threadId = String(dados[i][COL.THREAD - 1] || '').trim();
    const enviadoEm = dados[i][COL.ENVIADO - 1];
    const etapa = Number(dados[i][COL.ETAPA - 1] || 0);
    const nome = String(dados[i][COL.NOME - 1] || '').trim();

    if (status !== 'ENVIADO' || !threadId || !(enviadoEm instanceof Date)) continue;
    if (etapa >= 3) continue;

    const dias = Math.floor((hoje - enviadoEm) / 86400000);

    let thread;
    try {
      thread = GmailApp.getThreadById(threadId);
    } catch (e) {
      registrar_(aba, linha, 'ERRO', 'thread não encontrada');
      continue;
    }
    if (!thread) continue;

    // Alguém respondeu? A sequência para aqui.
    const resposta = verificarResposta_(thread);
    if (resposta === 'REMOVER') {
      registrar_(aba, linha, 'REMOVER', 'pediu remoção — não contatar');
      continue;
    }
    if (resposta === 'RESPONDEU') {
      registrar_(aba, linha, 'RESPONDEU', 'respondeu — sequência interrompida');
      continue;
    }

    let corpo = null;
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

function planilha_() {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CFG.ABA);
  if (!aba) throw new Error('Aba "' + CFG.ABA + '" não encontrada.');
  return aba;
}

/** Lê o rascunho do Gmail que serve de template. */
function pegarTemplate_() {
  const rascunhos = GmailApp.getDrafts();
  for (let i = 0; i < rascunhos.length; i++) {
    const msg = rascunhos[i].getMessage();
    if (msg.getSubject().trim() === CFG.ASSUNTO_RASCUNHO) {
      const html = msg.getBody();
      if (html.indexOf('{{nome}}') === -1) {
        throw new Error('O rascunho não contém {{nome}}. Adicione a variável antes de enviar.');
      }
      return { html: html };
    }
  }
  throw new Error('Rascunho "' + CFG.ASSUNTO_RASCUNHO + '" não encontrado no Gmail.');
}

function pegarAnexos_() {
  if (!CFG.ANEXAR_PDF || !CFG.ID_PDF_DRIVE) return [];
  return [DriveApp.getFileById(CFG.ID_PDF_DRIVE).getAs(MimeType.PDF)];
}

/** Localiza a thread recém-enviada para poder responder nela depois. */
function acharThreadId_(email) {
  const threads = GmailApp.search(
    'to:' + email + ' subject:"' + CFG.ASSUNTO_ENVIO + '" newer_than:1d', 0, 5);
  return threads.length ? threads[0].getId() : '';
}

/**
 * Verifica se o destinatário respondeu, e se pediu remoção.
 * Retorna 'REMOVER', 'RESPONDEU' ou ''.
 */
function verificarResposta_(thread) {
  const meu = Session.getActiveUser().getEmail().toLowerCase();
  const msgs = thread.getMessages();
  for (let i = 0; i < msgs.length; i++) {
    const de = msgs[i].getFrom().toLowerCase();
    if (de.indexOf(meu) !== -1) continue;       // mensagem minha, ignora
    const corpo = msgs[i].getPlainBody().toLowerCase();
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

function htmlParaTexto_(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
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
  const esc = texto
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;' +
         'line-height:22px;color:#222">' + esc.replace(/\n/g, '<br>') + '</div>';
}

function notificar_(titulo, msg) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, titulo, 8);
  } catch (e) {
    Logger.log(titulo + ': ' + msg);
  }
}

// ============================== GATILHOS ===================================

/** Cria os gatilhos diários. Rode uma vez. */
function criarGatilhos() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    const f = t.getHandlerFunction();
    if (f === 'enviarLote' || f === 'enviarFollowUps') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('enviarLote').timeBased()
    .atHour(9).nearMinute(20).everyDays(1)
    .inTimezone('America/Sao_Paulo').create();

  ScriptApp.newTrigger('enviarFollowUps').timeBased()
    .atHour(14).nearMinute(40).everyDays(1)
    .inTimezone('America/Sao_Paulo').create();

  SpreadsheetApp.getUi().alert(
    'Gatilhos criados\n\n' +
    'Lote principal: todo dia às 9h20\n' +
    'Follow-ups: todo dia às 14h40\n\n' +
    'Horário de Brasília. Para parar, remova em Gatilhos no editor.'
  );
}
