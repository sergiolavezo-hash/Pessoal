"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, ChevronDown, ChevronUp, Send, User } from "lucide-react";
import { ChartRenderer } from "@/dashboards/chart-renderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AiMessage } from "@/types";
import { readJson } from "@/lib/api-client";

interface Evidence {
  sql: string;
  executionId: string;
  rowCount: number;
  rows: Record<string, unknown>[];
  columns: Array<{ name: string }>;
  metrics: string[];
  period: string | null;
  explanation: string;
  intent: string;
  assumptions: string[];
}

interface Answer {
  answer: string;
  highlights: Array<{ label: string; value: string }>;
  insights: Array<{ kind: string; text: string }>;
  chart: { type: string | null; title?: string; xField?: string; yFields: string[] } | null;
  followups: string[];
}

interface ChatProps {
  workspaceId: string;
  conversationId: string | null;
  initialMessages: AiMessage[];
  suggestions: string[];
}

function EvidenceBlock({ answer, evidence }: { answer: Answer; evidence: Evidence }) {
  const [open, setOpen] = useState(false);
  const chart = answer.chart;

  return (
    <div className="mt-3 space-y-3">
      {answer.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {answer.highlights.map((h, i) => (
            <div key={i} className="rounded-md border bg-card px-3 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{h.label}</p>
              <p className="text-sm font-semibold tabular-nums">{h.value}</p>
            </div>
          ))}
        </div>
      )}

      {chart?.type && evidence.rows.length > 0 && (
        <div className="h-64 rounded-md border bg-card p-3">
          <ChartRenderer
            widget={{
              type: chart.type as "line",
              title: chart.title ?? "",
              xField: chart.xField,
              yFields: chart.yFields,
              format: undefined,
            }}
            rows={evidence.rows}
          />
        </div>
      )}

      {answer.insights.length > 0 && (
        <ul className="space-y-1.5">
          {answer.insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Badge variant="secondary" className="mt-0.5 shrink-0 text-[10px]">
                {insight.kind.replaceAll("_", " ")}
              </Badge>
              <span className="text-muted-foreground">{insight.text}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        How did Atlas calculate this?
      </button>

      {open && (
        <div className="space-y-3 rounded-md border bg-muted/40 p-3 text-xs">
          <div>
            <p className="font-medium">Intent</p>
            <p className="text-muted-foreground">{evidence.intent}</p>
          </div>
          <div>
            <p className="font-medium">Explanation</p>
            <p className="text-muted-foreground">{evidence.explanation}</p>
          </div>
          {evidence.metrics.length > 0 && (
            <div>
              <p className="font-medium">Metrics used</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {evidence.metrics.map((m) => (
                  <Badge key={m} variant="outline">{m}</Badge>
                ))}
              </div>
            </div>
          )}
          {evidence.period && (
            <div>
              <p className="font-medium">Period</p>
              <p className="text-muted-foreground">{evidence.period}</p>
            </div>
          )}
          <div>
            <p className="font-medium">Query</p>
            <pre className="mt-1 max-h-48 overflow-auto rounded bg-card p-2 font-mono">{evidence.sql}</pre>
          </div>
          {evidence.rows.length > 0 && (
            <div>
              <p className="font-medium">Result sample ({evidence.rowCount} rows)</p>
              <div className="mt-1 max-h-48 overflow-auto rounded border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(evidence.rows[0]).map((k) => (
                        <TableHead key={k} className="h-8 text-[10px]">{k}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evidence.rows.slice(0, 10).map((r, i) => (
                      <TableRow key={i}>
                        {Object.values(r).map((v, j) => (
                          <TableCell key={j} className="py-1 text-[11px]">{String(v ?? "—")}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <p className="text-muted-foreground">
            Evidence: query execution <code>{evidence.executionId}</code>
          </p>
        </div>
      )}
    </div>
  );
}

export function AnalystChat({ workspaceId, conversationId, initialMessages, suggestions }: ChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<AiMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    if (!text.trim() || thinking) return;
    setInput("");
    setThinking(true);
    const optimistic: AiMessage = {
      id: `local-${Date.now()}`,
      conversation_id: conversationId ?? "",
      role: "user",
      content: text,
      payload: {},
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, conversationId: conversationId ?? undefined, message: text }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "O Atlas não conseguiu responder");
      if (!conversationId) {
        router.push(`/ai-analyst?c=${json.conversationId}`);
        router.refresh();
        return;
      }
      setMessages((m) => [...m, json.message as AiMessage]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "O Atlas não conseguiu responder");
      setMessages((m) => m.filter((msg) => msg.id !== optimistic.id));
      setInput(text);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto pb-4 pr-1">
        {messages.length === 0 && !thinking && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Ask anything about your data. Every answer is backed by a real query.
            </p>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const payload = message.payload as { answer?: Answer; evidence?: Evidence };
          return (
            <div key={message.id} className="flex gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  message.role === "user" ? "bg-secondary" : "bg-primary/10"
                }`}
              >
                {message.role === "user" ? (
                  <User className="h-4 w-4 text-secondary-foreground" />
                ) : (
                  <Bot className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                {message.role === "assistant" && payload.answer && payload.evidence && (
                  <>
                    <EvidenceBlock answer={payload.answer} evidence={payload.evidence} />
                    {payload.answer.followups.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {payload.answer.followups.map((f) => (
                          <button
                            key={f}
                            onClick={() => send(f)}
                            className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {thinking && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 animate-pulse text-primary" />
            </div>
            <p className="pt-1.5 text-sm text-muted-foreground">
              Atlas is analyzing — resolving metrics, generating and validating the query…
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder='Pergunte ao Atlas… ex.: "Por que o faturamento caiu no mês passado?"'
          rows={2}
          className="resize-none"
          disabled={thinking}
        />
        <Button type="submit" size="icon" loading={thinking} disabled={!input.trim()}>
          <Send />
        </Button>
      </form>
    </div>
  );
}
