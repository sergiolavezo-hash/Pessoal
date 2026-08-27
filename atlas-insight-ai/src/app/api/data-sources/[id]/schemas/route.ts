import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace, handleApiError } from "@/services/api-context";
import { getConnectorFor } from "@/services/data-sources";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId);
    const { connector } = await getConnectorFor(ctx, id);
    const schemas = await connector.listSchemas();
    await connector.close();
    return NextResponse.json({ schemas });
  } catch (error) {
    return handleApiError(error);
  }
}
