/**
 * Levar o painel para fora do Atlas.
 *
 * Duas saídas, porque servem a coisas diferentes: o CSV leva os NÚMEROS para
 * quem vai continuar a conta numa planilha; a impressão leva o DESENHO para
 * quem vai apresentar ou arquivar.
 */

/**
 * Excel em português quebra colunas por ponto e vírgula, não por vírgula.
 * Um CSV separado por vírgula abre como uma coluna só — o usuário conclui
 * que a exportação veio quebrada, e tecnicamente ela veio.
 */
const SEPARATOR = ";";

/**
 * Escapa um valor para CSV.
 *
 * Aspas, quebras de linha e o próprio separador dentro do texto desalinham
 * todas as colunas seguintes, e o estrago só aparece lá na frente da planilha.
 */
export function cell(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  if (text.includes('"') || text.includes(SEPARATOR) || /[\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(
  columns: string[],
  rows: Array<Record<string, unknown>>
): string {
  const head = columns.map(cell).join(SEPARATOR);
  const body = rows.map((row) => columns.map((c) => cell(row[c])).join(SEPARATOR));
  return [head, ...body].join("\r\n");
}

/**
 * Nome de arquivo seguro a partir do título do widget.
 *
 * Barra e dois-pontos são proibidos em nome de arquivo no Windows e no macOS;
 * um título como "Vendas 2026/2027" faria o download falhar em silêncio.
 */
export function safeFileName(title: string, extension: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return `${base || "painel"}.${extension}`;
}

/**
 * Dispara o download no navegador.
 *
 * O BOM no início faz o Excel reconhecer UTF-8; sem ele, "São Paulo" chega
 * como "SÃ£o Paulo" e o cliente acha que o Atlas corrompeu os dados dele.
 */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Sem revogar, o blob fica na memória da aba até ela ser fechada.
  URL.revokeObjectURL(url);
}

export interface CsvSection {
  title: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

/**
 * Um arquivo só com todos os widgets, cada um numa seção.
 *
 * A alternativa seria disparar um download por widget — oito arquivos soltos
 * na pasta de downloads, sem indicação de que pertencem ao mesmo painel.
 * O título antes de cada bloco é o que permite reencontrar o número depois.
 */
export function buildDashboardCsv(sections: CsvSection[]): string {
  return sections
    .filter((s) => s.columns.length > 0)
    .map((s) => `${cell(s.title)}\r\n${toCsv(s.columns, s.rows)}`)
    .join("\r\n\r\n");
}
