import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  extensionOf,
  isUploadPathFor,
  storageFileName,
  storageKeyFor,
  uploadRejection,
} from "@/lib/uploads";

const WORKSPACE = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const UPLOAD = "33333333-3333-3333-3333-333333333333";

describe("extensionOf", () => {
  it("reads the last extension, case-insensitively", () => {
    expect(extensionOf("Vendas.CSV")).toBe("csv");
    expect(extensionOf("relatorio.2026.xlsx")).toBe("xlsx");
  });

  it("returns empty for a name without extension", () => {
    expect(extensionOf("vendas")).toBe("");
  });
});

describe("uploadRejection", () => {
  it("accepts the formats the ingest actually parses", () => {
    for (const name of ["vendas.csv", "vendas.xlsx", "vendas.xls"]) {
      expect(uploadRejection(name, 1024)).toBeNull();
    }
  });

  it("refuses a format the parser cannot read", () => {
    expect(uploadRejection("apresentacao.pdf", 1024)).toContain("não suportado");
  });

  /**
   * O arquivo vazio chegava até o parser e morria lá, com uma mensagem de
   * exceção que não dizia nada ao usuário.
   */
  it("refuses an empty file", () => {
    expect(uploadRejection("vendas.csv", 0)).toContain("vazio");
  });

  /**
   * O limite precisa aparecer na recusa: "arquivo grande demais" não diz ao
   * usuário quanto ele teria de cortar.
   */
  it("states the size and the limit when the file is too big", () => {
    const message = uploadRejection("vendas.csv", MAX_FILE_BYTES + 1);
    expect(message).toContain("50 MB");
    expect(message).toContain("50,0 MB");
  });

  it("accepts a file exactly at the limit", () => {
    expect(uploadRejection("vendas.csv", MAX_FILE_BYTES)).toBeNull();
  });
});

describe("storageFileName", () => {
  it("removes accents and spaces that break the object key", () => {
    expect(storageFileName("Relatório de Vendas.csv")).toBe("Relatorio_de_Vendas.csv");
  });

  it("keeps the extension when the name is very long", () => {
    const name = `${"a".repeat(300)}.xlsx`;
    expect(storageFileName(name).endsWith(".xlsx")).toBe(true);
    expect(storageFileName(name).length).toBeLessThanOrEqual(120);
  });

  it("never returns an empty key", () => {
    expect(storageFileName("...")).not.toBe("");
    expect(storageFileName("")).toBe("arquivo");
  });
});

describe("storageKeyFor / isUploadPathFor", () => {
  /**
   * As políticas do bucket (migração 0005) autorizam pelo PRIMEIRO segmento
   * do caminho. Um caminho que não comece pelo workspace ficaria inacessível
   * para o próprio dono do arquivo.
   */
  it("puts the workspace first, as the storage policies expect", () => {
    expect(storageKeyFor(WORKSPACE, UPLOAD, "vendas.csv")).toBe(
      `${WORKSPACE}/uploads/${UPLOAD}/vendas.csv`
    );
  });

  it("accepts the path it generated", () => {
    const path = storageKeyFor(WORKSPACE, UPLOAD, "Relatório 2026.xlsx");
    expect(isUploadPathFor(path, WORKSPACE)).toBe(true);
  });

  /**
   * O caminho volta pela mão do navegador. Sem esta recusa, um membro do
   * workspace A mandaria finalizar o objeto do workspace B e importaria dados
   * de outro cliente.
   */
  it("refuses a path belonging to another workspace", () => {
    const path = storageKeyFor(OTHER, UPLOAD, "vendas.csv");
    expect(isUploadPathFor(path, WORKSPACE)).toBe(false);
  });

  it("refuses directory traversal and anything outside the upload shape", () => {
    for (const path of [
      `${WORKSPACE}/uploads/${UPLOAD}/../../${OTHER}/segredo.csv`,
      `${WORKSPACE}/../${OTHER}/uploads/${UPLOAD}/vendas.csv`,
      `${WORKSPACE}/vendas.csv`,
      `${WORKSPACE}/uploads/nao-e-uuid/vendas.csv`,
      `/${WORKSPACE}/uploads/${UPLOAD}/vendas.csv`,
      "",
    ]) {
      expect(isUploadPathFor(path, WORKSPACE)).toBe(false);
    }
  });

  it("refuses anything that is not a string", () => {
    for (const value of [null, undefined, 42, {}, [`${WORKSPACE}/uploads/${UPLOAD}/a.csv`]]) {
      expect(isUploadPathFor(value, WORKSPACE)).toBe(false);
    }
  });
});
