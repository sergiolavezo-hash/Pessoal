import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog } from "@/services/api-context";
import { createModel, listModels } from "@/services/analysis-models";

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  tableIds: z.array(z.string().uuid()).min(1, "Escolha ao menos uma tabela"),
});

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace(request.nextUrl.searchParams.get("workspaceId"));
    return NextResponse.json({ models: await listModels(ctx) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    const model = await createModel(ctx, {
      name: body.name,
      description: body.description,
      tableIds: body.tableIds,
    });

    await auditLog(ctx, "created_model", "model", model.id, {
      tables: body.tableIds.length,
    });

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
