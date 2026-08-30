"use client";

import {
  DEFAULT_PROBABILITY_TABLE,
  type LotteryItem,
  chooseLottery,
  getPercentage,
} from "@/lib/lottery";
import { useCallback, useState } from "react";

interface DrawHistoryItem {
  timestamp: string;
  result: LotteryItem;
}

export default function Home() {
  const [table] = useState<LotteryItem[]>(DEFAULT_PROBABILITY_TABLE);
  const [currentResult, setCurrentResult] = useState<LotteryItem | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<DrawHistoryItem[]>([]);

  const handleDraw = useCallback(() => {
    if (isDrawing) return;
    setIsDrawing(true);

    // 小さなルーレット風演出
    let count = 0;
    const interval = setInterval(() => {
      const tempIndex = Math.floor(Math.random() * table.length);
      setCurrentResult(table[tempIndex]);
      count++;
      if (count > 8) {
        clearInterval(interval);
        const finalResult = chooseLottery(table);
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
  }, [table, isDrawing]);

  const handleResetHistory = () => {
    setHistory([]);
    setCurrentResult(null);
  };

  const winCount = history.filter((h) => h.result.id === "win").length;
  const winRate = history.length > 0 ? Math.round((winCount / history.length) * 100) : 0;

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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col items-center gap-8">
        {/* Lottery Card */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-6">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            ボタンを押してくじを引いてください
          </div>

          {/* Result Display Box */}
          <div
            className={`w-full max-w-sm h-48 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
              currentResult?.id === "win"
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 shadow-lg shadow-amber-200/50 dark:shadow-none"
                : currentResult?.id === "lose"
                  ? "bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700"
                  : "bg-slate-50 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700"
            }`}
          >
            {currentResult ? (
              <div
                className={`text-6xl font-black tracking-wider transition-transform duration-150 ${
                  isDrawing ? "scale-90 opacity-70" : "scale-100 opacity-100"
                } ${
                  currentResult.id === "win"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-600 dark:text-slate-300"
                }`}
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
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            確率設定
          </h2>
          <div className="flex flex-col gap-2">
            {table.map((item) => (
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
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  {getPercentage(item.ratio, table)}%
                </span>
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

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                <div className="text-xs text-slate-500 dark:text-slate-400">総回数</div>
                <div className="text-base font-bold">{history.length}回</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                <div className="text-xs text-slate-500 dark:text-slate-400">当たり</div>
                <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {winCount}回
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                <div className="text-xs text-slate-500 dark:text-slate-400">当選率</div>
                <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                  {winRate}%
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {history.map((h, index) => (
                <div
                  key={`${h.timestamp}-${index}`}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                    h.result.id === "win"
                      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {h.result.label}
                  <span className="ml-1.5 opacity-60 text-[10px]">{h.timestamp}</span>
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
