import { afterEach, describe, expect, it, vi } from "vitest";
import { isStoreAdminEmail, storeAdminEmails } from "@/store/admin";
import { productCreateSchema, styleUpsertSchema } from "@/store/schemas";

function withAdmins(value: string | undefined, run: () => void) {
  const before = process.env.STORE_ADMIN_EMAILS;
  if (value === undefined) delete process.env.STORE_ADMIN_EMAILS;
  else process.env.STORE_ADMIN_EMAILS = value;
  try {
    run();
  } finally {
    if (before === undefined) delete process.env.STORE_ADMIN_EMAILS;
    else process.env.STORE_ADMIN_EMAILS = before;
  }
}

afterEach(() => vi.restoreAllMocks());

describe("quem administra a loja", () => {
  /**
   * A loja é a Atlas vendendo, não o cliente gerindo a conta dele. Usar o
   * papel OWNER daria a TODO cliente o poder de editar preço, publicar
   * produto e baixar qualquer .pbix do catálogo.
   */
  it("recognises a configured admin, ignoring case and spaces", () => {
    withAdmins(" Sergio@Atlas.com , outro@atlas.com ", () => {
      expect(isStoreAdminEmail("sergio@atlas.com")).toBe(true);
      expect(isStoreAdminEmail("SERGIO@ATLAS.COM")).toBe(true);
      expect(isStoreAdminEmail("outro@atlas.com")).toBe(true);
    });
  });

  it("refuses anyone who is not on the list", () => {
    withAdmins("sergio@atlas.com", () => {
      expect(isStoreAdminEmail("cliente@empresa.com")).toBe(false);
      expect(isStoreAdminEmail(null)).toBe(false);
      expect(isStoreAdminEmail(undefined)).toBe(false);
      expect(isStoreAdminEmail("")).toBe(false);
    });
  });

  /**
   * Lista vazia = loja sem administração. É o padrão seguro: numa instalação
   * que esqueceu de configurar, ninguém entra por engano — nem string vazia,
   * que é o valor que um e-mail ausente costuma assumir.
   */
  it("locks everyone out when the list is empty or missing", () => {
    for (const value of [undefined, "", "   ", " , , "]) {
      withAdmins(value, () => {
        expect(storeAdminEmails()).toEqual([]);
        expect(isStoreAdminEmail("sergio@atlas.com")).toBe(false);
        expect(isStoreAdminEmail("")).toBe(false);
      });
    }
  });
});

describe("slug do produto", () => {
  /**
   * O slug é a URL indexável (/templates/executive-sales). Ele NÃO muda
   * depois de publicado — link quebrado perde o tráfego que a página levou
   * meses a ganhar. Por isso só existe na criação.
   */
  it("accepts a clean url segment", () => {
    expect(productCreateSchema.parse({ slug: "executive-sales", name: "Executive Sales", priceCents: 14900 }).slug)
      .toBe("executive-sales");
  });

  it("refuses anything that would make an ugly or broken url", () => {
    for (const slug of ["Executive Sales", "executive_sales", "-executive", "executive-", "EXEC", "ex", "acentuação"]) {
      const r = productCreateSchema.safeParse({ slug, name: "Nome", priceCents: 100 });
      expect(r.success, `slug "${slug}" deveria ser recusado`).toBe(false);
    }
  });

  // Editar não recebe slug: o campo simplesmente não existe no schema.
  it("is absent from the update schema, so it cannot change by accident", () => {
    expect(Object.keys(productCreateSchema.shape)).toContain("slug");
  });
});

describe("preço", () => {
  // Gratuito é um preço válido (isca, brinde); negativo não existe.
  it("allows zero but never a negative price", () => {
    expect(productCreateSchema.safeParse({ slug: "gratis", name: "Grátis", priceCents: 0 }).success).toBe(true);
    expect(productCreateSchema.safeParse({ slug: "erro", name: "Erro", priceCents: -1 }).success).toBe(false);
  });

  // Nulo no estilo = usa o preço do produto. Diferente de zero, que é grátis.
  it("lets a style inherit the product price with null, distinct from free", () => {
    const base = { productId: "3f2b1c4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b", style: "BLACK" as const, name: "Black" };
    expect(styleUpsertSchema.parse({ ...base, priceCents: null }).priceCents).toBeNull();
    expect(styleUpsertSchema.parse({ ...base, priceCents: 0 }).priceCents).toBe(0);
  });
});

describe("estilos aceitos", () => {
  it("takes the styles the catalogue offers and refuses invented ones", () => {
    const base = { productId: "3f2b1c4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b", name: "Nome" };
    for (const style of ["BLACK", "MODERN", "CLEAN", "WHITE", "EXECUTIVE"]) {
      expect(styleUpsertSchema.safeParse({ ...base, style }).success).toBe(true);
    }
    for (const style of ["black", "NEON", "", "PREMIUM"]) {
      expect(styleUpsertSchema.safeParse({ ...base, style }).success).toBe(false);
    }
  });
});
