import { describe, expect, it } from "vitest";
import {
  isDue,
  isValidSchedule,
  nextRefreshAt,
  REFRESH_SCHEDULE_LABEL,
} from "@/services/refresh-schedule";

describe("nextRefreshAt", () => {
  const now = new Date("2026-03-10T12:00:00.000Z");

  it("schedules an hour, a day and a week ahead", () => {
    expect(nextRefreshAt("hourly", now)?.toISOString()).toBe("2026-03-10T13:00:00.000Z");
    expect(nextRefreshAt("daily", now)?.toISOString()).toBe("2026-03-11T12:00:00.000Z");
    expect(nextRefreshAt("weekly", now)?.toISOString()).toBe("2026-03-17T12:00:00.000Z");
  });

  it("never schedules a manual dataset", () => {
    expect(nextRefreshAt("manual", now)).toBeNull();
  });

  /**
   * Conta a partir de AGORA, não do horário previsto anterior. O cron do
   * plano Hobby tem precisão de ±59 min; somar ao previsto antigo faria os
   * horários se acumularem para trás até dispararem duas vezes seguidas.
   */
  it("counts from now, so a late trigger does not stack up", () => {
    const late = new Date("2026-03-10T12:50:00.000Z");
    expect(nextRefreshAt("daily", late)?.toISOString()).toBe("2026-03-11T12:50:00.000Z");
  });
});

describe("isDue", () => {
  const now = new Date("2026-03-10T12:00:00.000Z");

  it("is due when the time has passed", () => {
    expect(isDue("2026-03-10T11:59:00.000Z", now)).toBe(true);
    expect(isDue("2026-03-10T12:00:00.000Z", now)).toBe(true);
  });

  it("is not due before the time", () => {
    expect(isDue("2026-03-10T12:01:00.000Z", now)).toBe(false);
  });

  // Sem horário marcado o dataset é manual: nunca deve entrar no lote do cron.
  it("is never due without a scheduled time", () => {
    expect(isDue(null, now)).toBe(false);
    expect(isDue(undefined, now)).toBe(false);
  });

  it("is not due for an unparseable date", () => {
    expect(isDue("nao é uma data", now)).toBe(false);
  });
});

describe("isValidSchedule", () => {
  it("accepts only the known frequencies", () => {
    expect(isValidSchedule("daily")).toBe(true);
    expect(isValidSchedule("manual")).toBe(true);
    expect(isValidSchedule("every-5-minutes")).toBe(false);
    expect(isValidSchedule(null)).toBe(false);
    expect(isValidSchedule(undefined)).toBe(false);
  });

  it("labels every frequency in plain language", () => {
    for (const label of Object.values(REFRESH_SCHEDULE_LABEL)) {
      expect(label).not.toMatch(/^[a-z]+$/);
    }
  });
});
