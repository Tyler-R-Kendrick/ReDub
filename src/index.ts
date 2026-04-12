/**
 * ReDub — public API.
 *
 * Usage:
 * ```tsx
 * import { Redub, Agent, Pronunciation, compile, serialize } from "redub";
 *
 * const doc = compile(
 *   <Redub xmlLang="en">
 *     <div begin="10s" end="13s">
 *       <p><span begin="0s">Hello world</span></p>
 *     </div>
 *   </Redub>
 * );
 *
 * const xml = serialize(doc);
 * ```
 */

export { Redub, Head, Metadata, Agent, Pronunciation } from "./components";
export type {
  RedubProps,
  HeadProps,
  MetadataProps,
  AgentProps,
  PronunciationProps,
} from "./components";

export { compile } from "./ast";
export { serialize } from "./serializer";

export {
  render,
  extractSegments,
  ElevenLabsProvider,
  OpenAIProvider,
} from "./render";
export type {
  AudioFormat,
  RenderOptions,
  RenderSegment,
  RenderResult,
  RenderProvider,
  ElevenLabsConfig,
  ElevenLabsRenderOptions,
  OpenAIConfig,
  OpenAIRenderOptions,
  OpenAIVoice,
  OpenAITTSModel,
} from "./render";

export type {
  Node,
  DocumentNode,
  HeadNode,
  MetadataNode,
  AgentNode,
  PronunciationNode,
  BodyNode,
  DivNode,
  PNode,
  SpanNode,
  TextNode,
} from "./types";
