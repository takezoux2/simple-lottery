import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIGS,
  DEFAULT_PROBABILITY_TABLE,
  type LotteryItem,
  chooseLottery,
  getAvailableLotteryItems,
  getPercentage,
  isAllLimitsReached,
} from "../lottery";

describe("lottery logic", () => {
  it("should choose '当たり' when random is less than 0.3", () => {
    // DEFAULT_PROBABILITY_TABLE has ratio 3 and 7 (total 10)
    const result = chooseLottery(DEFAULT_PROBABILITY_TABLE, () => 0.1);
    expect(result.label).toBe("当たり");
    expect(result.id).toBe("item-1");
  });

  it("should choose 'はずれ' when random is greater than or equal to 0.3", () => {
    const result = chooseLottery(DEFAULT_PROBABILITY_TABLE, () => 0.5);
    expect(result.label).toBe("はずれ");
    expect(result.id).toBe("item-2");
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

  it("should calculate correct percentage with integer ratios", () => {
    expect(getPercentage(3, DEFAULT_PROBABILITY_TABLE)).toBe(30);
    expect(getPercentage(7, DEFAULT_PROBABILITY_TABLE)).toBe(70);

    const omikuji = DEFAULT_CONFIGS[1].items;
    // omikuji total = 10 (1+2+3+3+1)
    expect(getPercentage(1, omikuji)).toBe(10);
    expect(getPercentage(2, omikuji)).toBe(20);
    expect(getPercentage(3, omikuji)).toBe(30);
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

  describe("hit limit filtering", () => {
    const itemsWithLimit: LotteryItem[] = [
      { id: "1", label: "特賞", ratio: 1, limit: 1 },
      { id: "2", label: "1等", ratio: 2, limit: 3 },
      { id: "3", label: "ハズレ", ratio: 7 }, // 無制限
    ];

    it("should return all items when no hits recorded", () => {
      const available = getAvailableLotteryItems(itemsWithLimit, {});
      expect(available).toHaveLength(3);
    });

    it("should exclude items that have reached their limit", () => {
      // 特賞が1回当たった場合
      const hitCounts = { "1": 1, "2": 2 };
      const available = getAvailableLotteryItems(itemsWithLimit, hitCounts);
      expect(available).toHaveLength(2);
      expect(available.some((i) => i.id === "1")).toBe(false);
      expect(available.some((i) => i.id === "2")).toBe(true);
      expect(available.some((i) => i.id === "3")).toBe(true);

      // 1等も上限（3回）に達した場合
      const hitCountsMax = { "1": 1, "2": 3 };
      const availableMax = getAvailableLotteryItems(itemsWithLimit, hitCountsMax);
      expect(availableMax).toHaveLength(1);
      expect(availableMax[0].id).toBe("3");
    });

    it("should correctly identify when all limits are reached", () => {
      const limitedOnly: LotteryItem[] = [
        { id: "1", label: "賞A", ratio: 1, limit: 2 },
        { id: "2", label: "賞B", ratio: 1, limit: 1 },
      ];

      expect(isAllLimitsReached(limitedOnly, { "1": 1, "2": 0 })).toBe(false);
      expect(isAllLimitsReached(limitedOnly, { "1": 2, "2": 0 })).toBe(false);
      expect(isAllLimitsReached(limitedOnly, { "1": 2, "2": 1 })).toBe(true);
    });

    it("should not reach all limits if an unlimited item exists", () => {
      expect(isAllLimitsReached(itemsWithLimit, { "1": 99, "2": 99 })).toBe(false);
    });
  });
});
