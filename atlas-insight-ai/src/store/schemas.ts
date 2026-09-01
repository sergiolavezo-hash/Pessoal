import { z } from "zod";

/** Formas aceitas pela administração da loja, num lugar só. */

export const STORE_STYLES = ["BLACK", "MODERN", "CLEAN", "WHITE", "EXECUTIVE", "DARK", "LIGHT"] as const;

/**
 * Slug é a URL indexável e NÃO muda depois de publicado: link quebrado perde
 * o tráfego que a página levou meses a ganhar. Por isso ele só é aceito na
 * criação — o schema de edição não o inclui.
 */
const slug = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas minúsculas, números e hífen.");

export const productCreateSchema = z.object({
  slug,
  name: z.string().min(3).max(120),
  subtitle: z.string().max(200).optional(),
  description: z.string().max(8000).optional(),
  category: z.string().max(60).optional(),
  priceCents: z.number().int().min(0),
  compatibility: z.string().max(300).optional(),
  license: z.string().max(300).optional(),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(300).optional(),
  coverUrl: z.string().url().optional(),
});

export const productUpdateSchema = productCreateSchema.omit({ slug: true }).partial().extend({
  status: z.enum(["draft", "active", "archived"]).optional(),
  sortOrder: z.number().int().optional(),
});

export const styleUpsertSchema = z.object({
  productId: z.string().uuid(),
  style: z.enum(STORE_STYLES),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  pages: z.number().int().min(0).max(200).optional(),
  components: z.number().int().min(0).max(2000).optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  previewUrls: z.array(z.string().url()).max(12).optional(),
});

export const stylePublishSchema = z.object({
  published: z.boolean(),
});
