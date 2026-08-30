import { DEFAULT_CONFIGS, type LotteryConfig, type LotteryItem } from "./lottery";

export const LOTTERY_CONFIGS_KEY = "simple_lottery_configs_v1";
export const LOTTERY_ACTIVE_ID_KEY = "simple_lottery_active_id_v1";

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
 */
export function saveConfig(
  configData: {
    id?: string;
    name: string;
    items: LotteryItem[];
    showLabel?: boolean;
    showProbability?: boolean;
  },
  setActive = false,
): { savedConfig: LotteryConfig; configs: LotteryConfig[] } {
  const configs = getStoredConfigs();
  const now = Date.now();

  let savedConfig: LotteryConfig;

  if (configData.id && configs.some((c) => c.id === configData.id)) {
    // 既存更新
    savedConfig = {
      id: configData.id,
      name: configData.name.trim() || "無題の設定",
      items: configData.items,
      showLabel: configData.showLabel !== false,
      showProbability: configData.showProbability !== false,
      createdAt: configs.find((c) => c.id === configData.id)?.createdAt || now,
      updatedAt: now,
    };
    const updatedConfigs = configs.map((c) => (c.id === savedConfig.id ? savedConfig : c));
    saveStoredConfigs(updatedConfigs);

    if (setActive) {
      setActiveConfigId(savedConfig.id);
    }
    return { savedConfig, configs: updatedConfigs };
  }

  // 新規作成
  savedConfig = {
    id: configData.id || generateId(),
    name: configData.name.trim() || "新規設定",
    items: configData.items,
    showLabel: configData.showLabel !== false,
    showProbability: configData.showProbability !== false,
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
 * 確率設定を複製します
 */
export function duplicateConfig(
  id: string,
): { duplicated: LotteryConfig; configs: LotteryConfig[] } | null {
  const configs = getStoredConfigs();
  const target = configs.find((c) => c.id === id);
  if (!target) return null;

  const now = Date.now();
  const duplicated: LotteryConfig = {
    id: generateId(),
    name: `${target.name} (コピー)`,
    items: target.items.map((item) => ({
      ...item,
      id: generateId(),
    })),
    showLabel: target.showLabel !== false,
    showProbability: target.showProbability !== false,
    createdAt: now,
    updatedAt: now,
  };

  const updatedConfigs = [duplicated, ...configs];
  saveStoredConfigs(updatedConfigs);
  return { duplicated, configs: updatedConfigs };
}

/**
 * 確率設定を削除します
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

  let activeId = getActiveConfigId();
  if (activeId === id) {
    activeId = updatedConfigs[0].id;
    setActiveConfigId(activeId);
  }

  return { success: true, activeId, configs: updatedConfigs };
}

/**
 * デフォルト設定に初期化します
 */
export function resetToDefaultConfigs(): { configs: LotteryConfig[]; activeId: string } {
  saveStoredConfigs(DEFAULT_CONFIGS);
  const activeId = DEFAULT_CONFIGS[0].id;
  setActiveConfigId(activeId);
  return { configs: DEFAULT_CONFIGS, activeId };
}
