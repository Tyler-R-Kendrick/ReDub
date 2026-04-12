# ReDub usage

## Authoring model

ReDub uses JSX to describe a timed speech document, then converts that tree into a normalized AST and finally into TTML2 / DAPT XML.

Typical flow:

1. Author a JSX tree rooted at `<Redub>`.
2. Call `compile()` to convert JSX into a `DocumentNode`.
3. Call `serialize()` to emit TTML2 / DAPT XML.

## Core API

### `Redub`

Document root for the authored script.

Supported document props:

- `xmlLang`
- `langSrc`
- `scriptType`
- `scriptRepresents`

### `Redub.Head`, `Redub.Metadata`, and named slots

Optional metadata container for:

- `<Agent />`
- `<Pronunciation />`

`<Agent />` and `<Pronunciation />` must be nested inside `<Redub.Metadata>`. Placing either component directly under `<Redub>` or `<Redub.Head>` throws a compiler error.

You can also use named slots for optional extension:

- `<Redub.Slot name="head">...</Redub.Slot>`
- `<Redub.Slot name="metadata">...</Redub.Slot>`

`name="metadata"` accepts either direct `<Agent />` / `<Pronunciation />` children or nested `<Redub.Metadata>` blocks.

### Body content

Body content must be wrapped in `<div>` elements. Supported authored structure:

- `<div>`
  - `<div>`
  - `<p>`
    - text
    - `<span>`

## Basic example

```tsx
import { Redub, compile, serialize } from "redub";

const document = compile(
  <Redub xmlLang="en">
    <div begin="10s" end="13s">
      <p>
        <span begin="0s">Hello</span>
        <span begin="1.5s"> world</span>
      </p>
    </div>
  </Redub>
);

const xml = serialize(document);
```

## Metadata example

```tsx
import { Redub, Agent, Pronunciation, compile, serialize } from "redub";

const document = compile(
  <Redub
    xmlLang="en"
    langSrc="fr"
    scriptType="preRecording"
    scriptRepresents={["audio.dialogue"]}
  >
    <Redub.Head>
      <Redub.Metadata>
        <Agent id="character_1" type="character" alias="ASSANE" />
        <Pronunciation target="SQL" alias="sequel" />
      </Redub.Metadata>
    </Redub.Head>
    <div
      id="d1"
      begin="10s"
      end="13s"
      {...({ agent: "character_1", represents: "audio.dialogue" } as object)}
    >
      <p xmlLang="en">
        <span begin="0s">Hello</span>
        <span begin="1.5s"> world</span>
      </p>
    </div>
  </Redub>
);

const xml = serialize(document);
```

## Slot-based metadata example

```tsx
import { Redub, Agent, Pronunciation, compile } from "redub";

const document = compile(
  <Redub xmlLang="en">
    <Redub.Slot name="metadata">
      <Agent id="character_1" type="character" alias="ASSANE" />
      <Pronunciation target="SQL" alias="sequel" />
    </Redub.Slot>
    <div begin="10s" end="13s">
      <p>
        <span begin="0s">Hello</span>
      </p>
    </div>
  </Redub>
);
```

## Timing

ReDub supports direct TTML timing props:

- `begin`
- `end`
- `dur`

It also supports Remotion-style frame timing on timed nodes:

- `from`
- `to`
- `fps`

When `fps` is provided with `from` and/or `to`, ReDub converts frames into TTML second expressions.

## Failure behavior

Compiler failures are deterministic and intended to be tested:

- `compile()` rejects roots that are not `<Redub>`
- multiple `<Redub.Head>` nodes are rejected
- `<Agent>` and `<Pronunciation>` are rejected when placed directly under `<Redub>`, `<Redub.Head>`, or inside a `<div>`
- invalid `fps` and frame inputs raise `RangeError`

## Output

`serialize()` emits:

- the TTML namespace by default
- the `ttm` namespace when agent metadata is present
- the `dapt` namespace when DAPT attributes are present
- the `redub` namespace when pronunciation extensions are present

## Examples

See the notebook at [`examples/redub-usage.ipynb`](../examples/redub-usage.ipynb) for copyable examples covering:

- basic authoring
- metadata authoring
- frame-based timing
