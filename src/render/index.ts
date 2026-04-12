/**
 * ReDub render pipeline — public API.
 *
 * Usage:
 * ```ts
 * import { compile } from "redub";
 * import { render, ElevenLabsProvider, OpenAIProvider } from "redub/render";
 *
 * const doc = compile(<Redub xmlLang="en">…</Redub>);
 *
 * // ElevenLabs
 * const results = await render(
 *   doc,
 *   new ElevenLabsProvider({ apiKey, voiceId }),
 *   { format: "mp3" }
 * );
 *
 * // OpenAI
 * const results = await render(
 *   doc,
 *   new OpenAIProvider({ apiKey, voice: "nova" }),
 *   { format: "mp3" }
 * );
 * ```
 */

export { render, extractSegments } from "./pipeline";
export { ElevenLabsProvider } from "./providers/elevenlabs";
export type { ElevenLabsConfig } from "./providers/elevenlabs";
export { OpenAIProvider } from "./providers/openai";
export type { OpenAIConfig, OpenAIVoice, OpenAITTSModel } from "./providers/openai";
export type {
  AudioFormat,
  RenderConfig,
  RenderSegment,
  RenderResult,
  RenderProvider,
} from "./types";
