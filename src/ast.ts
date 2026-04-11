/**
 * JSX → DAPT AST compiler.
 *
 * Call compile(<Redub>…</Redub>) to produce a DocumentNode.
 */
import React from "react";
import { Redub, Agent, Pronunciation } from "./components";
import type {
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Convert Remotion frame numbers to a TTML time expression ("Xs"). */
function framesToTime(frames: number, fps: number): string {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError(
      `framesToTime: fps must be a positive finite number, got ${fps}`
    );
  }
  if (!Number.isFinite(frames)) {
    throw new RangeError(
      `framesToTime: frames must be a finite number, got ${frames}`
    );
  }
  const seconds = frames / fps;
  // Format with up to 3 decimal places, trimming trailing zeros.
  const formatted = seconds.toFixed(3).replace(/\.?0+$/, "");
  return `${formatted}s`;
}

/** Resolve timing attributes, supporting Remotion from/to/fps props. */
function resolveTimingProps(props: Record<string, unknown>): {
  begin?: string;
  end?: string;
  dur?: string;
} {
  const { begin, end, dur, from, to, fps } = props as {
    begin?: string;
    end?: string;
    dur?: string;
    from?: number;
    to?: number;
    fps?: number;
  };

  if ((from !== undefined || to !== undefined) && fps !== undefined) {
    return {
      begin: from !== undefined ? framesToTime(from, fps) : undefined,
      end: to !== undefined ? framesToTime(to, fps) : undefined,
    };
  }

  return { begin, end, dur };
}

// ---------------------------------------------------------------------------
// Child node walkers
// ---------------------------------------------------------------------------

function compileSpanChildren(
  children: React.ReactNode
): Array<SpanNode | TextNode> {
  const result: Array<SpanNode | TextNode> = [];

  React.Children.forEach(children, (child) => {
    if (child == null || child === false) return;

    if (typeof child === "string" || typeof child === "number") {
      result.push({ kind: "text", value: String(child) });
      return;
    }

    if (React.isValidElement(child) && child.type === "span") {
      result.push(compileSpan(child.props as Record<string, unknown>));
    }
  });

  return result;
}

function compilePChildren(
  children: React.ReactNode
): Array<SpanNode | TextNode> {
  const result: Array<SpanNode | TextNode> = [];

  React.Children.forEach(children, (child) => {
    if (child == null || child === false) return;

    if (typeof child === "string" || typeof child === "number") {
      result.push({ kind: "text", value: String(child) });
      return;
    }

    if (React.isValidElement(child) && child.type === "span") {
      result.push(compileSpan(child.props as Record<string, unknown>));
    }
  });

  return result;
}

function compileDivChildren(
  children: React.ReactNode
): Array<DivNode | PNode> {
  const result: Array<DivNode | PNode> = [];

  React.Children.forEach(children, (child) => {
    if (child == null || child === false) return;
    if (!React.isValidElement(child)) return;

    const el = child as React.ReactElement<Record<string, unknown>>;

    if (el.type === Agent || el.type === Pronunciation) {
      throw new Error(
        `<${el.type === Agent ? "Agent" : "Pronunciation"}> may only appear inside <Redub.Metadata>, not inside a <div>.`
      );
    }

    if (el.type === "div") {
      result.push(compileDiv(el.props));
    } else if (el.type === "p") {
      result.push(compileP(el.props));
    }
  });

  return result;
}

// ---------------------------------------------------------------------------
// Node compilers
// ---------------------------------------------------------------------------

function compileSpan(props: Record<string, unknown>): SpanNode {
  const { begin, end, dur } = resolveTimingProps(props);
  return {
    kind: "span",
    id: props.id as string | undefined,
    begin,
    end,
    dur,
    xmlLang: props.xmlLang as string | undefined,
    children: compileSpanChildren(props.children as React.ReactNode),
  };
}

function compileP(props: Record<string, unknown>): PNode {
  const { begin, end, dur } = resolveTimingProps(props);
  return {
    kind: "p",
    id: props.id as string | undefined,
    begin,
    end,
    dur,
    xmlLang: props.xmlLang as string | undefined,
    langSrc: props.langSrc as string | undefined,
    children: compilePChildren(props.children as React.ReactNode),
  };
}

function compileDiv(props: Record<string, unknown>): DivNode {
  const { begin, end, dur } = resolveTimingProps(props);

  const represents = props.represents as string | string[] | undefined;
  const representsArr =
    represents == null
      ? undefined
      : Array.isArray(represents)
      ? represents
      : [represents];

  return {
    kind: "div",
    id: props.id as string | undefined,
    begin,
    end,
    dur,
    agent: props.agent as string | undefined,
    represents: representsArr,
    onScreen: props.onScreen as boolean | undefined,
    xmlLang: props.xmlLang as string | undefined,
    langSrc: props.langSrc as string | undefined,
    children: compileDivChildren(props.children as React.ReactNode),
  };
}

function compileAgent(props: Record<string, unknown>): AgentNode {
  return {
    kind: "agent",
    id: props.id as string,
    type: props.type as string | undefined,
    alias: props.alias as string | undefined,
  };
}

function compilePronunciation(
  props: Record<string, unknown>
): PronunciationNode {
  return {
    kind: "pronunciation",
    target: props.target as string,
    alias: props.alias as string | undefined,
    ipa: props.ipa as string | undefined,
    xsampa: props.xsampa as string | undefined,
  };
}

function compileMetadataChildren(
  children: React.ReactNode
): Array<AgentNode | PronunciationNode> {
  const result: Array<AgentNode | PronunciationNode> = [];

  React.Children.forEach(children, (child) => {
    if (child == null || child === false) return;

    if (React.isValidElement(child) && child.type === Agent) {
      result.push(compileAgent(child.props as Record<string, unknown>));
    } else if (React.isValidElement(child) && child.type === Pronunciation) {
      result.push(compilePronunciation(child.props as Record<string, unknown>));
    }
  });

  return result;
}

function compileMetadata(props: Record<string, unknown>): MetadataNode {
  return {
    kind: "metadata",
    children: compileMetadataChildren(props.children as React.ReactNode),
  };
}

function compileHeadChildren(children: React.ReactNode): Array<MetadataNode> {
  const result: Array<MetadataNode> = [];

  React.Children.forEach(children, (child) => {
    if (child == null || child === false) return;

    if (React.isValidElement(child) && child.type === Redub.Metadata) {
      result.push(compileMetadata(child.props as Record<string, unknown>));
    }
  });

  return result;
}

function compileHead(props: Record<string, unknown>): HeadNode {
  return {
    kind: "head",
    children: compileHeadChildren(props.children as React.ReactNode),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile a <Redub> JSX element tree into a DAPT DocumentNode AST.
 *
 * @example
 * ```tsx
 * const doc = compile(
 *   <Redub xmlLang="en">
 *     <div begin="10s" end="13s">
 *       <p><span begin="0s">Hello</span></p>
 *     </div>
 *   </Redub>
 * );
 * ```
 */
export function compile(
  element: React.ReactElement
): DocumentNode {
  if (element.type !== Redub) {
    throw new Error(
      `compile() expects a <Redub> root element, got "${String(element.type)}"`
    );
  }

  const props = element.props as Record<string, unknown>;
  const children = props.children as React.ReactNode;

  let head: HeadNode | undefined;
  const bodyChildren: Array<DivNode> = [];

  React.Children.forEach(children, (child) => {
    if (child == null || child === false) return;
    if (!React.isValidElement(child)) return;

    const el = child as React.ReactElement<Record<string, unknown>>;

    if (el.type === Redub.Head) {
      if (head !== undefined) {
        throw new Error(
          "<Redub> may only contain one <Redub.Head> element."
        );
      }
      head = compileHead(el.props);
    } else if (el.type === Agent || el.type === Pronunciation) {
      throw new Error(
        `<${el.type === Agent ? "Agent" : "Pronunciation"}> may only appear inside <Redub.Metadata>, not as a direct child of <Redub>.`
      );
    } else if (el.type === "div") {
      bodyChildren.push(compileDiv(el.props));
    }
    // Other top-level children (p, span) are ignored per the DAPT model;
    // content must be wrapped in <div>.
  });

  const scriptRepresents = props.scriptRepresents as string[] | undefined;

  return {
    kind: "document",
    xmlLang: props.xmlLang as string | undefined,
    langSrc: props.langSrc as string | undefined,
    scriptType: props.scriptType as string | undefined,
    scriptRepresents: scriptRepresents,
    head,
    body: { kind: "body", children: bodyChildren },
  };
}
