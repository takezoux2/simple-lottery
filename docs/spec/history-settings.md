# 抽選履歴設定・LocalStorage保存・履歴リセット機能 仕様書

本仕様書は、Simple Lottery における「抽選履歴の表示フラグ」「最大保存件数設定」「履歴のLocalStorage永続化」「履歴リセット機能（確認ダイアログ付き）」の機能設計、データ構造、UI/UX要件、および実装方針を定義します。

---

## 1. 概要と目的

1. **履歴の永続化**:
   現在メモリ内のみで保持されている抽選履歴および統計データを LocalStorage に保存し、ページのリロードやブラウザの再起動後も履歴を保持します。履歴はくじ設定（`configId`）ごとに個別に分離して保存します。
2. **履歴表示フラグ (`showHistory`)**:
   くじ設定ごとに、メイン画面における「抽選履歴・統計カード」の表示 / 非表示を切り替え可能にします（非表示中もバックグラウンドで保存は継続されます）。
3. **最大保存件数 (`maxHistoryCount`)**:
   くじ設定ごとに、保存する履歴の最大件数（1〜500件、デフォルト: 20件）を設定可能にします。
4. **履歴リセット機能（確認ダイアログ付き）**:
   設定一覧画面、設定編集画面、およびメイン画面において、抽選履歴をリセットするボタンを配置し、誤操作防止のための確認ダイアログ（`confirm`）を表示します。

---

## 2. データ構造

### 2.1 くじ設定 (`LotteryConfig`)
```typescript
export interface LotteryConfig {
  id: string;
  name: string;
  items: LotteryItem[];
  showLabel?: boolean;       // デフォルト: true (凡例にラベルを表示)
  showProbability?: boolean; // デフォルト: true (凡例に確率を表示)
  showHistory?: boolean;     // デフォルト: true (抽選履歴を表示) [NEW]
  maxHistoryCount?: number;  // デフォルト: 20 (最大保存件数: 1〜500) [NEW]
  createdAt: number;
  updatedAt: number;
}
```

※ 過去の LocalStorage 保存データなどで `showHistory` が `undefined` の場合は `true`、`maxHistoryCount` が `undefined` の場合は `20` として扱います（後方互換性の担保）。

### 2.2 抽選履歴アイテム (`DrawHistoryItem`)
```typescript
export interface DrawHistoryItem {
  id: string;
  timestamp: string;
  result: LotteryItem;
  configId: string;
  createdAt: number;
}
```

### 2.3 履歴ストレージキーとデータ構造
- キー名: `simple_lottery_history_v1`
- 保存構造: `Record<string, DrawHistoryItem[]>` （設定IDごとの履歴配列）

---

## 3. Storage API 設計 (`src/lib/storage.ts`)

- `getStoredHistory(configId: string): DrawHistoryItem[]`
  - 指定された設定IDの抽選履歴を取得（存在しない場合は空配列）。
- `saveStoredHistory(configId: string, history: DrawHistoryItem[]): void`
  - 指定された設定IDの抽選履歴を保存。
- `addHistoryItem(configId: string, item: LotteryItem, maxCount?: number): DrawHistoryItem[]`
  - 新しい抽選結果を追加し、指定された `maxCount` 件（1〜500、デフォルト20）に制限して保存。最新の履歴配列を返却。
- `clearHistory(configId: string): void`
  - 指定された設定IDの履歴をクリア。
- `clearAllHistory(): void`
  - 全設定の履歴をクリア。

---

## 4. UI / 画面仕様

### 4.1 メインくじ引き画面 (`/`)
1. **履歴のロードと保存**:
   - 初期化時および設定切り替え時に、選択された `activeConfig.id` に紐づく履歴を LocalStorage から取得。
   - くじを引いた際、`activeConfig.maxHistoryCount`（1〜500、デフォルト20）件上限で LocalStorage に保存。
2. **抽選履歴・統計カードの表示制御**:
   - `activeConfig.showHistory !== false` の場合のみ履歴カードを表示。
   - `showHistory: false` の場合でもバックグラウンドで履歴は保存される。
   - カードタイトルに最大件数を動的に反映（例: `抽選履歴（直近20回）`）。
3. **履歴クリア**:
   - メイン画面の「履歴クリア」押下時に確認ダイアログを表示。

### 4.2 設定画面 (`/settings`)

1. **新規作成 / 編集フォーム (`viewMode === "create" | "edit"`)**:
   - 「表示・履歴オプション」セクション:
     - 「凡例にラベルを表示」（チェックボックス、デフォルトON）
     - 「凡例に確率を表示」（チェックボックス、デフォルトON）
     - 「抽選履歴を表示」（チェックボックス、デフォルトON）
     - 「最大履歴保存件数」（数値入力 / スピナー、1〜500、デフォルト20）
   - 編集画面時（`viewMode === "edit"`）:
     - 「この設定の抽選履歴をリセット」ボタンを表示。
     - 押下時に確認ダイアログ（`window.confirm`）を表示し、リセット実行。

2. **設定一覧画面 (`viewMode === "list"`)**:
   - 各設定カードに、履歴表示状態および設定件数のバッジ・情報を表示（例: `履歴: 表示 (最大20件 / 保存中: 5件)`）。
   - 各設定カードのアクション領域（編集 / 複製 / 削除）に「履歴リセット」ボタンを追加。
   - 押下時に確認ダイアログを表示し、リセット実行。
   - 複製時には `showHistory`, `maxHistoryCount` の設定を引き継ぐ（履歴データは0件からスタート）。
   - 削除時には該当設定の LocalStorage 履歴データも削除。

---

## 5. テスト・品質保証

- `vitest` による単体テスト (`src/lib/__tests__/storage.test.ts`)
- `biome check`
- `pnpm build`
