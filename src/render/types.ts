/**
 * Shared types for the ReDub render pipeline.
 */

/** Supported output audio formats. */
export type AudioFormat = "mp3" | "wav" | "ogg" | "flac" | "aac";

/** Common configuration shared across all render providers. */
export interface RenderConfig {
  /** Output audio format (e.g. "mp3", "wav"). */
  format: AudioFormat;
}

/**
 * A discrete segment of text to be synthesised by a render provider.
 * Derived from the body of a compiled DocumentNode.
 */
export interface RenderSegment {
  /** Identifier of the source node (div/p id), if present. */
  id?: string;
  /** Plain-text content to synthesise. */
  text: string;
  /** TTML begin time expression (e.g. "10s"). */
  begin?: string;
  /** TTML end time expression (e.g. "13s"). */
  end?: string;
  /** Agent/speaker identifier for this segment. */
  agent?: string;
}

/** Audio output produced by a render provider for a single segment. */
export interface RenderResult {
  /** Matches the id of the source RenderSegment. */
  segmentId?: string;
  /** Raw audio bytes. */
  audio: Uint8Array;
  /** Audio format of the bytes. */
  format: AudioFormat;
}

/**
 * Interface that all render providers must implement.
 *
 * A provider is responsible for converting an array of RenderSegments
 * into audio using a specific TTS back-end (e.g. ElevenLabs, OpenAI).
 */
export interface RenderProvider {
  /** Human-readable name of the provider (e.g. "elevenlabs"). */
  readonly name: string;

  /**
   * Synthesise audio for each segment and return one RenderResult per segment,
   * in the same order.
   */
  render(
    segments: RenderSegment[],
    config: RenderConfig
  ): Promise<RenderResult[]>;
}
