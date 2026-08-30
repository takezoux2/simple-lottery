import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIGS } from "../lottery";
import {
  DEFAULT_MAX_HISTORY_COUNT,
  LOTTERY_ACTIVE_ID_KEY,
  LOTTERY_CONFIGS_KEY,
  LOTTERY_HISTORY_KEY,
  addHistoryItem,
  clearAllHistory,
  clearHistory,
  deleteConfig,
  duplicateConfig,
  getActiveConfig,
  getActiveConfigId,
  getHistoryCount,
  getStoredConfigs,
  getStoredHistory,
  resetToDefaultConfigs,
  saveConfig,
  saveStoredConfigs,
  saveStoredHistory,
  setActiveConfigId,
} from "../storage";

describe("storage management", () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStore[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
    });
  });

  it("should return DEFAULT_CONFIGS and save them if localStorage is empty", () => {
    const configs = getStoredConfigs();
    expect(configs).toHaveLength(DEFAULT_CONFIGS.length);
    expect(configs[0].name).toBe(DEFAULT_CONFIGS[0].name);
    expect(mockStore[LOTTERY_CONFIGS_KEY]).toBeDefined();
  });

  it("should get and set active config id", () => {
    expect(getActiveConfigId()).toBe(DEFAULT_CONFIGS[0].id);
    setActiveConfigId(DEFAULT_CONFIGS[1].id);
    expect(getActiveConfigId()).toBe(DEFAULT_CONFIGS[1].id);
    expect(getActiveConfig().id).toBe(DEFAULT_CONFIGS[1].id);
  });

  it("should save a new config and set active if specified", () => {
    const newConfigData = {
      name: "新規カスタムくじ",
      items: [
        { id: "1", label: "松", ratio: 1, color: "#e11d48" },
        { id: "2", label: "竹", ratio: 2, color: "#059669" },
        { id: "3", label: "梅", ratio: 3, color: "#4f46e5" },
      ],
    };

    const { savedConfig, configs } = saveConfig(newConfigData, true);
    expect(savedConfig.name).toBe("新規カスタムくじ");
    expect(savedConfig.id).toBeDefined();
    expect(savedConfig.showHistory).toBe(true);
    expect(savedConfig.maxHistoryCount).toBe(20);
    expect(configs[0].id).toBe(savedConfig.id);
    expect(getActiveConfigId()).toBe(savedConfig.id);
  });

  it("should update an existing config", () => {
    const existing = getStoredConfigs()[0];
    const updateData = {
      id: existing.id,
      name: "更新されたスタンダードくじ",
      items: [
        { id: "1", label: "超当たり", ratio: 5, color: "#d97706" },
        { id: "2", label: "はずれ", ratio: 5, color: "#4b5563" },
      ],
      showHistory: false,
      maxHistoryCount: 50,
    };

    const { savedConfig, configs } = saveConfig(updateData);
    expect(savedConfig.name).toBe("更新されたスタンダードくじ");
    expect(savedConfig.showHistory).toBe(false);
    expect(savedConfig.maxHistoryCount).toBe(50);
    const found = configs.find((c) => c.id === existing.id);
    expect(found?.name).toBe("更新されたスタンダードくじ");
    expect(found?.items[0].label).toBe("超当たり");
    expect(found?.showHistory).toBe(false);
    expect(found?.maxHistoryCount).toBe(50);
  });

  it("should duplicate a config with showHistory/maxHistoryCount and empty history", () => {
    const target = DEFAULT_CONFIGS[0];
    // 対象設定に履歴を追加
    addHistoryItem(target.id, target.items[0], 20);
    expect(getStoredHistory(target.id)).toHaveLength(1);

    const result = duplicateConfig(target.id);
    expect(result).not.toBeNull();
    expect(result?.duplicated.name).toBe(`${target.name} (コピー)`);
    expect(result?.duplicated.id).not.toBe(target.id);
    expect(result?.duplicated.showHistory).toBe(true);
    expect(result?.duplicated.maxHistoryCount).toBe(20);
    expect(result?.configs.length).toBe(DEFAULT_CONFIGS.length + 1);

    // 複製先の履歴は0件であること
    if (result) {
      expect(getStoredHistory(result.duplicated.id)).toHaveLength(0);
    }
  });

  it("should delete a config, clean up history, and update activeId if active one is deleted", () => {
    const configs = getStoredConfigs();
    const activeId = configs[0].id;
    setActiveConfigId(activeId);

    // 履歴を追加
    addHistoryItem(activeId, configs[0].items[0], 20);
    expect(getStoredHistory(activeId)).toHaveLength(1);

    const deleteResult = deleteConfig(activeId);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.activeId).not.toBe(activeId);
    expect(deleteResult.configs.some((c) => c.id === activeId)).toBe(false);
    // 削除された設定の履歴も削除されていること
    expect(getStoredHistory(activeId)).toHaveLength(0);
  });

  it("should prevent deleting the last remaining config", () => {
    saveStoredConfigs([DEFAULT_CONFIGS[0]]);
    const deleteResult = deleteConfig(DEFAULT_CONFIGS[0].id);
    expect(deleteResult.success).toBe(false);
    expect(deleteResult.configs).toHaveLength(1);
  });

  it("should reset to default configs", () => {
    saveStoredConfigs([]);
    const reset = resetToDefaultConfigs();
    expect(reset.configs).toHaveLength(DEFAULT_CONFIGS.length);
    expect(reset.activeId).toBe(DEFAULT_CONFIGS[0].id);
    expect(reset.configs[0].showLabel).toBe(true);
    expect(reset.configs[0].showProbability).toBe(true);
    expect(reset.configs[0].showHistory).toBe(true);
    expect(reset.configs[0].maxHistoryCount).toBe(20);
  });

  it("should save and duplicate custom showLabel, showProbability, showHistory, maxHistoryCount flags", () => {
    const newConfigData = {
      name: "ブラインドくじ",
      items: [
        { id: "1", label: "シークレットA", ratio: 1, color: "#e11d48" },
        { id: "2", label: "シークレットB", ratio: 2, color: "#059669" },
      ],
      showLabel: false,
      showProbability: false,
      showHistory: false,
      maxHistoryCount: 15,
    };

    const { savedConfig, configs } = saveConfig(newConfigData, true);
    expect(savedConfig.showLabel).toBe(false);
    expect(savedConfig.showProbability).toBe(false);
    expect(savedConfig.showHistory).toBe(false);
    expect(savedConfig.maxHistoryCount).toBe(15);
    expect(configs[0].showLabel).toBe(false);
    expect(configs[0].showProbability).toBe(false);
    expect(configs[0].showHistory).toBe(false);
    expect(configs[0].maxHistoryCount).toBe(15);

    // 複製時にフラグが引き継がれること
    const dupResult = duplicateConfig(savedConfig.id);
    expect(dupResult).not.toBeNull();
    expect(dupResult?.duplicated.showLabel).toBe(false);
    expect(dupResult?.duplicated.showProbability).toBe(false);
    expect(dupResult?.duplicated.showHistory).toBe(false);
    expect(dupResult?.duplicated.maxHistoryCount).toBe(15);

    // 更新時にフラグを変更できること
    const updateResult = saveConfig({
      id: savedConfig.id,
      name: "一部開示くじ",
      items: savedConfig.items,
      showLabel: true,
      showProbability: false,
      showHistory: true,
      maxHistoryCount: 50,
    });
    expect(updateResult.savedConfig.showLabel).toBe(true);
    expect(updateResult.savedConfig.showProbability).toBe(false);
    expect(updateResult.savedConfig.showHistory).toBe(true);
    expect(updateResult.savedConfig.maxHistoryCount).toBe(50);
  });

  it("should clamp maxHistoryCount between 1 and 500", () => {
    const { savedConfig: c1 } = saveConfig({
      name: "最小値テスト",
      items: [{ id: "1", label: "A", ratio: 1 }],
      maxHistoryCount: 0,
    });
    expect(c1.maxHistoryCount).toBe(1);

    const { savedConfig: c2 } = saveConfig({
      name: "最大値テスト",
      items: [{ id: "1", label: "A", ratio: 1 }],
      maxHistoryCount: 9999,
    });
    expect(c2.maxHistoryCount).toBe(500);
  });

  describe("history management API", () => {
    const testConfigId = "test-config-123";
    const testItemA = { id: "item-a", label: "大吉", ratio: 1, color: "#e11d48" };
    const testItemB = { id: "item-b", label: "中吉", ratio: 2, color: "#059669" };

    it("should add history items and respect maxCount limit", () => {
      // 3件追加（maxCount = 2）
      addHistoryItem(testConfigId, testItemA, 2);
      addHistoryItem(testConfigId, testItemB, 2);
      const res = addHistoryItem(testConfigId, testItemA, 2);

      expect(res).toHaveLength(2);
      expect(res[0].result.label).toBe("大吉");
      expect(res[1].result.label).toBe("中吉");
      expect(getStoredHistory(testConfigId)).toHaveLength(2);
      expect(getHistoryCount(testConfigId)).toBe(2);
    });

    it("should clear history for a specific configId", () => {
      addHistoryItem(testConfigId, testItemA, 10);
      addHistoryItem("other-config", testItemB, 10);

      expect(getStoredHistory(testConfigId)).toHaveLength(1);
      expect(getStoredHistory("other-config")).toHaveLength(1);

      clearHistory(testConfigId);
      expect(getStoredHistory(testConfigId)).toHaveLength(0);
      expect(getStoredHistory("other-config")).toHaveLength(1);
    });

    it("should clear all history", () => {
      addHistoryItem(testConfigId, testItemA, 10);
      addHistoryItem("other-config", testItemB, 10);

      clearAllHistory();
      expect(getStoredHistory(testConfigId)).toHaveLength(0);
      expect(getStoredHistory("other-config")).toHaveLength(0);
    });
  });
});
