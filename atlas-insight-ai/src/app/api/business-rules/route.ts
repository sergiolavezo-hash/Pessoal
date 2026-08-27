import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, auditLog, ApiError } from "@/services/api-context";
import { AIOrchestrator } from "@/ai/orchestrator";
import { isLLMConfigured } from "@/ai/llm";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const ctx = await requireWorkspace(workspaceId);
    const { data, error } = await ctx.supabase
      .from("business_rules")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ businessRules: data });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(120),
  definition: z.string().min(5).max(4000),
});

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    // The AI structures the rule when an LLM is configured; otherwise the
    // rule is stored as natural language only and structured later.
    let structured: Record<string, unknown> = {};
    let affectedEntities: string[] = [];
    if (isLLMConfigured()) {
      try {
        const orchestrator = new AIOrchestrator(ctx);
        structured = await orchestrator.parseBusinessRule(body.definition);
        const entities = structured.affected_entities;
        if (Array.isArray(entities)) affectedEntities = entities.map(String);
      } catch (error) {
        structured = { parse_error: error instanceof Error ? error.message : "AI parsing failed" };
      }
    }

    const { data: rule, error } = await ctx.supabase
      .from("business_rules")
      .insert({
        workspace_id: ctx.workspaceId,
        name: body.name,
        natural_language_definition: body.definition,
        structured_definition: structured,
        affected_entities: affectedEntities,
        status: "ACTIVE",
        created_by: ctx.user.id,
      })
      .select()
      .single();
    if (error || !rule) throw new ApiError(500, error?.message ?? "Failed to create rule");

    await auditLog(ctx, "created_business_rule", "business_rule", rule.id);
    return NextResponse.json({ businessRule: rule }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
