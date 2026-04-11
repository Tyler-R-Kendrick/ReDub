/**
 * DAPT AST Node types.
 * These represent the normalized internal tree used by the compiler and serializer.
 */

export type TextNode = {
  kind: "text";
  value: string;
};

export type SpanNode = {
  kind: "span";
  id?: string;
  begin?: string;
  end?: string;
  dur?: string;
  xmlLang?: string;
  children: Array<SpanNode | TextNode>;
};

export type PNode = {
  kind: "p";
  id?: string;
  begin?: string;
  end?: string;
  dur?: string;
  xmlLang?: string;
  langSrc?: string;
  children: Array<SpanNode | TextNode>;
};

export type DivNode = {
  kind: "div";
  id?: string;
  begin?: string;
  end?: string;
  dur?: string;
  agent?: string;
  represents?: string[];
  onScreen?: boolean;
  xmlLang?: string;
  langSrc?: string;
  children: Array<DivNode | PNode>;
};

export type AgentNode = {
  kind: "agent";
  id: string;
  type?: string;
  alias?: string;
};

export type PronunciationNode = {
  kind: "pronunciation";
  target: string;
  alias?: string;
  ipa?: string;
  xsampa?: string;
};

export type MetadataNode = {
  kind: "metadata";
  children: Array<AgentNode | PronunciationNode>;
};

export type HeadNode = {
  kind: "head";
  children: Array<MetadataNode>;
};

export type BodyNode = {
  kind: "body";
  children: Array<DivNode>;
};

export type DocumentNode = {
  kind: "document";
  xmlLang?: string;
  langSrc?: string;
  scriptType?: string;
  scriptRepresents?: string[];
  head?: HeadNode;
  body: BodyNode;
};

export type Node =
  | DocumentNode
  | HeadNode
  | MetadataNode
  | AgentNode
  | PronunciationNode
  | BodyNode
  | DivNode
  | PNode
  | SpanNode
  | TextNode;
