import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError } from "@/services/api-context";
import { getConnectorFor } from "@/services/data-sources";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const schema = request.nextUrl.searchParams.get("schema") ?? undefined;
    const ctx = await requireWorkspace(workspaceId);
    const { connector } = await getConnectorFor(ctx, id);
    const tables = await connector.listTables(schema);
    await connector.close();
    return NextResponse.json({ tables });
  } catch (error) {
    return handleApiError(error);
  }
}
