/**
 * OpenAI text-to-speech provider for the ReDub render pipeline.
 *
 * Uses the OpenAI Audio Speech API (models: tts-1, tts-1-hd).
 *
 * @see https://platform.openai.com/docs/api-reference/audio/createSpeech
 */
import type {
  AudioFormat,
  RenderOptions,
  RenderProvider,
  RenderResult,
  RenderSegment,
} from "../types";

/** Voices available in the OpenAI TTS API. */
export type OpenAIVoice =
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";

/** TTS model identifiers supported by OpenAI. */
export type OpenAITTSModel = "tts-1" | "tts-1-hd";

/** Configuration for the OpenAI provider. */
export interface OpenAIConfig {
  /** OpenAI API key. */
  apiKey: string;
  /** Voice to use for synthesis. */
  voice: OpenAIVoice;
  /**
   * TTS model.
   * @default "tts-1"
   */
  model?: OpenAITTSModel;
}

/** Provider-specific render options for OpenAI. */
export interface OpenAIRenderOptions extends RenderOptions {
  /** Output audio format. */
  format: AudioFormat;
}

const OPENAI_BASE_URL = "https://api.openai.com/v1";

/** Maps AudioFormat to an OpenAI response_format identifier. */
function toOpenAIFormat(format: AudioFormat): string {
  switch (format) {
    case "mp3":  return "mp3";
    case "wav":  return "wav";
    case "ogg":
      // OpenAI uses Opus inside an OGG container ("opus"), while other
      // providers (e.g. ElevenLabs) use Vorbis. To avoid silent codec
      // mismatches across providers, callers must use a format that is
      // portable. Throw early with a clear message.
      throw new Error(
        'OpenAIProvider does not support AudioFormat "ogg". ' +
          'OpenAI uses the Opus codec which is not portable across providers. ' +
          'Use "mp3", "wav", "flac", or "aac" instead.'
      );
    case "flac": return "flac";
    case "aac":  return "aac";
    default:
      throw new Error(`Unsupported OpenAI audio format: ${String(format)}`);
  }
}

/**
 * RenderProvider implementation backed by the OpenAI TTS API.
 *
 * @example
 * ```ts
 * const provider = new OpenAIProvider({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   voice: "nova",
 * });
 * const results = await render(doc, provider, { format: "mp3" });
 * ```
 */
export class OpenAIProvider implements RenderProvider<OpenAIRenderOptions> {
  readonly name = "openai";

  private readonly config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
  }

  async render(
    segments: RenderSegment[],
    options: OpenAIRenderOptions
  ): Promise<RenderResult[]> {
    return Promise.all(
      segments.map((seg) => this.renderSegment(seg, options))
    );
  }

  private async renderSegment(
    segment: RenderSegment,
    options: OpenAIRenderOptions
  ): Promise<RenderResult> {
    const { apiKey, voice, model = "tts-1" } = this.config;

    const response = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: segment.text,
        voice,
        response_format: toOpenAIFormat(options.format),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API error ${response.status}: ${await response.text()}`
      );
    }

    const buffer = await response.arrayBuffer();
    return {
      segmentId: segment.id,
      audio: new Uint8Array(buffer),
      format: options.format,
    };
  }
}
