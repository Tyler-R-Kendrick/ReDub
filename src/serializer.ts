/**
 * DAPT AST → TTML2/DAPT XML serializer.
 */
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
// Namespaces
// ---------------------------------------------------------------------------

const NS_TTML = "http://www.w3.org/ns/ttml";
const NS_TTM = "http://www.w3.org/ns/ttml#metadata";
const NS_DAPT = "urn:ietf:rfc:9401";
const NS_REDUB = "http://redub.dev/ns";

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attrsToString(attrs: Record<string, string | undefined>): string {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${escape(v as string)}"`)
    .join("");
}

function element(
  tag: string,
  attrs: Record<string, string | undefined>,
  children: string
): string {
  const attrStr = attrsToString(attrs);
  if (children.length === 0) {
    return `<${tag}${attrStr}/>`;
  }
  return `<${tag}${attrStr}>${children}</${tag}>`;
}

// ---------------------------------------------------------------------------
// Node detectors (decide which optional namespaces are required)
// ---------------------------------------------------------------------------

function hasDaptAttributes(doc: DocumentNode): boolean {
  if (doc.langSrc || doc.scriptType || doc.scriptRepresents) return true;
  return doc.body.children.some(divHasDaptAttributes);
}

function divHasDaptAttributes(div: DivNode): boolean {
  if (div.represents || div.agent || div.langSrc || div.onScreen !== undefined)
    return true;
  return div.children.some((child) => {
    if (child.kind === "div") return divHasDaptAttributes(child);
    if (child.kind === "p") return child.langSrc !== undefined;
    return false;
  });
}

function hasRedubExtensions(doc: DocumentNode): boolean {
  if (!doc.head) return false;
  return doc.head.children.some((meta) =>
    meta.children.some((c) => c.kind === "pronunciation")
  );
}

function hasTtmMetadata(doc: DocumentNode): boolean {
  if (!doc.head) return false;
  return doc.head.children.some((meta) =>
    meta.children.some((c) => c.kind === "agent")
  );
}

// ---------------------------------------------------------------------------
// Node serializers
// ---------------------------------------------------------------------------

function serializeText(node: TextNode): string {
  return escape(node.value);
}

function serializeSpan(node: SpanNode): string {
  const attrs: Record<string, string | undefined> = {
    id: node.id,
    begin: node.begin,
    end: node.end,
    dur: node.dur,
    "xml:lang": node.xmlLang,
  };
  const children = node.children
    .map((c) => (c.kind === "text" ? serializeText(c) : serializeSpan(c)))
    .join("");
  return element("span", attrs, children);
}

function serializeP(node: PNode): string {
  const attrs: Record<string, string | undefined> = {
    id: node.id,
    begin: node.begin,
    end: node.end,
    dur: node.dur,
    "xml:lang": node.xmlLang,
    "dapt:langSrc": node.langSrc,
  };
  const children = node.children
    .map((c) => (c.kind === "text" ? serializeText(c) : serializeSpan(c)))
    .join("");
  return element("p", attrs, children);
}

function serializeDiv(node: DivNode): string {
  const attrs: Record<string, string | undefined> = {
    id: node.id,
    begin: node.begin,
    end: node.end,
    dur: node.dur,
    "dapt:agent": node.agent,
    "dapt:represents":
      node.represents != null ? node.represents.join(" ") : undefined,
    "dapt:onScreen":
      node.onScreen !== undefined ? String(node.onScreen) : undefined,
    "xml:lang": node.xmlLang,
    "dapt:langSrc": node.langSrc,
  };
  const children = node.children
    .map((c) => (c.kind === "div" ? serializeDiv(c) : serializeP(c)))
    .join("");
  return element("div", attrs, children);
}

function serializeAgent(node: AgentNode): string {
  const attrs: Record<string, string | undefined> = {
    "xml:id": node.id,
  };
  const nameAttrs: Record<string, string | undefined> = {
    type: node.type,
  };
  const nameContent = node.alias ? escape(node.alias) : "";
  const nameEl = element("ttm:name", nameAttrs, nameContent);
  return element("ttm:agent", attrs, nameEl);
}

function serializePronunciation(node: PronunciationNode): string {
  const attrs: Record<string, string | undefined> = {
    target: node.target,
    alias: node.alias,
    ipa: node.ipa,
    xsampa: node.xsampa,
  };
  return element("redub:pronunciation", attrs, "");
}

function serializeMetadata(node: MetadataNode): string {
  const children = node.children
    .map((c) => {
      if (c.kind === "agent") return serializeAgent(c);
      return serializePronunciation(c);
    })
    .join("");
  return element("metadata", {}, children);
}

function serializeHead(node: HeadNode): string {
  const children = node.children.map(serializeMetadata).join("");
  return element("head", {}, children);
}

function serializeBody(node: BodyNode): string {
  const children = node.children.map(serializeDiv).join("");
  return element("body", {}, children);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Serialize a DAPT DocumentNode AST to a TTML2/DAPT XML string.
 *
 * @example
 * ```ts
 * const xml = serialize(doc);
 * // → '<tt xmlns="http://www.w3.org/ns/ttml">…</tt>'
 * ```
 */
export function serialize(doc: DocumentNode): string {
  const needsDapt = hasDaptAttributes(doc);
  const needsRedub = hasRedubExtensions(doc);
  const needsTtm = hasTtmMetadata(doc);

  const attrs: Record<string, string | undefined> = {
    xmlns: NS_TTML,
    "xml:lang": doc.xmlLang,
  };

  if (needsTtm) attrs["xmlns:ttm"] = NS_TTM;
  if (needsDapt) attrs["xmlns:dapt"] = NS_DAPT;
  if (needsRedub) attrs["xmlns:redub"] = NS_REDUB;

  if (doc.langSrc) attrs["dapt:langSrc"] = doc.langSrc;
  if (doc.scriptType) attrs["dapt:scriptType"] = doc.scriptType;
  if (doc.scriptRepresents)
    attrs["dapt:scriptRepresents"] = doc.scriptRepresents.join(" ");

  const children =
    (doc.head ? serializeHead(doc.head) : "") + serializeBody(doc.body);

  return `<?xml version="1.0" encoding="UTF-8"?>\n${element("tt", attrs, children)}`;
}
