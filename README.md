# ReDub

A React authoring system for timed speech and narration, built on top of TTML2 / DAPT and inspired by Remotion.

## Quick start

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
        <Agent id="host" type="character" alias="Narrator" />
        <Pronunciation target="SQL" alias="sequel" />
      </Redub.Metadata>
    </Redub.Head>
    <div begin="0s" end="2s" {...({ agent: "host", represents: "audio.dialogue" } as object)}>
      <p>
        <span>Hello world</span>
      </p>
    </div>
  </Redub>
);

const xml = serialize(document);
```

## Usage resources

- Detailed guide: [`docs/usage.md`](docs/usage.md)
- Worked notebook examples: [`examples/redub-usage.ipynb`](examples/redub-usage.ipynb)
