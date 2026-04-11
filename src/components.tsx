/**
 * ReDub React components.
 *
 * These are compile-time authoring components — they are not intended to
 * render to the DOM.  Pass a JSX tree rooted at <Redub> to compile() to
 * produce the DAPT AST, then serialise it with serialize().
 */
import React from "react";

// ---------------------------------------------------------------------------
// Prop interfaces
// ---------------------------------------------------------------------------

export interface RedubProps {
  /** BCP-47 language tag for the document (maps to xml:lang on <tt>). */
  xmlLang?: string;
  /** Source language (DAPT langSrc). */
  langSrc?: string;
  /** DAPT scriptType (e.g. "preRecording"). */
  scriptType?: string;
  /** DAPT scriptRepresents (e.g. ["audio.dialogue"]). */
  scriptRepresents?: string[];
  children?: React.ReactNode;
}

export interface HeadProps {
  children?: React.ReactNode;
}

export interface MetadataProps {
  children?: React.ReactNode;
}

export interface AgentProps {
  /** Unique identifier for the agent. */
  id: string;
  /** Agent type (e.g. "character"). */
  type?: string;
  /** Display alias / name for the agent. */
  alias?: string;
}

export interface PronunciationProps {
  /** The word or phrase whose pronunciation is being specified. */
  target: string;
  /** Alternative alias to substitute when speaking. */
  alias?: string;
  /** IPA phonetic representation. */
  ipa?: string;
  /** X-SAMPA phonetic representation. */
  xsampa?: string;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/**
 * Document root component.  All non-Head children become body content.
 *
 * Usage:
 * ```tsx
 * <Redub xmlLang="en">
 *   <Redub.Head>…</Redub.Head>
 *   <div begin="10s" end="13s">…</div>
 * </Redub>
 * ```
 */
const RedubRoot: React.FC<RedubProps> = () => null;

/**
 * Optional document head.  Must contain only <Redub.Metadata> children.
 */
const Head: React.FC<HeadProps> = () => null;

/**
 * Metadata section inside the document head.
 * May contain <Agent> and <Pronunciation> elements.
 */
const Metadata: React.FC<MetadataProps> = () => null;

export const Redub = Object.assign(RedubRoot, { Head, Metadata });

/**
 * Declares a named agent (speaker) in the document metadata.
 *
 * ```tsx
 * <Agent id="character_1" type="character" alias="ASSANE" />
 * ```
 */
export const Agent: React.FC<AgentProps> = () => null;

/**
 * Declares a pronunciation rule in the document metadata.
 *
 * ```tsx
 * <Pronunciation target="SQL" alias="sequel" />
 * ```
 */
export const Pronunciation: React.FC<PronunciationProps> = () => null;
