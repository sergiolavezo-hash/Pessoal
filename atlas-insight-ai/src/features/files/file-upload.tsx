"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { FILES_BUCKET, uploadRejection } from "@/lib/uploads";

/**
 * Lê a resposta com tolerância: quando a função do servidor cai ou estoura o
 * tempo, o corpo é uma página de erro, não JSON. Sem isso, o usuário recebia
 * a mensagem críptica do navegador ("The string did not match the expected
 * pattern") em vez de saber o que aconteceu.
 */
async function readResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (res.status === 504 || res.status === 408) {
      throw new Error(
        "O processamento demorou mais que o permitido. Arquivos muito grandes ou com layout complexo podem exceder o limite — tente novamente ou reduza o arquivo."
      );
    }
    throw new Error(
      `O servidor não concluiu o envio (erro ${res.status}). Tente novamente em instantes.`
    );
  }
}

/**
 * Registra a falha no servidor. Erros de navegador não aparecem em nenhum
 * log — sem isto, um problema que só acontece no aparelho do usuário fica
 * impossível de diagnosticar.
 */
async function reportClientError(
  workspaceId: string,
  error: unknown,
  extra: Record<string, unknown>
) {
  try {
    const e = error as { name?: string; message?: string; stack?: string };
    await fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        context: "file-upload",
        name: e?.name ?? typeof error,
        message: e?.message ?? String(error),
        stack: e?.stack?.slice(0, 1500),
        userAgent: navigator.userAgent,
        extra,
      }),
    });
  } catch {
    // Diagnóstico nunca pode piorar a falha original.
  }
}

interface IngestState {
  fileId: string;
  tableId: string;
  offset: number;
  total: number;
}

/**
 * Continua a ingestão até o servidor dizer que acabou.
 *
 * Cada rodada insere a fatia que couber nos 60 segundos da função e devolve
 * onde parou. O laço tem um teto de rodadas porque um servidor que devolvesse
 * sempre o mesmo offset viraria um laço infinito na aba do usuário — o
 * servidor garante progresso inserindo ao menos um lote, mas o teto é o que
 * torna essa garantia irrelevante para quem está olhando a tela.
 */
async function continueIngest(
  workspaceId: string,
  state: IngestState,
  onProgress: (text: string | null) => void
): Promise<Record<string, unknown>> {
  const MAX_ROUNDS = 200;
  let current = state;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const percent = Math.floor((current.offset / Math.max(current.total, 1)) * 100);
    onProgress(
      `${percent}% · ${current.offset.toLocaleString("pt-BR")} de ${current.total.toLocaleString("pt-BR")} linhas`
    );

    const res = await fetch(`/api/files/${current.fileId}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, tableId: current.tableId }),
    });
    const json = await readResponse(res);
    if (!res.ok) throw new Error((json.error as string) ?? "Falha ao concluir a importação");
    if (json.done) {
      onProgress(null);
      return json;
    }
    const next = json.ingest as IngestState | undefined;
    if (!next) throw new Error("Resposta inesperada do servidor durante a importação");
    // Sem avanço, insistir só repete o mesmo pedido para sempre.
    if (next.offset <= current.offset) {
      throw new Error(
        `A importação parou em ${current.offset.toLocaleString("pt-BR")} de ${current.total.toLocaleString("pt-BR")} linhas. Tente reenviar o arquivo.`
      );
    }
    current = next;
  }

  throw new Error("A importação não terminou no tempo esperado. Reenvie o arquivo.");
}

export function FileUpload({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  /**
   * Envio em duas etapas.
   *
   * O arquivo NÃO passa mais pela API: a função serverless recusa corpo acima
   * de ~4,5 MB antes mesmo de rodar, e qualquer planilha de trabalho estoura
   * isso — era essa a origem do "erro 413" sem explicação. Agora o navegador
   * pede uma permissão de escrita, manda os bytes direto para o Storage e a
   * API recebe só o caminho.
   */
  async function onFile(file: File) {
    // Recusa local primeiro: não faz sentido subir 40 MB para descobrir no
    // fim que o tipo não serve.
    const localRejection = uploadRejection(file.name, file.size);
    if (localRejection) {
      toast.error(localRejection, { duration: 10000 });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const ticketRes = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name: file.name, size: file.size }),
      });
      const ticket = await readResponse(ticketRes);
      if (!ticketRes.ok) throw new Error((ticket.error as string) ?? "Falha ao preparar o envio");

      const { error: storageError } = await createClient()
        .storage.from(FILES_BUCKET)
        .uploadToSignedUrl(ticket.path as string, ticket.token as string, file, {
          contentType: file.type || "application/octet-stream",
        });
      if (storageError) {
        throw new Error(`Não foi possível enviar o arquivo: ${storageError.message}`);
      }

      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          storagePath: ticket.path,
          name: file.name,
          mimeType: file.type || null,
        }),
      });
      let json = await readResponse(res);
      // Arquivo já cadastrado não é falha: o Atlas reconheceu o conteúdo e
      // não vai refazer parse, perfil e modelo para chegar ao mesmo dataset.
      if (res.status === 409 && json.duplicate) {
        toast.info((json.message as string) ?? "Este arquivo já está cadastrado no Atlas.", {
          duration: 9000,
        });
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error((json.error as string) ?? "Falha no envio");

      // Arquivo grande entra em fatias: cada pedido insere o que cabe em 60
      // segundos e diz onde parou. Sem isso, uma base de 300 mil linhas
      // simplesmente estourava o tempo da função e morria pela metade.
      if (json.ingest) {
        json = await continueIngest(workspaceId, json.ingest as IngestState, setProgress);
      }

      const table = (json.table ?? {}) as { rowCount?: number; dedupedCount?: number };
      const deduped = table.dedupedCount ?? 0;
      toast.success(
        `${file.name}: ${(table.rowCount ?? 0).toLocaleString("pt-BR")} linhas prontas` +
          (deduped > 0
            ? ` · ${deduped.toLocaleString("pt-BR")} linhas duplicadas removidas automaticamente`
            : ""),
        { duration: 8000 }
      );
      if (json.pipelineQueued) {
        toast.info(
          "Atlas está entendendo seus dados (perfil, relacionamentos e modelo). Em alguns instantes já dá para gerar um painel.",
          { duration: 9000 }
        );
      }
      for (const w of (json.warnings as string[]) ?? []) toast.warning(w, { duration: 9000 });

      // O arquivo sozinho não analisa nada: ele precisa entrar num modelo.
      // Levar o usuário para lá com a fonte já selecionada evita o passo em
      // que ele volta ao menu e tenta adivinhar qual tela abrir.
      // A TABELA recém-criada, não a fonte: todos os arquivos compartilham a
      // mesma fonte, então marcar a fonte traria todas as planilhas juntas.
      const tableId = (json.table as { tableId?: string } | undefined)?.tableId;
      if (tableId) {
        router.push(`/modelos?novo=${encodeURIComponent(tableId)}`);
        return;
      }
      router.refresh();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const name = error instanceof Error ? error.name : "Erro";
      toast.error(`Falha no envio (${name}): ${detail}`, { duration: 15000 });
      void reportClientError(workspaceId, error, {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || null,
      });
      // O registro pode ter ficado em processamento: atualiza para o usuário
      // ver a situação real em vez de um estado congelado.
      router.refresh();
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        // O iOS Safari filtra mal por extensão: sem os tipos MIME, arquivos
        // válidos aparecem esmaecidos e não dá para selecionar.
        accept={[
          ".csv",
          ".xlsx",
          ".xls",
          "text/csv",
          "text/comma-separated-values",
          "application/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ].join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <Button onClick={() => inputRef.current?.click()} loading={uploading}>
        <Upload />
        {progress ? `Importando ${progress}` : "Enviar arquivo"}
      </Button>
    </>
  );
}
