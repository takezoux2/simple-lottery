"use client";

import { Footer } from "@/components/Footer";
import { RouletteWheel } from "@/components/RouletteWheel";
import {
  DEFAULT_CONFIGS,
  type LotteryConfig,
  type LotteryItem,
  chooseLottery,
  getAvailableLotteryItems,
  getPercentage,
  isAllLimitsReached,
} from "@/lib/lottery";
import {
  type DrawHistoryItem,
  addHistoryItem,
  clearHistory,
  getActiveConfig,
  getStoredConfigs,
  getStoredHistory,
  getStoredHitCounts,
  incrementHitCount,
  setActiveConfigId,
} from "@/lib/storage";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

function HomeContent() {
  const searchParams = useSearchParams();
  const [configs, setConfigs] = useState<LotteryConfig[]>(DEFAULT_CONFIGS);
  const [activeConfig, setActiveConfig] = useState<LotteryConfig>(DEFAULT_CONFIGS[0]);
  const [currentResult, setCurrentResult] = useState<LotteryItem | null>(null);
  const [targetWheelResult, setTargetWheelResult] = useState<LotteryItem | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<DrawHistoryItem[]>([]);
  const [hitCounts, setHitCounts] = useState<Record<string, number>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // アンマウント時のタイマークリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // LocalStorageおよびURLパラメータから設定・履歴・当選数をロード
  useEffect(() => {
    const loadedConfigs = getStoredConfigs();
    setConfigs(loadedConfigs);

    const queryId = searchParams.get("id");
    let targetConfig: LotteryConfig | undefined;

    if (queryId) {
      targetConfig = loadedConfigs.find((c) => c.id === queryId);
    }

    if (!targetConfig) {
      targetConfig = getActiveConfig();
    }

    if (targetConfig) {
      setActiveConfigId(targetConfig.id);
      setActiveConfig(targetConfig);
      setHistory(getStoredHistory(targetConfig.id));
      setHitCounts(getStoredHitCounts(targetConfig.id));

      // URLパラメータの同期
      if (typeof window !== "undefined") {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get("id") !== targetConfig.id) {
          currentUrl.searchParams.set("id", targetConfig.id);
          window.history.replaceState(null, "", currentUrl.toString());
        }
      }
    }
  }, [searchParams]);

  // 設定の切り替え
  const handleSelectConfig = (id: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsDrawing(false);
    setActiveConfigId(id);
    const target = configs.find((c) => c.id === id);
    if (target) {
      setActiveConfig(target);
      setCurrentResult(null);
      setTargetWheelResult(null);
      setHistory(getStoredHistory(target.id));
      setHitCounts(getStoredHitCounts(target.id));

      // URLクエリパラメータを更新
      if (typeof window !== "undefined") {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set("id", target.id);
        window.history.replaceState(null, "", currentUrl.toString());
      }
    }
  };

  // 有効な抽選対象項目（上限未到達の項目）
  const availableItems = useMemo(() => {
    return getAvailableLotteryItems(activeConfig.items, hitCounts);
  }, [activeConfig.items, hitCounts]);

  const allLimitsReached = useMemo(() => {
    return isAllLimitsReached(activeConfig.items, hitCounts);
  }, [activeConfig.items, hitCounts]);

  // ルーレット停止時のハンドラー
  const handleWheelSpinEnd = useCallback(() => {
    if (targetWheelResult) {
      setCurrentResult(targetWheelResult);
      const updatedHistory = addHistoryItem(
        activeConfig.id,
        targetWheelResult,
        activeConfig.maxHistoryCount ?? 20,
      );
      const updatedHitCounts = incrementHitCount(activeConfig.id, targetWheelResult.id);
      setHitCounts(updatedHitCounts);
      setHistory(updatedHistory);
      setIsDrawing(false);
    }
  }, [activeConfig, targetWheelResult]);

  // くじ引き実行
  const handleDraw = useCallback(() => {
    const currentAvailable = getAvailableLotteryItems(activeConfig.items, hitCounts);
    if (isDrawing || currentAvailable.length === 0) return;

    if (activeConfig.animationType === "wheel") {
      // 円盤ルーレット演出
      const finalResult = chooseLottery(currentAvailable);
      setTargetWheelResult(finalResult);
      setCurrentResult(null);
      setIsDrawing(true);
    } else {
      // フラッシュカード演出（3秒間、徐々に表示時間を伸ばすイージング減速演出）
      setIsDrawing(true);
      const finalResult = chooseLottery(currentAvailable);
      const TOTAL_DURATION = 3000;
      const MIN_DELAY = 50;
      const MAX_DELAY = 450;
      const startTime = performance.now();
      let lastIndex = -1;

      const step = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / TOTAL_DURATION);

        if (progress >= 1) {
          // 3秒経過: 最終結果を表示して確定
          setCurrentResult(finalResult);
          const updatedHistory = addHistoryItem(
            activeConfig.id,
            finalResult,
            activeConfig.maxHistoryCount ?? 20,
          );
          const updatedHitCounts = incrementHitCount(activeConfig.id, finalResult.id);
          setHitCounts(updatedHitCounts);
          setHistory(updatedHistory);
          setIsDrawing(false);
          timerRef.current = null;
          return;
        }

        // 次の表示項目を選択（2つ以上ある場合は直前と重複しないようにする）
        let nextIndex = Math.floor(Math.random() * currentAvailable.length);
        if (currentAvailable.length > 1 && nextIndex === lastIndex) {
          nextIndex =
            (nextIndex + 1 + Math.floor(Math.random() * (currentAvailable.length - 1))) %
            currentAvailable.length;
        }
        lastIndex = nextIndex;
        setCurrentResult(currentAvailable[nextIndex]);

        // 徐々に遅延を長くして減速感を演出 (progress^1.8)
        const currentDelay = MIN_DELAY + (MAX_DELAY - MIN_DELAY) * progress ** 1.8;
        timerRef.current = setTimeout(step, currentDelay);
      };

      step();
    }
  }, [activeConfig, hitCounts, isDrawing]);

  const handleResetHistory = () => {
    if (
      !window.confirm(`「${activeConfig.name}」の抽選履歴・当選数をリセットしてもよろしいですか？`)
    ) {
      return;
    }
    clearHistory(activeConfig.id);
    setHistory([]);
    setHitCounts({});
    setCurrentResult(null);
    setTargetWheelResult(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-[family-name:var(--font-geist-sans)] transition-colors">
      {/* Header */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-amber-500 bg-clip-text text-transparent truncate">
              Simple Lottery
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 抽選種類ドロップダウン */}
            <div className="relative">
              <select
                aria-label="抽選種類の選択"
                value={activeConfig.id}
                onChange={(e) => handleSelectConfig(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[140px] sm:max-w-[200px] truncate transition-colors"
              >
                {configs.map((cfg) => (
                  <option key={cfg.id} value={cfg.id}>
                    {cfg.animationType === "wheel" ? "🎡 " : "🎴 "}
                    {cfg.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
                <svg
                  aria-hidden="true"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 transition-all shrink-0"
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col items-center gap-6">
        {/* Lottery Main Card */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-6">
          {/* Animation View: Wheel vs Flashcard */}
          {activeConfig.animationType === "wheel" ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <RouletteWheel
                items={availableItems}
                isSpinning={isDrawing}
                targetResult={targetWheelResult}
                onSpinEnd={handleWheelSpinEnd}
              />

              {/* Result Banner under Roulette */}
              {currentResult && !isDrawing && (
                <div
                  className="w-full max-w-sm py-4 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 shadow-md transition-all animate-fade-in flex flex-col items-center gap-1"
                  style={{ borderColor: currentResult.color || "#6366f1" }}
                >
                  <span className="text-xs font-semibold text-slate-400">当選結果</span>
                  <div
                    className="text-4xl sm:text-5xl font-black tracking-wider"
                    style={{ color: currentResult.color || "inherit" }}
                  >
                    {currentResult.label}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Result Display Box (Flashcard) */
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
          )}

          {/* Action Button & All Limits Reached Alert */}
          <div className="w-full max-w-xs flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleDraw}
              disabled={isDrawing || allLimitsReached}
              className="w-full py-4 px-8 rounded-2xl font-bold text-lg text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-indigo-500/20 transition-all duration-150"
            >
              {allLimitsReached
                ? "すべての上限に達しました"
                : isDrawing
                  ? activeConfig.animationType === "wheel"
                    ? "ルーレット回転中..."
                    : "抽選中..."
                  : activeConfig.animationType === "wheel"
                    ? "ルーレットを回す"
                    : "くじを引く"}
            </button>

            {allLimitsReached && (
              <div className="w-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-center flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  すべてのくじが上限に達しました
                </span>
                <button
                  type="button"
                  onClick={handleResetHistory}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-all"
                >
                  履歴・当選数をリセットして再開
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Probability Table Card */}
        {(activeConfig.showLabel !== false || activeConfig.showProbability !== false) && (
          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {activeConfig.showProbability !== false
                  ? `確率内訳 (${activeConfig.name})`
                  : `項目一覧 (${activeConfig.name})`}
              </h2>
              <Link
                href="/settings"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                設定を編集
              </Link>
            </div>

            {/* Mini preview bar (確率表示がONの場合のみ表示。有効項目のみで分布表示) */}
            {activeConfig.showProbability !== false && (
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 mb-3">
                {activeConfig.items.map((item, idx) => {
                  const isLimited =
                    item.limit !== undefined && item.limit !== null && item.limit > 0;
                  const currentHits = hitCounts[item.id] || 0;
                  const isReached = isLimited && currentHits >= (item.limit as number);
                  const pct = isReached ? 0 : getPercentage(item.ratio, availableItems);
                  if (pct <= 0) return null;

                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.color,
                      }}
                      className="h-full transition-all"
                    />
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {activeConfig.items.map((item) => {
                const isLimited = item.limit !== undefined && item.limit !== null && item.limit > 0;
                const currentHits = hitCounts[item.id] || 0;
                const isReached = isLimited && currentHits >= (item.limit as number);
                const pct = isReached ? 0 : getPercentage(item.ratio, availableItems);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between text-sm py-1.5 px-3 rounded-lg transition-colors ${
                      isReached
                        ? "bg-slate-100/60 dark:bg-slate-800/30 opacity-60 line-through text-slate-400"
                        : "bg-slate-50 dark:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color || "#6b7280" }}
                      />
                      {activeConfig.showLabel !== false && (
                        <span className="font-medium">{item.label}</span>
                      )}
                      {/* 上限到達バッジ */}
                      {isReached && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 no-underline inline-block">
                          上限到達
                        </span>
                      )}
                      {/* 上限表示 (showLimit !== false かつ 未到達の場合) */}
                      {!isReached && isLimited && activeConfig.showLimit !== false && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono no-underline">
                          (当選 {currentHits}/{item.limit}回)
                        </span>
                      )}
                    </div>

                    {activeConfig.showProbability !== false && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono no-underline">
                          比重: {item.ratio}
                        </span>
                        <span
                          className={`font-bold font-mono no-underline ${
                            isReached
                              ? "text-slate-400 dark:text-slate-600"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats & History */}
        {activeConfig.showHistory !== false && history.length > 0 && (
          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                抽選履歴（直近{activeConfig.maxHistoryCount ?? 20}回）
              </h2>
              <button
                type="button"
                onClick={handleResetHistory}
                className="text-xs text-slate-500 hover:text-rose-500 transition-colors"
              >
                履歴・当選数クリア
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
                  const isLimited =
                    item.limit !== undefined && item.limit !== null && item.limit > 0;
                  const currentHits = hitCounts[item.id] || 0;
                  const isReached = isLimited && currentHits >= (item.limit as number);

                  return (
                    <div
                      key={item.id}
                      className={`p-2 rounded-xl flex flex-col items-center transition-colors ${
                        isReached
                          ? "bg-slate-100/70 dark:bg-slate-800/30 opacity-70"
                          : "bg-slate-50 dark:bg-slate-800/50"
                      }`}
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
                      {isLimited && activeConfig.showLimit !== false && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {isReached ? (
                            <span className="text-rose-500 font-bold">上限到達</span>
                          ) : (
                            <span>
                              当選 {currentHits}/{item.limit}
                            </span>
                          )}
                        </div>
                      )}
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
      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
          読み込み中...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
