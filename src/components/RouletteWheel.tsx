"use client";

import type { LotteryItem } from "@/lib/lottery";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface RouletteWheelProps {
  items: LotteryItem[];
  isSpinning: boolean;
  targetResult: LotteryItem | null;
  onSpinEnd: () => void;
  className?: string;
}

interface SliceInfo {
  item: LotteryItem;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  color: string;
}

export function RouletteWheel({
  items,
  isSpinning,
  targetResult,
  onSpinEnd,
  className = "",
}: RouletteWheelProps) {
  const [rotation, setRotation] = useState<number>(0);
  const [activeItem, setActiveItem] = useState<LotteryItem | null>(null);
  const isSpinningProcessedRef = useRef(false);

  const cx = 160;
  const cy = 160;
  const radius = 142;

  // 比重合計の算出
  const totalRatio = useMemo(() => {
    return items.reduce((sum, item) => sum + Math.max(1, item.ratio || 1), 0);
  }, [items]);

  // 各スライスの角度計算 (12時方向を0度として時計回りに配置)
  const slices: SliceInfo[] = useMemo(() => {
    if (items.length === 0 || totalRatio <= 0) return [];
    let currentAngle = 0;
    return items.map((item, index) => {
      const angle = (Math.max(1, item.ratio || 1) / totalRatio) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      const midAngle = startAngle + angle / 2;
      currentAngle = endAngle;

      return {
        item,
        startAngle,
        endAngle,
        midAngle,
        color: item.color || `hsl(${(index * 360) / items.length}, 70%, 50%)`,
      };
    });
  }, [items, totalRatio]);

  // スピン開始時の回転角計算（isSpinningがtrueになった瞬間に1度だけ実行）
  useEffect(() => {
    if (isSpinning && targetResult) {
      if (isSpinningProcessedRef.current) return;
      isSpinningProcessedRef.current = true;

      const targetSlice = slices.find((s) => s.item.id === targetResult.id) || slices[0];
      if (!targetSlice) return;

      const sliceWidth = targetSlice.endAngle - targetSlice.startAngle;
      // 扇形の中央から±35%の範囲でランダムに揺らぎを付加
      const jitter = (Math.random() - 0.5) * 0.7 * sliceWidth;
      const targetAngle = targetSlice.midAngle + jitter;

      setRotation((prevRotation) => {
        // 12時（0度）位置に合わせるための時計回り角度
        const targetNormalized = (360 - (targetAngle % 360)) % 360;
        const currentMod = prevRotation % 360;
        let delta = (targetNormalized - currentMod) % 360;
        if (delta < 0) delta += 360;

        // 5〜7回転（1800〜2520度）を追加
        const extraSpins = 360 * (5 + Math.floor(Math.random() * 3));
        return prevRotation + extraSpins + delta;
      });

      setActiveItem(null);
    } else if (!isSpinning) {
      isSpinningProcessedRef.current = false;
    }
  }, [isSpinning, targetResult, slices]);

  const handleTransitionEnd = () => {
    if (isSpinning) {
      setActiveItem(targetResult);
      onSpinEnd();
    }
  };

  // 扇形パスの生成 (12時方向0度基準)
  const createSlicePath = (startDeg: number, endDeg: number): string => {
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;

    const x1 = cx + radius * Math.sin(startRad);
    const y1 = cy - radius * Math.cos(startRad);
    const x2 = cx + radius * Math.sin(endRad);
    const y2 = cy - radius * Math.cos(endRad);

    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 上部ポインター（針 ▼） */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-md">
        <svg width="34" height="38" viewBox="0 0 34 38" fill="none" aria-hidden="true">
          <path
            d="M17 38L3.14 8.75C1.8 5.92 3.86 2.5 7 2.5H27C30.14 2.5 32.2 5.92 30.86 8.75L17 38Z"
            fill="#e11d48"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="17" cy="11" r="3.5" fill="#ffffff" />
        </svg>
      </div>

      {/* ルーレット本体コンテナ */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full p-2 bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900 shadow-xl border-4 border-slate-300 dark:border-slate-700 flex items-center justify-center">
        {/* 回転するSVG円盤 */}
        <div
          className="w-full h-full rounded-full overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? "transform 3.6s cubic-bezier(0.12, 0.8, 0.3, 1)" : "none",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          <svg
            viewBox="0 0 320 320"
            className="w-full h-full"
            role="img"
            aria-label="円盤ルーレット"
          >
            <title>円盤ルーレット</title>
            <defs>
              <filter id="roulette-shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* スライス描画 */}
            {slices.length === 1 ? (
              <circle cx={cx} cy={cy} r={radius} fill={slices[0].color} />
            ) : (
              slices.map((slice) => (
                <path
                  key={slice.item.id}
                  d={createSlicePath(slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-colors"
                />
              ))
            )}

            {/* 各スライスのテキストラベル */}
            {slices.map((slice) => {
              const textRad = (slice.midAngle * Math.PI) / 180;
              // 半径の約62%の位置に文字を配置
              const textDist = radius * 0.62;
              const tx = cx + textDist * Math.sin(textRad);
              const ty = cy - textDist * Math.cos(textRad);

              // 扇形の幅に応じたフォントサイズ調整
              const sliceAngle = slice.endAngle - slice.startAngle;
              const fontSize =
                sliceAngle < 25
                  ? "10px"
                  : sliceAngle < 45
                    ? "12px"
                    : sliceAngle < 90
                      ? "14px"
                      : "15px";

              // テキストの回転角: 放射状に読めるよう調整
              const textRotate = slice.midAngle + 90;

              // 長いテキストの切り詰め
              const maxChars = sliceAngle < 35 ? 4 : sliceAngle < 60 ? 6 : 9;
              const displayLabel =
                slice.item.label.length > maxChars
                  ? `${slice.item.label.slice(0, maxChars)}…`
                  : slice.item.label;

              return (
                <g key={`text-${slice.item.id}`} transform={`translate(${tx}, ${ty})`}>
                  <text
                    transform={`rotate(${textRotate})`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize={fontSize}
                    fontWeight="bold"
                    style={{
                      filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.8))",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                    }}
                  >
                    {displayLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* 中央の金属風ハブピン */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gradient-to-br from-white via-slate-200 to-slate-400 dark:from-slate-600 dark:via-slate-800 dark:to-slate-900 border-2 border-slate-300 dark:border-slate-600 shadow-lg flex items-center justify-center pointer-events-none z-10">
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-slate-400 to-white dark:from-slate-700 dark:to-slate-500 shadow-inner" />
        </div>
      </div>

      {/* 当選結果バッジ（停止時に表示） */}
      {activeItem && !isSpinning && (
        <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-sm font-bold shadow-lg animate-bounce flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: activeItem.color }}
          />
          <span>{activeItem.label}</span>
        </div>
      )}
    </div>
  );
}
