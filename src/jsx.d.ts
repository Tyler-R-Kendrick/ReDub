/**
 * JSX type augmentations for TTML/DAPT authoring attributes.
 *
 * Extends the standard HTML intrinsic element types so that TTML timing
 * attributes (begin, end, dur), DAPT content attributes (agent, represents,
 * xmlLang, langSrc, onScreen) and Remotion frame timing attributes (from, to,
 * fps) can be used on div, p, and span without TypeScript errors.
 */
import "react";

declare module "react" {
  namespace JSX {
    interface DivAttributes {
      /** TTML begin time expression (e.g. "10s", "00:00:10.000"). */
      begin?: string;
      /** TTML end time expression. */
      end?: string;
      /** TTML duration. */
      dur?: string;
      /** DAPT agent reference. */
      agent?: string;
      /** DAPT represents — one or more content category strings. */
      represents?: string | string[];
      /** DAPT onScreen flag. */
      onScreen?: boolean;
      /** BCP-47 language override. */
      xmlLang?: string;
      /** DAPT source language. */
      langSrc?: string;
      /** Remotion start frame. */
      from?: number;
      /** Remotion end frame. */
      to?: number;
      /** Frames-per-second for Remotion frame conversion. */
      fps?: number;
    }

    interface PAttributes {
      /** TTML begin time expression. */
      begin?: string;
      /** TTML end time expression. */
      end?: string;
      /** TTML duration. */
      dur?: string;
      /** BCP-47 language override. */
      xmlLang?: string;
      /** DAPT source language. */
      langSrc?: string;
    }

    interface SpanAttributes {
      /** TTML begin time expression. */
      begin?: string;
      /** TTML end time expression. */
      end?: string;
      /** TTML duration. */
      dur?: string;
      /** BCP-47 language override. */
      xmlLang?: string;
    }

    interface IntrinsicElements {
      div: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLDivElement> & DivAttributes,
        HTMLDivElement
      >;
      p: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLParagraphElement> & PAttributes,
        HTMLParagraphElement
      >;
      span: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLSpanElement> & SpanAttributes,
        HTMLSpanElement
      >;
    }
  }
}
