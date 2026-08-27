import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError } from "@/services/api-context";
import { validateMetricForWorkspace } from "@/services/metrics";

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  formula: z.string().min(1).max(2000),
  slug: z.string().optional(),
});

/** Live validation for the metric editor. */
export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId);
    const validation = await validateMetricForWorkspace(ctx, body.formula, body.slug);
    return NextResponse.json({ validation });
  } catch (error) {
    return handleApiError(error);
  }
}
