export interface LotteryItem {
  id: string;
  label: string;
  ratio: number;
  color?: string;
  limit?: number; // 当選上限数 (1以上の正の整数。undefined または 0 の場合は無制限)
}

export interface LotteryConfig {
  id: string;
  name: string;
  items: LotteryItem[];
  showLabel?: boolean;
  showProbability?: boolean;
  showHistory?: boolean;
  showLimit?: boolean;
  maxHistoryCount?: number;
  createdAt: number;
  updatedAt: number;
}

export const PRESET_COLORS = [
  "#4f46e5", // indigo
  "#059669", // emerald
  "#d97706", // amber
  "#e11d48", // rose
  "#0284c7", // sky
  "#7c3aed", // violet
  "#ea580c", // orange
  "#0d9488", // teal
  "#db2777", // pink
  "#4b5563", // slate
];

export const DEFAULT_CONFIGS: LotteryConfig[] = [
  {
    id: "preset-standard",
    name: "スタンダードくじ (2択)",
    items: [
      { id: "item-1", label: "当たり", ratio: 3, color: "#059669" },
      { id: "item-2", label: "はずれ", ratio: 7, color: "#4b5563" },
    ],
    showLabel: true,
    showProbability: true,
    showHistory: true,
    showLimit: true,
    maxHistoryCount: 20,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "preset-omikuji",
    name: "おみくじ (5択)",
    items: [
      { id: "item-1", label: "大吉", ratio: 1, color: "#e11d48" },
      { id: "item-2", label: "中吉", ratio: 2, color: "#ea580c" },
      { id: "item-3", label: "小吉", ratio: 3, color: "#d97706" },
      { id: "item-4", label: "吉", ratio: 3, color: "#059669" },
      { id: "item-5", label: "凶", ratio: 1, color: "#4b5563" },
    ],
    showLabel: true,
    showProbability: true,
    showHistory: true,
    showLimit: true,
    maxHistoryCount: 20,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "preset-dice",
    name: "サイコロ (6択)",
    items: [
      { id: "item-1", label: "1", ratio: 1, color: "#4f46e5" },
      { id: "item-2", label: "2", ratio: 1, color: "#0284c7" },
      { id: "item-3", label: "3", ratio: 1, color: "#059669" },
      { id: "item-4", label: "4", ratio: 1, color: "#d97706" },
      { id: "item-5", label: "5", ratio: 1, color: "#ea580c" },
      { id: "item-6", label: "6", ratio: 1, color: "#e11d48" },
    ],
    showLabel: true,
    showProbability: true,
    showHistory: true,
    showLimit: true,
    maxHistoryCount: 20,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];

export const DEFAULT_PROBABILITY_TABLE: LotteryItem[] = DEFAULT_CONFIGS[0].items;

/**
 * 各項目の当選数と上限を考慮して、上限に達していない有効な抽選対象項目を返します
 */
export function getAvailableLotteryItems(
  items: LotteryItem[],
  hitCounts: Record<string, number> = {},
): LotteryItem[] {
  if (!items || items.length === 0) return [];
  return items.filter((item) => {
    if (item.limit === undefined || item.limit === null || item.limit <= 0) {
      return true;
    }
    const hits = hitCounts[item.id] || 0;
    return hits < item.limit;
  });
}

/**
 * すべての項目が上限に達しているかどうかを判定します
 */
export function isAllLimitsReached(
  items: LotteryItem[],
  hitCounts: Record<string, number> = {},
): boolean {
  if (!items || items.length === 0) return true;
  return getAvailableLotteryItems(items, hitCounts).length === 0;
}

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
export function getPercentage(itemRatio: number, table: { ratio: number }[]): number {
  const total = table.reduce((acc, cur) => acc + Math.max(0, cur.ratio), 0);
  if (total <= 0) return 0;
  return Math.round((Math.max(0, itemRatio) / total) * 1000) / 10;
}
