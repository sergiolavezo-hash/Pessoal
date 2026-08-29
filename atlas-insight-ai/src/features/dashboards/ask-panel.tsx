"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { readJson } from "@/lib/api-client";

interface MemoryAnswer {
  source: "memory";
  title: string;
  explanation: string | null;
  columns: Array<{ name: string }>;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
}

interface AiAnswer {
  source: "ai";
  answer: {
    answer: string;
    highlights?: Array<{ label: string; value: string }>;
  };
}

type AskResult = MemoryAnswer | AiAnswer;

/**
 * Perguntar dentro do painel.
 *
 * A origem da resposta fica visível de propósito. Quando ela veio da memória
 * do painel, o usuário vê que não gastou cota — e entende, sem ler manual,
 * por que perguntas parecidas saem de graça e perguntas novas não.
 */
export function AskPanel({
  dashboardId,
  workspaceId,
}: {
  dashboardId: string;
  workspaceId: string;
}) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);

  async function ask() {
    const trimmed = question.trim();
    if (trimmed.length < 2) return;

    setAsking(true);
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, question: trimmed }),
      });
      const json = (await readJson(res)) as AskResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Não foi possível responder");
      setResult(json);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível responder");
    } finally {
      setAsking(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !asking) ask();
            }}
            placeholder="Pergunte sobre estes dados — ex.: qual o faturamento mensal?"
            aria-label="Pergunta sobre este painel"
          />
          <Button onClick={ask} loading={asking} disabled={question.trim().length < 2}>
            <Send />
            Perguntar
          </Button>
        </div>

        {result && (
          <div className="mt-4">
            {result.source === "memory" ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">
                    <Zap className="mr-1 h-3 w-3" />
                    Respondido pela memória do painel
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Sem consumo da sua cota de IA
                  </span>
                </div>
                <p className="mt-2 font-medium">{result.title}</p>
                {result.explanation && (
                  <p className="text-sm text-muted-foreground">{result.explanation}</p>
                )}
                {result.rows.length > 0 && (
                  <div className="mt-3 max-h-72 overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {result.columns.map((col) => (
                            <TableHead key={col.name}>{col.name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.rows.slice(0, 20).map((row, i) => (
                          <TableRow key={i}>
                            {result.columns.map((col) => (
                              <TableCell key={col.name}>{String(row[col.name] ?? "—")}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {result.rowCount > 20 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mostrando 20 de {result.rowCount.toLocaleString("pt-BR")} linhas.
                  </p>
                )}
              </>
            ) : (
              <>
                <Badge variant="secondary">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Pergunta nova — respondida pela IA
                </Badge>
                <p className="mt-2 whitespace-pre-wrap text-sm">{result.answer.answer}</p>
                {result.answer.highlights && result.answer.highlights.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {result.answer.highlights.map((h) => (
                      <div key={h.label} className="rounded-md border px-3 py-2">
                        <p className="text-xs text-muted-foreground">{h.label}</p>
                        <p className="font-medium">{h.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
