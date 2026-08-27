import { describe, expect, it } from "vitest";
import { assertAllowed, TRIAL_BLOCK_MESSAGES } from "@/services/billing";
import { ApiError } from "@/services/api-context";

describe("billing gating", () => {
  it("passes when the verdict allows", () => {
    expect(() =>
      assertAllowed({ allowed: true, reason: "active_subscription" })
    ).not.toThrow();
    expect(() =>
      assertAllowed({ allowed: true, reason: "trialing", runs_remaining: 1 })
    ).not.toThrow();
  });

  it("throws 402 with a friendly message when the trial time expired", () => {
    try {
      assertAllowed({ allowed: false, reason: "trial_time_expired" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(402);
      expect((error as ApiError).message).toBe(TRIAL_BLOCK_MESSAGES.trial_time_expired);
    }
  });

  it("throws 402 when the free dashboard run was spent", () => {
    expect(() => assertAllowed({ allowed: false, reason: "trial_runs_exhausted" })).toThrowError(
      TRIAL_BLOCK_MESSAGES.trial_runs_exhausted
    );
  });

  it("falls back to a generic message for unknown reasons", () => {
    expect(() => assertAllowed({ allowed: false, reason: "weird_state" })).toThrowError(
      /weird_state/
    );
  });
});
