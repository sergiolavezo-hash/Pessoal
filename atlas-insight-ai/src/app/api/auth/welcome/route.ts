import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSignupEffectiveNotifications } from "@/services/notifications";
import type { Profile } from "@/types";

/**
 * Called right after the first-access verification succeeds. Sends the
 * "cadastro efetivado" emails exactly once per user (profiles.welcomed_at
 * is the idempotency flag). Always returns 200 for authenticated users —
 * email delivery is best-effort and must never block onboarding.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = data as Profile | null;
  if (!profile || profile.welcomed_at) {
    return NextResponse.json({ sent: false, reason: "already_welcomed" });
  }

  // Claim the flag first so concurrent calls send at most once.
  const { data: claimed } = await supabase
    .from("profiles")
    .update({ welcomed_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("welcomed_at", null)
    .select("id");
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ sent: false, reason: "already_welcomed" });
  }

  const result = await sendSignupEffectiveNotifications({
    name: profile.full_name || user.email || "",
    email: profile.email || user.email || "",
    phone: profile.phone,
    company: profile.company,
  });

  return NextResponse.json({ sent: true, ...result });
}
