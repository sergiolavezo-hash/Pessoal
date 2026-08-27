import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError } from "@/services/api-context";
import { getConnectorFor } from "@/services/data-sources";

const bodySchema = z.object({ workspaceId: z.string().uuid() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId);
    const { connector } = await getConnectorFor(ctx, id);
    const result = await connector.testConnection();
    await connector.close();

    await ctx.supabase
      .from("data_sources")
      .update(
        result.ok
          ? { status: "CONNECTED", last_error: null }
          : { status: "ERROR", last_error: result.message }
      )
      .eq("id", id);

    return NextResponse.json({ result });
  } catch (error) {
    return handleApiError(error);
  }
}
