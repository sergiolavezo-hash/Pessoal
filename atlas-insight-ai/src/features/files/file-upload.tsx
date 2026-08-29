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

export function FileUpload({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
      const json = await readResponse(res);
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
        Enviar arquivo
      </Button>
    </>
  );
}
