export interface LotteryItem {
  id: string;
  label: string;
  ratio: number;
  color?: string;
  limit?: number; // 当選上限数 (1以上の正の整数。undefined または 0 の場合は無制限)
  count?: number; // 当たり個数 (1以上の正の整数。個数指定くじでのみ使用。undefined の場合は1)
}

export type LotteryAnimationType = "card" | "wheel";

/**
 * くじ引きの種類
 * - "probability": 比重による確率抽選（引いても減らない）
 * - "count": 各項目の当たり個数を設定し、引くごとに減っていくくじ（引き切りで終了）
 */
export type LotteryDrawMode = "probability" | "count";

export const DEFAULT_DRAW_MODE: LotteryDrawMode = "probability";
export const DEFAULT_ITEM_COUNT = 1;

export interface LotteryConfig {
  id: string;
  name: string;
  items: LotteryItem[];
  drawMode?: LotteryDrawMode; // "probability" (確率指定) | "count" (個数指定)。undefined は "probability"
  animationType?: LotteryAnimationType; // "card" (フラッシュカード) | "wheel" (円盤ルーレット)
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
    drawMode: "probability",
    animationType: "card",
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
    drawMode: "probability",
    animationType: "wheel",
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
    drawMode: "probability",
    animationType: "wheel",
    showLabel: true,
    showProbability: true,
    showHistory: true,
    showLimit: true,
    maxHistoryCount: 20,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "preset-box",
    name: "箱くじ (個数指定・10本)",
    items: [
      { id: "item-1", label: "大当たり", ratio: 1, color: "#e11d48", count: 1 },
      { id: "item-2", label: "当たり", ratio: 1, color: "#d97706", count: 2 },
      { id: "item-3", label: "はずれ", ratio: 1, color: "#4b5563", count: 7 },
    ],
    drawMode: "count",
    animationType: "card",
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
 * 個数指定くじにおける項目の当たり個数を返します（未設定・不正値の場合は1）
 */
export function getItemCount(item: LotteryItem): number {
  const raw = item.count;
  if (raw === undefined || raw === null || !Number.isFinite(raw)) {
    return DEFAULT_ITEM_COUNT;
  }
  return Math.max(0, Math.floor(raw));
}

/**
 * 個数指定くじにおける項目の残り個数（当たり個数 - 当選数）を返します
 */
export function getRemainingCount(
  item: LotteryItem,
  hitCounts: Record<string, number> = {},
): number {
  return Math.max(0, getItemCount(item) - (hitCounts[item.id] || 0));
}

/**
 * 個数指定くじにおけるくじの総本数（全項目の当たり個数の合計）を返します
 */
export function getTotalItemCount(items: LotteryItem[]): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((acc, cur) => acc + getItemCount(cur), 0);
}

/**
 * 個数指定くじにおける残り本数（全項目の残り個数の合計）を返します
 */
export function getTotalRemainingCount(
  items: LotteryItem[],
  hitCounts: Record<string, number> = {},
): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((acc, cur) => acc + getRemainingCount(cur, hitCounts), 0);
}

/**
 * 有効な抽選対象項目を返します
 * - "probability": 当選上限に達していない項目
 * - "count": 残り個数が1以上の項目
 */
export function getAvailableLotteryItems(
  items: LotteryItem[],
  hitCounts: Record<string, number> = {},
  drawMode: LotteryDrawMode = DEFAULT_DRAW_MODE,
): LotteryItem[] {
  if (!items || items.length === 0) return [];

  if (drawMode === "count") {
    return items.filter((item) => getRemainingCount(item, hitCounts) > 0);
  }

  return items.filter((item) => {
    if (item.limit === undefined || item.limit === null || item.limit <= 0) {
      return true;
    }
    const hits = hitCounts[item.id] || 0;
    return hits < item.limit;
  });
}

/**
 * 抽選可能な項目がなくなったかどうかを判定します
 * （"probability" では全項目が上限到達、"count" ではくじの引き切りを意味します）
 */
export function isAllLimitsReached(
  items: LotteryItem[],
  hitCounts: Record<string, number> = {},
  drawMode: LotteryDrawMode = DEFAULT_DRAW_MODE,
): boolean {
  if (!items || items.length === 0) return true;
  return getAvailableLotteryItems(items, hitCounts, drawMode).length === 0;
}

/**
 * 抽選・確率表示・ルーレット描画に使用する重み付きテーブルを生成します
 * - "probability": 上限未到達の項目をそのまま返却（比重 = ratio）
 * - "count": 残り個数が1以上の項目について、比重を残り個数に置き換えて返却
 */
export function getDrawTable(
  items: LotteryItem[],
  hitCounts: Record<string, number> = {},
  drawMode: LotteryDrawMode = DEFAULT_DRAW_MODE,
): LotteryItem[] {
  const available = getAvailableLotteryItems(items, hitCounts, drawMode);
  if (drawMode !== "count") return available;
  return available.map((item) => ({
    ...item,
    ratio: getRemainingCount(item, hitCounts),
  }));
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
