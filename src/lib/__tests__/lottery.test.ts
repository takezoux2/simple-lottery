import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIGS,
  DEFAULT_PROBABILITY_TABLE,
  type LotteryItem,
  chooseLottery,
  getAvailableLotteryItems,
  getDrawTable,
  getItemCount,
  getPercentage,
  getRemainingCount,
  getTotalItemCount,
  getTotalRemainingCount,
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

  describe("count draw mode (個数指定くじ)", () => {
    const boxItems: LotteryItem[] = [
      { id: "1", label: "大当たり", ratio: 1, count: 1 },
      { id: "2", label: "当たり", ratio: 1, count: 2 },
      { id: "3", label: "はずれ", ratio: 1, count: 7 },
    ];

    it("should default the item count to 1 when unset or invalid", () => {
      expect(getItemCount({ id: "x", label: "A", ratio: 5 })).toBe(1);
      expect(getItemCount({ id: "x", label: "A", ratio: 5, count: 3 })).toBe(3);
      expect(getItemCount({ id: "x", label: "A", ratio: 5, count: 3.9 })).toBe(3);
      expect(getItemCount({ id: "x", label: "A", ratio: 5, count: -2 })).toBe(0);
    });

    it("should calculate remaining counts and totals", () => {
      expect(getTotalItemCount(boxItems)).toBe(10);
      expect(getTotalRemainingCount(boxItems, {})).toBe(10);

      const hitCounts = { "1": 1, "2": 1 };
      expect(getRemainingCount(boxItems[0], hitCounts)).toBe(0);
      expect(getRemainingCount(boxItems[1], hitCounts)).toBe(1);
      expect(getRemainingCount(boxItems[2], hitCounts)).toBe(7);
      expect(getTotalRemainingCount(boxItems, hitCounts)).toBe(8);
      // 当選数が個数を上回っても残りは0未満にならない
      expect(getRemainingCount(boxItems[0], { "1": 5 })).toBe(0);
    });

    it("should exclude items whose remaining count is zero", () => {
      expect(getAvailableLotteryItems(boxItems, {}, "count")).toHaveLength(3);

      const available = getAvailableLotteryItems(boxItems, { "1": 1, "2": 2 }, "count");
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe("3");
    });

    it("should detect when every lottery ticket has been drawn", () => {
      expect(isAllLimitsReached(boxItems, { "1": 1, "2": 2 }, "count")).toBe(false);
      expect(isAllLimitsReached(boxItems, { "1": 1, "2": 2, "3": 7 }, "count")).toBe(true);
    });

    it("should build a draw table weighted by the remaining counts", () => {
      const table = getDrawTable(boxItems, {}, "count");
      expect(table.map((i) => i.ratio)).toEqual([1, 2, 7]);
      expect(getPercentage(1, table)).toBe(10);

      // 「当たり」を1本引いた後は残り 1 / 1 / 7 (合計9本)
      const afterTable = getDrawTable(boxItems, { "2": 1 }, "count");
      expect(afterTable.map((i) => i.ratio)).toEqual([1, 1, 7]);
      expect(getTotalRemainingCount(boxItems, { "2": 1 })).toBe(9);

      // 引き切った項目はテーブルから除外される
      const lastTable = getDrawTable(boxItems, { "1": 1, "2": 2, "3": 6 }, "count");
      expect(lastTable).toHaveLength(1);
      expect(lastTable[0].id).toBe("3");
      expect(lastTable[0].ratio).toBe(1);
    });

    it("should not mutate the original items when building the draw table", () => {
      getDrawTable(boxItems, { "3": 3 }, "count");
      expect(boxItems[2].ratio).toBe(1);
      expect(boxItems[2].count).toBe(7);
    });

    it("should choose an item according to the remaining counts", () => {
      const table = getDrawTable(boxItems, {}, "count");
      // 残り 1 / 2 / 7 (合計10本) -> 0〜0.1: 大当たり, 0.1〜0.3: 当たり, 0.3〜: はずれ
      expect(chooseLottery(table, () => 0.05).label).toBe("大当たり");
      expect(chooseLottery(table, () => 0.2).label).toBe("当たり");
      expect(chooseLottery(table, () => 0.9).label).toBe("はずれ");

      // 大当たりを引いた後は当該項目が選ばれない
      const afterTable = getDrawTable(boxItems, { "1": 1 }, "count");
      expect(chooseLottery(afterTable, () => 0).label).toBe("当たり");
    });

    it("should keep the probability mode behaviour by default", () => {
      const limited: LotteryItem[] = [{ id: "1", label: "A", ratio: 3, limit: 1, count: 1 }];
      // drawMode 未指定 (= "probability") では count ではなく limit で判定する
      expect(getAvailableLotteryItems(limited, { "1": 0 })).toHaveLength(1);
      expect(getDrawTable(limited, { "1": 0 })[0].ratio).toBe(3);
      expect(isAllLimitsReached(limited, { "1": 1 })).toBe(true);
    });

    it("should provide a count-mode preset as a default config", () => {
      const preset = DEFAULT_CONFIGS.find((c) => c.drawMode === "count");
      expect(preset).toBeDefined();
      expect(getTotalItemCount(preset?.items ?? [])).toBe(10);
    });
  });
});
