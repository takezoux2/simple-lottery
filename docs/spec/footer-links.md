# フッター外部リンク追加 仕様書

本仕様書は、Simple Lottery のサイト最下部（フッター）における外部リンク（`takezoux2.com` および `bambooq.takezoux2.com`）の追加仕様を定義します。

---

## 1. 概要と目的

サイト最下部（フッター）に、関連サイトへの外部リンクを追加します。

- `takezoux2.com` (`https://takezoux2.com`)
- `bambooq.takezoux2.com` (`https://bambooq.takezoux2.com`)
- `GitHub` (`https://github.com/takezoux2/simple-lottery`) (GitHubアイコン付きリンク)

---

## 2. 実装方針

1. **コンポーネント化 (`src/components/Footer.tsx`)**:
   - フッター部分を共通コンポーネントとして切り出し、メイン画面（`/`）および設定画面（`/settings`）で共通利用できるようにします。
2. **リンク設定**:
   - `target="_blank"` および `rel="noopener noreferrer"` を設定し、セキュリティと別タブ表示に対応します。
   - ダークモードおよびホバー時のスタイルを Tailwind CSS で設定します。
3. **著作権表記**:
   - 既存の `Simple Lottery © {year}` 表記をリンク群の下部に配置します。

---

## 3. テスト・品質保証

- `biome check .` によるフォーマットおよびリント検証
- `vitest run` による既存テストの通過確認
- `next build` によるSSGビルド検証
