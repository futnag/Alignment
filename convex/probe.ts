// 検証④：Convex の DB・スケジューラ・ベクトル検索の動作確認。
// 実行例（convex dev を起動した状態で）:
//   npx convex run probe:insertProbe '{"label":"db","note":"hello"}'
//   npx convex run probe:listProbes
//   npx convex run probe:scheduleProbe '{"delayMs":3000}'   → 数秒後 listProbes に scheduler 行が増える
//   npx convex run probe:seedVectors
//   npx convex run probe:searchVectors '{"seed":1}'
import { v } from 'convex/values';
import {
  mutation,
  query,
  action,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { internal } from './_generated/api';

// ===== DB の確認 =====
export const insertProbe = mutation({
  args: { label: v.string(), note: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert('probe', { ...args, createdAt: Date.now() });
  },
});

export const listProbes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('probe').order('desc').take(10);
  },
});

// ===== スケジューラの確認 =====
// delayMs ミリ秒後に内部 mutation を起動し、probe テーブルへ書き込ませる。
export const scheduleProbe = mutation({
  args: { delayMs: v.number() },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(args.delayMs, internal.probe.delayedWrite, {
      scheduledAt: Date.now(),
    });
    return `scheduled +${args.delayMs}ms`;
  },
});

export const delayedWrite = internalMutation({
  args: { scheduledAt: v.number() },
  handler: async (ctx, args) => {
    const ranAt = Date.now();
    await ctx.db.insert('probe', {
      label: 'scheduler',
      note: `delayed write fired: scheduled ${args.scheduledAt}, ran ${ranAt} (Δ${ranAt - args.scheduledAt}ms)`,
      createdAt: ranAt,
    });
  },
});

// ===== ベクトル検索の確認 =====
// 8次元の決定論的ダミーベクトル（seed ごとに別方向）。
function dummyVec(seed: number): number[] {
  return Array.from({ length: 8 }, (_, i) => Math.sin(seed * (i + 1)));
}

export const seedVectors = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('vectors').take(1);
    if (existing.length > 0) return 'already seeded';
    const labels = ['alpha', 'beta', 'gamma', 'delta'];
    for (let i = 0; i < labels.length; i++) {
      await ctx.db.insert('vectors', { label: labels[i], embedding: dummyVec(i + 1) });
    }
    return `seeded ${labels.length} vectors`;
  },
});

// vectorSearch は action でのみ使える。検索→該当ドキュメント取得して返す。
export const searchVectors = action({
  args: { seed: v.number() },
  handler: async (ctx, args): Promise<{ label: string | null; score: number }[]> => {
    const results = await ctx.vectorSearch('vectors', 'by_embedding', {
      vector: dummyVec(args.seed),
      limit: 3,
    });
    const docs = await ctx.runQuery(internal.probe.getVectors, {
      ids: results.map((r) => r._id),
    });
    return results.map((r, i) => ({ label: docs[i]?.label ?? null, score: r._score }));
  },
});

export const getVectors = internalQuery({
  args: { ids: v.array(v.id('vectors')) },
  handler: async (ctx, args) => {
    const out = [];
    for (const id of args.ids) out.push(await ctx.db.get(id));
    return out;
  },
});
