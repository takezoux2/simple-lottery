# 当たり（項目）の当選上限設定 仕様書

本仕様書は、Simple Lottery における「当たりの上限（当選上限数）設定」「上限表示フラグ（`showLimit`）」「上限到達時の抽選除外」「当選カウントの永続化とリセット」の機能設計、データ構造、UI/UX要件、および実装方針を定義します。

---

## 1. 概要と目的

くじ引きにおいて、特定の賞（「特賞 1本」「1等 3本」など）や各項目に**当選上限数（最大当選回数）**を設定できるようにします。
上限に達した項目は以降の抽選およびアニメーション演出から自動的に除外され、残りの項目のみで確率が再計算されて抽選が行われます。
また、くじ設定ごとに「凡例に上限を表示するかどうか (`showLimit`)」の表示オプションを提供します。
すべての項目が上限に達した場合は抽選が停止され、リセットの案内が表示されます。

---

## 2. 確定仕様一覧

1. **上限の設定単位**: 各項目（`LotteryItem`）ごとに個別に上限回数（`limit?: number`）を設定可能。未設定または0の場合は無制限。
2. **上限到達時の抽選・確率**: 上限に達した項目は抽選対象から除外（アニメーション演出含む）。残りの有効項目の比重合計から実効確率（%）を動的に再計算して表示。
3. **当選回数カウントの永続化とリセット**: LocalStorage に保存。既存の「履歴クリア」「履歴リセット」と連動し、リセット時に当選回数も0クリア。
4. **全項目上限到達時の挙動**: くじ引きボタンを非活性化（「すべての上限に達しました」）し、リセットボタンを表示。
5. **設定画面の上限入力UI**: 各項目行に「上限」数値入力欄（プレースホルダー「無制限」、0または空欄で無制限、1以上の整数で上限設定）。
6. **上限表示フラグ (`showLimit`)**:
   - `LotteryConfig` に `showLimit?: boolean`（デフォルト: `true`）を追加。
   - ON（デフォルト）: 凡例に各項目の上限数・当選数（例: `当選 1/3回`）を表示。
   - OFF: 凡例の上限テキストを非表示にする（内部の上限判定・除外は動作）。
   - 設定画面の「表示・履歴オプション」に「凡例に上限を表示」チェックボックスを追加。

---

## 3. データ構造

### 3.1 くじ項目 (`LotteryItem`)
```typescript
export interface LotteryItem {
  id: string;
  label: string;
  ratio: number;
  color?: string;
  limit?: number; // 当選上限数 (1以上の正の整数。undefined または 0 の場合は無制限) [NEW]
}
```

※ 過去の LocalStorage 保存データなどで `limit` が `undefined` または `0` の場合は「無制限（上限なし）」として扱います（後方互換性の担保）。

### 3.2 くじ設定 (`LotteryConfig`)
```typescript
export interface LotteryConfig {
  id: string;
  name: string;
  items: LotteryItem[];
  showLabel?: boolean;       // デフォルト: true (凡例にラベルを表示)
  showProbability?: boolean; // デフォルト: true (凡例に確率を表示)
  showHistory?: boolean;     // デフォルト: true (抽選履歴を表示)
  showLimit?: boolean;       // デフォルト: true (凡例に上限を表示) [NEW]
  maxHistoryCount?: number;  // デフォルト: 20
  createdAt: number;
  updatedAt: number;
}
```

※ 過去のデータで `showLimit` が `undefined` の場合は `true` として扱います。

### 3.3 当選回数ストレージキーとデータ構造
- キー名: `simple_lottery_hit_counts_v1`
- 保存構造: `Record<string, Record<string, number>>`
  - 第1キー: `configId` (設定ID)
  - 第2キー: `itemId` (項目ID)
  - 値: 当選回数（`number`）

---

## 4. ロジック設計

### 4.1 抽選ロジック (`src/lib/lottery.ts`)
- **`getAvailableLotteryItems(items: LotteryItem[], hitCounts: Record<string, number>): LotteryItem[]`**:
  - 各項目について、`limit` が設定されており（`limit > 0`）、現在の当選回数 `hitCounts[item.id] >= limit` となっている項目を除外。
  - まだ上限に達していない（または無制限の）項目一覧を返却。
- **`isAllLimitsReached(items: LotteryItem[], hitCounts: Record<string, number>): boolean`**:
  - `getAvailableLotteryItems` の結果が空配列（0件）の場合、`true` を返却。
- **`chooseLottery(items: LotteryItem[], randomFn?: () => number)`**:
  - `getAvailableLotteryItems` で取得した有効な項目配列を対象に抽選を実行。
  - 上限到達項目を除いた残りの有効項目の比重合計に基づいて確率を正規化し選出。

### 4.2 Storage API 設計 (`src/lib/storage.ts`)
- `getStoredHitCounts(configId: string): Record<string, number>`
  - 指定された設定IDの項目別当選回数マップを取得。
- `saveStoredHitCounts(configId: string, counts: Record<string, number>): void`
  - 指定された設定IDの当選回数マップを保存。
- `incrementHitCount(configId: string, itemId: string): Record<string, number>`
  - 指定された項目の当選回数を +1 し、最新のカウントマップを保存・返却。
- `resetHitCounts(configId: string): void`
  - 指定された設定IDの当選回数カウントをリセット（0クリア）。
- `resetAllHitCounts(): void`
  - 全設定の当選回数カウントをクリア。
- `clearHistory(configId: string)` の更新:
  - 履歴クリア時に該当設定の当選回数カウント（`hitCounts`）も連動してリセット。
- `deleteConfig(configId: string)` の更新:
  - 設定削除時に紐づく当選回数カウントも削除。

---

## 5. UI / 画面仕様

### 5.1 設定画面 (`/settings`)

1. **新規作成 / 編集フォーム (`viewMode === "create" | "edit"`)**:
   - 「表示・履歴オプション」セクション:
     - 「凡例に上限を表示」チェックボックスを追加（デフォルト: ON）。
   - 各項目エディタ行:
     - 「上限」数値入力欄（プレースホルダー「無制限」、0または空欄で無制限、1以上の整数で上限設定）を追加。
   - バリデーション: 上限値が入力されている場合は 1 以上の正の整数であること。
   - 複製（Duplicate）時: `limit` 設定および `showLimit` を引き継ぎ（当選カウントは0からスタート）。

2. **設定一覧画面 (`viewMode === "list"`)**:
   - 各設定カード内の項目チップに、上限設定がある場合は `上限: X回` をバッジ表示。
   - 現在の当選状況（例: `当選 1/3` や `上限到達`）を表示。
   - 設定メタ情報に `上限: 表示 / 非表示` バッジを表示。
   - 「履歴リセット」ボタンで当選数カウントも0にリセット。

### 5.2 メインくじ引き画面 (`/`)

1. **くじ引き実行 (`handleDraw`)**:
   - 抽選対象は「まだ上限に達していない項目」のみ（`getAvailableLotteryItems`）。
   - 抽選アニメーション演出中も有効な項目からランダム表示。
   - 抽選確定時に、当選した項目の当選回数を `incrementHitCount` で加算。
   - 履歴追加と同時に画面の当選カウント・有効確率を即座に更新。

2. **下部凡例カード（確率内訳・項目一覧）**:
   - `showLimit !== false` の場合:
     - 各項目に当選状況（例: `当選 1/3回` または `残り 2回`）を表示。
     - 上限に達した項目には「上限到達」バッジを表示し、グレーアウト。
   - 確率表示: 残りの有効な項目間で実効確率（%）を動的に再計算して表示（上限到達項目は 0%）。

3. **全項目が上限に達した場合（終了状態）**:
   - くじを引くボタンを非活性（`disabled`）にし、ラベルを「すべての上限に達しました」に変更。
   - 「すべてのくじが上限に達しました。履歴をクリアして最初からやり直せます。」という案内とリセットボタンを表示。

4. **履歴クリア / リセット**:
   - 「履歴クリア」ボタン押下時、当選回数カウントもあわせてリセットし、再び全項目が抽選可能になる。

---

## 6. テスト・品質保証

- `vitest` による単体テスト:
  - `src/lib/__tests__/lottery.test.ts`: 上限設定時の除外ロジック、比重再計算、全上限到達時の判定。
  - `src/lib/__tests__/storage.test.ts`: 当選カウントの保存・取得・加算・リセット・複製時の挙動、`showLimit` フラグ。
- `biome check` によるコード品質・フォーマットの検証。
- `pnpm build` によるビルド確認。
