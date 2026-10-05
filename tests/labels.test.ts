import { describe, expect, it } from "vitest";
import { quantityLabel } from "@/lib/labels";

describe("quantityLabel", () => {
  it("declines written-out units by number", () => {
    expect(quantityLabel(1, "roll")).toBe("1 рулон");
    expect(quantityLabel(2, "roll")).toBe("2 рулона");
    expect(quantityLabel(5, "roll")).toBe("5 рулонов");
    expect(quantityLabel(11, "bottle")).toBe("11 бутылок");
    expect(quantityLabel(22, "bottle")).toBe("22 бутылки");
    expect(quantityLabel(0, "ream")).toBe("0 пачек");
  });

  it("keeps abbreviations and uses a decimal comma", () => {
    expect(quantityLabel(1.5, "kg")).toBe("1,5 кг");
    expect(quantityLabel(30, "pcs")).toBe("30 шт");
    expect(quantityLabel(null, "pcs")).toBeNull();
  });
});
