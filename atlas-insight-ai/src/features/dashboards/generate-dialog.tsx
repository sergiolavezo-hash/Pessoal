"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Database, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { readJson } from "@/lib/api-client";

/**
 * Um modelo criado pelo usuário.
 *
 * O seletor listava os modelos SEMÂNTICOS automáticos ("Arquivos enviados
 * model v3"), que são artefato interno do Atlas e não dizem nada a quem
 * montou "Modelo Comercial". Agora lista o que o usuário criou, e a escolha
 * restringe de verdade as tabelas que a IA enxerga.
 */
export interface GenerateModelOption {
  id: string;
  name: string;
  /** Fonte das tabelas do modelo; a geração é ancorada nela. */
  dataSourceId: string;
  tableCount: number;
}

export interface GenerateSourceOption {
  id: string;
  name: string;
  type: string;
  /** Whether an ACTIVE semantic model exists for this source. */
  hasModel: boolean;
  /** e.g. "Uploaded Files model v3" — shown as the option label. */
  modelLabel: string | null;
  /** Analysis contexts (Looker-style subjects) discovered in this source. */
  contexts: string[];
}

interface PromptSuggestion {
  title: string;
  prompt: string;
  alternatives: string[];
  dataSummary: string;
}

interface GenerateChoice {
  /** Option value: sourceId, or `${sourceId}::${context}` for one subject. */
  value: string;
  label: string;
  source: GenerateSourceOption;
}

function buildChoices(sources: GenerateSourceOption[]): GenerateChoice[] {
  const choices: GenerateChoice[] = [];
  for (const s of sources) {
    const base = s.modelLabel ? `${s.modelLabel} — ${s.name}` : `${s.name} (raw schema)`;
    if (s.contexts.length > 1) {
      // Vários assuntos na mesma fonte: analisar separadamente ou juntos.
      for (const c of s.contexts) {
        choices.push({ value: `${s.id}::${c}`, label: `${base} · assunto: ${c}`, source: s });
      }
      choices.push({ value: s.id, label: `${base} · todos os assuntos juntos`, source: s });
    } else {
      choices.push({ value: s.id, label: base, source: s });
    }
  }
  return choices;
}

export function GenerateDashboardDialog({
  workspaceId,
  sources,
  models = [],
  initialModelId,
}: {
  workspaceId: string;
  sources: GenerateSourceOption[];
  models?: GenerateModelOption[];
  /** Vindo de "Criar painel" dentro de um modelo: já chega escolhido. */
  initialModelId?: string;
}) {
  const router = useRouter();
  const choices = buildChoices(sources);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState(
    initialModelId ?? (models.length === 1 ? models[0].id : "")
  );
  const [choice, setChoice] = useState(choices.length === 1 ? choices[0].value : "");
  const [submitting, setSubmitting] = useState(false);
  const [suggestion, setSuggestion] = useState<PromptSuggestion | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  // Enquanto o usuário não escrever nada próprio, a sugestão da IA manda no
  // campo; assim que ele edita, paramos de sobrescrever o texto dele.
  const [promptTouched, setPromptTouched] = useState(false);

  const selectedModel = models.find((m) => m.id === modelId) ?? null;
  // Com um modelo escolhido, a fonte vem dele; sem modelos criados, o
  // seletor antigo por fonte continua servindo de saída.
  const effectiveChoice = selectedModel ? selectedModel.dataSourceId : choice;
  const selected = choices.find((c) => c.value === effectiveChoice)?.source;

  /**
   * Por que o botão está desativado — ou null quando dá para gerar.
   *
   * Um botão apagado sem explicação é um beco sem saída: o usuário vê o
   * modelo escolhido, o campo vazio e nada em que clicar. Dizer o que falta
   * transforma isso numa instrução.
   */
  const blockedReason: string | null = !effectiveChoice
    ? "Selecione um modelo para continuar."
    : suggesting
      ? "Aguarde o Atlas ler seus dados…"
      : prompt.trim().length < 5
        ? "Descreva o que você quer analisar para gerar o painel."
        : null;

  /** Lê os dados selecionados e pré-carrega um prompt pronto. */
  async function loadSuggestion(nextChoice: string) {
    if (!nextChoice) {
      setSuggestion(null);
      return;
    }
    const [dataSourceId, context] = nextChoice.split("::");
    setSuggesting(true);
    setSuggestion(null);
    try {
      const res = await fetch("/api/dashboards/suggest-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          dataSourceId,
          ...(context ? { context } : {}),
          ...(modelId ? { modelId } : {}),
        }),
      });
      const json = await readJson<{ suggestion?: PromptSuggestion; dashboard?: { id: string; name: string }; error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "Não foi possível ler os dados");
      const next = json.suggestion as PromptSuggestion;
      setSuggestion(next);
      // Só preenche se o usuário ainda não escreveu o próprio texto.
      setPrompt((current) => (promptTouched && current.trim() !== "" ? current : next.prompt));
    } catch {
      // Sugestão é uma conveniência: sem ela o usuário escreve o próprio texto.
      setSuggestion(null);
    } finally {
      setSuggesting(false);
    }
  }

  function selectChoice(next: string) {
    setChoice(next);
    void loadSuggestion(next);
  }

  function selectModel(next: string) {
    setModelId(next);
    const model = models.find((m) => m.id === next);
    if (model) void loadSuggestion(model.dataSourceId);
  }

  async function submit() {
    if (!effectiveChoice) {
      toast.error("Selecione o modelo que dará base ao painel.");
      return;
    }
    setSubmitting(true);
    try {
      const [dataSourceId, context] = effectiveChoice.split("::");
      const res = await fetch("/api/dashboards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          prompt,
          dataSourceId,
          ...(context ? { context } : {}),
          ...(modelId ? { modelId } : {}),
        }),
      });
      const json = await readJson<{ suggestion?: PromptSuggestion; dashboard?: { id: string; name: string }; error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "Falha ao gerar o painel");
      const dashboard = json.dashboard;
      if (!dashboard) throw new Error("O painel não foi devolvido pelo servidor.");
      toast.success(`Painel "${dashboard.name}" gerado`);
      setOpen(false);
      router.push(`/dashboards/${dashboard.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar o painel", {
        duration: 10000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Ao abrir com uma opção já selecionada, sugere sem exigir clique.
  //
  // Precisa olhar a escolha EFETIVA: com um modelo pré-selecionado (vindo de
  // "Criar painel" dentro dele, ou por ser o único), `choice` está vazio e a
  // sugestão nunca carregava — o usuário via o campo em branco e o botão
  // apagado, sem nada para clicar que resolvesse.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && effectiveChoice && !suggestion && !suggesting) {
      void loadSuggestion(effectiveChoice);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles />
          Gerar com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>O que você quer analisar?</DialogTitle>
          <DialogDescription>
            Escolha o modelo que dá base ao painel. Atlas lê os dados, sugere um prompt pronto e
            usa somente tabelas e colunas que realmente existem.
          </DialogDescription>
        </DialogHeader>
        {sources.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            <Database className="mx-auto mb-2 h-6 w-6" />
            Nenhuma fonte de dados conectada.{" "}
            <Link href="/data-sources" className="text-primary hover:underline">
              Conecte uma primeiro →
            </Link>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="gen-model">Modelo</Label>
              {models.length > 0 ? (
                <>
                  <select
                    id="gen-model"
                    required
                    value={modelId}
                    onChange={(e) => selectModel(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="" disabled>
                      Selecione o modelo que dá base a este painel…
                    </option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {m.tableCount}{" "}
                        {m.tableCount === 1 ? "tabela" : "tabelas"}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    O painel usará somente as tabelas deste modelo.
                  </p>
                </>
              ) : (
                // Sem modelos criados o produto não deve travar: cair para as
                // fontes evita a tela sem saída de quem acabou de subir dados.
                <>
                  <select
                    id="gen-model"
                    required
                    value={choice}
                    onChange={(e) => selectChoice(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="" disabled>
                      Selecione a fonte que dá base a este painel…
                    </option>
                    {choices.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Você ainda não criou nenhum modelo. Crie um em Modelos para escolher
                    exatamente quais tabelas entram no painel.
                  </p>
                </>
              )}
              {selected && !selected.hasModel && models.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Atlas usará o esquema sincronizado da fonte.
                </p>
              )}
            </div>
            {suggesting && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Atlas está lendo seus dados para sugerir o painel…
              </p>
            )}
            {suggestion?.dataSummary && !suggesting && (
              <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">O que Atlas viu nos dados: </span>
                {suggestion.dataSummary}
              </p>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>Descreva seu objetivo</Label>
                {suggestion && prompt !== suggestion.prompt && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt(suggestion.prompt);
                      setPromptTouched(false);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Restaurar sugestão
                  </button>
                )}
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setPromptTouched(true);
                }}
                rows={6}
                placeholder={
                  suggesting
                    ? "Atlas está lendo seus dados…"
                    : effectiveChoice
                      ? "Descreva o painel que você quer…"
                      : "Selecione o modelo acima e Atlas escreve a sugestão para você."
                }
                required
                minLength={5}
              />
              <p className="text-xs text-muted-foreground">
                Sugestão escrita a partir das colunas que existem nos seus dados. Edite à vontade.
              </p>
            </div>
            {(suggestion?.alternatives.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Outros ângulos de análise</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestion?.alternatives.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setPrompt(s);
                        setPromptTouched(true);
                      }}
                      className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {blockedReason && (
              <p className="text-center text-xs text-muted-foreground">{blockedReason}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              loading={submitting}
              disabled={blockedReason !== null}
            >
              {submitting ? "Atlas está desenhando e validando seu painel…" : "Gerar painel"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
