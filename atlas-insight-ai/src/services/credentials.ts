import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptJson, decryptJson } from "@/lib/crypto";

/**
 * Data source credential storage. Secrets are AES-256-GCM encrypted at rest
 * and only ever touched server-side through the service-role client — the
 * credentials table has no RLS policies for end users.
 */
export async function storeCredentials(
  admin: SupabaseClient,
  dataSourceId: string,
  credentials: Record<string, unknown>
): Promise<void> {
  const encrypted = encryptJson(credentials);
  const { error } = await admin
    .from("data_source_credentials")
    .upsert({ data_source_id: dataSourceId, encrypted_payload: encrypted }, { onConflict: "data_source_id" });
  if (error) throw new Error(`Failed to store credentials: ${error.message}`);
}

export async function loadCredentials(
  admin: SupabaseClient,
  dataSourceId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await admin
    .from("data_source_credentials")
    .select("encrypted_payload")
    .eq("data_source_id", dataSourceId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load credentials: ${error.message}`);
  if (!data) return {};
  return decryptJson<Record<string, unknown>>(data.encrypted_payload);
}
