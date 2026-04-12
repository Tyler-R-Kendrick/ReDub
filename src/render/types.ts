/**
 * Shared types for the ReDub render pipeline.
 */

/** Supported output audio formats. */
export type AudioFormat = "mp3" | "wav" | "ogg" | "flac" | "aac";

/**
 * Base options type for all render providers.
 *
 * Concrete providers extend this with their own provider-specific options
 * (e.g. output format, quality settings) following the options DI pattern.
 */
export interface RenderOptions {}

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
 * `TOptions` is the provider-specific options type (must extend `RenderOptions`).
 * Callers pass a concrete provider and matching options, giving each provider
 * full control over its own configuration surface (Liskov substitution).
 *
 * @template TOptions Provider-specific options type.
 */
export interface RenderProvider<TOptions extends RenderOptions = RenderOptions> {
  /** Human-readable name of the provider (e.g. "elevenlabs"). */
  readonly name: string;

  /**
   * Synthesise audio for each segment and return one RenderResult per segment,
   * in the same order.
   */
  render(
    segments: RenderSegment[],
    options: TOptions
  ): Promise<RenderResult[]>;
}
