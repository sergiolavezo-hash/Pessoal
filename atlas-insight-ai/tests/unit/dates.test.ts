import { describe, expect, it } from "vitest";
import { describeDayMonth, detectDateFormat, toIsoDate } from "@/services/dates";
import { inferColumnType } from "@/services/file-ingest";

function iso(values: string[]): Array<string | null> {
  const format = detectDateFormat(values);
  if (!format) return values.map(() => null);
  return values.map((v) => toIsoDate(v, format));
}

describe("formatos que os clientes trazem", () => {
  /**
   * O motivo desta camada existir. Antes só `aaaa-mm-dd` era reconhecido, e
   * o papel DATE é atribuído pelo TIPO da coluna — então toda base cuja data
   * viesse em qualquer outro formato ficava "sem evolução no tempo".
   */
  it("reads the Brazilian Excel format", () => {
    expect(iso(["22/01/2020", "15/03/2020"])).toEqual(["2020-01-22", "2020-03-15"]);
  });

  it("reads the US format", () => {
    expect(iso(["01/22/2020", "03/15/2020"])).toEqual(["2020-01-22", "2020-03-15"]);
  });

  it("reads ISO, dots and dashes", () => {
    expect(iso(["2020-01-22", "2020-03-15"])).toEqual(["2020-01-22", "2020-03-15"]);
    expect(iso(["22.01.2020", "15.03.2020"])).toEqual(["2020-01-22", "2020-03-15"]);
    expect(iso(["22-01-2020", "15-03-2020"])).toEqual(["2020-01-22", "2020-03-15"]);
  });

  it("keeps the time when there is one", () => {
    expect(iso(["22/01/2020 17:30", "15/03/2020 08:05:09"])).toEqual([
      "2020-01-22 17:30:00",
      "2020-03-15 08:05:09",
    ]);
  });

  // Data sem hora numa coluna que tem hora precisa virar meia-noite, senão
  // o Postgres recusa a linha inteira.
  it("fills midnight for a row without a time in a timestamp column", () => {
    expect(iso(["22/01/2020 17:30", "15/03/2020"])).toEqual([
      "2020-01-22 17:30:00",
      "2020-03-15 00:00:00",
    ]);
  });

  /**
   * Ano de dois dígitos é o que mais aparece em export de sistema, e era o
   * que derrubava a coluna `Last Update` da base COVID inteira para texto.
   */
  it("expands a two-digit year the way Postgres does", () => {
    expect(iso(["31/01/20", "15/03/99"])).toEqual(["2020-01-31", "1999-03-15"]);
  });
});

describe("dia ou mês: a coluna decide, não o valor", () => {
  /**
   * "01/02/2020" sozinho é ambíguo. A coluna quase nunca é: basta um valor
   * com dia acima de 12 para provar de que lado está o dia.
   */
  it("lets one unambiguous value teach the whole column", () => {
    expect(iso(["01/02/2020", "22/01/2020"])).toEqual(["2020-02-01", "2020-01-22"]);
    expect(iso(["01/02/2020", "01/22/2020"])).toEqual(["2020-01-02", "2020-01-22"]);
  });

  it("assumes the Brazilian order and says so when nothing decides", () => {
    const format = detectDateFormat(["01/02/2020", "03/04/2020"]);
    expect(format?.ambiguous).toBe(true);
    expect(format?.dayMonth).toBe("dmy");
    expect(describeDayMonth("dmy")).toBe("dia/mês/ano");
  });

  // Aviso só quando há dúvida DE VERDADE: alarme falso treina o usuário a
  // ignorar todos os avisos.
  it("stays quiet when the column resolved itself", () => {
    expect(detectDateFormat(["22/01/2020", "01/02/2020"])?.ambiguous).toBe(false);
    expect(detectDateFormat(["2020-01-22", "2020-03-15"])?.ambiguous).toBe(false);
  });
});

describe("coluna com formatos misturados", () => {
  /**
   * O caso real: a coluna "Last Update" da base COVID traz
   * "1/22/2020 17:00" e "2020-03-11T02:18:14" lado a lado. Exigir um formato
   * único devolvia null e a coluna virava texto.
   */
  it("reads each value by its own family", () => {
    expect(iso(["1/22/2020 17:00", "2020-03-11T02:18:14", "2021-04-02 15:13:53"])).toEqual([
      "2020-01-22 17:00:00",
      "2020-03-11 02:18:14",
      "2021-04-02 15:13:53",
    ]);
  });
});

describe("o que NÃO é data", () => {
  it("refuses a column that is only partly dates", () => {
    // Converter os "n/d" para vazio apagaria dado do cliente sem avisar.
    expect(detectDateFormat(["22/01/2020", "n/d", "15/03/2020"])).toBeNull();
  });

  it("refuses dates that do not exist", () => {
    expect(detectDateFormat(["31/02/2020"])).toBeNull();
    expect(detectDateFormat(["45/13/2020"])).toBeNull();
  });

  it("refuses versions, codes and plain text", () => {
    for (const values of [["1.2.3"], ["10.20.30"], ["Sul", "Norte"], ["ABC-12-XY"], ["22/01-2020"]]) {
      expect(detectDateFormat(values)).toBeNull();
    }
  });

  // Número nunca chega ao detector: o tipo numérico é decidido antes.
  it("keeps money and counts numeric", () => {
    expect(inferColumnType(["R$ 1.234,56", "R$ 89,90"])).toBe("numeric");
    expect(inferColumnType(["1", "2", "3"])).toBe("bigint");
  });
});

describe("inferColumnType com as datas reais", () => {
  it("types a date column as date and a timestamp column as timestamptz", () => {
    expect(inferColumnType(["22/01/2020", "15/03/2020"])).toBe("date");
    expect(inferColumnType(["22/01/2020 17:30", "15/03/2020 08:00"])).toBe("timestamptz");
    expect(inferColumnType(["01/22/2020", "03/15/2020"])).toBe("date");
  });

  it("leaves a text column alone", () => {
    expect(inferColumnType(["Anhui", "Beijing"])).toBe("text");
  });
});

describe("data com ponto continua funcionando quando o ano é completo", () => {
  /**
   * A guarda do separador ponto vale só quando NENHUM valor traz ano de
   * quatro dígitos. "22.01.2020" é data e não pode ser confundida com versão.
   */
  it("accepts dotted dates with a four-digit year", () => {
    expect(iso(["22.01.2020", "15.03.2020"])).toEqual(["2020-01-22", "2020-03-15"]);
  });

  // Mas "10.20.30" sozinho é indistinguível de código: fica texto.
  it("refuses an all-short dotted triple", () => {
    expect(detectDateFormat(["10.20.30", "11.21.31"])).toBeNull();
  });

  // Com barra, ano curto continua valendo: é escrita de data de verdade.
  it("still accepts short years with slashes and dashes", () => {
    expect(iso(["31/01/20", "15/03/20"])).toEqual(["2020-01-31", "2020-03-15"]);
    expect(iso(["31-01-20", "15-03-20"])).toEqual(["2020-01-31", "2020-03-15"]);
  });
});
