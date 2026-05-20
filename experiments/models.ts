// 検証用モデルの「品質の梯子」4本。価格は OpenRouter 2026-05 時点（$/100万トークン）。
// ※ 最終的なモデル選定は未決定事項（prototype_plan.md 第9部）。これは検証②③で実測して決めるための候補。

export type ModelKey = 'nano' | 'flash' | 'haiku' | 'sonnet';

export const MODELS: Record<
  ModelKey,
  { slug: string; inputPrice: number; outputPrice: number; label: string }
> = {
  nano: {
    slug: 'openai/gpt-4.1-nano',
    inputPrice: 0.1,
    outputPrice: 0.4,
    label: 'GPT-4.1-nano (フロア)',
  },
  flash: {
    slug: 'google/gemini-2.5-flash',
    inputPrice: 0.3,
    outputPrice: 2.5,
    label: 'Gemini 2.5 Flash (主力)',
  },
  haiku: {
    slug: 'anthropic/claude-haiku-4.5',
    inputPrice: 1.0,
    outputPrice: 5.0,
    label: 'Claude Haiku 4.5 (軽量上限)',
  },
  sonnet: {
    slug: 'anthropic/claude-sonnet-4.6',
    inputPrice: 3.0,
    outputPrice: 15.0,
    label: 'Claude Sonnet 4.6 (中堅)',
  },
};

export const MODEL_KEYS: ModelKey[] = ['nano', 'flash', 'haiku', 'sonnet'];
