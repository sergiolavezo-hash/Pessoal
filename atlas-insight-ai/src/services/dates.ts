/**
 * Reconhecer data escrita como gente escreve.
 *
 * O inferidor antigo só aceitava `aaaa-mm-dd`. Tudo o mais — inclusive
 * `dd/mm/aaaa`, o padrão do Excel em português — virava TEXTO. E coluna de
 * data como texto não é detalhe de tipo: o perfil atribui o papel DATE a
 * partir do tipo, então a base inteira ficava "sem evolução no tempo". Numa
 * série temporal isso é a base perdendo o sentido, e o usuário só via um
 * painel sem nenhum gráfico ao longo do tempo.
 *
 * O modelo é o da FAMÍLIA do formato, não o de um formato único por coluna:
 *
 *   - Ano de quatro dígitos na frente ("2020-03-11") não tem dúvida nenhuma.
 *   - Ano no fim ("22/01/2020") ou ano de dois dígitos ("2/2/20") deixam uma
 *     única dúvida: o primeiro número é dia ou mês?
 *
 * Essa dúvida é resolvida pela COLUNA INTEIRA, nunca pelo valor: basta um
 * "22/01/2020" para provar que o primeiro campo é dia, ou um "01/22/2020"
 * para provar que é mês. Uma coluna pode misturar as duas famílias — a base
 * COVID tem "1/22/2020 17:00" e "2020-03-11T02:18:14" lado a lado — e cada
 * valor é convertido pela família dele.
 *
 * Só quando nenhum valor da coluna desempata é que se assume um padrão, e aí
 * vira aviso na tela: ler o mês como dia troca todos os números de lugar.
 */

/** Dentro da família com o ano no fim, quem vem primeiro. */
export type DayMonth = "dmy" | "mdy";

export interface DateFormat {
  dayMonth: DayMonth;
  /** Tem hora junto? Decide entre coluna `date` e `timestamptz`. */
  withTime: boolean;
  /** Nenhum valor desempatou dia de mês: o padrão foi assumido. */
  ambiguous: boolean;
}

/**
 * Três números com o MESMO separador (/ . ou -), com hora opcional depois.
 * O mesmo separador nos dois lugares é exigido pela referência \2: "22/01-2020"
 * não é data, é digitação errada, e aceitar isso abre a porta para lixo.
 */
const PARTS =
  /^(\d{1,4})([/.\-])(\d{1,2})\2(\d{1,4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*$/;

interface Candidate {
  a: number;
  b: number;
  c: number;
  sep: string;
  /** Quantos dígitos o primeiro campo tinha: é o que marca "2020" como ano. */
  aLen: number;
  cLen: number;
  time: { h: number; m: number; s: number } | null;
}

function split(value: string): Candidate | null {
  const m = PARTS.exec(value.trim());
  if (!m) return null;
  const [, a, sep, b, c, h, mi, se] = m;
  return {
    a: Number(a),
    b: Number(b),
    c: Number(c),
    sep,
    aLen: a.length,
    cLen: c.length,
    time: h == null ? null : { h: Number(h), m: Number(mi), s: Number(se ?? "0") },
  };
}

/**
 * Ano de dois dígitos vira ano de quatro.
 *
 * "1/31/20 23:59" aparece à vontade em export de sistema, e sem isto a coluna
 * inteira volta a ser texto: 20 não é um ano que exista. O corte em 70 é a
 * convenção do próprio Postgres — 00-69 vira 2000, 70-99 vira 1900.
 */
function expandYear(year: number, digits: number): number {
  if (digits > 2) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
}

/** Uma data existe de verdade? 31/02 casa com a regex e não existe. */
/**
 * Um ano se escreve com dois ou quatro dígitos. Nunca com um ou três.
 *
 * Essa única regra separa data de versão e de código: "1.2.3" tem ano de um
 * dígito, e sem ela virava 2003-02-01 — uma coluna de versões inteira
 * silenciosamente convertida em datas, que é pior do que não reconhecer nada.
 */
function isYearField(digits: number): boolean {
  return digits === 2 || digits === 4;
}

function realDate(year: number, month: number, day: number): boolean {
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function validTime(t: Candidate["time"]): boolean {
  return t == null || (t.h <= 23 && t.m <= 59 && t.s <= 59);
}

type Resolved = [year: number, month: number, day: number];

function asYmd(p: Candidate): Resolved | null {
  if (!isYearField(p.aLen)) return null;
  const r: Resolved = [expandYear(p.a, p.aLen), p.b, p.c];
  return realDate(...r) ? r : null;
}

function asDayMonth(p: Candidate, order: DayMonth): Resolved | null {
  if (!isYearField(p.cLen)) return null;
  const r: Resolved =
    order === "dmy" ? [expandYear(p.c, p.cLen), p.b, p.a] : [expandYear(p.c, p.cLen), p.a, p.b];
  return realDate(...r) ? r : null;
}

/**
 * Como este valor deve ser lido, e se ele sozinho resolve a dúvida.
 *
 * `vote` é o que a coluna usa para decidir: um valor que só faz sentido de um
 * jeito ensina a coluna inteira.
 */
function readValue(
  p: Candidate,
  dayMonth: DayMonth
): { resolved: Resolved; vote: DayMonth | null; ambiguous: boolean } | null {
  if (!validTime(p.time)) return null;

  // Ano de quatro dígitos na frente: não há o que discutir, e este valor não
  // opina sobre dia-mês porque não pertence a essa família.
  if (p.aLen === 4) {
    const r = asYmd(p);
    return r ? { resolved: r, vote: null, ambiguous: false } : null;
  }

  const d = asDayMonth(p, "dmy");
  const m = asDayMonth(p, "mdy");

  if (d && m) {
    const chosen = dayMonth === "dmy" ? d : m;
    return { resolved: chosen, vote: null, ambiguous: true };
  }
  if (d) return { resolved: d, vote: "dmy", ambiguous: false };
  if (m) return { resolved: m, vote: "mdy", ambiguous: false };

  // Sobra a leitura com ano curto na frente ("20-01-31"), rara mas real.
  const y = asYmd(p);
  return y ? { resolved: y, vote: null, ambiguous: false } : null;
}

/**
 * Padrão quando a coluna inteira é ambígua: pt-BR, porque é o público do
 * produto e o que o Excel local produz. Fica registrado em `ambiguous` para
 * virar aviso — assumir em silêncio é o que faz março virar dia 3.
 */
const DEFAULT_DAY_MONTH: DayMonth = "dmy";

/**
 * Formato da coluna, ou null se ela não for de data.
 *
 * Exige que TODOS os valores preenchidos sejam data. Uma coluna com 90% de
 * datas e o resto "n/d" segue como texto de propósito: converter os 10% para
 * vazio apagaria dado do cliente sem avisar.
 */
export function detectDateFormat(values: unknown[]): DateFormat | null {
  const present = values
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => String(v).trim());
  if (present.length === 0) return null;

  const votes: Record<DayMonth, number> = { dmy: 0, mdy: 0 };
  let withTime = false;
  let sawAmbiguous = false;
  let sawFullYear = false;
  let sawDotSeparator = false;

  for (const value of present) {
    const p = split(value);
    if (!p) return null;
    // A ordem passada aqui não muda o veredito de "é data?" nem o voto.
    const read = readValue(p, DEFAULT_DAY_MONTH);
    if (!read) return null;
    if (read.vote) votes[read.vote] += 1;
    if (read.ambiguous) sawAmbiguous = true;
    if (p.time != null) withTime = true;
    if (p.aLen === 4 || p.cLen === 4) sawFullYear = true;
    if (p.sep === ".") sawDotSeparator = true;
  }

  // Nenhum valor da coluna traz ano de quatro dígitos E o separador é ponto:
  // "10.20.30" é muito mais often código ou versão do que data. Ficar como
  // texto é seguro — virar a data errada, não. Barra e traço continuam
  // valendo, porque "31/01/20" e "31-01-20" são datas de verdade.
  if (!sawFullYear && sawDotSeparator) return null;

  const decided = votes.dmy === votes.mdy ? null : votes.dmy > votes.mdy ? "dmy" : "mdy";
  return {
    dayMonth: decided ?? DEFAULT_DAY_MONTH,
    withTime,
    // Só avisa quando houve dúvida real E a coluna não a resolveu sozinha.
    ambiguous: sawAmbiguous && decided == null,
  };
}

/**
 * Converte para ISO, que é o que o Postgres aceita sem depender de locale.
 * Devolve null quando o valor não é data — vazio é melhor que data inventada.
 */
export function toIsoDate(value: unknown, format: DateFormat): string | null {
  if (value == null || String(value).trim() === "") return null;
  const p = split(String(value));
  if (!p) return null;
  const read = readValue(p, format.dayMonth);
  if (!read) return null;

  const [year, month, day] = read.resolved;
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!format.withTime) return iso;
  if (p.time == null) return `${iso} 00:00:00`;

  const { h, m, s } = p.time;
  return `${iso} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Como o formato aparece para o usuário, no aviso de ambiguidade. */
export function describeDayMonth(order: DayMonth): string {
  return order === "dmy" ? "dia/mês/ano" : "mês/dia/ano";
}
