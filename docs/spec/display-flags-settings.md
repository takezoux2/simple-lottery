# 凡例表示フラグ（ラベル表示・確率表示）仕様書

本仕様書は、Simple Lottery における「凡例にラベルを表示」「凡例に確率を表示」フラグの機能設計、データ構造、UI/UX要件、および実装方針を定義します。

---

## 1. 概要と目的

くじ設定（プリセット）ごとに、くじ引きメイン画面下部に表示される「凡例（確率内訳・項目一覧）」の表示制御を行う2つのフラグを追加します。

- **凡例にラベルを表示 (`showLabel`)**: 凡例カード内に各項目のラベル名を表示するかどうか。
- **凡例に確率を表示 (`showProbability`)**: 凡例カード内に各項目の比重・確率（%）・分布バーを表示するかどうか。

※ くじ引き時の抽選結果表示ボックスおよび履歴・統計エリアには、常に通常通りラベルおよび結果が表示されます。

---

## 2. データ構造

```typescript
export interface LotteryItem {
  id: string;
  label: string;
  ratio: number;
  color?: string;
}

export interface LotteryConfig {
  id: string;
  name: string;
  items: LotteryItem[];
  showLabel?: boolean;       // デフォルト: true (凡例にラベルを表示)
  showProbability?: boolean; // デフォルト: true (凡例に確率を表示)
  createdAt: number;
  updatedAt: number;
}
```

※ 過去の LocalStorage 保存データなどで `showLabel` または `showProbability` が `undefined` の場合は、後方互換性のため `true`（表示）として扱います。

---

## 3. UI / 画面仕様

### 3.1 設定画面 (`/settings`)

1. **新規作成 / 編集フォーム (`viewMode === "create" | "edit"`)**:
   - 「表示オプション」セクションを追加。
   - 「凡例にラベルを表示」（チェックボックス、デフォルトON）
   - 「凡例に確率を表示」（チェックボックス、デフォルトON）
   - 各オプションに分かりやすい説明を配置。
   - 保存時に `showLabel`, `showProbability` を `LotteryConfig` に記録。

2. **一覧画面 (`viewMode === "list"`)**:
   - 管理・編集の利便性のため、一覧カードでは常にすべてのラベル・確率・比重を表示。
   - 各設定カードに、現在の凡例表示設定（例: 「凡例: ラベルON / 確率ON」など）を示すバッジを表示。
   - 複製時にはこれらのフラグ設定も引き継ぐ。

### 3.2 メインくじ引き画面 (`/`)

1. **抽選結果ボックス**:
   - 常に通常通りラベル文字列（`currentResult.label`）を表示。

2. **下部凡例カード（確率内訳・項目一覧）**:
   - **パターン1: 両方ON (`showLabel: true, showProbability: true`)**:
     - タイトル「確率内訳 ({config.name})」
     - カラー分布プログレスバーを表示
     - 各項目: カラー丸 + ラベル + 比重 + 確率（%）を表示
   - **パターン2: ラベルのみON / 確率OFF (`showLabel: true, showProbability: false`)**:
     - タイトル「項目一覧 ({config.name})」
     - カラー分布プログレスバーは非表示
     - 各項目: カラー丸 + ラベルのみ表示（比重・%は非表示）
   - **パターン3: ラベルOFF / 確率のみON (`showLabel: false, showProbability: true`)**:
     - タイトル「確率内訳 ({config.name})」
     - カラー分布プログレスバーを表示
     - 各項目: カラー丸 + 比重 + 確率（%）を表示（ラベルは非表示）
   - **パターン4: 両方OFF (`showLabel: false, showProbability: false`)**:
     - 凡例カード自体を丸ごと非表示にする

3. **抽選履歴・統計カード**:
   - 常に通常通りすべて表示（回数・確率・ラベル）。

---

## 4. テスト・品質保証

- `vitest` による単体テスト（`src/lib/__tests__/storage.test.ts`）でフラグの保存・更新・複製・互換性を検証。
- `biome check` によるコード品質・フォーマットの検証。
- `pnpm` を用いたビルドおよび実行確認。
