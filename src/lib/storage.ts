import {
  DEFAULT_CONFIGS,
  type LotteryAnimationType,
  type LotteryConfig,
  type LotteryItem,
} from "./lottery";

export const LOTTERY_CONFIGS_KEY = "simple_lottery_configs_v1";
export const LOTTERY_ACTIVE_ID_KEY = "simple_lottery_active_id_v1";
export const LOTTERY_HISTORY_KEY = "simple_lottery_history_v1";
export const LOTTERY_HIT_COUNTS_KEY = "simple_lottery_hit_counts_v1";

export const DEFAULT_MAX_HISTORY_COUNT = 20;
export const MIN_MAX_HISTORY_COUNT = 1;
export const MAX_MAX_HISTORY_COUNT = 500;

export interface DrawHistoryItem {
  id: string;
  timestamp: string;
  result: LotteryItem;
  configId: string;
  createdAt: number;
}

function isClient(): boolean {
  return typeof window !== "undefined" || typeof localStorage !== "undefined";
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 指定文字数（デフォルト5文字）のランダムなIDを生成します（半角英小文字・数字）
 */
export function generateShortId(length = 5): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += chars[values[i] % chars.length];
    }
    return result;
  }
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * LocalStorageから保存されているすべての確率設定を取得します
 */
export function getStoredConfigs(): LotteryConfig[] {
  if (!isClient()) {
    return DEFAULT_CONFIGS;
  }

  try {
    const raw = localStorage.getItem(LOTTERY_CONFIGS_KEY);
    if (!raw) {
      saveStoredConfigs(DEFAULT_CONFIGS);
      return DEFAULT_CONFIGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveStoredConfigs(DEFAULT_CONFIGS);
    return DEFAULT_CONFIGS;
  } catch (error) {
    console.error("Failed to read configs from localStorage:", error);
    return DEFAULT_CONFIGS;
  }
}

/**
 * すべての確率設定をLocalStorageに保存します
 */
export function saveStoredConfigs(configs: LotteryConfig[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(LOTTERY_CONFIGS_KEY, JSON.stringify(configs));
  } catch (error) {
    console.error("Failed to save configs to localStorage:", error);
  }
}

/**
 * 現在アクティブな設定IDを取得します
 */
export function getActiveConfigId(): string {
  const configs = getStoredConfigs();
  const defaultId = configs[0]?.id || DEFAULT_CONFIGS[0].id;

  if (!isClient()) {
    return defaultId;
  }

  try {
    const activeId = localStorage.getItem(LOTTERY_ACTIVE_ID_KEY);
    if (activeId && configs.some((c) => c.id === activeId)) {
      return activeId;
    }
    setActiveConfigId(defaultId);
    return defaultId;
  } catch {
    return defaultId;
  }
}

/**
 * アクティブな設定IDを設定・保存します
 */
export function setActiveConfigId(id: string): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(LOTTERY_ACTIVE_ID_KEY, id);
  } catch (error) {
    console.error("Failed to set active config ID:", error);
  }
}

/**
 * 現在アクティブな確率設定オブジェクトを取得します
 */
export function getActiveConfig(): LotteryConfig {
  const configs = getStoredConfigs();
  const activeId = getActiveConfigId();
  const found = configs.find((c) => c.id === activeId);
  return found || configs[0] || DEFAULT_CONFIGS[0];
}

/**
 * 確率設定を新規作成または更新保存します
 * @param configData 保存するくじ設定データ
 * @param setActive 保存後にアクティブ設定にするかどうか
 * @param originalId 編集前のID（IDを変更した場合のマイグレーション用）
 */
export function saveConfig(
  configData: {
    id?: string;
    name: string;
    items: LotteryItem[];
    animationType?: LotteryAnimationType;
    showLabel?: boolean;
    showProbability?: boolean;
    showHistory?: boolean;
    showLimit?: boolean;
    maxHistoryCount?: number;
  },
  setActive = false,
  originalId?: string,
): { savedConfig: LotteryConfig; configs: LotteryConfig[] } {
  const configs = getStoredConfigs();
  const now = Date.now();

  const validatedMaxHistory = Math.min(
    MAX_MAX_HISTORY_COUNT,
    Math.max(
      MIN_MAX_HISTORY_COUNT,
      Math.floor(configData.maxHistoryCount ?? DEFAULT_MAX_HISTORY_COUNT),
    ),
  );

  const targetId = configData.id?.trim() || generateShortId(5);

  // 1. originalId が指定されている場合の更新（ID変更対応）
  if (originalId && configs.some((c) => c.id === originalId)) {
    const existing = configs.find((c) => c.id === originalId);

    // IDが変更された場合、履歴・当選回数・アクティブIDを新IDへ移行
    if (originalId !== targetId) {
      // 履歴移行
      const allHistories = getAllStoredHistories();
      if (allHistories[originalId]) {
        allHistories[targetId] = allHistories[originalId].map((h) => ({
          ...h,
          configId: targetId,
        }));
        delete allHistories[originalId];
        saveAllStoredHistories(allHistories);
      }

      // 当選回数移行
      const allHits = getAllStoredHitCounts();
      if (allHits[originalId]) {
        allHits[targetId] = allHits[originalId];
        delete allHits[originalId];
        saveAllStoredHitCounts(allHits);
      }

      // アクティブID更新
      if (getActiveConfigId() === originalId) {
        setActiveConfigId(targetId);
      }
    }

    const savedConfig: LotteryConfig = {
      id: targetId,
      name: configData.name.trim() || "無題の設定",
      items: configData.items,
      animationType: configData.animationType ?? "card",
      showLabel: configData.showLabel !== false,
      showProbability: configData.showProbability !== false,
      showHistory: configData.showHistory !== false,
      showLimit: configData.showLimit !== false,
      maxHistoryCount: validatedMaxHistory,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const updatedConfigs = configs.map((c) => (c.id === originalId ? savedConfig : c));
    saveStoredConfigs(updatedConfigs);

    if (setActive) {
      setActiveConfigId(savedConfig.id);
    }
    return { savedConfig, configs: updatedConfigs };
  }

  // 2. configData.id が既存設定と一致する場合の更新
  if (configData.id && configs.some((c) => c.id === configData.id)) {
    const existing = configs.find((c) => c.id === configData.id);
    const savedConfig: LotteryConfig = {
      id: configData.id,
      name: configData.name.trim() || "無題の設定",
      items: configData.items,
      animationType: configData.animationType ?? "card",
      showLabel: configData.showLabel !== false,
      showProbability: configData.showProbability !== false,
      showHistory: configData.showHistory !== false,
      showLimit: configData.showLimit !== false,
      maxHistoryCount: validatedMaxHistory,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    const updatedConfigs = configs.map((c) => (c.id === savedConfig.id ? savedConfig : c));
    saveStoredConfigs(updatedConfigs);

    if (setActive) {
      setActiveConfigId(savedConfig.id);
    }
    return { savedConfig, configs: updatedConfigs };
  }

  // 3. 新規作成
  const savedConfig: LotteryConfig = {
    id: targetId,
    name: configData.name.trim() || "新規設定",
    items: configData.items,
    animationType: configData.animationType ?? "card",
    showLabel: configData.showLabel !== false,
    showProbability: configData.showProbability !== false,
    showHistory: configData.showHistory !== false,
    showLimit: configData.showLimit !== false,
    maxHistoryCount: validatedMaxHistory,
    createdAt: now,
    updatedAt: now,
  };
  const updatedConfigs = [savedConfig, ...configs];
  saveStoredConfigs(updatedConfigs);

  if (setActive) {
    setActiveConfigId(savedConfig.id);
  }
  return { savedConfig, configs: updatedConfigs };
}

/**
 * 確率設定を複製します（履歴・当選カウントは複製せず0件から開始）
 */
export function duplicateConfig(
  id: string,
): { duplicated: LotteryConfig; configs: LotteryConfig[] } | null {
  const configs = getStoredConfigs();
  const target = configs.find((c) => c.id === id);
  if (!target) return null;

  const now = Date.now();
  const duplicated: LotteryConfig = {
    id: generateShortId(5),
    name: `${target.name} (コピー)`,
    items: target.items.map((item) => ({
      ...item,
      id: generateId(),
    })),
    animationType: target.animationType ?? "card",
    showLabel: target.showLabel !== false,
    showProbability: target.showProbability !== false,
    showHistory: target.showHistory !== false,
    showLimit: target.showLimit !== false,
    maxHistoryCount: target.maxHistoryCount ?? DEFAULT_MAX_HISTORY_COUNT,
    createdAt: now,
    updatedAt: now,
  };

  const updatedConfigs = [duplicated, ...configs];
  saveStoredConfigs(updatedConfigs);
  return { duplicated, configs: updatedConfigs };
}

/**
 * 確率設定を削除します（紐づく履歴および当選カウントも削除）
 */
export function deleteConfig(id: string): {
  success: boolean;
  activeId: string;
  configs: LotteryConfig[];
} {
  const configs = getStoredConfigs();
  if (configs.length <= 1) {
    // 最後の1件は削除不可
    return { success: false, activeId: getActiveConfigId(), configs };
  }

  const updatedConfigs = configs.filter((c) => c.id !== id);
  saveStoredConfigs(updatedConfigs);

  // 紐づく履歴および当選カウントも削除
  clearHistory(id);
  resetHitCounts(id);

  let activeId = getActiveConfigId();
  if (activeId === id) {
    activeId = updatedConfigs[0].id;
    setActiveConfigId(activeId);
  }

  return { success: true, activeId, configs: updatedConfigs };
}

/**
 * デフォルト設定に初期化します（全当選カウントも初期化）
 */
export function resetToDefaultConfigs(): { configs: LotteryConfig[]; activeId: string } {
  saveStoredConfigs(DEFAULT_CONFIGS);
  resetAllHitCounts();
  const activeId = DEFAULT_CONFIGS[0].id;
  setActiveConfigId(activeId);
  return { configs: DEFAULT_CONFIGS, activeId };
}

/* ==========================================================================
   履歴 (History) 管理 API
   ========================================================================== */

/**
 * 全設定の履歴マップをLocalStorageから取得
 */
function getAllStoredHistories(): Record<string, DrawHistoryItem[]> {
  if (!isClient()) return {};
  try {
    const raw = localStorage.getItem(LOTTERY_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch (error) {
    console.error("Failed to read history from localStorage:", error);
    return {};
  }
}

/**
 * 全設定の履歴マップをLocalStorageに保存
 */
function saveAllStoredHistories(histories: Record<string, DrawHistoryItem[]>): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(LOTTERY_HISTORY_KEY, JSON.stringify(histories));
  } catch (error) {
    console.error("Failed to save history to localStorage:", error);
  }
}

/**
 * 指定された設定IDの抽選履歴を取得します
 */
export function getStoredHistory(configId: string): DrawHistoryItem[] {
  if (!configId) return [];
  const all = getAllStoredHistories();
  const list = all[configId];
  return Array.isArray(list) ? list : [];
}

/**
 * 指定された設定IDの抽選履歴を保存します
 */
export function saveStoredHistory(configId: string, history: DrawHistoryItem[]): void {
  if (!configId) return;
  const all = getAllStoredHistories();
  all[configId] = history;
  saveAllStoredHistories(all);
}

/**
 * 抽選結果を1件履歴に追加し、最大件数（maxCount）でトリムして保存します
 */
export function addHistoryItem(
  configId: string,
  result: LotteryItem,
  maxCount = DEFAULT_MAX_HISTORY_COUNT,
): DrawHistoryItem[] {
  if (!configId) return [];
  const validMax = Math.min(
    MAX_MAX_HISTORY_COUNT,
    Math.max(MIN_MAX_HISTORY_COUNT, Math.floor(maxCount)),
  );
  const current = getStoredHistory(configId);
  const now = new Date();
  const newItem: DrawHistoryItem = {
    id: generateId(),
    timestamp: now.toLocaleTimeString(),
    result,
    configId,
    createdAt: now.getTime(),
  };

  const updated = [newItem, ...current].slice(0, validMax);
  saveStoredHistory(configId, updated);
  return updated;
}

/**
 * 指定された設定IDの抽選履歴をクリア（リセット）し、当選回数もリセットします
 */
export function clearHistory(configId: string): void {
  if (!configId) return;
  const all = getAllStoredHistories();
  if (all[configId]) {
    delete all[configId];
    saveAllStoredHistories(all);
  }
  resetHitCounts(configId);
}

/**
 * 全設定の履歴および当選回数をクリアします
 */
export function clearAllHistory(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(LOTTERY_HISTORY_KEY);
    localStorage.removeItem(LOTTERY_HIT_COUNTS_KEY);
  } catch (error) {
    console.error("Failed to clear all history and hit counts:", error);
  }
}

/**
 * 指定された設定IDの保存済み履歴件数を取得します
 */
export function getHistoryCount(configId: string): number {
  return getStoredHistory(configId).length;
}

/* ==========================================================================
   当選回数 (Hit Counts) 管理 API
   ========================================================================== */

/**
 * 全設定の当選回数マップをLocalStorageから取得
 */
function getAllStoredHitCounts(): Record<string, Record<string, number>> {
  if (!isClient()) return {};
  try {
    const raw = localStorage.getItem(LOTTERY_HIT_COUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch (error) {
    console.error("Failed to read hit counts from localStorage:", error);
    return {};
  }
}

/**
 * 全設定の当選回数マップをLocalStorageに保存
 */
function saveAllStoredHitCounts(hitCounts: Record<string, Record<string, number>>): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(LOTTERY_HIT_COUNTS_KEY, JSON.stringify(hitCounts));
  } catch (error) {
    console.error("Failed to save hit counts to localStorage:", error);
  }
}

/**
 * 指定された設定IDの項目別当選回数マップを取得します
 */
export function getStoredHitCounts(configId: string): Record<string, number> {
  if (!configId) return {};
  const all = getAllStoredHitCounts();
  const map = all[configId];
  return map && typeof map === "object" && !Array.isArray(map) ? map : {};
}

/**
 * 指定された設定IDの項目別当選回数マップを保存します
 */
export function saveStoredHitCounts(configId: string, counts: Record<string, number>): void {
  if (!configId) return;
  const all = getAllStoredHitCounts();
  all[configId] = counts;
  saveAllStoredHitCounts(all);
}

/**
 * 指定された項目の当選回数を1加算し、最新のカウントマップを保存・返却します
 */
export function incrementHitCount(configId: string, itemId: string): Record<string, number> {
  if (!configId || !itemId) return {};
  const currentCounts = getStoredHitCounts(configId);
  const updatedCounts: Record<string, number> = {
    ...currentCounts,
    [itemId]: (currentCounts[itemId] || 0) + 1,
  };
  saveStoredHitCounts(configId, updatedCounts);
  return updatedCounts;
}

/**
 * 指定された設定IDの当選回数をクリア（0リセット）します
 */
export function resetHitCounts(configId: string): void {
  if (!configId) return;
  const all = getAllStoredHitCounts();
  if (all[configId]) {
    delete all[configId];
    saveAllStoredHitCounts(all);
  }
}

/**
 * すべての設定の当選回数をクリアします
 */
export function resetAllHitCounts(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(LOTTERY_HIT_COUNTS_KEY);
  } catch (error) {
    console.error("Failed to reset all hit counts:", error);
  }
}
