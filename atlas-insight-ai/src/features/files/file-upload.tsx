"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  async function onFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("workspaceId", workspaceId);
      formData.set("file", file);

      const res = await fetch("/api/files", { method: "POST", body: formData });
      const json = await readResponse(res);
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
