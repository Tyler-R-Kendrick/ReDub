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

export { Redub, Agent, Pronunciation } from "./components";
export type {
  RedubProps,
  HeadProps,
  MetadataProps,
  AgentProps,
  PronunciationProps,
} from "./components";

export { compile } from "./ast";
export { serialize } from "./serializer";

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
