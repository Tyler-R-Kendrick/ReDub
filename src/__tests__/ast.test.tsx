/** @jsxImportSource react */
import React from "react";
import { compile } from "../ast";
import { Redub, Agent, Pronunciation } from "../components";
import type {
  DocumentNode,
  DivNode,
  PNode,
  SpanNode,
  AgentNode,
  PronunciationNode,
} from "../types";

describe("compile()", () => {
  describe("document root", () => {
    it("requires a <Redub> root element", () => {
      expect(() =>
        compile(<div /> as unknown as React.ReactElement)
      ).toThrow(/compile\(\) expects a <Redub> root element/);
    });

    it("compiles a minimal <Redub> with no children", () => {
      const doc = compile(<Redub />);
      expect(doc.kind).toBe("document");
      expect(doc.body.children).toHaveLength(0);
      expect(doc.head).toBeUndefined();
    });

    it("captures document-level attributes", () => {
      const doc = compile(
        <Redub
          xmlLang="en"
          langSrc="fr"
          scriptType="preRecording"
          scriptRepresents={["audio.dialogue"]}
        />
      );
      expect(doc.xmlLang).toBe("en");
      expect(doc.langSrc).toBe("fr");
      expect(doc.scriptType).toBe("preRecording");
      expect(doc.scriptRepresents).toEqual(["audio.dialogue"]);
    });
  });

  describe("body / div / p / span", () => {
    it("compiles a single <div> into the body", () => {
      const doc = compile(
        <Redub>
          <div id="d1" begin="10s" end="13s" />
        </Redub>
      );
      expect(doc.body.children).toHaveLength(1);
      const div = doc.body.children[0] as DivNode;
      expect(div.kind).toBe("div");
      expect(div.id).toBe("d1");
      expect(div.begin).toBe("10s");
      expect(div.end).toBe("13s");
    });

    it("compiles nested <p> inside <div>", () => {
      const doc = compile(
        <Redub>
          <div>
            <p xmlLang="en" />
          </div>
        </Redub>
      );
      const div = doc.body.children[0] as DivNode;
      expect(div.children).toHaveLength(1);
      const p = div.children[0] as PNode;
      expect(p.kind).toBe("p");
      expect(p.xmlLang).toBe("en");
    });

    it("compiles <span> with text inside <p>", () => {
      const doc = compile(
        <Redub>
          <div>
            <p>
              <span begin="0s">Hello</span>
              <span begin="1.5s"> world</span>
            </p>
          </div>
        </Redub>
      );
      const p = (doc.body.children[0] as DivNode).children[0] as PNode;
      expect(p.children).toHaveLength(2);
      const span1 = p.children[0] as SpanNode;
      expect(span1.kind).toBe("span");
      expect(span1.begin).toBe("0s");
      expect((span1.children[0] as { kind: "text"; value: string }).value).toBe(
        "Hello"
      );
      const span2 = p.children[1] as SpanNode;
      expect(span2.begin).toBe("1.5s");
    });

    it("compiles div agent and represents attributes", () => {
      const doc = compile(
        <Redub>
          <div
            {...({ agent: "character_1", represents: "audio.dialogue" } as object)}
          />
        </Redub>
      );
      const div = doc.body.children[0] as DivNode;
      expect(div.agent).toBe("character_1");
      expect(div.represents).toEqual(["audio.dialogue"]);
    });

    it("accepts represents as an array", () => {
      const doc = compile(
        <Redub>
          <div
            {...({
              represents: ["audio.dialogue", "video.description"],
            } as object)}
          />
        </Redub>
      );
      const div = doc.body.children[0] as DivNode;
      expect(div.represents).toEqual([
        "audio.dialogue",
        "video.description",
      ]);
    });

    it("compiles nested divs", () => {
      const doc = compile(
        <Redub>
          <div id="outer">
            <div id="inner" />
          </div>
        </Redub>
      );
      const outer = doc.body.children[0] as DivNode;
      expect(outer.id).toBe("outer");
      expect(outer.children).toHaveLength(1);
      const inner = outer.children[0] as DivNode;
      expect(inner.id).toBe("inner");
    });
  });

  describe("Remotion frame timing", () => {
    it("converts from/to/fps to begin/end time expressions on div", () => {
      const doc = compile(
        <Redub>
          <div {...({ from: 300, to: 390, fps: 30 } as object)} />
        </Redub>
      );
      const div = doc.body.children[0] as DivNode;
      expect(div.begin).toBe("10s");
      expect(div.end).toBe("13s");
    });

    it("converts fractional frames correctly", () => {
      const doc = compile(
        <Redub>
          <div {...({ from: 1, to: 2, fps: 3 } as object)} />
        </Redub>
      );
      const div = doc.body.children[0] as DivNode;
      expect(div.begin).toBe("0.333s");
      expect(div.end).toBe("0.667s");
    });
  });

  describe("head / metadata / Agent / Pronunciation", () => {
    it("compiles a head with an Agent", () => {
      const doc = compile(
        <Redub>
          <Redub.Head>
            <Redub.Metadata>
              <Agent id="character_1" type="character" alias="ASSANE" />
            </Redub.Metadata>
          </Redub.Head>
        </Redub>
      );
      expect(doc.head).toBeDefined();
      const meta = doc.head!.children[0];
      expect(meta.kind).toBe("metadata");
      const agent = meta.children[0] as AgentNode;
      expect(agent.kind).toBe("agent");
      expect(agent.id).toBe("character_1");
      expect(agent.type).toBe("character");
      expect(agent.alias).toBe("ASSANE");
    });

    it("compiles a head with a Pronunciation", () => {
      const doc = compile(
        <Redub>
          <Redub.Head>
            <Redub.Metadata>
              <Pronunciation target="SQL" alias="sequel" />
            </Redub.Metadata>
          </Redub.Head>
        </Redub>
      );
      const meta = doc.head!.children[0];
      const pron = meta.children[0] as PronunciationNode;
      expect(pron.kind).toBe("pronunciation");
      expect(pron.target).toBe("SQL");
      expect(pron.alias).toBe("sequel");
    });

    it("compiles head and body together", () => {
      const doc = compile(
        <Redub xmlLang="en">
          <Redub.Head>
            <Redub.Metadata>
              <Agent id="c1" type="character" alias="Hero" />
            </Redub.Metadata>
          </Redub.Head>
          <div begin="0s" end="5s">
            <p>
              <span begin="0s">Hi</span>
            </p>
          </div>
        </Redub>
      );
      expect(doc.head).toBeDefined();
      expect(doc.body.children).toHaveLength(1);
    });
  });
});
