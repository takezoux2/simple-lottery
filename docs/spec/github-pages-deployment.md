# GitHub Pages デプロイ対応計画

本プロジェクト（simple-lottery）を **GitHub Pages** に自動デプロイできるように設定を行います。
リポジトリのサブディレクトリ配下（`https://takezoux2.github.io/simple-lottery/`）またはカスタムドメインでのホスティングに対応し、PWA機能や静的ルーティングが正しく動作するようにします。

---

## 1. 概要と方針

1. **GitHub Actions ワークフロー (`.github/workflows/deploy.yml`) の追加**:
   - `main` / `master` ブランチへのプッシュ時および手動実行（`workflow_dispatch`）時にトリガー。
   - `actions/configure-pages` を利用してベースパス等の設定を自動取得。
   - `pnpm` 環境で Lint (`biome`)、テスト (`vitest`)、ビルド (`next build`) を実行。
   - `actions/upload-pages-artifact` および `actions/deploy-pages` で GitHub Pages へ安全にデプロイ。

2. **Next.js の basePath / trailingSlash 設定 (`next.config.ts`)**:
   - 環境変数 `NEXT_PUBLIC_BASE_PATH` を受け取り、`basePath` および `env` に設定。
   - 静的ホスティング（GitHub Pages）でのページ直接アクセス時の404回避のため `trailingSlash: true` を設定。

3. **PWA / Service Worker / Manifest のパス対応**:
   - `src/app/manifest.ts`: `start_url` や `icons` のパスに `NEXT_PUBLIC_BASE_PATH` を反映。
   - `src/components/ServiceWorkerRegister.tsx`: Service Worker 登録URLおよびスコープに `basePath` を反映。

4. **ドキュメントの更新**:
   - `README.md` にデプロイ手順および GitHub リポジトリ設定（GitHub Pages を GitHub Actions ソースに切り替える手順）を記載。

---

## 2. 変更対象ファイル

- [NEW] `.github/workflows/deploy.yml` : GitHub Pages デプロイ用 GitHub Actions ワークフロー
- [MODIFY] `next.config.ts` : `basePath`, `trailingSlash`, 環境変数定義の追加
- [MODIFY] `src/app/manifest.ts` : `basePath` に応じた `start_url` / `icons` パス対応
- [MODIFY] `src/components/ServiceWorkerRegister.tsx` : `basePath` に応じた Service Worker 登録パス対応
- [MODIFY] `README.md` : GitHub Pages デプロイに関する説明・設定手順の追記
- [NEW] `docs/spec/github-pages-deployment.md` : 本計画の仕様書

---

## 3. 検証計画

1. **単体テスト・Lint**:
   - `pnpm test` (vitest) がパスすること
   - `pnpm run lint` (biome check) がパスすること
2. **通常ビルド (Root Path)**:
   - `pnpm run build` でエラーなく `out/` が生成されること
3. **サブパスビルド (Base Path 指定)**:
   - `NEXT_PUBLIC_BASE_PATH=/simple-lottery pnpm run build` を実行
   - `out/index.html` 内のスクリプトタグ、CSS、リンク、マニフェスト等のパスが `/simple-lottery/` 基準になっていることを確認
   - `out/manifest.webmanifest` 内の `start_url` と `icons` が正しいパスになっていることを確認
4. **型チェック**:
   - `pnpm exec tsc --noEmit` が成功すること
