// NPCの内部状態モデル（脳）。architecture.md 第3部の四層構造をConvexテーブルに翻訳。
// 段階2 #1。性格などの中身は experiments/cast.ts（過剰調和型・検証済み）からシードする。
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // 組織インスタンス（1プレイ=1組織）。第5部 生成パイプラインの器。
  games: defineTable({
    archetype: v.string(), // 'over_harmony'（過剰調和型）
    playerName: v.string(),
    createdAt: v.number(),
  }),

  // 第1層 不変の核（L125-133）＋ 第2層 動的状態（L135-142）
  npcs: defineTable({
    gameId: v.id('games'),
    key: v.string(), // 'tanaka' 等の安定ハンドル
    name: v.string(),
    role: v.string(),
    archetype: v.string(),
    hiddenGoal: v.string(), // 脳のみ。プロンプトに出さない（第11部/第14部）
    keganStage: v.string(), // '3' | '4' | 'pseudo-4'
    personality: v.object({
      ambition: v.number(),
      introspection: v.number(),
      conflictAvoidance: v.number(),
      expressiveness: v.number(),
    }),
    dynamic: v.object({
      resourceLevel: v.number(), // 心理的リソース残量 0-100
      burnout: v.number(), // 燃え尽き度 0-100
    }),
  }).index('by_game', ['gameId']),

  // 第3層 関係性データ（最重要・L144-159）。NPC→各相手の1行。
  relationships: defineTable({
    gameId: v.id('games'),
    fromNpc: v.string(), // npc.key
    toCharacter: v.string(), // npc.key または 'player'
    competenceTrust: v.number(), // 能力信頼（L150）
    characterTrust: v.number(), // 人格信頼（L151）
    politicalSafety: v.number(), // 政治的安全度（L152）
    emotionalCloseness: v.number(), // 感情的距離（L153）
    guessedGoal: v.optional(v.string()), // 読みの内容＝相手の隠れ目的の推測（L154）
    guessConfidence: v.number(), // 読みの確信度 0-100（L155）
    recentEmotion: v.optional(v.string()), // 直近の感情（L157）
  })
    .index('by_game', ['gameId'])
    .index('by_from', ['gameId', 'fromNpc']),

  // 第4層 観測イベントログ（L161-172）。今は空。記録ロジックは段階2 #3。
  events: defineTable({
    gameId: v.id('games'),
    observer: v.string(), // 観測したnpc.key
    at: v.number(),
    summary: v.string(), // 発生イベント
    channel: v.string(), // 'slack'|'email'|'zoom'|'direct'|'rumor'
    interpretation: v.string(), // そのNPCの当時の解釈
    deltas: v.optional(
      v.array(v.object({ toCharacter: v.string(), axis: v.string(), amount: v.number() })),
    ),
  }).index('by_observer', ['gameId', 'observer']),
});
