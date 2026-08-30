# 抽選アニメーション（円盤ルーレット / フラッシュカード）仕様書

本仕様書は、Simple Lottery における「円盤ルーレット（Roulette Wheel）」抽選アニメーションの追加、および設定ごとのアニメーション切り替え機能（フラッシュカード / 円盤ルーレット）の設計、データ構造、UI/UX要件、および実装方針を定義します。

---

## 1. 概要と目的

くじ引きの演出体験を向上させるため、既存のカード型高速切り替えアニメーション（フラッシュカード）に加え、視覚的に楽しく公平感が伝わる「円盤ルーレット」アニメーションを導入します。
また、くじ設定（プリセット）ごとに利用するアニメーションタイプ（フラッシュカード / 円盤ルーレット）を選択・保存できるようにします。

- **フラッシュカード (`"card"`)**: 結果表示ボックス内で項目が高速でパパパッと切り替わり、決定時に拡大表示されるクイックなアニメーション。
- **円盤ルーレット (`"wheel"`)**: 各項目の比重に応じた扇形を持つ円盤が勢いよく回転し、上部の針（インジケーター）が当選項目を指して停止する臨場感のあるアニメーション。

---

## 2. データ構造

### 2.1 型定義

```typescript
export type LotteryAnimationType = "card" | "wheel";

export interface LotteryConfig {
  id: string;
  name: string;
  items: LotteryItem[];
  animationType?: LotteryAnimationType; // デフォルト: "card"
  showLabel?: boolean;
  showProbability?: boolean;
  showHistory?: boolean;
  showLimit?: boolean;
  maxHistoryCount?: number;
  createdAt: number;
  updatedAt: number;
}
```

※ 過去の LocalStorage 保存データなどで `animationType` が `undefined` の場合は、後方互換性のため `"card"`（フラッシュカード）として扱います。

---

## 3. UI / 画面仕様

### 3.1 設定画面 (`/settings`)

1. **新規作成 / 編集フォーム (`viewMode === "create" | "edit"`)**:
   - 「アニメーションタイプ」選択セクションを追加。
   - 2択のボタンスイッチャー / ラジオ選択UI:
     - 🎴 **フラッシュカード** (`"card"`): カード内で項目が高速に切り替わるシンプル＆クイック演出
     - 🎡 **円盤ルーレット** (`"wheel"`): 確率に応じた扇形円盤が回転して結果を指すダイナミック演出
   - 保存時に `animationType` を `LotteryConfig` に記録。

2. **一覧画面 (`viewMode === "list"`)**:
   - 各設定カードのヘッダーメタ情報エリアに、現在のアニメーション設定バッジを表示（例: 「🎴 カード」「🎡 ルーレット」）。
   - 複製時には `animationType` の設定もそのまま引き継ぐ。

### 3.2 メインくじ引き画面 (`/`)

1. **フラッシュカード表示モード (`animationType === "card"` / デフォルト)**:
   - 従来のカード型結果ボックスを表示。
   - 「くじを引く」ボタン押下で項目が高速に切り替わり、最終結果でピタッと停止。

2. **円盤ルーレット表示モード (`animationType === "wheel"`)**:
   - 中央に SVG ベースの美麗な円盤ルーレットコンポーネントを表示。
   - 円盤の上部中央に当選を指す三角ポインター（針 ▼）を配置。
   - 円盤には有効な抽選項目（上限未到達の項目 `availableItems`）の比重に基づいた扇形とラベル・カラーを描画。
   - 「くじを引く」ボタン押下時:
     - 抽選結果 `finalResult` を確率通りに事前決定。
     - ポインターが当選項目の扇形内部（中心付近のランダムな位置）を指すように目標回転角度を計算。
     - スムーズなイージング（`cubic-bezier(0.12, 0.8, 0.3, 1)` 等）で勢いよく回転し、自然に減速して停止（約3.5秒）。
     - 停止後、結果カードがポップアップ/ハイライトされ、履歴および当選数に反映。

3. **共通動作**:
   - 抽選中（`isDrawing`）はボタンを非活性化。
   - 上限到達項目が存在する場合、有効な項目のみでルーレット・フラッシュカードを構成。
   - 全項目上限到達時はアラートとリセットボタンを表示。

---

## 4. 円盤ルーレットの数学的・描画仕様

1. **扇形パスの生成**:
   - 円盤の中心 $(cx, cy) = (150, 150)$、半径 $r = 135$
   - 12時（真上）方向を $0^\circ$ として時計回りに角度 $\theta$ を計算。
   - 項目 $i$ の角度幅 $\Delta\theta_i = 360^\circ \times \frac{\text{ratio}_i}{\sum \text{ratio}}$
   - 開始角 $\theta_{\text{start}}$ から 終了角 $\theta_{\text{end}}$ までの扇形を SVG `<path>` で描画。
   - 項目が1つの場合（$360^\circ$）は `<circle>` または 2つの半円弧で完全な円を描画。

2. **回転停止位置の計算**:
   - 当選項目 $k$ の扇形の中央角度を $M_k = \frac{\theta_{\text{start}, k} + \theta_{\text{end}, k}}{2}$ とする。
   - 安全マージンを加えた微小オフセット $\delta \in [-0.35 \times \Delta\theta_k, +0.35 \times \Delta\theta_k]$
   - 目標角度 $A_k = M_k + \delta$
   - 真上のポインター（$0^\circ$）が $A_k$ を指すための円盤の時計回り回転角:
     $$\text{step} = (360^\circ - (A_k \bmod 360^\circ)) \bmod 360^\circ$$
   - 複数回回転（5〜8周）を加算:
     $$\text{newRotation} = \text{currentRotation} + 360^\circ \times \text{spins} + \text{diff}$$

---

## 5. テスト・品質保証

- `vitest` による単体テスト（`src/lib/__tests__/storage.test.ts`）で `animationType` の保存・更新・複製・デフォルト互換性を検証。
- `biome check` によるコード品質・フォーマットの検証。
- `pnpm build` による SSG ビルドの検証。
