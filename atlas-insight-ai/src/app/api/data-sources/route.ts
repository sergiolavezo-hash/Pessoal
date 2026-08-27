import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { connectorConfigSchemas, isSupportedConnectorType } from "@/connectors/config-schemas";
import { createConnector } from "@/connectors";
import { createAdminClient } from "@/lib/supabase/admin";
import { storeCredentials } from "@/services/credentials";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId);
    const { data, error } = await ctx.supabase
      .from("data_sources")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ dataSources: data });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(80),
  type: z.string(),
  config: z.record(z.string(), z.unknown()).default({}),
  credentials: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    if (!isSupportedConnectorType(body.type)) {
      throw new ApiError(400, `Unsupported connector type: ${body.type}`);
    }
    const schemas = connectorConfigSchemas[body.type];
    const config = schemas.config.parse(body.config);
    const credentials = schemas.credentials.parse(body.credentials);

    // Test the connection before persisting anything.
    const admin = createAdminClient();
    const probe = createConnector(
      { id: "probe", workspace_id: ctx.workspaceId, type: body.type, config },
      credentials,
      admin
    );
    const test = await probe.testConnection();
    await probe.close();

    const { data: dataSource, error } = await ctx.supabase
      .from("data_sources")
      .insert({
        workspace_id: ctx.workspaceId,
        name: body.name,
        type: body.type,
        config,
        status: test.ok ? "CONNECTED" : "ERROR",
        last_error: test.ok ? null : test.message,
        created_by: ctx.user.id,
      })
      .select()
      .single();
    if (error || !dataSource) throw new ApiError(500, error?.message ?? "Failed to create data source");

    if (Object.keys(credentials).length > 0) {
      await storeCredentials(admin, dataSource.id, credentials);
    }

    await auditLog(ctx, "created_data_source", "data_source", dataSource.id, { type: body.type });
    return NextResponse.json({ dataSource, test }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
