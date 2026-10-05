import { describe, expect, it } from "vitest";
import { addDays, endOfMonth, isoWeek, isoWeekday, startOfWeek, todayISO } from "@/lib/dates";

describe("dates", () => {
  it("computes ISO weekday and week", () => {
    expect(isoWeekday("2026-10-05")).toBe(1);
    expect(isoWeekday("2026-10-11")).toBe(7);
    expect(isoWeek("2026-01-01")).toBe(1);
    expect(isoWeek("2026-10-05")).toBe(41);
    expect(isoWeek("2027-01-01")).toBe(53);
  });

  it("does date arithmetic across month and DST boundaries", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(startOfWeek("2026-10-08")).toBe("2026-10-05");
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
  });

  it("uses Berlin time for today", () => {
    expect(todayISO(new Date("2026-10-05T22:30:00Z"))).toBe("2026-10-06");
  });
});
