// LLM 呼び出しの薄いラッパー。Vercel AI SDK + OpenRouter プロバイダ。
// 1呼び出しごとに テキスト・トークン数・コスト・レイテンシ を返す（検証②の素材）。
import 'dotenv/config';
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { MODELS, type ModelKey } from './models';

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY ?? '' });

// 生成するのはSlackの短文のみ。出力上限を切らないと OpenRouter が
// モデルの最大出力(数万トークン)を見積もり、低残高だと 402 で拒否される。
const MAX_OUTPUT_TOKENS = 512;

export type GenResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
};

export async function generate(
  key: ModelKey,
  system: string,
  prompt: string,
  maxOutputTokens: number = MAX_OUTPUT_TOKENS,
): Promise<GenResult> {
  const m = MODELS[key];
  const t0 = Date.now();
  const res = await generateText({
    model: openrouter(m.slug),
    system,
    prompt,
    maxOutputTokens,
  });
  const latencyMs = Date.now() - t0;

  // AI SDK v6: usage.inputTokens / outputTokens（取得できない場合は0）
  const inputTokens = res.usage.inputTokens ?? 0;
  const outputTokens = res.usage.outputTokens ?? 0;
  const costUsd = (inputTokens / 1e6) * m.inputPrice + (outputTokens / 1e6) * m.outputPrice;

  return { text: res.text, inputTokens, outputTokens, costUsd, latencyMs };
}
