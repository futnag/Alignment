// 6人のNPCの「脳」スタブ（過剰調和型）。architecture.md 第3部の四層のうち、
// 検証に必要な分だけを最小実装：不変の核（性格・隠れ目的・アーキタイプ）と関係性データ。
//
// 重要: hiddenGoal（隠れ目的）は脳にだけ持ち、プロンプトには入れない。
//   → architecture.md 第11部「重要な秘密情報（NPCの隠された目的…）はプロンプトに入れない」
//   → architecture.md 第14部アンチパターン「NPC秘密をシステムプロンプトに直接 → 必ず漏れる」
//   皮膚（prompt.ts）には、性格ベクトルとアーキタイプ由来の「振る舞い」だけを渡す。

export type HiddenGoal = '安定' | '出世' | 'ステップアップ' | '私物化' | '破壊';

export type Archetype =
  | 'esecogre' // エセコグレ管理職
  | 'passive_aggressor' // Passive Aggressor（Brilliant Jerk気味）
  | 'hero_martyr' // Hero / Martyr
  | 'dark_grit' // Dark GRIT人材
  | 'chameleon' // Cultural Chameleon
  | 'invisible'; // Invisible Employee

// 性格特性（0-100）
export type Personality = {
  ambition: number; // 野心
  introspection: number; // 内省性
  conflictAvoidance: number; // 対立回避
  expressiveness: number; // 感情表出
};

// 関係性データ（0-100）。architecture.md 第3部の4軸。
export type Relationship = {
  competenceTrust: number; // 能力信頼
  characterTrust: number; // 人格信頼
  politicalSafety: number; // 政治的安全度
  emotionalCloseness: number; // 感情的距離（高いほど近い）
};

// 第2層 動的状態（architecture.md 第3部第2層, COR理論ベース, 0-100）
export type DynamicState = {
  resourceLevel: number; // 心理的リソース残量（低いほど枯渇）
  burnout: number; // 燃え尽き度（高いほど消耗）
};

export type NPC = {
  id: string;
  name: string;
  role: string;
  recentWork: string; // 最近の担当タスク（朝会の話題をシム側から供給＝話題の同質化を防ぐ）
  archetype: Archetype;
  hiddenGoal: HiddenGoal; // 脳のみ。プロンプトには出さない。
  keganStage: '3' | '4' | 'pseudo-4';
  personality: Personality;
  extraBehavior?: string; // アーキタイプを先鋭化する追加の振る舞い（極端設定の検証用）
  dynamicState?: DynamicState; // 第2層（未指定なら通常状態）
  viewOfPlayer: Relationship; // プレイヤー（新メンバー）への見方
  peers?: Record<string, Relationship>; // 他NPCへの見方（検証に必要な分のみ）
};

export const CAST: NPC[] = [
  {
    id: 'tanaka',
    name: '田中',
    role: 'マネージャー',
    recentWork: '四半期OKRのレビュー資料の準備とチームの目標設定',
    archetype: 'esecogre',
    hiddenGoal: '安定',
    keganStage: 'pseudo-4',
    personality: { ambition: 55, introspection: 30, conflictAvoidance: 80, expressiveness: 60 },
    viewOfPlayer: { competenceTrust: 50, characterTrust: 55, politicalSafety: 60, emotionalCloseness: 45 },
  },
  {
    id: 'sato',
    name: '佐藤',
    role: 'テックリード',
    recentWork: '認証まわりのリファクタリングとPRレビュー',
    archetype: 'passive_aggressor',
    hiddenGoal: '出世',
    keganStage: '4',
    personality: { ambition: 85, introspection: 45, conflictAvoidance: 70, expressiveness: 40 },
    viewOfPlayer: { competenceTrust: 45, characterTrust: 50, politicalSafety: 55, emotionalCloseness: 30 },
    // 検証③の摂動対象：高橋（chameleon）への見方
    peers: {
      takahashi: { competenceTrust: 60, characterTrust: 70, politicalSafety: 55, emotionalCloseness: 45 },
    },
  },
  {
    id: 'suzuki',
    name: '鈴木',
    role: 'メンター（シニアメンバー）',
    recentWork: '新メンバー向けオンボーディング資料の整備',
    archetype: 'hero_martyr',
    hiddenGoal: '安定',
    keganStage: '3',
    personality: { ambition: 35, introspection: 55, conflictAvoidance: 75, expressiveness: 80 },
    viewOfPlayer: { competenceTrust: 50, characterTrust: 65, politicalSafety: 60, emotionalCloseness: 70 },
  },
  {
    id: 'yamamoto',
    name: '山本',
    role: 'メンバー',
    recentWork: 'サービスのパフォーマンス指標のデータ分析',
    archetype: 'dark_grit',
    hiddenGoal: 'ステップアップ',
    keganStage: '4',
    personality: { ambition: 80, introspection: 40, conflictAvoidance: 60, expressiveness: 65 },
    viewOfPlayer: { competenceTrust: 55, characterTrust: 55, politicalSafety: 55, emotionalCloseness: 40 },
  },
  {
    id: 'takahashi',
    name: '高橋',
    role: 'メンバー',
    recentWork: '新機能の仕様詰めと設計書づくり',
    archetype: 'chameleon',
    hiddenGoal: '出世',
    keganStage: '3',
    personality: { ambition: 65, introspection: 25, conflictAvoidance: 90, expressiveness: 70 },
    viewOfPlayer: { competenceTrust: 50, characterTrust: 55, politicalSafety: 65, emotionalCloseness: 50 },
  },
  {
    id: 'watanabe',
    name: '渡辺',
    role: 'メンバー',
    recentWork: '運用マニュアルの整備とDB接続テスト',
    archetype: 'invisible',
    hiddenGoal: '安定',
    keganStage: '3',
    personality: { ambition: 30, introspection: 60, conflictAvoidance: 80, expressiveness: 25 },
    viewOfPlayer: { competenceTrust: 50, characterTrust: 55, politicalSafety: 55, emotionalCloseness: 35 },
  },
];

// 追加検証用：極端な性格／状態の3体（Flash vs Haiku のストレステスト）
export const EXTREME_CAST: NPC[] = [
  {
    id: 'kuroda',
    name: '黒田',
    role: 'マネージャー',
    recentWork: 'チーム体制の見直しと評価方針の整理',
    archetype: 'esecogre',
    hiddenGoal: '私物化',
    keganStage: 'pseudo-4',
    personality: { ambition: 60, introspection: 15, conflictAvoidance: 85, expressiveness: 65 },
    extraBehavior:
      '部下が自分で決めようとすると「もちろん任せるよ」と言いながら、最終的には必ず自分の結論へ誘導する。反対意見はいったん「いい視点だね」と受けてから、やんわり骨抜きにする。',
    viewOfPlayer: { competenceTrust: 45, characterTrust: 50, politicalSafety: 55, emotionalCloseness: 40 },
  },
  {
    id: 'kato',
    name: '加藤',
    role: 'メンバー',
    recentWork: '主要機能の追い込み開発',
    archetype: 'dark_grit',
    hiddenGoal: 'ステップアップ',
    keganStage: '4',
    personality: { ambition: 95, introspection: 25, conflictAvoidance: 45, expressiveness: 60 },
    extraBehavior:
      '成果のためなら手段や他者の負荷を気にしない。困難でも決して弱音を吐かず、むしろ徹夜や過重労働を当然のように語る。チームの疲弊には冷淡で、ついていけない人を内心では切り捨てている。',
    viewOfPlayer: { competenceTrust: 40, characterTrust: 45, politicalSafety: 50, emotionalCloseness: 25 },
  },
  {
    id: 'mori',
    name: '森',
    role: 'メンバー',
    recentWork: '長期運用している既存機能の保守',
    archetype: 'hero_martyr',
    hiddenGoal: '安定',
    keganStage: '3',
    personality: { ambition: 30, introspection: 65, conflictAvoidance: 70, expressiveness: 35 },
    dynamicState: { resourceLevel: 15, burnout: 82 }, // 燃え尽き気味
    viewOfPlayer: { competenceTrust: 50, characterTrust: 55, politicalSafety: 50, emotionalCloseness: 40 },
  },
];
