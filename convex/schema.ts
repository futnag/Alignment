// 検証④用の最小スキーマ。Convex の DB・スケジューラ・ベクトル検索が動くかだけを確認する。
// 本番のNPCスキーマ（脳の四層）は段階2で別途設計する。ここは使い捨ての probe。
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // DB と スケジューラ の確認用：単純な行を入れて読み出す
  probe: defineTable({
    label: v.string(),
    note: v.string(),
    createdAt: v.number(),
  }),

  // ベクトル検索の確認用：8次元のダミーベクトルを入れて近傍検索する
  // （本物の埋め込みモデル選定は段階2/3。ここでは検索機構が動くかだけ見る）
  vectors: defineTable({
    label: v.string(),
    embedding: v.array(v.float64()),
  }).vectorIndex('by_embedding', {
    vectorField: 'embedding',
    dimensions: 8,
  }),
});
