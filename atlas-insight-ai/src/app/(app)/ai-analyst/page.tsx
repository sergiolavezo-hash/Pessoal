import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { cn, relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AnalystChat } from "@/features/ai-analyst/chat";
import type { AiConversation, AiMessage } from "@/types";

export const metadata = { title: "AI Analyst" };

const SUGGESTIONS = [
  "What was our total revenue last quarter?",
  "Which region grew the most?",
  "Who are the top 5 salespeople by revenue?",
  "Compare this month with the previous month",
];

export default async function AiAnalystPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("updated_at", { ascending: false })
    .limit(30);

  const conversationList = (conversations ?? []) as AiConversation[];
  const selected = c ? conversationList.find((conv) => conv.id === c) ?? null : null;

  let messages: AiMessage[] = [];
  if (selected) {
    const { data } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", selected.id)
      .order("created_at");
    messages = (data ?? []) as AiMessage[];
  }

  return (
    <div>
      <PageHeader
        title="AI Analyst"
        description="Conversational analytics with evidence for every number."
        actions={
          <Button variant="outline" asChild>
            <Link href="/ai-analyst">
              <MessageSquarePlus />
              New conversation
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">History</p>
          {conversationList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            <ul className="space-y-1">
              {conversationList.map((conv) => (
                <li key={conv.id}>
                  <Link
                    href={`/ai-analyst?c=${conv.id}`}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                      selected?.id === conv.id && "bg-accent font-medium"
                    )}
                  >
                    <span className="line-clamp-1">{conv.title}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(conv.updated_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="min-w-0">
          <AnalystChat
            workspaceId={ctx.workspace.id}
            conversationId={selected?.id ?? null}
            initialMessages={messages}
            suggestions={SUGGESTIONS}
          />
        </div>
      </div>
    </div>
  );
}
