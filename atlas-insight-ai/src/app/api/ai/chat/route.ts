import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireWorkspace, handleApiError, ApiError } from "@/services/api-context";
import { AIOrchestrator } from "@/ai/orchestrator";

export const maxDuration = 60;

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(2).max(4000),
  dataSourceId: z.string().uuid().optional(),
});

/** AI Analyst conversational turn with persisted history + evidence. */
export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const ctx = await requireWorkspace(body.workspaceId, "EDITOR");

    // Find or create the conversation.
    let conversationId = body.conversationId;
    if (conversationId) {
      const { data } = await ctx.supabase
        .from("ai_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("workspace_id", ctx.workspaceId)
        .single();
      if (!data) throw new ApiError(404, "Conversation not found");
    } else {
      const { data, error } = await ctx.supabase
        .from("ai_conversations")
        .insert({
          workspace_id: ctx.workspaceId,
          user_id: ctx.user.id,
          title: body.message.slice(0, 80),
        })
        .select("id")
        .single();
      if (error || !data) throw new ApiError(500, error?.message ?? "Failed to create conversation");
      conversationId = data.id;
    }

    await ctx.supabase.from("ai_messages").insert({
      workspace_id: ctx.workspaceId,
      conversation_id: conversationId,
      role: "user",
      content: body.message,
    });

    const orchestrator = new AIOrchestrator(ctx, conversationId);
    const { answer, evidence } = await orchestrator.chat(body.message, body.dataSourceId);

    const { data: assistantMessage } = await ctx.supabase
      .from("ai_messages")
      .insert({
        workspace_id: ctx.workspaceId,
        conversation_id: conversationId,
        role: "assistant",
        content: answer.answer,
        payload: { answer, evidence },
      })
      .select()
      .single();

    await ctx.supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({ conversationId, message: assistantMessage, answer, evidence });
  } catch (error) {
    return handleApiError(error);
  }
}
