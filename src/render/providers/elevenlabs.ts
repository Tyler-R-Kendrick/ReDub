/**
 * ElevenLabs text-to-speech provider for the ReDub render pipeline.
 *
 * @see https://elevenlabs.io/docs/api-reference/text-to-speech
 */
import type {
  AudioFormat,
  RenderOptions,
  RenderProvider,
  RenderResult,
  RenderSegment,
} from "../types";

/** Configuration for the ElevenLabs provider. */
export interface ElevenLabsConfig {
  /** ElevenLabs API key. */
  apiKey: string;
  /** Voice ID to use for synthesis. */
  voiceId: string;
  /**
   * ElevenLabs model ID.
   * @default "eleven_multilingual_v2"
   */
  modelId?: string;
}

/** Provider-specific render options for ElevenLabs. */
export interface ElevenLabsRenderOptions extends RenderOptions {
  /** Output audio format. */
  format: AudioFormat;
}

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

/** Maps AudioFormat to an ElevenLabs output_format identifier. */
function toElevenLabsFormat(format: AudioFormat): string {
  switch (format) {
    case "mp3":  return "mp3_44100_128";
    case "wav":  return "pcm_44100";
    case "ogg":  return "ogg_vorbis_44100_128";
    case "flac": return "flac_44100";
    case "aac":  return "aac_44100_128";
    default:
      throw new Error(
        `Unsupported ElevenLabs audio format: ${String(format)}. ` +
          "Supported formats are: mp3, wav, ogg, flac, aac."
      );
  }
}

/**
 * RenderProvider implementation backed by the ElevenLabs TTS API.
 *
 * @example
 * ```ts
 * const provider = new ElevenLabsProvider({
 *   apiKey: process.env.ELEVENLABS_API_KEY!,
 *   voiceId: "21m00Tcm4TlvDq8ikWAM",
 * });
 * const results = await render(doc, provider, { format: "mp3" });
 * ```
 */
export class ElevenLabsProvider implements RenderProvider<ElevenLabsRenderOptions> {
  readonly name = "elevenlabs";

  private readonly config: ElevenLabsConfig;

  constructor(config: ElevenLabsConfig) {
    this.config = config;
  }

  async render(
    segments: RenderSegment[],
    options: ElevenLabsRenderOptions
  ): Promise<RenderResult[]> {
    return Promise.all(
      segments.map((seg) => this.renderSegment(seg, options))
    );
  }

  private async renderSegment(
    segment: RenderSegment,
    options: ElevenLabsRenderOptions
  ): Promise<RenderResult> {
    const { apiKey, voiceId, modelId = "eleven_multilingual_v2" } = this.config;

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: segment.text,
          model_id: modelId,
          output_format: toElevenLabsFormat(options.format),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `ElevenLabs API error ${response.status}: ${await response.text()}`
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
