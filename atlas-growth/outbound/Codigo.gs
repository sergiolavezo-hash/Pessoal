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

  // Rascunhos dos follow-ups. Deixe vazio para usar o texto puro embutido
  // no código (followUp1_ / encerramento_) em vez do HTML do Gmail.
  ASSUNTO_RASCUNHO_2: 'TEMPLATE Atlas Outbound 2',
  ASSUNTO_RASCUNHO_3: 'TEMPLATE Atlas Outbound 3',

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

const COL = { EMAIL: 1, NOME: 2, STATUS: 3, ENVIADO: 4, THREAD: 5, ETAPA: 6, OBS: 7 };

// ================================ MENU ====================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Atlas Outbound')
    .addItem('1. Validar planilha (não envia)', 'validarPlanilha')
    .addItem('2. Conferir os 3 templates', 'conferirLinks')
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

  avisar_(
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

/**
 * Execução automática, de hora em hora dentro da janela.
 * Calcula quanto ainda cabe hoje pela rampa e envia só a fatia daquela hora.
 * Rodar fora da janela ou no fim de semana não faz nada.
 */
function enviarLoteAutomatico() {
  if (!dentroDaJanela_()) {
    Logger.log('Fora da janela de envio. Nada a fazer.');
    return;
  }
  const limite = vagasDestaHora_();
  if (limite <= 0) {
    Logger.log('Cota do dia já cumprida.');
    return;
  }
  enviarLote(limite);
}

function enviarLote(limitePersonalizado) {
  const aba = planilha_();
  const template = pegarTemplate_();
  const anexos = pegarAnexos_();
  const dados = aba.getDataRange().getValues();

  const teto = limitePersonalizado || CFG.MAX_POR_EXECUCAO;
  let enviados = 0, pulados = 0, erros = 0;
  const quota = MailApp.getRemainingDailyQuota();

  for (let i = 1; i < dados.length && enviados < teto; i++) {
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
  if (CFG.SOMENTE_DIAS_UTEIS) {
    const diaSemana = Number(Utilities.formatDate(new Date(), TZ, 'u'));
    if (diaSemana > 5) { Logger.log('Fim de semana. Follow-ups não saem.'); return; }
  }
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

    // Quanto tempo desde o ÚLTIMO e-mail desta thread — não desde o primeiro.
    // Como já confirmamos acima que ninguém respondeu, a última mensagem da
    // thread é necessariamente nossa. Sem esta guarda, um contato que ficou
    // parado em etapa 1 por duas semanas receberia o follow-up 1 hoje e o
    // encerramento amanhã, porque os dois prazos já teriam vencido.
    const diasDesdeUltimo = Math.floor(
      (hoje - thread.getLastMessageDate()) / 86400000);
    if (diasDesdeUltimo < CFG.INTERVALO_MINIMO_DIAS) continue;

    let corpo = null;
    if (etapa === 1 && dias >= CFG.DIAS_FOLLOWUP_1) {
      corpo = montarFollowUp_(2, primeiroNome_(nome));
    } else if (etapa === 2 && dias >= CFG.DIAS_FOLLOWUP_2) {
      corpo = montarFollowUp_(3, primeiroNome_(nome));
    }
    if (!corpo) continue;

    try {
      thread.reply(corpo.texto, { htmlBody: corpo.html, name: CFG.NOME_REMETENTE });
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

/**
 * Monta o corpo do follow-up da etapa pedida (2 ou 3).
 *
 * Preferência: o rascunho HTML no Gmail. Sem rascunho configurado ou
 * encontrado, cai no texto puro embutido — assim a sequência nunca para
 * por falta de template.
 */
function montarFollowUp_(numero, nome) {
  const assunto = numero === 2 ? CFG.ASSUNTO_RASCUNHO_2 : CFG.ASSUNTO_RASCUNHO_3;
  const tpl = pegarTemplate_(assunto, false);

  if (tpl) {
    const html = tpl.html.replace(/\{\{nome\}\}/g, nome);
    return { html: html, texto: htmlParaTexto_(html) };
  }

  const texto = numero === 2 ? followUp1_(nome) : encerramento_(nome);
  return { html: textoParaHtml_(texto), texto: texto };
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

/**
 * Devolve a aba de contatos.
 *
 * getActiveSpreadsheet() devolve null quando o projeto não está vinculado a
 * uma planilha (criado avulso em script.google.com em vez de Extensões →
 * Apps Script). Por isso preferimos openById quando CFG.PLANILHA_ID estiver
 * preenchido — openById funciona em qualquer contexto, inclusive gatilho.
 */
function planilha_() {
  let ss = null;
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
  const aba = ss.getSheetByName(CFG.ABA);
  if (!aba) throw new Error('Aba "' + CFG.ABA + '" não encontrada em ' + ss.getName() + '.');
  return aba;
}

/** Lê o rascunho do Gmail que serve de template. */
/**
 * Lê um rascunho do Gmail pelo assunto e devolve { html }.
 *
 * obrigatorio = false devolve null em vez de estourar, para o caso dos
 * follow-ups: sem rascunho, o script cai no texto puro embutido.
 */
function pegarTemplate_(assunto, obrigatorio) {
  const alvo = (assunto || CFG.ASSUNTO_RASCUNHO).trim();
  if (obrigatorio === undefined) obrigatorio = true;
  if (!alvo) return null;

  const rascunhos = GmailApp.getDrafts();
  for (let i = 0; i < rascunhos.length; i++) {
    const msg = rascunhos[i].getMessage();
    if (msg.getSubject().trim() === alvo) {
      const html = limparUrls_(msg.getBody());
      if (html.indexOf('{{nome}}') === -1) {
        throw new Error('O rascunho "' + alvo + '" não contém {{nome}}.');
      }
      return { html: html };
    }
  }
  if (!obrigatorio) return null;
  throw new Error('Rascunho "' + alvo + '" não encontrado no Gmail.');
}

/**
 * O Gmail reescreve todo link de mensagem armazenada para
 * https://www.google.com/url?q=<destino>&source=gmail&...
 *
 * Num disparo em massa isso derruba entregabilidade: redirecionador de
 * terceiro é padrão de phishing para os filtros. Não adianta limpar no
 * rascunho — o Gmail reembrulha. Então desfazemos aqui, no envio.
 */
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

/** Mostra como os links vão sair depois da limpeza. Não envia nada. */
function conferirLinks() {
  const partes = [
    { rotulo: 'E-mail 1', assunto: CFG.ASSUNTO_RASCUNHO, obrigatorio: true },
    { rotulo: 'E-mail 2', assunto: CFG.ASSUNTO_RASCUNHO_2, obrigatorio: false },
    { rotulo: 'E-mail 3', assunto: CFG.ASSUNTO_RASCUNHO_3, obrigatorio: false }
  ];
  const relatorio = partes.map(function (parte) {
    const tpl = pegarTemplate_(parte.assunto, parte.obrigatorio);
    if (!tpl) return parte.rotulo + ': sem rascunho — usa o texto puro do código';
    const links = (tpl.html.match(/href="([^"]+)"/g) || []).map(function (h) {
      return '   ' + h.replace('href="', '').replace('"', '');
    });
    const sujo = tpl.html.indexOf('google.com/url') !== -1;
    return parte.rotulo + (sujo ? '  ⚠ AINDA HÁ google.com/url' : '  ✓') +
           '\n' + (links.length ? links.join('\n') : '   (nenhum link)');
  }).join('\n\n');

  avisar_('Links dos templates\n\n' + relatorio);
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

/**
 * Converte o HTML em texto puro.
 *
 * Os links viram URL completa e explícita. Sem isso, a âncora
 * "atlas-partner.com" virava texto solto e o cliente de e-mail
 * auto-linkava como http:// (sem o s) — o que dispara aviso de
 * site não seguro em parte dos leitores.
 */
function htmlParaTexto_(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      function (tudo, href, texto) {
        const rotulo = texto.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (/^(mailto:|tel:)/i.test(href)) return rotulo || href.replace(/^\w+:/, '');
        if (!rotulo) return href;
        // rótulo que já é o próprio endereço: mostra só a URL completa
        const nu = rotulo.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
        const hu = href.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
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
  const esc = texto
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;' +
         'line-height:22px;color:#222">' + esc.replace(/\n/g, '<br>') + '</div>';
}

/**
 * Alerta em caixa de diálogo. Cai no log quando não há interface — é o que
 * acontece em toda execução por gatilho.
 */
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

const TZ = 'America/Sao_Paulo';

/** Hoje é dia útil e estamos dentro da janela de envio? */
function dentroDaJanela_() {
  const agora = new Date();
  const dia = Number(Utilities.formatDate(agora, TZ, 'u'));   // 1=seg ... 7=dom
  const hora = Number(Utilities.formatDate(agora, TZ, 'H'));

  if (CFG.SOMENTE_DIAS_UTEIS && dia > 5) return false;
  return hora >= CFG.HORA_INICIO && hora < CFG.HORA_FIM;
}

/**
 * Data em que a campanha começou. Guardada na primeira execução e usada
 * para saber em que semana da rampa estamos.
 */
function inicioDaCampanha_() {
  const props = PropertiesService.getScriptProperties();
  let iso = props.getProperty('INICIO_CAMPANHA');
  if (!iso) {
    iso = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    props.setProperty('INICIO_CAMPANHA', iso);
  }
  const p = iso.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

/** Teto de envios para hoje, conforme a semana da rampa. */
function limiteDiarioHoje_() {
  const dias = Math.floor((new Date() - inicioDaCampanha_()) / 86400000);
  const semana = Math.floor(dias / 7);
  const r = CFG.RAMPA_DIARIA;
  return semana < r.length ? r[semana] : r[r.length - 1];
}

/** Quantos já saíram hoje, lendo a coluna enviado_em. */
function enviadosHoje_() {
  const hoje = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const dados = planilha_().getDataRange().getValues();
  let n = 0;
  for (let i = 1; i < dados.length; i++) {
    const d = dados[i][COL.ENVIADO - 1];
    if (d instanceof Date && Utilities.formatDate(d, TZ, 'yyyy-MM-dd') === hoje) n++;
  }
  return n;
}

/**
 * Quantos cabem nesta execução. Divide o que falta do dia pelas horas que
 * ainda restam na janela, para os envios saírem espalhados em vez de em
 * rajada — rajada é o padrão que os filtros reconhecem como robô.
 */
function vagasDestaHora_() {
  const falta = limiteDiarioHoje_() - enviadosHoje_();
  if (falta <= 0) return 0;
  const hora = Number(Utilities.formatDate(new Date(), TZ, 'H'));
  const janelasRestantes = Math.max(1, CFG.HORA_FIM - hora);
  return Math.max(1, Math.ceil(falta / janelasRestantes));
}

/** Situação da campanha, sem enviar nada. */
function verStatus() {
  const dados = planilha_().getDataRange().getValues();
  const conta = {};
  for (let i = 1; i < dados.length; i++) {
    const s = String(dados[i][COL.STATUS - 1] || 'PENDENTE').trim() || 'PENDENTE';
    conta[s] = (conta[s] || 0) + 1;
  }
  const linhas = Object.keys(conta).sort().map(function (k) {
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

/** Resumo do dia por e-mail. Roda uma vez, no fim da janela. */
function relatorioDiario() {
  if (!CFG.ENVIAR_RELATORIO) return;
  const dia = Number(Utilities.formatDate(new Date(), TZ, 'u'));
  if (CFG.SOMENTE_DIAS_UTEIS && dia > 5) return;

  const dados = planilha_().getDataRange().getValues();
  const conta = {};
  let pendentes = 0;
  for (let i = 1; i < dados.length; i++) {
    const s = String(dados[i][COL.STATUS - 1] || '').trim();
    if (!s) { pendentes++; continue; }
    conta[s] = (conta[s] || 0) + 1;
  }

  const corpo =
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

/** Cria os gatilhos diários. Rode uma vez. */
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

/** Desliga tudo. A planilha e o histórico ficam intactos. */
function pausarAutomacao() {
  const n = removerGatilhos_();
  avisar_(
    'Automação pausada\n\n' + n + ' gatilho(s) removido(s).\n\n' +
    'Nenhum envio automático vai acontecer. O menu continua funcionando ' +
    'para envio manual, e a rampa retoma de onde parou quando você religar.'
  );
}

function removerGatilhos_() {
  const meus = ['enviarLote', 'enviarLoteAutomatico', 'enviarFollowUps',
                'relatorioDiario'];
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (meus.indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
      n++;
    }
  });
  return n;
}
