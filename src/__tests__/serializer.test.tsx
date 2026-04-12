/** @jsxImportSource react */
import React from "react";
import { compile } from "../ast";
import { serialize } from "../serializer";
import { Redub, Agent, Pronunciation } from "../components";

describe("serialize()", () => {
  function xmlFrom(el: React.ReactElement): string {
    return serialize(compile(el));
  }

  describe("minimal document", () => {
    it("produces valid TTML wrapper with XML declaration", () => {
      const xml = xmlFrom(<Redub />);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('xmlns="http://www.w3.org/ns/ttml"');
      expect(xml).toMatch(/<tt[^>]*>/);
      expect(xml).toContain("<body/>");
    });

    it("sets xml:lang on <tt> when xmlLang is provided", () => {
      const xml = xmlFrom(<Redub xmlLang="en" />);
      expect(xml).toContain('xml:lang="en"');
    });
  });

  describe("body / div / p / span", () => {
    it("serializes a <div> with begin and end", () => {
      const xml = xmlFrom(
        <Redub>
          <div begin="10s" end="13s" />
        </Redub>
      );
      expect(xml).toContain('<div begin="10s" end="13s"/>');
    });

    it("serializes nested p and span with text", () => {
      const xml = xmlFrom(
        <Redub>
          <div begin="10s" end="13s">
            <p>
              <span begin="0s">Hello</span>
              <span begin="1.5s"> world</span>
            </p>
          </div>
        </Redub>
      );
      expect(xml).toContain('<span begin="0s">Hello</span>');
      expect(xml).toContain('<span begin="1.5s"> world</span>');
    });

    it("serializes text, nested spans, and nested divs", () => {
      const xml = xmlFrom(
        <Redub>
          <div id="outer">
            <div id="inner">
              <p>
                {"Lead "}
                <span>
                  inner
                  <span begin="1s">nested</span>
                </span>
              </p>
            </div>
          </div>
        </Redub>
      );

      expect(xml).toContain('<div id="outer"><div id="inner">');
      expect(xml).toContain("<p>Lead <span>inner<span begin=\"1s\">nested</span></span></p>");
    });

    it("escapes XML special characters in text", () => {
      const xml = xmlFrom(
        <Redub>
          <div>
            <p>
              <span>{"AT&T <rocks>"}</span>
            </p>
          </div>
        </Redub>
      );
      expect(xml).toContain("AT&amp;T &lt;rocks&gt;");
    });

    it("serializes div id attribute", () => {
      const xml = xmlFrom(
        <Redub>
          <div id="d1" />
        </Redub>
      );
      expect(xml).toContain('id="d1"');
    });
  });

  describe("DAPT attributes", () => {
    it("includes dapt namespace when DAPT attributes are present", () => {
      const xml = xmlFrom(
        <Redub langSrc="fr" />
      );
      expect(xml).toContain("xmlns:dapt=");
      expect(xml).toContain('dapt:langSrc="fr"');
    });

    it("serializes scriptType and scriptRepresents on <tt>", () => {
      const xml = xmlFrom(
        <Redub scriptType="preRecording" scriptRepresents={["audio.dialogue"]} />
      );
      expect(xml).toContain('dapt:scriptType="preRecording"');
      expect(xml).toContain('dapt:scriptRepresents="audio.dialogue"');
    });

    it("serializes dapt:agent on <div>", () => {
      const xml = xmlFrom(
        <Redub>
          <div {...({ agent: "character_1" } as object)} />
        </Redub>
      );
      expect(xml).toContain('dapt:agent="character_1"');
    });

    it("serializes dapt:represents on <div>", () => {
      const xml = xmlFrom(
        <Redub>
          <div {...({ represents: ["audio.dialogue"] } as object)} />
        </Redub>
      );
      expect(xml).toContain('dapt:represents="audio.dialogue"');
    });

    it("declares dapt namespace when a nested paragraph has langSrc", () => {
      const xml = xmlFrom(
        <Redub>
          <div>
            <p {...({ langSrc: "fr" } as object)} />
          </div>
        </Redub>
      );

      expect(xml).toContain("xmlns:dapt=");
      expect(xml).toContain('dapt:langSrc="fr"');
    });
  });

  describe("Remotion frame timing", () => {
    it("converts frame timing to time expressions in XML output", () => {
      const xml = xmlFrom(
        <Redub>
          <div {...({ from: 300, to: 390, fps: 30 } as object)} />
        </Redub>
      );
      expect(xml).toContain('begin="10s"');
      expect(xml).toContain('end="13s"');
      // Frame attributes should not appear in XML output
      expect(xml).not.toContain("from=");
      expect(xml).not.toContain("fps=");
    });
  });

  describe("head / metadata", () => {
    it("serializes Agent inside metadata", () => {
      const xml = xmlFrom(
        <Redub>
          <Redub.Head>
            <Redub.Metadata>
              <Agent id="character_1" type="character" alias="ASSANE" />
            </Redub.Metadata>
          </Redub.Head>
        </Redub>
      );
      expect(xml).toContain("xmlns:ttm=");
      expect(xml).toContain("<head>");
      expect(xml).toContain("<metadata>");
      expect(xml).toContain('xml:id="character_1"');
      expect(xml).toContain('type="character"');
      expect(xml).toContain("ASSANE");
    });

    it("serializes an Agent without optional metadata as an empty name element", () => {
      const xml = xmlFrom(
        <Redub>
          <Redub.Head>
            <Redub.Metadata>
              <Agent id="character_2" />
            </Redub.Metadata>
          </Redub.Head>
        </Redub>
      );

      expect(xml).toContain('<ttm:agent xml:id="character_2"><ttm:name/></ttm:agent>');
    });

    it("serializes Pronunciation inside metadata with redub namespace", () => {
      const xml = xmlFrom(
        <Redub>
          <Redub.Head>
            <Redub.Metadata>
              <Pronunciation target="SQL" alias="sequel" />
            </Redub.Metadata>
          </Redub.Head>
        </Redub>
      );
      expect(xml).toContain("xmlns:redub=");
      expect(xml).toContain('<redub:pronunciation target="SQL" alias="sequel"');
    });

    it("serializes Pronunciation with IPA", () => {
      const xml = xmlFrom(
        <Redub>
          <Redub.Head>
            <Redub.Metadata>
              <Pronunciation target="GIF" ipa="ɡɪf" />
            </Redub.Metadata>
          </Redub.Head>
        </Redub>
      );
      expect(xml).toContain('target="GIF"');
      expect(xml).toContain('ipa="ɡɪf"');
    });

    it("omits ttm namespace when no agents present", () => {
      const xml = xmlFrom(
        <Redub>
          <Redub.Head>
            <Redub.Metadata>
              <Pronunciation target="SQL" alias="sequel" />
            </Redub.Metadata>
          </Redub.Head>
        </Redub>
      );
      expect(xml).not.toContain("xmlns:ttm=");
    });

    it("omits redub namespace when no pronunciations present", () => {
      const xml = xmlFrom(
        <Redub>
          <Redub.Head>
            <Redub.Metadata>
              <Agent id="c1" type="character" alias="Hero" />
            </Redub.Metadata>
          </Redub.Head>
        </Redub>
      );
      expect(xml).not.toContain("xmlns:redub=");
    });

    it("omits head element when no head children", () => {
      const xml = xmlFrom(<Redub />);
      expect(xml).not.toContain("<head");
    });

    it("serializes metadata from named slots", () => {
      const xml = xmlFrom(
        <Redub>
          <Redub.Slot name="metadata">
            <Agent id="slot-agent" />
            <Pronunciation target="SQL" alias="sequel" />
          </Redub.Slot>
        </Redub>
      );

      expect(xml).toContain("<head>");
      expect(xml).toContain("<metadata>");
      expect(xml).toContain('xml:id="slot-agent"');
      expect(xml).toContain('<redub:pronunciation target="SQL" alias="sequel"');
      expect(xml).toContain("xmlns:ttm=");
      expect(xml).toContain("xmlns:redub=");
    });
  });

  describe("integration — PRD example", () => {
    it("produces the example output from the PRD", () => {
      const xml = xmlFrom(
        <Redub xmlLang="en">
          <div begin="10s" end="13s">
            <p>
              <span begin="0s">Hello</span>
              <span begin="1.5s"> world</span>
            </p>
          </div>
        </Redub>
      );
      expect(xml).toContain('xmlns="http://www.w3.org/ns/ttml"');
      expect(xml).toContain('xml:lang="en"');
      expect(xml).toContain('<div begin="10s" end="13s">');
      expect(xml).toContain("<p>");
      expect(xml).toContain('<span begin="0s">Hello</span>');
      expect(xml).toContain('<span begin="1.5s"> world</span>');
    });

    it("produces the full-featured PRD example with head and body", () => {
      const xml = xmlFrom(
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

      // Namespaces
      expect(xml).toContain('xmlns="http://www.w3.org/ns/ttml"');
      expect(xml).toContain("xmlns:ttm=");
      expect(xml).toContain("xmlns:dapt=");
      expect(xml).toContain("xmlns:redub=");

      // Document attributes
      expect(xml).toContain('xml:lang="en"');
      expect(xml).toContain('dapt:langSrc="fr"');
      expect(xml).toContain('dapt:scriptType="preRecording"');

      // Head / metadata
      expect(xml).toContain('<ttm:agent xml:id="character_1">');
      expect(xml).toContain('<redub:pronunciation target="SQL" alias="sequel"');

      // Body
      expect(xml).toContain('id="d1"');
      expect(xml).toContain('dapt:agent="character_1"');
      expect(xml).toContain('<span begin="0s">Hello</span>');
    });
  });

  describe("onScreen attribute", () => {
    it("serializes dapt:onScreen on <div> and declares xmlns:dapt", () => {
      const xml = xmlFrom(
        <Redub>
          <div {...({ onScreen: true } as object)} />
        </Redub>
      );
      expect(xml).toContain("xmlns:dapt=");
      expect(xml).toContain('dapt:onScreen="true"');
    });

    it("serializes dapt:onScreen=false and declares xmlns:dapt", () => {
      const xml = xmlFrom(
        <Redub>
          <div {...({ onScreen: false } as object)} />
        </Redub>
      );
      expect(xml).toContain("xmlns:dapt=");
      expect(xml).toContain('dapt:onScreen="false"');
    });
  });

  describe("defensive serialization", () => {
    it("throws on unexpected nested body nodes in malformed AST input", () => {
      expect(() =>
        serialize({
          kind: "document",
          body: {
            kind: "body",
            children: [
              {
                kind: "div",
                children: [{ kind: "unexpected" } as never],
              } as never,
            ],
          },
        } as never)
      ).toThrow(/unsupported child kind "unexpected" inside <div>/);
    });

    it("throws when malformed nested body nodes reach div serialization", () => {
      expect(() =>
        serialize({
          kind: "document",
          body: {
            kind: "body",
            children: [
              {
                kind: "div",
                agent: "speaker-1",
                children: [{ kind: "unexpected" } as never],
              } as never,
            ],
          },
        } as never)
      ).toThrow(/unsupported child kind "unexpected" inside <div>/);
    });
  });
});
