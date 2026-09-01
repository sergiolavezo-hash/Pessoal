"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Upload, Eye, EyeOff, FileBox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { postJson, readJson } from "@/lib/api-client";
import { STORE_STYLES } from "@/store/schemas";

export interface AdminStyle {
  id: string;
  style: string;
  name: string;
  description: string | null;
  pages: number | null;
  components: number | null;
  price_cents: number | null;
  preview_urls: string[];
  asset_path: string | null;
  asset_bytes: number | null;
  revision: number;
  published: boolean;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  status: "draft" | "active" | "archived";
  price_cents: number;
  store_product_styles: AdminStyle[];
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const mb = (bytes: number | null) => (bytes ? `${(bytes / 1048576).toFixed(1)} MB` : "—");

/** Slug sugerido a partir do nome, para não digitar duas vezes. */
function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function StoreAdmin({
  workspaceId,
  products,
}: {
  workspaceId: string;
  products: AdminProduct[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(key: string, run: () => Promise<void>) {
    setBusy(key);
    try {
      await run();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na operação", { duration: 10000 });
    } finally {
      setBusy(null);
    }
  }

  /**
   * O .pbix vai DIRETO para o bucket privado. Passar pela API estouraria o
   * limite de 4,5 MB da função na borda — um .pbix com imagens e temas
   * ultrapassa isso com folga.
   */
  async function uploadAsset(style: AdminStyle, file: File) {
    const ticket = await postJson<{ path: string; token: string }>("/api/store/admin/asset-url", {
      workspaceId,
      styleId: style.id,
      fileName: file.name,
      sizeBytes: file.size,
    });

    const { error } = await createClient()
      .storage.from("store-assets")
      .uploadToSignedUrl(ticket.path, ticket.token, file);
    if (error) throw new Error(`Não foi possível enviar o arquivo: ${error.message}`);

    const res = await fetch("/api/store/admin/asset-url", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, styleId: style.id, path: ticket.path, sizeBytes: file.size }),
    });
    const json = await readJson<{ revision?: number; error?: string }>(res);
    if (!res.ok) throw new Error(json.error ?? "Falha ao confirmar o envio");
    toast.success(`Arquivo publicado (revisão ${json.revision}).`);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewProductDialog workspaceId={workspaceId} onDone={() => router.refresh()} />
      </div>

      {products.map((product) => (
        <Card key={product.id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium">{product.name}</h3>
                  <Badge variant={product.status === "active" ? "success" : "secondary"}>
                    {product.status === "active" ? "Na vitrine" : product.status === "draft" ? "Rascunho" : "Arquivado"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  /templates/{product.slug} · {brl(product.price_cents)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <NewStyleDialog
                  workspaceId={workspaceId}
                  productId={product.id}
                  taken={product.store_product_styles.map((s) => s.style)}
                  onDone={() => router.refresh()}
                />
                <Button
                  variant={product.status === "active" ? "outline" : "default"}
                  size="sm"
                  loading={busy === `p:${product.id}`}
                  onClick={() =>
                    act(`p:${product.id}`, async () => {
                      const res = await fetch(`/api/store/admin/products/${product.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          workspaceId,
                          status: product.status === "active" ? "draft" : "active",
                        }),
                      });
                      const json = await readJson<{ error?: string }>(res);
                      if (!res.ok) throw new Error(json.error ?? "Falha ao publicar");
                    })
                  }
                >
                  {product.status === "active" ? "Tirar da vitrine" : "Publicar produto"}
                </Button>
              </div>
            </div>

            {product.store_product_styles.length === 0 ? (
              <p className="mt-3 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                Nenhum estilo ainda. Um produto sem estilo publicado não pode ir para a vitrine —
                a página abriria vazia.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {product.store_product_styles.map((style) => (
                  <div key={style.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                    <Badge variant="secondary" className="font-mono text-[10px]">{style.style}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm">{style.name}</span>

                    <span className="text-xs text-muted-foreground">
                      {style.pages ?? "?"} pág · {style.components ?? "?"} comp ·{" "}
                      {style.price_cents == null ? "preço do produto" : brl(style.price_cents)}
                    </span>

                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileBox className="h-3.5 w-3.5" />
                      {style.asset_path ? `${mb(style.asset_bytes)} · rev ${style.revision}` : "sem arquivo"}
                    </span>

                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pbix"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) act(`u:${style.id}`, () => uploadAsset(style, file));
                          e.target.value = "";
                        }}
                      />
                      <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent">
                        <Upload className="h-3.5 w-3.5" />
                        {busy === `u:${style.id}` ? "Enviando…" : "Enviar .pbix"}
                      </span>
                    </label>

                    <Button
                      variant="ghost"
                      size="sm"
                      loading={busy === `s:${style.id}`}
                      onClick={() =>
                        act(`s:${style.id}`, async () => {
                          const res = await fetch(`/api/store/admin/styles/${style.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ workspaceId, published: !style.published }),
                          });
                          const json = await readJson<{ error?: string }>(res);
                          if (!res.ok) throw new Error(json.error ?? "Falha ao publicar estilo");
                        })
                      }
                    >
                      {style.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {style.published ? "Publicado" : "Oculto"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NewProductDialog({ workspaceId, onDone }: { workspaceId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [price, setPrice] = useState("149");
  const [saving, setSaving] = useState(false);

  // O slug acompanha o nome até o usuário mexer nele; depois para, porque
  // corrigir o slug e ver o nome desfazer a correção é enlouquecedor.
  const [slugTouched, setSlugTouched] = useState(false);
  const effectiveSlug = slugTouched ? slug : slugify(name);

  async function save() {
    setSaving(true);
    try {
      await postJson("/api/store/admin/products", {
        workspaceId,
        slug: effectiveSlug,
        name,
        subtitle: subtitle || undefined,
        priceCents: Math.round(Number(price.replace(",", ".")) * 100),
      });
      toast.success("Produto criado como rascunho.");
      setOpen(false);
      setName(""); setSlug(""); setSubtitle(""); setSlugTouched(false);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar", { duration: 10000 });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus />Novo produto</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo modelo</DialogTitle>
          <DialogDescription>
            Nasce como rascunho. Só vai para a vitrine quando você publicar — e só depois de
            ter ao menos um estilo com arquivo e preview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Executive Sales Dashboard" />
          </div>
          <div className="space-y-1.5">
            <Label>Endereço da página</Label>
            <Input
              value={effectiveSlug}
              onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
              placeholder="executive-sales"
            />
            <p className="text-[11px] text-muted-foreground">
              /templates/{effectiveSlug || "…"} — não muda depois de publicado, porque link
              quebrado perde o tráfego que a página levou meses a ganhar.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Subtítulo</Label>
            <Textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={2}
              placeholder="Modelo Power BI profissional para análise comercial."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Preço (R$)</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} loading={saving} disabled={name.length < 3 || effectiveSlug.length < 3}>
            Criar rascunho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewStyleDialog({
  workspaceId, productId, taken, onDone,
}: {
  workspaceId: string; productId: string; taken: string[]; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const available = STORE_STYLES.filter((s) => !taken.includes(s));
  const [style, setStyle] = useState<string>(available[0] ?? "");
  const [name, setName] = useState("");
  const [pages, setPages] = useState("");
  const [components, setComponents] = useState("");
  const [previews, setPreviews] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await postJson("/api/store/admin/styles", {
        workspaceId,
        productId,
        style,
        name: name || style,
        pages: pages ? Number(pages) : undefined,
        components: components ? Number(components) : undefined,
        previewUrls: previews.split("\n").map((u) => u.trim()).filter(Boolean),
      });
      toast.success("Estilo salvo.");
      setOpen(false); setName(""); setPages(""); setComponents(""); setPreviews("");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar", { duration: 10000 });
    } finally {
      setSaving(false);
    }
  }

  if (available.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus />Estilo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo estilo</DialogTitle>
          <DialogDescription>
            O mesmo modelo com outro acabamento. O cliente escolhe antes de comprar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Estilo</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              {available.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Nome exibido</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={style} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Páginas</Label>
              <Input value={pages} onChange={(e) => setPages(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label>Componentes</Label>
              <Input value={components} onChange={(e) => setComponents(e.target.value)} inputMode="numeric" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Previews (uma URL por linha)</Label>
            <Textarea value={previews} onChange={(e) => setPreviews(e.target.value)} rows={3} />
            <p className="text-[11px] text-muted-foreground">
              Sem ao menos um preview o estilo não pode ser publicado: o cliente compraria sem
              ver o que está levando.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} loading={saving}>Salvar estilo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
