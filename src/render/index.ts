/**
 * ReDub render pipeline — public API.
 *
 * Usage:
 * ```ts
 * import {
 *   compile, render,
 *   ElevenLabsProvider, OpenAIProvider, HuggingFaceLocalProvider,
 * } from "redub";
 *
 * const doc = compile(<Redub xmlLang="en">…</Redub>);
 *
 * // ElevenLabs — format is part of ElevenLabsRenderOptions
 * const results = await render(
 *   doc,
 *   new ElevenLabsProvider({ apiKey, voiceId }),
 *   { format: "mp3" }
 * );
 *
 * // OpenAI — format is part of OpenAIRenderOptions
 * const results = await render(
 *   doc,
 *   new OpenAIProvider({ apiKey, voice: "nova" }),
 *   { format: "mp3" }
 * );
 *
 * // HuggingFace local — format is always "wav" (WAV-encoded PCM)
 * const results = await render(
 *   doc,
 *   new HuggingFaceLocalProvider({ model: "Xenova/speecht5_tts" }),
 *   {}
 * );
 * ```
 */

export { render, extractSegments } from "./pipeline";
export { ElevenLabsProvider } from "./providers/elevenlabs";
export type { ElevenLabsConfig, ElevenLabsRenderOptions } from "./providers/elevenlabs";
export { OpenAIProvider } from "./providers/openai";
export type { OpenAIConfig, OpenAIRenderOptions, OpenAIVoice, OpenAITTSModel } from "./providers/openai";
export { HuggingFaceLocalProvider } from "./providers/huggingface-local";
export type { HuggingFaceLocalConfig, HuggingFaceLocalRenderOptions } from "./providers/huggingface-local";
export type {
  AudioFormat,
  RenderOptions,
  RenderSegment,
  RenderResult,
  RenderProvider,
} from "./types";
