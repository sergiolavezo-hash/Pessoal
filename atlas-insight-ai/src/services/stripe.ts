import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import { ApiError } from "@/services/api-context";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  const env = serverEnv();
  if (!env.STRIPE_SECRET_KEY) {
    throw new ApiError(
      503,
      "Checkout is not enabled yet — the payment provider is not configured."
    );
  }
  if (!cached) {
    cached = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return cached;
}

export const PLAN_TIER: Record<string, "PRO" | "BUSINESS"> = {
  pro: "PRO",
  business: "BUSINESS",
};
