# GA4 (Google Analytics 4) 導入 仕様書

本仕様書は、Simple Lottery における Google Analytics 4 (GA4) の導入、GitHub Actions 連携、およびアクセス・イベント計測の仕様を定義します。

---

## 1. 概要と目的

- サイトへのアクセス状況（ページビュー、ユーザー数、利用環境等）の可視化。
- 主要なユーザー操作（くじ引きの実行、設定の保存、履歴のリセット等）をカスタムイベントとして計測し、機能の利用状況を把握できるようにする。
- 静的エクスポート (SSG) および PWA 環境で安全に動作し、環境変数により有効/無効を切り替えられる設計とする。
- GitHub Pages デプロイ時（GitHub Actions）に GitHub の Variables / Secrets から自動注入できるようにする。

---

## 2. 仕様詳細

### 2.1 環境変数
- 環境変数名: `NEXT_PUBLIC_GA_ID`
- 形式: `G-XXXXXXXXXX`
- 動作仕様:
  - `NEXT_PUBLIC_GA_ID` が設定されている場合のみ、GA4 タグ（`gtag.js`）を読み込む。
  - 未設定（ローカル開発・テスト等）の場合はスクリプトを読み込まず、イベント送信処理も安全にスキップ（no-op）する。

### 2.2 GitHub Actions 連携 (`.github/workflows/deploy.yml`)
- `Build Next.js` ステップにて `NEXT_PUBLIC_GA_ID: ${{ vars.NEXT_PUBLIC_GA_ID || secrets.NEXT_PUBLIC_GA_ID }}` を注入。
- リポジトリの Variables（推奨）または Secrets に設定することで、ビルド時に埋め込まれる。

### 2.3 スクリプト組み込み (`src/components/GoogleAnalytics.tsx`, `src/app/layout.tsx`)
- `next/script` を利用し、`strategy="afterInteractive"` で非同期ロード。
- `window.dataLayer` の初期化および `gtag('config', GA_ID)` の実行。

### 2.4 計測ヘルパー (`src/lib/gtag.ts`)
- `pageview(url: string)`: ページ遷移時の計測。
- `event(params)`: カスタムイベントの送信。
  - `action`: イベント名 (例: `draw_lottery`, `save_config`, `clear_history`)
  - `category`: イベントカテゴリ (例: `engagement`, `settings`)
  - `label`: ラベル（くじのタイトルや当選アイテム名など）
  - `value`: 数値（当選確率やインデックスなど）
  - 追加カスタムパラメータ

### 2.5 計測対象イベント
1. **くじ引き実行 (`draw_lottery`)**:
   - トリガー: 「くじを引く」実行時、またはルーレット演出終了時
   - パラメータ: `config_id`, `config_name`, `item_name`, `animation_type`
2. **設定保存 (`save_config`)**:
   - トリガー: 設定画面で保存ボタンを押下した時
   - パラメータ: `config_id`, `config_name`, `item_count`
3. **履歴クリア (`clear_history`)**:
   - トリガー: 履歴クリアボタンを押下した時

---

## 3. テスト・品質保証

- `biome check .` によるフォーマットおよびリント検証
- `vitest run` による `gtag` ヘルパー関数の単体テスト検証
- `next build` による SSG ビルドの正常完了確認
