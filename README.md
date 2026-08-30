This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## GitHub Pages へのデプロイ

本プロジェクトは GitHub Actions を用いて GitHub Pages へ自動デプロイできるように設定されています。

### 初回設定手順（リポジトリ管理者）
1. GitHub リポジトリの **Settings** > **Pages** を開きます。
2. **Build and deployment** > **Source** で **「GitHub Actions」** を選択します。
3. `main`（または `master`）ブランチに変更をプッシュすると、自動的に `.github/workflows/deploy.yml` が実行されデプロイされます。
4. GitHub Actions タブの「Deploy to GitHub Pages」から手動で実行（workflow_dispatch）することも可能です。

### ローカルでの検証・ビルド

```bash
# テストの実行
pnpm test

# Linter / Formatter のチェック
pnpm run lint

# 静的エクスポートビルド（ルートパス）
pnpm run build

# GitHub Pages 用のサブパス（/simple-lottery）を指定したビルド
NEXT_PUBLIC_BASE_PATH=/simple-lottery pnpm run build
```

