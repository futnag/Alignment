// 段階2 #5：過剰調和型1組織の初期生成（固定組織のシード）。
//   実行: npx convex run seed:seed
//   確認: npx convex run seed:overview
// 何度実行しても同じ状態になるよう、毎回 全テーブルをクリアしてから投入する（開発用）。
import { mutation, query, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { CAST, type Relationship } from '../experiments/cast';

// 過剰調和型のNPC→NPCベースライン。実データが無い分をルールで埋める（第5部ステップ6 L241/L247）。
// 全員が表層的には礼儀正しい中庸＝差異はプレイを通じて滲み出る。
const HARMONY_BASELINE: Relationship = {
  competenceTrust: 55,
  characterTrust: 55,
  politicalSafety: 60,
  emotionalCloseness: 45,
};

// 通常NPCの第2層 初期値（入社初日＝枯渇なしの基準。燃え尽きはプレイで蓄積）。
const DYNAMIC_DEFAULT = { resourceLevel: 100, burnout: 0 };

async function clearAll(ctx: MutationCtx) {
  for (const t of ['events', 'relationships', 'npcs', 'games'] as const) {
    for (const row of await ctx.db.query(t).collect()) {
      await ctx.db.delete(row._id);
    }
  }
}

export const seed = mutation({
  args: { playerName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await clearAll(ctx);

    const gameId = await ctx.db.insert('games', {
      archetype: 'over_harmony',
      playerName: args.playerName ?? 'プレイヤー',
      createdAt: Date.now(),
    });

    // 第1層+第2層
    for (const n of CAST) {
      await ctx.db.insert('npcs', {
        gameId,
        key: n.id,
        name: n.name,
        role: n.role,
        archetype: n.archetype,
        hiddenGoal: n.hiddenGoal,
        keganStage: n.keganStage,
        personality: n.personality,
        dynamic: { ...DYNAMIC_DEFAULT },
      });
    }

    // 第3層：NPC→プレイヤー（実データ）＋ NPC→NPC（ベースライン、peersで上書き）
    let relCount = 0;
    for (const a of CAST) {
      await ctx.db.insert('relationships', {
        gameId,
        fromNpc: a.id,
        toCharacter: 'player',
        ...a.viewOfPlayer,
        guessConfidence: 0,
      });
      relCount++;
      for (const b of CAST) {
        if (b.id === a.id) continue;
        const view = a.peers?.[b.id] ?? HARMONY_BASELINE;
        await ctx.db.insert('relationships', {
          gameId,
          fromNpc: a.id,
          toCharacter: b.id,
          ...view,
          guessConfidence: 0,
        });
        relCount++;
      }
    }

    return { gameId, npcs: CAST.length, relationships: relCount };
  },
});

// 投入結果の目視確認用。
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db.query('games').collect();
    const npcs = await ctx.db.query('npcs').collect();
    const rels = await ctx.db.query('relationships').collect();
    const events = await ctx.db.query('events').collect();
    return {
      games: games.map((g) => ({ archetype: g.archetype, playerName: g.playerName })),
      npcCount: npcs.length,
      npcs: npcs.map((n) => `${n.name}(${n.role}/${n.archetype}/隠:${n.hiddenGoal})`),
      relationshipCount: rels.length,
      eventCount: events.length,
      // サンプル: 佐藤の関係性（peers上書き=高橋 が効いているか確認）
      satoRelations: rels
        .filter((r) => r.fromNpc === 'sato')
        .map(
          (r) =>
            `→${r.toCharacter}: 能${r.competenceTrust}/人${r.characterTrust}/政${r.politicalSafety}/情${r.emotionalCloseness}`,
        ),
    };
  },
});
