import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROBABILITY_TABLE,
  type LotteryItem,
  chooseLottery,
  getPercentage,
} from "../lottery";

describe("lottery logic", () => {
  it("should choose '当たり' when random is less than 0.3", () => {
    const result = chooseLottery(DEFAULT_PROBABILITY_TABLE, () => 0.1);
    expect(result.label).toBe("当たり");
    expect(result.id).toBe("win");
  });

  it("should choose 'はずれ' when random is greater than or equal to 0.3", () => {
    const result = chooseLottery(DEFAULT_PROBABILITY_TABLE, () => 0.5);
    expect(result.label).toBe("はずれ");
    expect(result.id).toBe("lose");
  });

  it("should handle custom tables with multiple items", () => {
    const customTable: LotteryItem[] = [
      { id: "1", label: "特賞", ratio: 1 },
      { id: "2", label: "1等", ratio: 9 },
      { id: "3", label: "ハズレ", ratio: 90 },
    ];

    // total = 100
    // random 0.005 -> 特賞 (0 ~ 0.01)
    expect(chooseLottery(customTable, () => 0.005).label).toBe("特賞");
    // random 0.05 -> 1等 (0.01 ~ 0.1)
    expect(chooseLottery(customTable, () => 0.05).label).toBe("1等");
    // random 0.5 -> ハズレ (0.1 ~ 1.0)
    expect(chooseLottery(customTable, () => 0.5).label).toBe("ハズレ");
  });

  it("should calculate correct percentage", () => {
    expect(getPercentage(0.3, DEFAULT_PROBABILITY_TABLE)).toBe(30);
    expect(getPercentage(0.7, DEFAULT_PROBABILITY_TABLE)).toBe(70);
  });

  it("should throw error on empty table", () => {
    expect(() => chooseLottery([])).toThrow("確率テーブルが空です");
  });

  it("should throw error when all ratios are zero", () => {
    const zeroTable: LotteryItem[] = [
      { id: "1", label: "A", ratio: 0 },
      { id: "2", label: "B", ratio: 0 },
    ];
    expect(() => chooseLottery(zeroTable)).toThrow("有効な確率の合計値が0以下です");
  });
});
