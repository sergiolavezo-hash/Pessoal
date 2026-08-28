import { describe, expect, it } from "vitest";
import { dailyResetClock, formatWait, msUntilDailyReset } from "@/lib/wait-time";

describe("formatWait", () => {
  it("uses seconds for short waits", () => {
    expect(formatWait(40_000)).toBe("em 40 segundos");
    expect(formatWait(1_000)).toBe("em 1 segundo");
  });

  it("never promises a wait in the past", () => {
    expect(formatWait(-5_000)).toBe("em 0 segundos");
  });

  it("switches to minutes, hours and days as the wait grows", () => {
    expect(formatWait(11 * 60_000)).toBe("em 11 minutos");
    expect(formatWait(3 * 3_600_000)).toBe("em cerca de 3 horas");
    expect(formatWait(2 * 86_400_000)).toBe("em cerca de 2 dias");
  });
});

describe("msUntilDailyReset", () => {
  it("counts to the next UTC midnight, matching current_date no banco", () => {
    const now = new Date("2026-08-28T23:00:00.000Z");
    expect(msUntilDailyReset(now)).toBe(3_600_000);
  });

  it("gives a full day right after the turn", () => {
    const now = new Date("2026-08-28T00:00:00.000Z");
    expect(msUntilDailyReset(now)).toBe(86_400_000);
  });

  it("reports the clock time of the reset", () => {
    const now = new Date("2026-08-28T23:00:00.000Z");
    expect(dailyResetClock(now, "pt-BR")).toMatch(/^\d{2}:\d{2}$/);
  });
});
