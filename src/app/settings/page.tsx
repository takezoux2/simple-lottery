"use client";

import {
  DEFAULT_CONFIGS,
  type LotteryConfig,
  type LotteryItem,
  PRESET_COLORS,
  getPercentage,
} from "@/lib/lottery";
import {
  DEFAULT_MAX_HISTORY_COUNT,
  MAX_MAX_HISTORY_COUNT,
  MIN_MAX_HISTORY_COUNT,
  clearHistory,
  deleteConfig,
  duplicateConfig,
  generateId,
  getActiveConfigId,
  getHistoryCount,
  getStoredConfigs,
  getStoredHitCounts,
  resetToDefaultConfigs,
  saveConfig,
  setActiveConfigId,
} from "@/lib/storage";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ViewMode = "list" | "create" | "edit";

interface FormItemState {
  id: string;
  label: string;
  ratio: number;
  color: string;
  limit?: number;
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<LotteryConfig[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [_historyVersion, setHistoryVersion] = useState(0);

  // フォーム状態
  const [formName, setFormName] = useState("");
  const [formItems, setFormItems] = useState<FormItemState[]>([]);
  const [formShowLabel, setFormShowLabel] = useState(true);
  const [formShowProbability, setFormShowProbability] = useState(true);
  const [formShowHistory, setFormShowHistory] = useState(true);
  const [formShowLimit, setFormShowLimit] = useState(true);
  const [formMaxHistoryCount, setFormMaxHistoryCount] = useState(DEFAULT_MAX_HISTORY_COUNT);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [activeColorPickerIndex, setActiveColorPickerIndex] = useState<number | null>(null);

  // 初期化とLocalStorageからのロード
  useEffect(() => {
    const loadedConfigs = getStoredConfigs();
    const currentActiveId = getActiveConfigId();
    setConfigs(loadedConfigs);
    setActiveId(currentActiveId);
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // 一覧へ戻る
  const handleBackToList = () => {
    setViewMode("list");
    setEditingId(null);
    setFormError(null);
    setActiveColorPickerIndex(null);
  };

  // 新規作成画面を開く
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormName("新しいくじ設定");
    setFormItems([
      { id: generateId(), label: "項目1", ratio: 1, color: PRESET_COLORS[0], limit: undefined },
      { id: generateId(), label: "項目2", ratio: 1, color: PRESET_COLORS[1], limit: undefined },
    ]);
    setFormShowLabel(true);
    setFormShowProbability(true);
    setFormShowHistory(true);
    setFormShowLimit(true);
    setFormMaxHistoryCount(DEFAULT_MAX_HISTORY_COUNT);
    setFormError(null);
    setViewMode("create");
  };

  // 編集画面を開く
  const handleOpenEdit = (config: LotteryConfig) => {
    setEditingId(config.id);
    setFormName(config.name);
    setFormItems(
      config.items.map((item, index) => ({
        id: item.id || generateId(),
        label: item.label,
        ratio: Math.max(1, Math.round(item.ratio || 1)),
        color: item.color || PRESET_COLORS[index % PRESET_COLORS.length],
        limit: item.limit && item.limit > 0 ? item.limit : undefined,
      })),
    );
    setFormShowLabel(config.showLabel !== false);
    setFormShowProbability(config.showProbability !== false);
    setFormShowHistory(config.showHistory !== false);
    setFormShowLimit(config.showLimit !== false);
    setFormMaxHistoryCount(config.maxHistoryCount ?? DEFAULT_MAX_HISTORY_COUNT);
    setFormError(null);
    setViewMode("edit");
  };

  // 履歴リセット
  const handleResetConfigHistory = (config: { id: string; name: string }) => {
    if (!window.confirm(`「${config.name}」の抽選履歴・当選数をリセットしてもよろしいですか？`)) {
      return;
    }
    clearHistory(config.id);
    setHistoryVersion((v) => v + 1);
    showNotification(`「${config.name}」の抽選履歴・当選数をリセットしました`);
  };

  // アクティブ設定の切り替え
  const handleSetActive = (id: string) => {
    setActiveConfigId(id);
    setActiveId(id);
    showNotification("使用するくじ設定を切り替えました");
  };

  // 複製
  const handleDuplicate = (id: string) => {
    const res = duplicateConfig(id);
    if (res) {
      setConfigs(res.configs);
      showNotification(`「${res.duplicated.name}」を作成しました`);
    }
  };

  // 削除
  const handleDelete = (config: LotteryConfig) => {
    if (configs.length <= 1) {
      alert("設定をすべて削除することはできません（最低1件必要です）");
      return;
    }
    if (!window.confirm(`「${config.name}」を削除してもよろしいですか？`)) {
      return;
    }

    const res = deleteConfig(config.id);
    if (res.success) {
      setConfigs(res.configs);
      setActiveId(res.activeId);
      showNotification(`「${config.name}」を削除しました`);
    }
  };

  // デフォルト初期化
  const handleResetDefaults = () => {
    if (
      !window.confirm(
        "すべての設定を初期プリセットにリセットしますか？\n（追加した独自設定は消去されます）",
      )
    ) {
      return;
    }
    const res = resetToDefaultConfigs();
    setConfigs(res.configs);
    setActiveId(res.activeId);
    showNotification("初期プリセットにリセットしました");
  };

  // フォーム内: 項目追加
  const handleAddItem = () => {
    const nextColor = PRESET_COLORS[formItems.length % PRESET_COLORS.length];
    setFormItems((prev) => [
      ...prev,
      {
        id: generateId(),
        label: `項目${prev.length + 1}`,
        ratio: 1,
        color: nextColor,
        limit: undefined,
      },
    ]);
  };

  // フォーム内: 項目削除
  const handleRemoveItem = (index: number) => {
    if (formItems.length <= 2) {
      setFormError("最低2つの項目が必要です");
      return;
    }
    setFormItems((prev) => prev.filter((_, i) => i !== index));
    if (activeColorPickerIndex === index) {
      setActiveColorPickerIndex(null);
    }
  };

  // フォーム内: ラベル更新
  const handleItemLabelChange = (index: number, val: string) => {
    setFormItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], label: val };
      return next;
    });
  };

  // フォーム内: 比重更新 (1以上の正の整数)
  const handleItemRatioChange = (index: number, val: number) => {
    const safeVal = Math.max(1, Math.floor(val || 1));
    setFormItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ratio: safeVal };
      return next;
    });
  };

  // フォーム内: 上限更新 (空欄または0は無制限、1以上で設定)
  const handleItemLimitChange = (index: number, val: string) => {
    setFormItems((prev) => {
      const next = [...prev];
      const trimmed = val.trim();
      if (trimmed === "" || trimmed === "0") {
        next[index] = { ...next[index], limit: undefined };
      } else {
        const parsed = Number.parseInt(trimmed, 10);
        next[index] = {
          ...next[index],
          limit: !Number.isNaN(parsed) && parsed > 0 ? parsed : undefined,
        };
      }
      return next;
    });
  };

  // フォーム内: 比重ステップ増減
  const handleRatioStep = (index: number, delta: number) => {
    setFormItems((prev) => {
      const next = [...prev];
      const newRatio = Math.max(1, (next[index].ratio || 1) + delta);
      next[index] = { ...next[index], ratio: newRatio };
      return next;
    });
  };

  // フォーム内: カラー変更
  const handleItemColorChange = (index: number, color: string) => {
    setFormItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], color };
      return next;
    });
    setActiveColorPickerIndex(null);
  };

  // リアルタイム計算: 比重合計
  const totalRatio = useMemo(() => {
    return formItems.reduce((acc, cur) => acc + Math.max(1, cur.ratio || 1), 0);
  }, [formItems]);

  // フォーム保存
  const handleSaveForm = (shouldSetActive: boolean) => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError("設定名を入力してください");
      return;
    }
    if (formItems.length < 2) {
      setFormError("最低2つの項目を設定してください");
      return;
    }
    for (let i = 0; i < formItems.length; i++) {
      if (!formItems[i].label.trim()) {
        setFormError(`項目 ${i + 1} の名前を入力してください`);
        return;
      }
      if (formItems[i].ratio <= 0) {
        setFormError(`項目 ${i + 1} の比重は1以上の整数にしてください`);
        return;
      }
      if (
        formItems[i].limit !== undefined &&
        (Number.isNaN(formItems[i].limit) || (formItems[i].limit as number) <= 0)
      ) {
        setFormError(`項目 ${i + 1} の上限は1以上の整数にしてください`);
        return;
      }
    }

    const cleanItems: LotteryItem[] = formItems.map((item) => ({
      id: item.id,
      label: item.label.trim(),
      ratio: Math.max(1, Math.floor(item.ratio)),
      color: item.color,
      limit: item.limit && item.limit > 0 ? Math.floor(item.limit) : undefined,
    }));

    const safeMaxHistory = Math.min(
      MAX_MAX_HISTORY_COUNT,
      Math.max(MIN_MAX_HISTORY_COUNT, Math.floor(formMaxHistoryCount || DEFAULT_MAX_HISTORY_COUNT)),
    );

    const result = saveConfig(
      {
        id: editingId || undefined,
        name: trimmedName,
        items: cleanItems,
        showLabel: formShowLabel,
        showProbability: formShowProbability,
        showHistory: formShowHistory,
        showLimit: formShowLimit,
        maxHistoryCount: safeMaxHistory,
      },
      shouldSetActive,
    );

    setConfigs(result.configs);
    if (shouldSetActive) {
      setActiveId(result.savedConfig.id);
    }
    showNotification(
      editingId ? `「${trimmedName}」を更新しました` : `「${trimmedName}」を作成しました`,
    );
    handleBackToList();
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-[family-name:var(--font-geist-sans)] transition-colors">
      {/* Header */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 -ml-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-sm font-medium"
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <title>戻る</title>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>くじ引きに戻る</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <h1 className="text-base font-bold bg-gradient-to-r from-indigo-600 to-amber-500 bg-clip-text text-transparent">
              確率設定管理
            </h1>
          </div>

          {viewMode === "list" && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-sm transition-all"
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <title>新規作成</title>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>新規作成</span>
            </button>
          )}
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-medium rounded-full shadow-lg border border-slate-700 dark:border-slate-300 animate-bounce">
          {notification}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {/* ===================== 一覧画面 (List View) ===================== */}
        {viewMode === "list" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  保存済みのくじ設定一覧
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  くじ引きで使用する設定を選択・編集・追加できます
                </p>
              </div>
            </div>

            {/* Config List */}
            <div className="flex flex-col gap-4">
              {configs.map((config) => {
                const isActive = config.id === activeId;
                const totalCfgRatio = config.items.reduce(
                  (acc, cur) => acc + Math.max(1, cur.ratio || 1),
                  0,
                );

                return (
                  <div
                    key={config.id}
                    className={`rounded-2xl p-5 border transition-all ${
                      isActive
                        ? "bg-white dark:bg-slate-900 border-indigo-500 dark:border-indigo-400 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/20"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                    }`}
                  >
                    {/* Card Top */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {config.name}
                          </h3>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                              現在使用中
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 dark:text-slate-500 mt-1">
                          <span>
                            項目数: {config.items.length}件 / 比重合計: {totalCfgRatio}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            凡例:
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                config.showLabel !== false
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {config.showLabel !== false ? "ラベル表示" : "ラベル非表示"}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                config.showProbability !== false
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {config.showProbability !== false ? "確率表示" : "確率非表示"}
                            </span>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1.5">
                            履歴:
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                config.showHistory !== false
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {config.showHistory !== false ? "表示" : "非表示"}
                              {` (最大${config.maxHistoryCount ?? DEFAULT_MAX_HISTORY_COUNT}件 / 保存${getHistoryCount(config.id)}件)`}
                            </span>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1.5">
                            上限:
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                config.showLimit !== false
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {config.showLimit !== false ? "表示" : "非表示"}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Top Action */}
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleSetActive(config.id)}
                          className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
                        >
                          この設定を使う
                        </button>
                      )}
                    </div>

                    {/* Probability Distribution Bar */}
                    <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 mb-4">
                      {config.items.map((item, idx) => {
                        const pct = getPercentage(item.ratio, config.items);
                        return (
                          <div
                            key={item.id || idx}
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                item.color || PRESET_COLORS[idx % PRESET_COLORS.length],
                            }}
                            title={`${item.label}: ${item.ratio} (${pct}%)`}
                            className="h-full transition-all hover:opacity-80"
                          />
                        );
                      })}
                    </div>

                    {/* Items chips */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {config.items.map((item, idx) => {
                        const pct = getPercentage(item.ratio, config.items);
                        const hitCounts = getStoredHitCounts(config.id);
                        const hits = hitCounts[item.id] || 0;
                        const isLimited =
                          item.limit !== undefined && item.limit !== null && item.limit > 0;
                        const isReached = isLimited && hits >= (item.limit as number);

                        return (
                          <div
                            key={item.id || idx}
                            className={`flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-lg border transition-colors ${
                              isReached
                                ? "bg-slate-100/60 dark:bg-slate-800/30 border-rose-200 dark:border-rose-900/50 text-slate-400 opacity-70"
                                : "bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800"
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  item.color || PRESET_COLORS[idx % PRESET_COLORS.length],
                              }}
                            />
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {item.label}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                              比重{item.ratio} ({pct}%)
                            </span>
                            {isLimited && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                  isReached
                                    ? "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400"
                                    : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                                }`}
                              >
                                {isReached ? "上限到達" : `上限: ${hits}/${item.limit}`}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleResetConfigHistory(config)}
                        className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-1"
                        title="抽選履歴をリセット"
                      >
                        <svg
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <title>履歴リセット</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span>履歴リセット</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(config)}
                        className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                      >
                        <svg
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <title>編集</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span>編集</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(config.id)}
                        className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                      >
                        <svg
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <title>複製</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <span>複製</span>
                      </button>

                      {configs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDelete(config)}
                          className="px-2.5 py-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1"
                        >
                          <svg
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <title>削除</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          <span>削除</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer options */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>設定はブラウザのLocalStorageに保存されます</span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-slate-500 hover:text-rose-500 transition-colors underline underline-offset-2"
              >
                初期プリセットに戻す
              </button>
            </div>
          </div>
        )}

        {/* ===================== 新規作成・編集画面 (Create / Edit View) ===================== */}
        {(viewMode === "create" || viewMode === "edit") && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {viewMode === "create" ? "新規確率設定の作成" : "確率設定の編集"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  項目名と比重（正の整数）を設定するとリアルタイムに確率が算出されます
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackToList}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                キャンセル
              </button>
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6">
              {/* Preset Name */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="config-name-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  設定名 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="config-name-input"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: ランチ決めくじ、3択ルーレット"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Display & History Options Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  表示・履歴オプション
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formShowLabel}
                      onChange={(e) => setFormShowLabel(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      凡例にラベルを表示
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formShowProbability}
                      onChange={(e) => setFormShowProbability(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      凡例に確率を表示
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formShowLimit}
                      onChange={(e) => setFormShowLimit(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      凡例に上限を表示
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formShowHistory}
                      onChange={(e) => setFormShowHistory(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      抽選履歴を表示
                    </span>
                  </label>
                </div>

                {/* Max History Count Stepper & Reset in Edit Mode */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="max-history-input"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0"
                    >
                      最大履歴保存件数 (1〜500件):
                    </label>
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setFormMaxHistoryCount((prev) =>
                            Math.max(MIN_MAX_HISTORY_COUNT, prev - 5),
                          )
                        }
                        disabled={formMaxHistoryCount <= MIN_MAX_HISTORY_COUNT}
                        className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none font-bold text-sm"
                        title="5件減らす"
                      >
                        -
                      </button>
                      <input
                        id="max-history-input"
                        type="number"
                        min={MIN_MAX_HISTORY_COUNT}
                        max={MAX_MAX_HISTORY_COUNT}
                        step="1"
                        value={formMaxHistoryCount}
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value, 10);
                          setFormMaxHistoryCount(
                            Number.isNaN(val) ? DEFAULT_MAX_HISTORY_COUNT : val,
                          );
                        }}
                        className="w-14 text-center text-xs font-semibold bg-transparent focus:outline-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormMaxHistoryCount((prev) =>
                            Math.min(MAX_MAX_HISTORY_COUNT, prev + 5),
                          )
                        }
                        disabled={formMaxHistoryCount >= MAX_MAX_HISTORY_COUNT}
                        className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none font-bold text-sm"
                        title="5件増やす"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-slate-400">件</span>
                  </div>

                  {/* Reset History Button in Edit Mode */}
                  {viewMode === "edit" && editingId && (
                    <button
                      type="button"
                      onClick={() =>
                        handleResetConfigHistory({
                          id: editingId,
                          name: formName || "この設定",
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition-colors self-start sm:self-auto"
                    >
                      <svg
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <title>履歴リセット</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>この設定の履歴・当選数をリセット ({getHistoryCount(editingId)}件)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    項目と比重・上限の設定 <span className="text-rose-500">*</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition-colors"
                  >
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <title>項目追加</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>項目を追加</span>
                  </button>
                </div>

                {/* Items Editor List */}
                <div className="flex flex-col gap-2.5">
                  {formItems.map((item, index) => {
                    const pct = getPercentage(item.ratio, formItems);
                    const isPickerOpen = activeColorPickerIndex === index;

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 relative"
                      >
                        {/* Left: Color button + Label */}
                        <div className="flex items-center gap-2 flex-1">
                          {/* Color Picker Toggle Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveColorPickerIndex(isPickerOpen ? null : index)}
                              className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-transform hover:scale-105 shrink-0 shadow-inner"
                              style={{ backgroundColor: item.color }}
                              title="カラーを選択"
                            >
                              <span className="sr-only">カラー変更</span>
                            </button>

                            {/* Color Palette Popover */}
                            {isPickerOpen && (
                              <div className="absolute top-9 left-0 z-30 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 grid grid-cols-5 gap-1.5 w-40">
                                {PRESET_COLORS.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => handleItemColorChange(index, c)}
                                    className={`w-6 h-6 rounded-md transition-transform hover:scale-110 ${
                                      item.color === c
                                        ? "ring-2 ring-indigo-600 ring-offset-1 dark:ring-offset-slate-800"
                                        : ""
                                    }`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Label input */}
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => handleItemLabelChange(index, e.target.value)}
                            placeholder={`項目名 ${index + 1}`}
                            className="flex-1 min-w-[100px] px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Right: Ratio Stepper + Limit Input + Calculated Percentage + Delete */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 flex-wrap">
                          {/* Ratio Stepper */}
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400 shrink-0">比重:</span>
                            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleRatioStep(index, -1)}
                                disabled={item.ratio <= 1}
                                className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none font-bold text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={item.ratio}
                                onChange={(e) =>
                                  handleItemRatioChange(index, Number.parseInt(e.target.value) || 1)
                                }
                                className="w-10 text-center text-xs font-semibold bg-transparent focus:outline-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleRatioStep(index, 1)}
                                className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Limit Input */}
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400 shrink-0">上限:</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              placeholder="無制限"
                              value={item.limit ?? ""}
                              onChange={(e) => handleItemLimitChange(index, e.target.value)}
                              className="w-16 text-center text-xs font-semibold px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-slate-400 placeholder:font-normal"
                              title="空欄で無制限、1以上の整数で当選上限数を指定"
                            />
                          </div>

                          {/* Real-time Percentage Badge */}
                          <div className="w-14 text-right font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                            {pct}%
                          </div>

                          {/* Delete Item Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={formItems.length <= 2}
                            className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                            title={formItems.length <= 2 ? "最低2項目必要です" : "項目を削除"}
                          >
                            <svg
                              aria-hidden="true"
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <title>削除</title>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Probability Preview Bar */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span>リアルタイム確率分布プレビュー</span>
                  <span>比重合計: {totalRatio}</span>
                </div>

                <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700">
                  {formItems.map((item, idx) => {
                    const pct = getPercentage(item.ratio, formItems);
                    return (
                      <div
                        key={item.id || idx}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: item.color,
                        }}
                        title={`${item.label}: ${pct}%`}
                        className="h-full transition-all"
                      />
                    );
                  })}
                </div>
              </div>

              {/* Error Alert */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveForm(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  保存する
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveForm(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-md shadow-indigo-500/20 transition-all"
                >
                  保存して今すぐ使う
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-400 dark:text-slate-600">
        Simple Lottery &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
