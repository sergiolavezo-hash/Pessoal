import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSignupEffectiveNotifications } from "@/services/notifications";
import type { Profile } from "@/types";

/**
 * OAuth / email-link callback. Exchanges the auth code for a session,
 * fires the one-time "cadastro efetivado" notifications when this is a
 * first confirmation, then redirects to the requested destination.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await maybeSendWelcome();
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/dashboard"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

/** Best-effort, idempotent — never blocks the redirect on email failures. */
async function maybeSendWelcome(): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: claimed } = await supabase
      .from("profiles")
      .update({ welcomed_at: new Date().toISOString() })
      .eq("id", user.id)
      .is("welcomed_at", null)
      .select("*");
    const profile = (claimed?.[0] ?? null) as Profile | null;
    if (!profile) return;

    await sendSignupEffectiveNotifications({
      name: profile.full_name || user.email || "",
      email: profile.email || user.email || "",
      phone: profile.phone,
      company: profile.company,
    });
  } catch {
    // welcome email is never a blocker
  }
}
