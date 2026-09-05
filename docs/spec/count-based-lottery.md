# くじの種類「個数指定くじ」 仕様書

本仕様書は、Simple Lottery に追加する **くじ引きの種類（抽選方式 / `drawMode`）** と、
そのうちの新方式である **「個数指定くじ」（すべての項目に当たり個数を設定するタイプ）** の
機能設計、データ構造、UI/UX 要件、実装方針を定義します。

---

## 1. 概要と目的

これまでのくじ引きは、各項目に設定した **比重（`ratio`）** による確率抽選（引いても中身が減らない＝復元抽出）のみでした。
本機能では、くじ引きの種類として **「個数指定くじ」** を追加します。

「個数指定くじ」は、箱の中に入っている各当たりの **個数（本数）** をすべての項目に対して設定し、
1 回引くごとにその項目が 1 本ずつ減っていく **非復元抽出（引いたら減るくじ）** です。
総本数（全項目の個数の合計）だけ引くと、くじはすべて引き切られて終了します。

| くじの種類 (`drawMode`) | 表示名 | 抽選の重み | 引いた後 | 終了条件 |
| :--- | :--- | :--- | :--- | :--- |
| `probability`（既定） | 確率指定くじ | 比重 `ratio` | 減らない（当選上限 `limit` の到達判定のみ） | すべての項目が上限到達 |
| `count`（新規） | 個数指定くじ | 残り個数 `count - 当選数` | 残り個数が 1 減る | 残り本数が 0（引き切り） |

---

## 2. 確定仕様一覧

1. **くじの種類**: `LotteryConfig.drawMode` に `"probability" | "count"` を追加。未設定（既存データ）は `"probability"` として扱う（後方互換）。
2. **当たり個数**: 各項目（`LotteryItem`）に `count?: number`（1 以上の整数、未設定時は 1）を追加。`drawMode === "count"` のときのみ使用する。
3. **抽選確率**: 個数指定くじの抽選確率は「その項目の残り個数 ÷ 全項目の残り本数」。1 回引くごとに残り個数が減るため、確率は動的に変化する。
4. **抽選対象**: 残り個数が 0 になった項目は抽選対象から除外（アニメーション演出・ルーレットの扇形からも除外）。
5. **引き切り時の挙動**: 残り本数が 0 になるとくじ引きボタンを非活性化し、「すべてのくじを引き切りました」と表示してリセットを案内する。
6. **当選数の管理**: 既存の当選回数（`hitCounts`）をそのまま流用する。したがって「履歴・当選数リセット」で残り個数も初期状態に戻る。
7. **`limit`（当選上限）との関係**: 個数指定くじでは `count` が実質的な上限として機能するため `limit` は使用しない（保存値は保持するが判定には用いない）。
8. **設定画面**: 「くじの種類」を選択する UI（確率指定 / 個数指定）を追加し、選択に応じて項目行の入力欄を「比重・上限」／「個数」に切り替える。
9. **プリセット**: 初期プリセットに個数指定くじの例（`preset-box`「箱くじ (個数指定・10本)」）を追加する。

---

## 3. データ構造

### 3.1 くじ項目 (`LotteryItem`)
```typescript
export interface LotteryItem {
  id: string;
  label: string;
  ratio: number;
  color?: string;
  limit?: number; // 当選上限数（確率指定くじでのみ使用）
  count?: number; // 当たり個数 (1以上の整数。個数指定くじでのみ使用。未設定時は1) [NEW]
}
```

### 3.2 くじ設定 (`LotteryConfig`)
```typescript
export type LotteryDrawMode = "probability" | "count"; // [NEW]

export interface LotteryConfig {
  id: string;
  name: string;
  items: LotteryItem[];
  drawMode?: LotteryDrawMode;          // デフォルト: "probability" [NEW]
  animationType?: LotteryAnimationType; // "card" | "wheel"
  showLabel?: boolean;
  showProbability?: boolean;
  showHistory?: boolean;
  showLimit?: boolean;
  maxHistoryCount?: number;
  createdAt: number;
  updatedAt: number;
}
```

---

## 4. ロジック設計 (`src/lib/lottery.ts`)

- **`getItemCount(item): number`**: 項目の当たり個数（未設定・不正値は 1、負値は 0 に丸め）。
- **`getRemainingCount(item, hitCounts): number`**: `getItemCount(item) - 当選数`（下限 0）。
- **`getTotalItemCount(items): number`** / **`getTotalRemainingCount(items, hitCounts): number`**: 総本数・残り本数。
- **`getAvailableLotteryItems(items, hitCounts, drawMode = "probability")`**:
  - `"probability"`: 従来どおり `limit` 到達項目を除外。
  - `"count"`: 残り個数が 0 の項目を除外。
- **`isAllLimitsReached(items, hitCounts, drawMode = "probability")`**: 抽選可能な項目が 0 件なら `true`（個数指定くじでは「引き切り」を意味する）。
- **`getDrawTable(items, hitCounts, drawMode = "probability"): LotteryItem[]`**:
  - 抽選・確率表示・ルーレット描画に使う重み付きテーブルを返す。
  - `"count"` の場合は、抽選可能な項目の `ratio` を **残り個数** に置き換えたテーブルを返す。
  - `"probability"` の場合は `getAvailableLotteryItems` と同じ結果を返す。
- **`chooseLottery(table, randomFn)`**: 変更なし。`getDrawTable` の戻り値を渡すことで、両方式に対応する。
  - 呼び出し側は、選出結果の `id` から元の項目（`config.items`）を引き直して履歴・当選数に記録する。

いずれの関数も第 3 引数を省略した場合は従来の確率指定くじとして動作するため、既存の呼び出しとの後方互換性を保つ。

---

## 5. Storage 設計 (`src/lib/storage.ts`)

- `saveConfig()`: `drawMode`（未指定時は `"probability"`）を保存対象に追加。項目の `count` は `items` としてそのまま永続化。
- `duplicateConfig()`: `drawMode` および項目の `count` を引き継ぐ（当選数・履歴は 0 から）。
- 当選数（`hitCounts`）・履歴の保存構造そのものは変更しない。

---

## 6. UI / 画面仕様

### 6.1 設定画面 (`/settings`)

1. **新規作成 / 編集フォーム**:
   - 「くじの種類」セクション（カード型 2 択）を追加。
     - 🎯 確率指定くじ: 比重で確率を決める。引いても減らない。
     - 📦 個数指定くじ: 各項目の当たり個数を設定。引くと減り、総本数で引き切る。
   - 個数指定くじ選択時、項目行の「比重」「上限」入力を **「個数」ステッパー** に切り替える。
   - リアルタイムプレビューは、残り本数ではなく設定個数に基づく初期確率（`個数 / 総本数`）と総本数を表示。
   - バリデーション: 個数は 1 以上の整数。総本数が 1 以上であること。
2. **設定一覧画面**:
   - 各設定カードに「種類: 🎯 確率指定 / 📦 個数指定」バッジを表示。
   - 個数指定くじのカードでは、比重合計の代わりに「総本数」を表示し、項目チップに `残り n/N 個` を表示する。

### 6.2 メインくじ引き画面 (`/`)

1. ヘッダーのくじ選択ドロップダウンでは、個数指定くじに 📦 アイコンを付与する。
2. 抽選は `getDrawTable(...)` の結果（残り個数を重みとしたテーブル）に対して実行し、確定時に当選数を +1 する。
3. 凡例カードでは、個数指定くじの場合に以下を表示する。
   - 見出しに残り本数（例: `残り 7/10 本`）。
   - 各項目の `残り n/N 個` と現在の確率（残り個数ベース）。
   - 残り 0 の項目は「引き切り」バッジ + グレーアウト。
4. 引き切り時はボタンを非活性化し、ラベルを「すべて引き切りました」に変更してリセットを案内する。

---

## 7. テスト・品質保証

- `src/lib/__tests__/lottery.test.ts`: 個数の正規化、残り個数計算、抽選対象の除外、引き切り判定、残り個数重みの抽選テーブル。
- `src/lib/__tests__/storage.test.ts`: `drawMode` と `count` の保存・更新・複製・デフォルト値の後方互換。
- `pnpm lint`（biome）、`pnpm test`（vitest）、`pnpm build` による検証。
