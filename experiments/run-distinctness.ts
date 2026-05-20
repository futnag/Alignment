// 段階1 技術検証スクリプト（prototype_plan.md 第5部 段階1）。
//   検証①: 6人のNPCが別人として読み分けられるか（朝会の発言を4モデルで生成）
//   検証③: 関係性データの変化が発言ニュアンスに反映されるか（佐藤→高橋の人格信頼を摂動）
//   検証②: 上記の呼び出しからコスト/レイテンシを集計し、1日分を外挿
//
// 実行: OPENROUTER_API_KEY を .env に入れて `npm run exp:distinctness`
import 'dotenv/config';
import { CAST } from './cast';
import { buildSystem, buildStandupPrompt, buildPeerCommentPrompt } from './prompt';
import { generate } from './llm';
import { MODELS, MODEL_KEYS, type ModelKey } from './models';

type Stat = { cost: number; lat: number[] };

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('✗ OPENROUTER_API_KEY が未設定です。.env.example をコピーして .env を作成してください。');
    process.exit(1);
  }

  const stat: Record<ModelKey, Stat> = {
    nano: { cost: 0, lat: [] },
    flash: { cost: 0, lat: [] },
    haiku: { cost: 0, lat: [] },
    sonnet: { cost: 0, lat: [] },
  };
  const record = (k: ModelKey, r: { costUsd: number; latencyMs: number }) => {
    stat[k].cost += r.costUsd;
    stat[k].lat.push(r.latencyMs);
  };

  // ===== 検証①: キャラクター区別性 =====
  console.log('############## 検証① キャラクター区別性（朝会の発言）##############');
  for (const npc of CAST) {
    console.log(`\n========== ${npc.name}（${npc.role}）==========`);
    const sys = buildSystem(npc);
    const prompt = buildStandupPrompt(npc);
    for (const k of MODEL_KEYS) {
      const r = await generate(k, sys, prompt);
      record(k, r);
      console.log(
        `\n[${MODELS[k].label}]  (${r.latencyMs}ms / in ${r.inputTokens} out ${r.outputTokens} tok / $${r.costUsd.toFixed(5)})`,
      );
      console.log(r.text.trim());
    }
  }

  // ===== 検証③: 状態反映（佐藤 → 高橋の人格信頼を 高→低 に摂動）=====
  console.log('\n\n############## 検証③ 状態反映（佐藤→高橋, 人格信頼の摂動）##############');
  const sato = CAST.find((n) => n.id === 'sato')!;
  const sys = buildSystem(sato);
  const baseView = sato.peers!.takahashi;
  const lowTrustView = { ...baseView, characterTrust: 20, politicalSafety: 35 };
  for (const k of MODEL_KEYS) {
    const high = await generate(k, sys, buildPeerCommentPrompt('高橋', baseView));
    const low = await generate(k, sys, buildPeerCommentPrompt('高橋', lowTrustView));
    record(k, high);
    record(k, low);
    console.log(`\n[${MODELS[k].label}]`);
    console.log(`  信頼:高 → ${high.text.trim()}`);
    console.log(`  信頼:低 → ${low.text.trim()}`);
  }

  // ===== 検証②: コスト/レイテンシ集計 + 1日分外挿 =====
  const CALLS_PER_DAY = 60; // 仮定: 6人 × 約10生成/日（要再検討）
  console.log('\n\n############## 検証② コスト/レイテンシ集計 ##############');
  console.log('(注) 本検証のプロンプトは短い。本番は状態+履歴で入力トークンが増えるため、下の外挿は下限の目安。\n');
  for (const k of MODEL_KEYS) {
    const s = stat[k];
    const calls = s.lat.length;
    const avgLat = Math.round(s.lat.reduce((a, b) => a + b, 0) / calls);
    const maxLat = Math.max(...s.lat);
    const costPerCall = s.cost / calls;
    const perDay = costPerCall * CALLS_PER_DAY;
    console.log(
      `${MODELS[k].label}\n` +
        `  計 ${calls}回 / 合計 $${s.cost.toFixed(5)} / 1回平均 $${costPerCall.toFixed(5)}\n` +
        `  レイテンシ 平均 ${avgLat}ms / 最大 ${maxLat}ms\n` +
        `  → 1日分(${CALLS_PER_DAY}生成)外挿 ≒ $${perDay.toFixed(4)}\n`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
