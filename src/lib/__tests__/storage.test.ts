import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIGS } from "../lottery";
import {
  LOTTERY_ACTIVE_ID_KEY,
  LOTTERY_CONFIGS_KEY,
  deleteConfig,
  duplicateConfig,
  getActiveConfig,
  getActiveConfigId,
  getStoredConfigs,
  resetToDefaultConfigs,
  saveConfig,
  saveStoredConfigs,
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
    };

    const { savedConfig, configs } = saveConfig(updateData);
    expect(savedConfig.name).toBe("更新されたスタンダードくじ");
    const found = configs.find((c) => c.id === existing.id);
    expect(found?.name).toBe("更新されたスタンダードくじ");
    expect(found?.items[0].label).toBe("超当たり");
  });

  it("should duplicate a config", () => {
    const target = DEFAULT_CONFIGS[0];
    const result = duplicateConfig(target.id);
    expect(result).not.toBeNull();
    expect(result?.duplicated.name).toBe(`${target.name} (コピー)`);
    expect(result?.duplicated.id).not.toBe(target.id);
    expect(result?.configs.length).toBe(DEFAULT_CONFIGS.length + 1);
  });

  it("should delete a config and update activeId if active one is deleted", () => {
    const configs = getStoredConfigs();
    const activeId = configs[0].id;
    setActiveConfigId(activeId);

    const deleteResult = deleteConfig(activeId);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.activeId).not.toBe(activeId);
    expect(deleteResult.configs.some((c) => c.id === activeId)).toBe(false);
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
  });
});
