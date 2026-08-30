export interface LotteryItem {
  id: string;
  label: string;
  ratio: number;
  color?: string;
}

export const DEFAULT_PROBABILITY_TABLE: LotteryItem[] = [
  { id: "win", label: "当たり", ratio: 0.3, color: "#10b981" },
  { id: "lose", label: "はずれ", ratio: 0.7, color: "#6b7280" },
];

/**
 * 確率テーブルに基づいてくじ引き結果を1件選出します
 */
export function chooseLottery(
  table: LotteryItem[] = DEFAULT_PROBABILITY_TABLE,
  randomFn: () => number = Math.random,
): LotteryItem {
  if (!table || table.length === 0) {
    throw new Error("確率テーブルが空です");
  }

  const totalRatio = table.reduce((acc, cur) => acc + Math.max(0, cur.ratio), 0);
  if (totalRatio <= 0) {
    throw new Error("有効な確率の合計値が0以下です");
  }

  const random = randomFn();
  let sum = 0;

  for (const item of table) {
    const normalizedRatio = Math.max(0, item.ratio) / totalRatio;
    sum += normalizedRatio;
    if (random < sum) {
      return item;
    }
  }

  // 浮動小数点計算の丸め誤差対策として最後の要素を返却
  return table[table.length - 1];
}

/**
 * 各項目のパーセンテージ（0〜100%）を計算します
 */
export function getPercentage(itemRatio: number, table: LotteryItem[]): number {
  const total = table.reduce((acc, cur) => acc + Math.max(0, cur.ratio), 0);
  if (total <= 0) return 0;
  return Math.round((Math.max(0, itemRatio) / total) * 1000) / 10;
}
