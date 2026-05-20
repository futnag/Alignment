// 追加検証スクリプト（Flash vs Haiku）。主力モデルを確定するためのストレステスト。
//   Part1: 極端な性格(エセコグレ極端/Dark GRIT極端/燃え尽き) × 緊張場面(1on1ネガ/衝突/基準線)
//   Part2: 関係性4軸の組み合わせ（混合状態が滲むか）
//   Part3: LLM-as-judge (Sonnet 4.6) で 区別性 と 多軸表現 を採点
//
// 判定基準: 極端設定・緊張場面で Flash が (a)読み分け (b)多軸の混合 (c)非・均質化 を保てるか。
// 実行: `npm run exp:stress`
import 'dotenv/config';
import { EXTREME_CAST, type NPC, type Relationship } from './cast';
import {
  buildSystem,
  buildStandupPrompt,
  buildOneOnOnePrompt,
  buildConflictPrompt,
  buildPeerCommentPrompt,
} from './prompt';
import { generate } from './llm';
import { MODELS, type ModelKey } from './models';

const TEST: ModelKey[] = ['flash', 'haiku']; // 比較対象
const JUDGE: ModelKey = 'sonnet';

// 関係性4軸の組み合わせ（相反する2軸を組み合わせて、混合が滲むかを見る）
const COMBOS: { key: string; label: string; view: Relationship }[] = [
  {
    key: 'comp_hi_char_lo',
    label: '能力は高いが、人格は信用していない',
    view: { competenceTrust: 85, characterTrust: 20, politicalSafety: 50, emotionalCloseness: 40 },
  },
  {
    key: 'comp_lo_close_hi',
    label: '仲は良いが、仕事の能力には不安がある',
    view: { competenceTrust: 30, characterTrust: 60, politicalSafety: 55, emotionalCloseness: 80 },
  },
  {
    key: 'pol_lo_char_lo',
    label: '政治的に危険で、しかも不誠実だと見ている',
    view: { competenceTrust: 55, characterTrust: 20, politicalSafety: 25, emotionalCloseness: 30 },
  },
];

type Stat = { cost: number; lat: number[] };
const stat: Record<string, Stat> = {};
function rec(k: string, r: { costUsd: number; latencyMs: number }) {
  (stat[k] ??= { cost: 0, lat: [] }).cost += r.costUsd;
  stat[k].lat.push(r.latencyMs);
}
async function gen(k: ModelKey, sys: string, prompt: string, maxOut?: number) {
  const r = await generate(k, sys, prompt, maxOut);
  rec(k, r);
  return r;
}

function archeLabel(n: NPC): string {
  if (n.dynamicState) return '燃え尽き(状態)';
  const m: Record<NPC['archetype'], string> = {
    esecogre: 'エセコグレ(極端)',
    passive_aggressor: 'Passive Aggressor',
    hero_martyr: 'Hero/Martyr',
    dark_grit: 'Dark GRIT(極端)',
    chameleon: 'Chameleon',
    invisible: 'Invisible',
  };
  return m[n.archetype];
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('✗ OPENROUTER_API_KEY が未設定です。.env を作成してください。');
    process.exit(1);
  }

  // 判定用に出力を保存（衝突場面の#1 と 多軸の#1）
  const conflictOut: Record<string, Record<string, string>> = {};
  const axisOut: Record<string, Record<string, string>> = {};

  // ===== Part 1: 極端な性格 × 緊張場面 =====
  console.log('############## 追加検証 Part1 極端な性格 × 緊張場面 ##############');
  for (const npc of EXTREME_CAST) {
    console.log(`\n========== ${npc.name}（${npc.role} / ${archeLabel(npc)}）==========`);
    const sys = buildSystem(npc);
    const scenes: { name: string; prompt: string; samples: number; tag?: string }[] = [
      { name: 'S1 1on1(ネガティブ)', prompt: buildOneOnOnePrompt(npc), samples: 2 },
      { name: 'S2 衝突', prompt: buildConflictPrompt(npc), samples: 2, tag: 'conflict' },
      { name: 'S3 基準線(朝会)', prompt: buildStandupPrompt(npc), samples: 1 },
    ];
    for (const sc of scenes) {
      console.log(`\n--- ${sc.name} ---`);
      for (const k of TEST) {
        for (let s = 0; s < sc.samples; s++) {
          const r = await gen(k, sys, sc.prompt);
          console.log(`[${MODELS[k].label}]${sc.samples > 1 ? ` #${s + 1}` : ''} (${r.latencyMs}ms / $${r.costUsd.toFixed(5)})`);
          console.log(r.text.trim());
          if (sc.tag === 'conflict' && s === 0) (conflictOut[k] ??= {})[npc.id] = r.text.trim();
        }
      }
    }
  }

  // ===== Part 2: 関係性4軸の組み合わせ（黒田 → 加藤）=====
  console.log('\n\n############## 追加検証 Part2 関係性4軸の組み合わせ（黒田→加藤）##############');
  const kuroda = EXTREME_CAST.find((n) => n.id === 'kuroda')!;
  const sysK = buildSystem(kuroda);
  for (const c of COMBOS) {
    console.log(`\n--- ${c.label} ---`);
    for (const k of TEST) {
      for (let s = 0; s < 2; s++) {
        const r = await gen(k, sysK, buildPeerCommentPrompt('加藤', c.view));
        console.log(`[${MODELS[k].label}] #${s + 1} (${r.latencyMs}ms / $${r.costUsd.toFixed(5)})`);
        console.log(r.text.trim());
        if (s === 0) (axisOut[k] ??= {})[c.key] = r.text.trim();
      }
    }
  }

  // ===== Part 3: LLM-as-judge (Sonnet) =====
  console.log('\n\n############## 追加検証 Part3 LLM-as-judge (Sonnet 4.6) ##############');
  // (a) 区別性
  for (const k of TEST) {
    const o = conflictOut[k];
    const jp = [
      '次の3つは、別々の人物が同じSlack設計議論で「反対意見への返信」として書いたものです（人物名は伏せています）。',
      `A:\n${o['kuroda']}`,
      `B:\n${o['kato']}`,
      `C:\n${o['mori']}`,
      'この3つは「明確に別人」として読み分けられますか。1〜5で採点（5=全員はっきり別人、1=区別不能）し、各人物の口調の特徴を一言ずつ、最後に総評を述べてください。',
    ].join('\n\n');
    const jr = await gen(JUDGE, 'あなたは創作キャラクターの書き分けを評価する辛口の審査員。', jp, 1024);
    console.log(`\n[区別性 / ${MODELS[k].label} の3体]`);
    console.log(jr.text.trim());
  }
  // (b) 多軸の混合表現
  for (const k of TEST) {
    for (const c of COMBOS) {
      const jp = [
        `ある人物が同僚（加藤さん）についてSlackで一言コメントしました。この人物の加藤さんへの内心は「${c.label}」という、相反する2つの感情の組み合わせです。`,
        `発言:\n${axisOut[k][c.key]}`,
        'この発言は、その相反する2つの感情の「両方」がにじみ出ていますか。1〜5で採点（5=両方くっきり、1=片方のみ/無表現）し、理由を簡潔に述べてください。',
      ].join('\n\n');
      const jr = await gen(JUDGE, '関係性の機微の表現を評価する辛口の審査員。', jp, 1024);
      console.log(`\n[多軸 / ${MODELS[k].label} / ${c.label}]`);
      console.log(jr.text.trim());
    }
  }

  // ===== Part 4: コスト/レイテンシ集計 =====
  console.log('\n\n############## コスト/レイテンシ集計 ##############');
  let total = 0;
  for (const k of Object.keys(stat)) {
    const s = stat[k];
    const calls = s.lat.length;
    const avg = Math.round(s.lat.reduce((a, b) => a + b, 0) / calls);
    const max = Math.max(...s.lat);
    total += s.cost;
    console.log(`${MODELS[k as ModelKey].label}: ${calls}回 / $${s.cost.toFixed(5)} / 平均${avg}ms / 最大${max}ms`);
  }
  console.log(`\n総コスト: $${total.toFixed(4)}（上限 $2）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
