import { z } from "zod";

// The semantic model is the contract between raw data and the AI/metrics
// layers. The LLM never sees raw column lists alone — it sees this model.

export const aggregationSchema = z.enum(["SUM", "AVG", "MIN", "MAX", "COUNT", "COUNT_DISTINCT"]);

export const semanticFieldSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fieldType: z.enum(["DIMENSION", "MEASURE", "ATTRIBUTE"]),
  /** Physical column name in the underlying table. */
  column: z.string().min(1),
  dataType: z.string().optional(),
  defaultAggregation: aggregationSchema.optional(),
  format: z.enum(["number", "currency", "percent", "decimal"]).optional(),
  synonyms: z.array(z.string()).default([]),
  /** Confidence of the automatic classification (0-1). */
  confidence: z.number().min(0).max(1).optional(),
});

export const semanticEntitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  /**
   * Physical table reference the SQL generator should use, e.g.
   * "public.orders", "dataset.sales" or "file_data.f_<id>".
   */
  table: z.string().min(1),
  /** Catalog table id, for lineage. */
  tableId: z.string().uuid().optional(),
  primaryKey: z.string().optional(),
  fields: z.array(semanticFieldSchema).default([]),
});

export const semanticRelationshipSchema = z.object({
  fromEntity: z.string().min(1),
  fromField: z.string().min(1),
  toEntity: z.string().min(1),
  toField: z.string().min(1),
  type: z.enum(["one-to-one", "one-to-many", "many-to-one", "many-to-many"]),
  confidence: z.number().min(0).max(1).optional(),
});

export const semanticModelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  dialect: z.enum(["bigquery", "postgres", "sqlserver"]),
  entities: z.array(semanticEntitySchema).min(1),
  relationships: z.array(semanticRelationshipSchema).default([]),
});

export type SemanticField = z.infer<typeof semanticFieldSchema>;
export type SemanticEntity = z.infer<typeof semanticEntitySchema>;
export type SemanticRelationship = z.infer<typeof semanticRelationshipSchema>;
export type SemanticModel = z.infer<typeof semanticModelSchema>;

export function findEntity(model: SemanticModel, name: string): SemanticEntity | undefined {
  const normalized = name.trim().toLowerCase();
  return model.entities.find((e) => e.name.toLowerCase() === normalized);
}

export function findField(entity: SemanticEntity, name: string): SemanticField | undefined {
  const normalized = name.trim().toLowerCase();
  return entity.fields.find(
    (f) =>
      f.name.toLowerCase() === normalized ||
      f.column.toLowerCase() === normalized ||
      f.synonyms.some((s) => s.toLowerCase() === normalized)
  );
}
