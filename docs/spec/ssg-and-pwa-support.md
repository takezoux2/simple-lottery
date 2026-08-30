# SSG (Static Site Generation) および PWA (Progressive Web App) 対応計画

本プロジェクト（simple-lottery）を **SSG（静的サイト生成・静的エクスポート）** および **PWA（Progressive Web App）** に対応させます。
完全なオフライン動作を可能にし、モバイルやデスクトップへのインストールに対応した高速なWebアプリケーションを実現します。
あわせて、プロジェクト規則に基づき `biome`（Linter / Formatter）および `vitest`（単体テスト）のツールチェーンを整備します。

---

## 1. 概要と方針

1. **SSG（静的エクスポート）対応**:
   - `next.config.ts` の `output: 'export'` に加え、画像最適化無効化 (`images.unoptimized: true`) を設定。
   - `page.tsx` をクライアントサイド（`"use client"`）で何度でもくじを引けるインタラクティブなUIに刷新。
2. **PWA対応**:
   - Web App Manifest: Next.js App Routerの `src/app/manifest.ts` を実装。
   - Service Worker: `public/sw.js` によるオフラインキャッシュ（コアアセットのプリキャッシュ & 動的キャッシュ）。
   - Service Worker登録: `src/components/ServiceWorkerRegister.tsx`。
   - PWAメタデータ: `src/app/layout.tsx` に `viewport`, `themeColor`, `appleWebApp`, `manifest`, `icons` を設定。
   - アイコン: 各サイズ（192x192, 512x512, 180x180, svg）を `public/icons/` に配置。
3. **品質・ツールチェーン (`biome`, `vitest`, `pnpm`)**:
   - `biome.json`: BiomeによるLinter/Formatter設定。
   - `vitest.config.ts`: Vitestによる単体テスト設定。
   - 抽選ロジックの単体テスト (`src/lib/__tests__/lottery.test.ts`) を実装。

---

## 2. 変更対象ファイル

### 設定・ツール
- `package.json`: 依存関係とnpm scripts (`test`, `lint`, `format`)
- `biome.json`: Biome設定
- `vitest.config.ts`: Vitest設定
- `next.config.ts`: 画像最適化無効化設定の追加

### PWA & アプリケーション
- `src/app/manifest.ts`: Web App Manifest定義
- `public/sw.js`: Service Workerスクリプト
- `public/icons/*`: PWA用アプリアイコン
- `src/components/ServiceWorkerRegister.tsx`: Service Worker登録コンポーネント
- `src/app/layout.tsx`: PWAメタデータとServiceWorkerRegisterの組み込み
- `src/lib/lottery.ts`: 抽選ロジック
- `src/lib/__tests__/lottery.test.ts`: 抽選ロジックの単体テスト
- `src/app/page.tsx`: インタラクティブなくじ引きUI

---

## 3. 検証計画

- `pnpm install`
- `pnpm run test` (Vitest)
- `pnpm run lint` (Biome)
- `pnpm exec tsc --noEmit`
- `pnpm run build` で `out/` ディレクトリ配下に `manifest.webmanifest`, `sw.js`, `icons/`, `index.html` が出力されることを確認
