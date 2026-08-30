"use client";

import {
  DEFAULT_CONFIGS,
  type LotteryConfig,
  type LotteryItem,
  chooseLottery,
  getPercentage,
} from "@/lib/lottery";
import {
  getActiveConfig,
  getActiveConfigId,
  getStoredConfigs,
  setActiveConfigId,
} from "@/lib/storage";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface DrawHistoryItem {
  timestamp: string;
  result: LotteryItem;
}

export default function Home() {
  const [configs, setConfigs] = useState<LotteryConfig[]>(DEFAULT_CONFIGS);
  const [activeConfig, setActiveConfig] = useState<LotteryConfig>(DEFAULT_CONFIGS[0]);
  const [currentResult, setCurrentResult] = useState<LotteryItem | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<DrawHistoryItem[]>([]);

  // LocalStorageから設定をロード
  useEffect(() => {
    const loadedConfigs = getStoredConfigs();
    const currentActive = getActiveConfig();
    setConfigs(loadedConfigs);
    setActiveConfig(currentActive);
  }, []);

  // 設定の切り替え
  const handleSelectConfig = (id: string) => {
    setActiveConfigId(id);
    const target = configs.find((c) => c.id === id);
    if (target) {
      setActiveConfig(target);
      setCurrentResult(null);
    }
  };

  const handleDraw = useCallback(() => {
    if (isDrawing || !activeConfig.items || activeConfig.items.length === 0) return;
    setIsDrawing(true);

    const items = activeConfig.items;
    let count = 0;
    const interval = setInterval(() => {
      const tempIndex = Math.floor(Math.random() * items.length);
      setCurrentResult(items[tempIndex]);
      count++;
      if (count > 8) {
        clearInterval(interval);
        const finalResult = chooseLottery(items);
        setCurrentResult(finalResult);
        setHistory((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            result: finalResult,
          },
          ...prev.slice(0, 19),
        ]);
        setIsDrawing(false);
      }
    }, 60);
  }, [activeConfig, isDrawing]);

  const handleResetHistory = () => {
    setHistory([]);
    setCurrentResult(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-[family-name:var(--font-geist-sans)] transition-colors">
      {/* Header */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-amber-500 bg-clip-text text-transparent">
              Simple Lottery
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800">
              PWA / SSG
            </span>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 transition-all"
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
              <title>確率設定</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>確率設定</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col items-center gap-6">
        {/* Preset Switcher Bar */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 mr-1">
              設定:
            </span>
            {configs.map((cfg) => {
              const isSelected = cfg.id === activeConfig.id;
              return (
                <button
                  key={cfg.id}
                  type="button"
                  onClick={() => handleSelectConfig(cfg.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {cfg.name}
                </button>
              );
            })}
          </div>

          <Link
            href="/settings"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-1"
          >
            + 編集 / 新規
          </Link>
        </div>

        {/* Lottery Card */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {activeConfig.name}
            </span>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              ボタンを押してくじを引いてください
            </div>
          </div>

          {/* Result Display Box */}
          <div
            className={`w-full max-w-sm h-48 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
              currentResult
                ? "shadow-lg bg-slate-50 dark:bg-slate-800/50"
                : "bg-slate-50 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700"
            }`}
            style={{
              borderColor: currentResult?.color || undefined,
            }}
          >
            {currentResult ? (
              <div
                className={`text-5xl sm:text-6xl font-black tracking-wider transition-transform duration-150 ${
                  isDrawing ? "scale-90 opacity-70" : "scale-100 opacity-100"
                }`}
                style={{
                  color: currentResult.color || "inherit",
                }}
              >
                {currentResult.label}
              </div>
            ) : (
              <span className="text-6xl font-bold text-slate-300 dark:text-slate-600 select-none">
                ？
              </span>
            )}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleDraw}
            disabled={isDrawing}
            className="w-full max-w-xs py-4 px-8 rounded-2xl font-bold text-lg text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-indigo-500/20 transition-all duration-150"
          >
            {isDrawing ? "抽選中..." : "くじを引く"}
          </button>
        </div>

        {/* Probability Table Card */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              確率内訳 ({activeConfig.name})
            </h2>
            <Link
              href="/settings"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              設定を編集
            </Link>
          </div>

          {/* Mini preview bar */}
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 mb-3">
            {activeConfig.items.map((item, idx) => {
              const pct = getPercentage(item.ratio, activeConfig.items);
              return (
                <div
                  key={item.id || idx}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: item.color,
                  }}
                  className="h-full"
                />
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            {activeConfig.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color || "#6b7280" }}
                  />
                  <span className="font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                    比重: {item.ratio}
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                    {getPercentage(item.ratio, activeConfig.items)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats & History */}
        {history.length > 0 && (
          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                抽選履歴（直近20回）
              </h2>
              <button
                type="button"
                onClick={handleResetHistory}
                className="text-xs text-slate-500 hover:text-rose-500 transition-colors"
              >
                履歴クリア
              </button>
            </div>

            {/* Stats Summary Breakdown by Items */}
            <div className="mb-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                総回数:{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {history.length}回
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                {activeConfig.items.map((item) => {
                  const count = history.filter(
                    (h) => h.result.id === item.id || h.result.label === item.label,
                  ).length;
                  const rate = Math.round((count / history.length) * 100);
                  return (
                    <div
                      key={item.id}
                      className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl flex flex-col items-center"
                    >
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-full">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <div className="text-base font-bold mt-0.5">
                        {count}回
                        <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">
                          ({rate}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* History Badges */}
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pt-2 border-t border-slate-100 dark:border-slate-800">
              {history.map((h, index) => (
                <div
                  key={`${h.timestamp}-${index}`}
                  className="text-xs px-2.5 py-1 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: h.result.color }}
                  />
                  <span>{h.result.label}</span>
                  <span className="opacity-50 text-[10px]">{h.timestamp}</span>
                </div>
              ))}
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
