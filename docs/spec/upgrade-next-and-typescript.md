# Next.js と TypeScript の最新バージョンへの更新計画

Next.js および TypeScript を最新の安定版バージョンに更新します。また、整合性を保つために関連する React や型定義ファイル、Next.js 向け ESLint 設定も更新します。

## 対象バージョン

- **Next.js**: `15.0.3` -> `^16.3.3` (最新安定版)
- **TypeScript**: `^5` -> `^7.0.2` (最新安定版)
- **React / React-DOM**: `19.0.0-rc-...` -> `^19.2.8` (最新安定版)
- **@types/react / @types/react-dom**: `^18` -> `^19.2.18` / `^19.2.5`
- **@types/node**: `^20` -> `^26.4.0`
- **eslint-config-next**: `15.0.3` -> `^16.3.3`

## 変更内容

### [simple-lottery]

#### [MODIFY] [package.json](../../package.json)
- `dependencies`:
  - `next`: `^16.3.3`
  - `react`: `^19.2.8`
  - `react-dom`: `^19.2.8`
- `devDependencies`:
  - `typescript`: `^7.0.2`
  - `@types/node`: `^26.4.0`
  - `@types/react`: `^19.2.18`
  - `@types/react-dom`: `^19.2.5`
  - `eslint-config-next`: `^16.3.3`

#### [MODIFY] [next.config.ts](../../next.config.ts) / [tsconfig.json](../../tsconfig.json) (必要に応じて調整)
- 最新バージョンにおける設定互換性を確認・調整

## Verification Plan

### Automated Tests / Verification
- `pnpm install` で依存関係のインストールおよび `pnpm-lock.yaml` の生成
- `pnpm exec tsc --noEmit` で型チェックを実行
- `pnpm run build` で Next.js アプリケーションのビルドが成功することを確認
