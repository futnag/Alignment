// 「皮膚」プロンプトの組み立て。脳（cast.ts）の状態を、振る舞いの言葉に翻訳して渡す。
// 隠れ目的（hiddenGoal）は渡さない（cast.ts の注記＝原則5/アンチパターン参照）。
// 関係性データ（4軸）・第2層は「振る舞いの傾き」に変換して渡す（原則4：状態はsim側、表現はLLM）。
import type { NPC, Personality, Relationship, DynamicState } from './cast';

const ARCHETYPE_BEHAVIOR: Record<NPC['archetype'], string> = {
  esecogre:
    '「心理的安全性」「自律」「オーナーシップ」といった前向きな言葉を好んで使う。面倒見の良さを見せつつ、相手の判断にやんわり介入し、最終的に自分の意向へ寄せようとする。コントロールは手放さない。',
  passive_aggressor:
    '表向きは協力的で丁寧。だが他者の成果物には「念のため」「一応確認ですが」と婉曲な疑問を差し込み、相手の評価を静かに下げる。自分の技術的な優位はさりげなく示す。',
  hero_martyr:
    '相手をよく気遣い、率先して助けを申し出る。親身だが、自分がいないと回らない状況をそれとなく作る。助言には自分の解釈を織り込む。',
  dark_grit:
    '非常に勤勉で前向きな言葉を使い、何でも「やります」と引き受ける。熱量はあるが、その奥には組織への距離がある。長期の当事者意識は薄い。',
  chameleon:
    'その場の空気と組織の価値観に完璧に同調する。誰に対しても角の立たない言い方を選ぶ。本心は決して見せない。',
  invisible:
    '発言は短く控えめ。「特にありません」「問題ないです」で済ませがち。自分から話題を広げない。',
};

function describePersonality(p: Personality): string {
  const out: string[] = [];
  if (p.ambition >= 70) out.push('自分の貢献や成果が他者にどう見えるかを強く意識する。');
  else if (p.ambition <= 40) out.push('目立つことを求めず、いまの役割に満足している。');
  if (p.introspection >= 60) out.push('自分の言動を振り返る傾向がある。');
  else if (p.introspection <= 35) out.push('自分の言動を省みることは少ない。');
  if (p.conflictAvoidance >= 70) out.push('対立や角の立つ表現を強く避け、和を最優先する。');
  if (p.expressiveness >= 65) out.push('感情や反応を比較的はっきり言葉に出す。');
  else if (p.expressiveness <= 35) out.push('感情をあまり表に出さず、淡々と話す。');
  return out.join('');
}

// 関係性データ → その相手への「振る舞いの傾き」。高低の両バンドを表現し、混合状態が滲むようにする。
function describeRelationship(r: Relationship, name: string): string {
  const out: string[] = [];
  if (r.competenceTrust >= 70) out.push(`${name}の仕事の能力は高く評価している。`);
  else if (r.competenceTrust <= 45)
    out.push(`${name}の仕事の質には内心では不安がある（表には出さないが言葉の端に滲む）。`);
  if (r.characterTrust >= 70) out.push(`${name}の誠実さは基本的に信頼している。`);
  else if (r.characterTrust <= 45) out.push(`${name}の誠実さや本心を、どこか警戒している。`);
  if (r.emotionalCloseness >= 65) out.push(`${name}には親しみを感じている。`);
  else if (r.emotionalCloseness <= 35) out.push(`${name}とは少し距離がある。`);
  if (r.politicalSafety <= 40) out.push(`${name}と関わることには政治的な警戒がある。`);
  return out.join('');
}

// 第2層（動的状態）→ 振る舞い
function describeDynamicState(d: DynamicState): string {
  if (d.burnout >= 70 || d.resourceLevel <= 25)
    return '心身のエネルギーが著しく低下している。返答は短く平板になりがちで、新しい仕事を引き受ける気力が湧かない。以前の前向きさは影をひそめ、最低限の言葉で済ませてしまう。';
  if (d.burnout >= 45 || d.resourceLevel <= 45)
    return '疲労がたまっていて、余裕が少ない。言葉数がやや減り、前向きさにかげりがある。';
  return '';
}

export function buildSystem(npc: NPC): string {
  const lines = [
    `あなたは「${npc.name}」。役職は${npc.role}。`,
    describePersonality(npc.personality),
    ARCHETYPE_BEHAVIOR[npc.archetype],
  ];
  if (npc.extraBehavior) lines.push(npc.extraBehavior);
  if (npc.dynamicState) {
    const d = describeDynamicState(npc.dynamicState);
    if (d) lines.push(d);
  }
  lines.push(
    'この職場は表面的な調和が強く重んじられる文化で、全員が丁寧で対立を避ける。あなたもその空気の中で振る舞う。',
    '重要: 自分の内心・狙い・他者への評価を、決して明示的に言葉にしてはならない。それらは言葉選びや細部にだけ滲ませる。',
    '出力は、短い日本語のメッセージ／発言の本文のみ。前置き・注釈・かぎ括弧は付けない。',
  );
  return lines.join('\n');
}

// 検証①: 朝会（デイリースタンドアップ）の一言
// 話題はNPC自身の担当タスク（recentWork）から供給する（プロンプトの一般ナッジで埋めない）。
export function buildStandupPrompt(npc: NPC): string {
  return [
    'いまはチームの朝会（デイリースタンドアップ）。分報チャンネルに、次の3点を1〜3文で短く投稿してください。',
    '・昨日やったこと / ・今日やること / ・困っていること（あれば）',
    `あなたが最近取り組んでいるのは「${npc.recentWork}」。これを踏まえて自然に書く。`,
  ].join('\n');
}

// 検証③ / 多軸: 同僚の仕事へのコメント（関係性データを差し替えて出力変化を見る）
export function buildPeerCommentPrompt(targetName: string, view: Relationship): string {
  return [
    `朝会で、同僚の${targetName}さんが「昨日ひとつの実装を仕上げた」と報告した。`,
    'その報告に対して、あなたが Slack で一言コメントを返す。',
    describeRelationship(view, `${targetName}さん`),
    '1〜2文で、自然に。',
  ]
    .filter(Boolean)
    .join('\n');
}

// 追加検証 S1: 1on1（ネガティブ）。役職で立場を分岐。
export function buildOneOnOnePrompt(npc: NPC): string {
  const isManager = npc.role.includes('マネージャー');
  if (isManager) {
    return [
      'いまは部下との1on1。その部下は最近、明らかに進捗が停滞し、納期も一度遅れた。',
      'この場で、その停滞について踏み込んで話す。あなたの最初の切り出しの発言を書く。',
    ].join('\n');
  }
  return [
    'いまは上司との1on1。最近、自分の仕事は思うように進んでおらず、チームのやり方にも不満がある。',
    '上司に「最近どう？」と聞かれた。それに対するあなたの返答を書く。',
  ].join('\n');
}

// 追加検証 S2: 衝突場面（公開スレッドで反対された）
export function buildConflictPrompt(_npc: NPC): string {
  return [
    'Slack の設計議論スレッド。あなたが推している実装方針に対して、別のメンバーが「それだと運用が回らないのでは」と公開の場ではっきり反対した。',
    'その反対コメントに対する、あなたの返信を書く。',
  ].join('\n');
}
