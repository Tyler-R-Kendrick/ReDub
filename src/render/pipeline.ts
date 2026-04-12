/**
 * Core render pipeline: extracts RenderSegments from a DocumentNode and
 * delegates synthesis to a RenderProvider.
 */
import type { DocumentNode, DivNode, PNode, SpanNode, TextNode } from "../types";
import type { RenderConfig, RenderProvider, RenderResult, RenderSegment } from "./types";

// ---------------------------------------------------------------------------
// Internal helpers — text extraction
// ---------------------------------------------------------------------------

function textFromChildren(
  children: Array<SpanNode | TextNode>
): string {
  return children
    .map((c) =>
      c.kind === "text" ? c.value : textFromChildren(c.children)
    )
    .join("");
}

function segmentsFromP(p: PNode, parentDiv: DivNode): RenderSegment | null {
  const text = textFromChildren(p.children).trim();
  if (!text) return null;
  return {
    id: p.id ?? parentDiv.id,
    text,
    begin: p.begin ?? parentDiv.begin,
    end: p.end ?? parentDiv.end,
    agent: parentDiv.agent,
  };
}

function segmentsFromDiv(div: DivNode): RenderSegment[] {
  const results: RenderSegment[] = [];
  for (const child of div.children) {
    if (child.kind === "div") {
      results.push(...segmentsFromDiv(child));
    } else if (child.kind === "p") {
      const seg = segmentsFromP(child, div);
      if (seg) results.push(seg);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract ordered RenderSegments from a compiled DocumentNode.
 *
 * Each `<p>` element with non-empty text produces one segment. Timing and
 * agent context are inherited from the enclosing `<div>` when not set on the
 * `<p>` itself.
 */
export function extractSegments(doc: DocumentNode): RenderSegment[] {
  const segments: RenderSegment[] = [];
  for (const div of doc.body.children) {
    segments.push(...segmentsFromDiv(div));
  }
  return segments;
}

/**
 * Render a DocumentNode to audio using the supplied provider.
 *
 * Text is extracted from every `<p>` in the document body and sent to the
 * provider for synthesis. Results are returned in document order.
 *
 * @example
 * ```ts
 * import { compile } from "redub";
 * import { render, ElevenLabsProvider } from "redub/render";
 *
 * const doc = compile(<Redub xmlLang="en">…</Redub>);
 * const results = await render(doc, new ElevenLabsProvider({ apiKey, voiceId }), { format: "mp3" });
 * ```
 */
export async function render(
  doc: DocumentNode,
  provider: RenderProvider,
  config: RenderConfig
): Promise<RenderResult[]> {
  const segments = extractSegments(doc);
  return provider.render(segments, config);
}
