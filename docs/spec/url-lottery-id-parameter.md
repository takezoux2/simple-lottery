# URLクエリパラメータ指定＆くじID管理（5文字ランダム生成・任意変更）仕様書

本仕様書は、Simple Lottery における「URLクエリパラメータ（`?id=xxx`）によるくじ指定」「デフォルト5文字ランダムIDの自動割り当て」「設定・編集画面からのID任意変更と履歴マイグレーション」の機能設計、データ構造、UI/UX要件、および実装方針を定義します。

---

## 1. 概要と目的

- **URLパラメータによるくじ指定**: `/?id=<くじID>` のURLにアクセスすることで、該当するくじ設定を直接アクティブにして表示・抽選可能にする。
- **デフォルト5文字ランダムID**: 新規くじ作成時および複製時に、短く扱いやすい5文字程度のランダムなID（例: `k7x9p`, `a3b8z`）を自動割り当てする。
- **編集画面からのID任意変更**: 設定編集画面から、くじのIDをユーザーが覚えやすい英数字や単語（例: `lunch`, `omikuji-2026` など）へ自由に変更できるようにする。ID変更時には、紐づく履歴および当選カウントのデータも新しいIDへ安全に移行（マイグレーション）する。

---

## 2. 確定仕様一覧

1. **ID生成仕様**:
   - 関数: `generateShortId(length = 5): string`
   - 使用文字セット: 半角英小文字＋数字 (`0-9a-z`) 36種類。
   - 新規作成時・複製時のデフォルトIDとして自動生成。
2. **IDバリデーション仕様**:
   - 必須（空文字不可）。
   - 使用可能文字: 半角英数字、ハイフン、アンダースコア（`/^[a-zA-Z0-9_-]+$/`）。
   - 一意性（ユニーク制約）: 他の既存くじ設定と重複するIDは設定不可（エラーメッセージを表示）。
3. **ID変更時のデータマイグレーション**:
   - 編集画面でIDが変更された場合、該当くじの履歴（`DrawHistoryItem[]`）および当選回数カウント（`Record<string, number>`）のストレージキーを新IDへ自動移行。
   - 現在アクティブなくじのIDを変更した場合は、アクティブID（`LOTTERY_ACTIVE_ID_KEY`）も新IDに更新。
4. **URLクエリパラメータ連携 (`/?id=xxx`)**:
   - メイン画面表示時、URLに `?id=xxx` が指定されていれば、該当IDのくじ設定をアクティブにして表示。
   - 存在しないIDが指定された場合は、デフォルトまたは最後に使用していたくじにフォールバック。
   - ヘッダーのくじ切り替えドロップダウン操作時、URLのクエリパラメータ（`?id=xxx`）も連動して更新（`history.replaceState`）。
   - 設定画面の各くじカードに「URLコピー」ボタンを設置し、直接開くURLをワンクリックでクリップボードにコピー可能にする。
   - 設定画面の「くじ引きに戻る」リンクや「保存して今すぐ使う」ボタンは、選択したくじの `/?id=xxx` へ遷移。

---

## 3. データ構造・API設計

### 3.1 ID生成ユーティリティ (`src/lib/storage.ts`)

```typescript
/**
 * 指定文字数（デフォルト5文字）のランダムなIDを生成します
 */
export function generateShortId(length = 5): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += chars[values[i] % chars.length];
    }
    return result;
  }
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
```

### 3.2 ストレージ保存ロジック拡張 (`src/lib/storage.ts`)

```typescript
export function saveConfig(
  configData: {
    id: string; // 指定されたID
    name: string;
    items: LotteryItem[];
    animationType?: LotteryAnimationType;
    showLabel?: boolean;
    showProbability?: boolean;
    showHistory?: boolean;
    showLimit?: boolean;
    maxHistoryCount?: number;
  },
  setActive = false,
  originalId?: string, // 編集前のID（ID変更時のマイグレーション用）
): { savedConfig: LotteryConfig; configs: LotteryConfig[] }
```

- `originalId` が指定されており、かつ `originalId !== configData.id` の場合:
  - 履歴マップ `LOTTERY_HISTORY_KEY` 内の `originalId` の履歴データを `configData.id` へ移行（各項目の `configId` も更新）。
  - 当選回数マップ `LOTTERY_HIT_COUNTS_KEY` 内の `originalId` のデータを `configData.id` へ移行。
  - `LOTTERY_ACTIVE_ID_KEY` が `originalId` の場合は `configData.id` に更新。

---

## 4. UI / 画面仕様

### 4.1 メイン画面 (`src/app/page.tsx`)
- Next.js SSG（静的エクスポート）対応のため、`useSearchParams()` を使用するメイン部分を `<Suspense>` でラップ。
- クエリパラメータ `?id=...` を読み取り、該当くじをアクティブに設定。
- ドロップダウン変更時に `history.replaceState(null, "", ?id=${selectedId})` でURLを同期。

### 4.2 設定画面 (`src/app/settings/page.tsx`)
- **作成・編集フォーム**:
  - 設定名の上に「くじID (URL識別子)」入力フィールドを追加。
  - 「ランダム再生成」ボタン（🎲）を配置し、ワンクリックで5文字のランダムIDを再生成可能。
  - バリデーション: 半角英数字・ハイフン・アンダースコアのみ、重複チェック。
- **一覧画面**:
  - 各くじカードのヘッダーに `ID: xxx` バッジを表示。
  - 「URLコピー」ボタンを追加し、クリックで `https://<domain>/?id=xxx` をコピーしてトースト通知を表示。

---

## 5. テスト・品質保証方針

- `vitest` による単体テスト:
  - `src/lib/__tests__/storage.test.ts`:
    - `generateShortId` の長さ・文字セットテスト。
    - 新規作成・更新・ID変更時のデータマイグレーションテスト（履歴・当選カウントの移行確認）。
    - 複製時のランダムID生成確認。
- `pnpm lint` / `pnpm format` (Biome) による静的解析。
- `pnpm build` による静的エクスポート（SSG）ビルドの確認。
