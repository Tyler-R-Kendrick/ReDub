/**
 * HuggingFace local text-to-speech provider for the ReDub render pipeline.
 *
 * Runs SpeechT5 directly in the browser via Transformers.js with no server
 * round-trip. The model pipeline is lazy-initialised on the first render call
 * and then cached for subsequent segments.
 *
 * @see https://huggingface.co/docs/transformers.js
 */
import type {
  RenderOptions,
  RenderProvider,
  RenderResult,
  RenderSegment,
} from "../types";

// ---------------------------------------------------------------------------
// Config — constructor-time options (wired once per provider instance)
// ---------------------------------------------------------------------------

/** Configuration for the HuggingFace local provider. */
export interface HuggingFaceLocalConfig {
  /**
   * Transformers.js-compatible SpeechT5 model identifier.
   * @default "Xenova/speecht5_tts"
   */
  model?: string;
  /**
   * Whether to use quantized (int8) model weights.
   * Quantized models are smaller but slightly less accurate.
   * @default false
   */
  quantized?: boolean;
  /**
   * URL to a speaker-embeddings tensor (`.bin` file compatible with
   * the SpeechT5 speaker-embedding input).
   * When omitted the provider uses Transformers.js built-in defaults.
   */
  speakerEmbeddingsUrl?: string;
}

// ---------------------------------------------------------------------------
// Per-render options — passed at the render() call site
// ---------------------------------------------------------------------------

/**
 * Provider-specific render options for the HuggingFace local provider.
 *
 * SpeechT5 always synthesises raw PCM which is wrapped into a WAV container,
 * so `format` is always `"wav"` and is included here for type completeness.
 */
export interface HuggingFaceLocalRenderOptions extends RenderOptions {
  /**
   * Output audio format.
   * The HuggingFace local provider only supports WAV (PCM) output.
   * @default "wav"
   */
  format?: "wav";
}

// ---------------------------------------------------------------------------
// Internal — Transformers.js shape (kept narrow to avoid a hard dependency)
// ---------------------------------------------------------------------------

/** Minimal slice of the Transformers.js TextToAudioPipelineOutput. */
interface TJSAudioOutput {
  audio: Float32Array;
  sampling_rate: number;
}

/** Minimal slice of the Transformers.js TextToAudioPipeline callable. */
interface TJSSynthesizer {
  (
    text: string,
    options?: { speaker_embeddings?: string }
  ): Promise<TJSAudioOutput>;
}

// ---------------------------------------------------------------------------
// Internal — WAV encoding
// ---------------------------------------------------------------------------

/**
 * Encode a Float32 PCM array into a minimal WAV `Uint8Array`.
 *
 * Produces a standard PCM WAV with a 44-byte header followed by 16-bit
 * signed little-endian samples — universally supported by browsers and
 * audio tooling.
 */
function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const numSamples = samples.length;
  const byteRate = sampleRate * 2; // 16-bit mono → 2 bytes/sample
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);       // PCM sub-chunk size
  view.setUint16(20, 1, true);        // PCM format
  view.setUint16(22, 1, true);        // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true);        // block align (mono 16-bit)
  view.setUint16(34, 16, true);       // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Clamp float32 [-1, 1] → int16
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped * 0x7fff, true);
  }

  return new Uint8Array(buffer);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * RenderProvider that synthesises audio locally in the browser using
 * SpeechT5 through Transformers.js.
 *
 * The model is lazy-loaded and cached on first use; subsequent segments
 * within the same instance reuse the warm pipeline.
 *
 * @example
 * ```ts
 * const provider = new HuggingFaceLocalProvider({
 *   model: "Xenova/speecht5_tts",
 * });
 * const results = await render(doc, provider, {});
 * ```
 */
export class HuggingFaceLocalProvider
  implements RenderProvider<HuggingFaceLocalRenderOptions>
{
  readonly name = "huggingface-local";

  private readonly config: Required<
    Omit<HuggingFaceLocalConfig, "speakerEmbeddingsUrl">
  > & { speakerEmbeddingsUrl?: string };

  /** Cached synthesizer pipeline. Populated on first render call. */
  private synthesizerPromise: Promise<TJSSynthesizer> | null = null;

  constructor(config: HuggingFaceLocalConfig = {}) {
    this.config = {
      model: config.model ?? "Xenova/speecht5_tts",
      quantized: config.quantized ?? false,
      speakerEmbeddingsUrl: config.speakerEmbeddingsUrl,
    };
  }

  async render(
    segments: RenderSegment[],
    options: HuggingFaceLocalRenderOptions
  ): Promise<RenderResult[]> {
    const synthesizer = await this.getSynthesizer();
    const results: RenderResult[] = [];
    for (const seg of segments) {
      results.push(await this.renderSegment(seg, options, synthesizer));
    }
    return results;
  }

  /**
   * Lazily initialise and cache the Transformers.js TTS pipeline.
   * Dynamic import keeps `@huggingface/transformers` out of the synchronous
   * module graph — callers that never instantiate this provider pay no cost.
   */
  private getSynthesizer(): Promise<TJSSynthesizer> {
    if (!this.synthesizerPromise) {
      this.synthesizerPromise = this.initSynthesizer();
    }
    return this.synthesizerPromise;
  }

  private async initSynthesizer(): Promise<TJSSynthesizer> {
    let pipelineFn: (
      task: string,
      model: string,
      opts: { quantized: boolean }
    ) => Promise<TJSSynthesizer>;

    try {
      // Dynamic import so that bundlers can tree-shake / code-split this.
      const transformers = await import("@huggingface/transformers");
      pipelineFn = transformers.pipeline as typeof pipelineFn;
    } catch {
      throw new Error(
        "HuggingFaceLocalProvider requires '@huggingface/transformers' to be " +
          "installed. Run: npm install @huggingface/transformers"
      );
    }

    return pipelineFn("text-to-speech", this.config.model, {
      quantized: this.config.quantized,
    });
  }

  private async renderSegment(
    segment: RenderSegment,
    _options: HuggingFaceLocalRenderOptions,
    synthesizer: TJSSynthesizer
  ): Promise<RenderResult> {
    const pipelineOptions = this.config.speakerEmbeddingsUrl
      ? { speaker_embeddings: this.config.speakerEmbeddingsUrl }
      : undefined;

    const output = await synthesizer(segment.text, pipelineOptions);
    const audio = encodeWav(output.audio, output.sampling_rate);

    return {
      segmentId: segment.id,
      audio,
      format: "wav",
    };
  }
}
