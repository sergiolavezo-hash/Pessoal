/**
 * Onde o arquivo enviado pousa — e por que ele não passa mais pela API.
 *
 * O envio antigo mandava o arquivo dentro do corpo do POST /api/files. Isso
 * funciona na máquina do desenvolvedor e falha em produção: a função
 * serverless da Vercel recusa qualquer corpo acima de ~4,5 MB NA BORDA, antes
 * de o código rodar. O handler nunca via o arquivo, a checagem de tamanho
 * nunca executava, e o usuário levava um 413 sem explicação. Esse teto é da
 * infraestrutura — não existe ajuste em vercel.json nem no código que o
 * levante.
 *
 * A correção é o arquivo NÃO passar pela função: o navegador pede uma URL
 * assinada, envia direto para o Storage do Supabase e depois manda para a API
 * apenas o caminho — algumas centenas de bytes. O limite que passa a valer é
 * o do bucket, que é o limite que o produto realmente anuncia.
 */

export const FILES_BUCKET = "workspace-files";

/**
 * Teto do arquivo. Agora é um número que o servidor consegue de fato aplicar:
 * antes ele estava escrito no código mas era inalcançável, porque a borda
 * cortava muito antes.
 */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = new Set(["csv", "xlsx", "xls"]);

export function extensionOf(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? (parts.pop() ?? "").toLowerCase() : "";
}

/**
 * Motivo pelo qual o arquivo não pode ser enviado, ou null quando pode.
 *
 * Devolve a frase pronta em português: essa recusa é a única coisa que o
 * usuário lê quando o envio para, e "400 Bad Request" não explica nada.
 */
export function uploadRejection(fileName: string, sizeBytes: number): string | null {
  const extension = extensionOf(fileName);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return `Tipo de arquivo não suportado${extension ? ` (".${extension}")` : ""}. Envie CSV, XLSX ou XLS.`;
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "O arquivo está vazio.";
  }
  if (sizeBytes > MAX_FILE_BYTES) {
    const mb = (sizeBytes / 1024 / 1024).toFixed(1).replace(".", ",");
    return `O arquivo tem ${mb} MB e o limite é ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

/**
 * Nome utilizável como chave no Storage.
 *
 * Acento, espaço e pontuação em chave de objeto quebram assinatura de URL e
 * viram nomes ilegíveis no bucket. O nome de verdade continua guardado na
 * tabela — este aqui só precisa ser único e recuperável.
 */
export function storageFileName(fileName: string): string {
  const cleaned = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._-]+/, "")
    // Corta pelo fim para a extensão sobreviver a um nome longo.
    .slice(-120);
  return cleaned || "arquivo";
}

/**
 * Caminho do objeto: <workspace>/uploads/<id do envio>/<nome>.
 *
 * O workspace vem primeiro porque as políticas do bucket (migração 0005)
 * autorizam pelo primeiro segmento do caminho. O id do envio isola tentativas
 * do mesmo arquivo: dois envios simultâneos do mesmo nome não se sobrescrevem.
 */
export function storageKeyFor(workspaceId: string, uploadId: string, fileName: string): string {
  return `${workspaceId}/uploads/${uploadId}/${storageFileName(fileName)}`;
}

const UPLOAD_PATH =
  /^([0-9a-fA-F-]{36})\/uploads\/([0-9a-fA-F-]{36})\/([A-Za-z0-9._-]+)$/;

/**
 * O caminho devolvido pelo navegador aponta mesmo para um envio deste
 * workspace?
 *
 * Quem finaliza o envio manda o caminho de volta, e um caminho é texto: sem
 * esta conferência, um membro do workspace A poderia mandar finalizar o objeto
 * do workspace B e importar dados alheios. O formato fechado também descarta
 * travessia ("../") de saída.
 */
export function isUploadPathFor(path: unknown, workspaceId: string): path is string {
  if (typeof path !== "string") return false;
  const match = UPLOAD_PATH.exec(path);
  return match !== null && match[1].toLowerCase() === workspaceId.toLowerCase();
}
