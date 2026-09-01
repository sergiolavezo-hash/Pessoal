import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUserIsStoreAdmin } from "@/store/admin";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StoreAdmin, type AdminProduct } from "@/features/store/store-admin";

export const metadata = { title: "Loja de modelos" };

/**
 * Administração do catálogo.
 *
 * A área inteira responde 404 para quem não administra a loja: quem não pode
 * entrar não precisa saber que ela existe. O menu lateral também não mostra o
 * item — descobrir a URL não deve ser a única barreira, mas esconder o
 * caminho evita que um cliente sequer tente.
 */
export default async function StoreAdminPage() {
  if (!(await currentUserIsStoreAdmin())) notFound();

  const ctx = await getAppContext();

  // Cliente de serviço: a RLS da vitrine só enxerga produto `active`, e a
  // administração precisa ver exatamente o que o cliente não vê — rascunho
  // e arquivado. A autorização já aconteceu acima.
  const { data } = await createAdminClient()
    .from("store_products")
    .select("*, store_product_styles(*)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const products = (data ?? []) as unknown as AdminProduct[];

  return (
    <div>
      <PageHeader
        title="Loja de modelos"
        description="Catálogo, estilos, arquivos e publicação. O cliente só vê o que estiver publicado."
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum modelo cadastrado"
          description="Crie o primeiro produto, adicione os estilos e envie o .pbix de cada um. Nada aparece na vitrine antes de você publicar."
          action={<StoreAdmin workspaceId={ctx.workspace.id} products={[]} />}
        />
      ) : (
        <StoreAdmin workspaceId={ctx.workspace.id} products={products} />
      )}
    </div>
  );
}
