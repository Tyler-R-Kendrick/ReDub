---
name: redub-docs
description: >-
  Use this skill whenever the user wants to create, author, or generate timed speech scripts,
  audio dubbing scripts, narration tracks, or any kind of synchronized audio content using the
  ReDub library. Triggers include: "generate a dubbing script", "create timed narration",
  "write a TTML/DAPT script", "author a speech document with timing", "ReDub", "timed audio",
  "dubbing with agents", or any request to produce synchronized spoken audio with timing metadata.
  Also use when the user wants to understand how to structure audio timing, assign lines to voice
  actors/agents, add pronunciation hints, or convert frame-based timecodes to TTML seconds.
---

# ReDub Docs

ReDub is a React-based authoring system for timed speech and narration. It uses JSX to describe
a synchronized audio document, compiles the tree into a normalized AST, and serializes it to
TTML2 / DAPT XML — the interchange format used by professional dubbing pipelines.

## Quick orientation

The public API is three exports:

| Export | Purpose |
|---|---|
| `compile(jsx)` | Converts a JSX tree rooted at `<Redub>` into a `DocumentNode` AST |
| `serialize(doc)` | Converts a `DocumentNode` into TTML2 / DAPT XML string |
| Components | `Redub`, `Agent`, `Pronunciation` (and `Redub.Head`, `Redub.Metadata`) |

```ts
import { Redub, Agent, Pronunciation, compile, serialize } from "redub";
```

## Document structure

A ReDub document mirrors the TTML body structure:

```
<Redub>               ← document root (xmlLang required)
  <Redub.Head>        ← optional metadata container
    <Redub.Metadata>
      <Agent />       ← voice actor / character declaration
      <Pronunciation />  ← pronunciation hint
    </Redub.Metadata>
  </Redub.Head>
  <div>               ← timed block (maps to a TTML <div>)
    <p>               ← paragraph
      <span>text</span>  ← inline timed text
    </p>
  </div>
</Redub>
```

**Key constraints enforced by the compiler:**
- Root must be `<Redub>` — anything else throws.
- Only one `<Redub.Head>` allowed.
- `<Agent>` and `<Pronunciation>` must be inside `<Redub.Metadata>` — placing them elsewhere throws.
- `<div>` must be direct children of `<Redub>` (or nested divs).

## Generating audio scripts — step by step

### Step 1 — Plan your structure

Decide:
- **Language** (`xmlLang`, `langSrc` if dubbing from another language)
- **Script type**: `"preRecording"` for scripts to be recorded, or omit for post-production
- **Agents**: one entry per voice actor or character
- **Timing source**: raw TTML seconds (`begin`/`end`/`dur`) or Remotion-style frames (`from`/`to`/`fps`)

### Step 2 — Declare agents (if multi-character)

```tsx
<Redub.Metadata>
  <Agent id="narrator" type="character" alias="NARRATOR" />
  <Agent id="host"     type="character" alias="HOST" />
</Redub.Metadata>
```

Reference an agent from a `<div>` using the spread workaround (TypeScript needs it):

```tsx
<div {...({ agent: "narrator", represents: "audio.dialogue" } as object)}>
```

### Step 3 — Add pronunciation hints (optional)

```tsx
<Pronunciation target="SQL"  alias="sequel" />
<Pronunciation target="API"  alias="A P I" />
<Pronunciation target="ReDub" ipa="ɹiːdʌb" />
```

### Step 4 — Write timed content

**TTML-style (seconds):**
```tsx
<div begin="10s" end="13s">
  <p>
    <span begin="0s">Hello</span>
    <span begin="1.5s"> world</span>
  </p>
</div>
```

**Frame-based (Remotion-style):**
```tsx
<div from={240} to={390} fps={24}>
  <p><span from={0} fps={24}>Hello world</span></p>
</div>
```

When `fps` is given with `from`/`to`, ReDub converts frames to `"Ns"` TTML strings automatically.

### Step 5 — Compile and serialize

```tsx
const doc = compile(
  <Redub xmlLang="en" langSrc="fr" scriptType="preRecording" scriptRepresents={["audio.dialogue"]}>
    {/* head + body */}
  </Redub>
);

const xml = serialize(doc);
// xml is a complete TTML2 / DAPT XML string ready for a dubbing pipeline
```

## Common patterns

### Minimal single-voice script

```tsx
const xml = serialize(compile(
  <Redub xmlLang="en">
    <div begin="0s" end="5s">
      <p><span begin="0s">Welcome to the show.</span></p>
    </div>
  </Redub>
));
```

### Multi-character dialogue

```tsx
const xml = serialize(compile(
  <Redub xmlLang="en" langSrc="fr" scriptType="preRecording" scriptRepresents={["audio.dialogue"]}>
    <Redub.Head>
      <Redub.Metadata>
        <Agent id="alice" type="character" alias="ALICE" />
        <Agent id="bob"   type="character" alias="BOB" />
      </Redub.Metadata>
    </Redub.Head>
    <div begin="0s" end="4s" {...({ agent: "alice", represents: "audio.dialogue" } as object)}>
      <p><span begin="0s">Hello Bob.</span></p>
    </div>
    <div begin="4s" end="8s" {...({ agent: "bob", represents: "audio.dialogue" } as object)}>
      <p><span begin="0s">Hi Alice!</span></p>
    </div>
  </Redub>
));
```

### Slot-based metadata (alternative syntax)

Useful when authoring metadata separately from the head:

```tsx
const xml = serialize(compile(
  <Redub xmlLang="en">
    <Redub.Metadata slot="metadata">
      <Agent id="narrator" type="character" alias="NARRATOR" />
    </Redub.Metadata>
    <div begin="0s" end="10s">
      <p><span begin="0s">And so it begins...</span></p>
    </div>
  </Redub>
));
```

## What `serialize()` emits

The serializer automatically includes only the namespaces that are actually needed:

| Condition | Namespace added |
|---|---|
| Always | `tt` (TTML) |
| Agent metadata present | `ttm` |
| DAPT attributes present (`represents`, `agent`) | `dapt` |
| Pronunciation extensions present | `redub` |

## Reference documentation

For the full API reference, timing details, failure behavior, and more examples, read:

- **[`references/usage.md`](references/usage.md)** — complete usage guide (authoring model, all props, timing, failure behavior, output namespaces)
