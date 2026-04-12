/** @jsxImportSource react */
import React from "react";
import { compile } from "../ast";
import { Redub } from "../components";
import { extractSegments, render } from "../render/pipeline";
import { ElevenLabsProvider } from "../render/providers/elevenlabs";
import type { ElevenLabsRenderOptions } from "../render/providers/elevenlabs";
import { OpenAIProvider } from "../render/providers/openai";
import type { OpenAIRenderOptions } from "../render/providers/openai";
import type {
  RenderOptions,
  RenderProvider,
  RenderResult,
  RenderSegment,
} from "../render/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAudio(size = 4): Uint8Array {
  return new Uint8Array(size).fill(0xff);
}

/** Minimal mock provider that echoes segments back as fake audio. */
function makeMockProvider(name = "mock"): RenderProvider<RenderOptions> {
  return {
    name,
    async render(
      segments: RenderSegment[],
      _options: RenderOptions
    ): Promise<RenderResult[]> {
      return segments.map((seg) => ({
        segmentId: seg.id,
        audio: makeAudio(),
        format: "mp3",
      }));
    },
  };
}

// ---------------------------------------------------------------------------
// extractSegments()
// ---------------------------------------------------------------------------

describe("extractSegments()", () => {
  it("returns an empty array for a document with no body content", () => {
    const doc = compile(<Redub />);
    expect(extractSegments(doc)).toEqual([]);
  });

  it("returns an empty array when divs contain no <p> elements", () => {
    const doc = compile(
      <Redub>
        <div id="d1" begin="0s" end="1s" />
      </Redub>
    );
    expect(extractSegments(doc)).toEqual([]);
  });

  it("ignores <p> elements with only whitespace text", () => {
    const doc = compile(
      <Redub>
        <div>
          <p>
            <span>{"   "}</span>
          </p>
        </div>
      </Redub>
    );
    expect(extractSegments(doc)).toEqual([]);
  });

  it("extracts a single segment from a div > p > span tree", () => {
    const doc = compile(
      <Redub>
        <div id="d1" begin="0s" end="5s">
          <p id="p1">
            <span>Hello world</span>
          </p>
        </div>
      </Redub>
    );
    const segments = extractSegments(doc);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      id: "p1",
      text: "Hello world",
      begin: "0s",
      end: "5s",
    });
  });

  it("inherits id and timing from the parent div when <p> has none", () => {
    const doc = compile(
      <Redub>
        <div id="outer" begin="2s" end="4s">
          <p>
            <span>Text</span>
          </p>
        </div>
      </Redub>
    );
    const [seg] = extractSegments(doc);
    expect(seg.id).toBe("outer");
    expect(seg.begin).toBe("2s");
    expect(seg.end).toBe("4s");
  });

  it("extracts the agent from the enclosing div", () => {
    const doc = compile(
      <Redub>
        <div {...({ agent: "speaker_1" } as object)}>
          <p>
            <span>Line</span>
          </p>
        </div>
      </Redub>
    );
    const [seg] = extractSegments(doc);
    expect(seg.agent).toBe("speaker_1");
  });

  it("extracts multiple segments from multiple <p> elements", () => {
    const doc = compile(
      <Redub>
        <div id="d1" begin="0s" end="3s">
          <p id="p1">
            <span>First</span>
          </p>
          <p id="p2">
            <span>Second</span>
          </p>
        </div>
      </Redub>
    );
    const segments = extractSegments(doc);
    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe("First");
    expect(segments[1].text).toBe("Second");
  });

  it("concatenates text across multiple spans in a <p>", () => {
    const doc = compile(
      <Redub>
        <div>
          <p>
            <span begin="0s">Hello</span>
            <span begin="1s"> world</span>
          </p>
        </div>
      </Redub>
    );
    const [seg] = extractSegments(doc);
    expect(seg.text).toBe("Hello world");
  });

  it("extracts segments from nested divs in document order", () => {
    const doc = compile(
      <Redub>
        <div id="outer">
          <div id="inner1">
            <p id="p1">
              <span>One</span>
            </p>
          </div>
          <div id="inner2">
            <p id="p2">
              <span>Two</span>
            </p>
          </div>
        </div>
      </Redub>
    );
    const segments = extractSegments(doc);
    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe("One");
    expect(segments[1].text).toBe("Two");
  });
});

// ---------------------------------------------------------------------------
// render()
// ---------------------------------------------------------------------------

describe("render()", () => {
  it("returns an empty array when the document has no text", async () => {
    const doc = compile(<Redub />);
    const results = await render(doc, makeMockProvider(), {});
    expect(results).toEqual([]);
  });

  it("returns one result per segment in document order", async () => {
    const doc = compile(
      <Redub>
        <div>
          <p id="p1">
            <span>Alpha</span>
          </p>
          <p id="p2">
            <span>Beta</span>
          </p>
        </div>
      </Redub>
    );
    const results = await render(doc, makeMockProvider(), {});
    expect(results).toHaveLength(2);
    expect(results[0].segmentId).toBe("p1");
    expect(results[1].segmentId).toBe("p2");
  });

  it("propagates provider errors", async () => {
    const failProvider: RenderProvider<RenderOptions> = {
      name: "failing",
      render: async () => {
        throw new Error("provider failure");
      },
    };
    const doc = compile(
      <Redub>
        <div>
          <p>
            <span>Hi</span>
          </p>
        </div>
      </Redub>
    );
    await expect(render(doc, failProvider, {})).rejects.toThrow(
      "provider failure"
    );
  });
});

// ---------------------------------------------------------------------------
// ElevenLabsProvider
// ---------------------------------------------------------------------------

describe("ElevenLabsProvider", () => {
  const fakeAudio = makeAudio(8);

  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeAudio.buffer,
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("has name 'elevenlabs'", () => {
    const provider = new ElevenLabsProvider({
      apiKey: "key",
      voiceId: "voice123",
    });
    expect(provider.name).toBe("elevenlabs");
  });

  it("calls the ElevenLabs API with the correct URL and headers", async () => {
    const provider = new ElevenLabsProvider({
      apiKey: "test-key",
      voiceId: "voice-abc",
    });
    const segments: RenderSegment[] = [{ text: "Hello" }];
    const options: ElevenLabsRenderOptions = { format: "mp3" };
    await provider.render(segments, options);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("voice-abc");
    expect((init as RequestInit).headers).toMatchObject({
      "xi-api-key": "test-key",
    });
  });

  it("sends the correct output_format for each AudioFormat", async () => {
    const provider = new ElevenLabsProvider({
      apiKey: "key",
      voiceId: "v",
    });
    const segments: RenderSegment[] = [{ text: "Test" }];

    const cases: Array<[ElevenLabsRenderOptions["format"], string]> = [
      ["mp3", "mp3_44100_128"],
      ["wav", "pcm_44100"],
      ["ogg", "ogg_vorbis_44100_128"],
      ["flac", "flac_44100"],
      ["aac", "aac_44100_128"],
    ];

    for (const [format, expectedOutputFormat] of cases) {
      (fetch as jest.Mock).mockClear();
      await provider.render(segments, { format });
      const body = JSON.parse(
        (fetch as jest.Mock).mock.calls[0][1].body as string
      );
      expect(body.output_format).toBe(expectedOutputFormat);
    }
  });

  it("uses the default modelId when none is provided", async () => {
    const provider = new ElevenLabsProvider({ apiKey: "k", voiceId: "v" });
    await provider.render([{ text: "Hi" }], { format: "mp3" });
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body as string);
    expect(body.model_id).toBe("eleven_multilingual_v2");
  });

  it("uses a custom modelId when provided", async () => {
    const provider = new ElevenLabsProvider({
      apiKey: "k",
      voiceId: "v",
      modelId: "eleven_turbo_v2",
    });
    await provider.render([{ text: "Hi" }], { format: "mp3" });
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body as string);
    expect(body.model_id).toBe("eleven_turbo_v2");
  });

  it("returns audio bytes and preserves segmentId", async () => {
    const provider = new ElevenLabsProvider({ apiKey: "k", voiceId: "v" });
    const options: ElevenLabsRenderOptions = { format: "mp3" };
    const [result] = await provider.render(
      [{ id: "seg-1", text: "Hi" }],
      options
    );
    expect(result.segmentId).toBe("seg-1");
    expect(result.audio).toBeInstanceOf(Uint8Array);
    expect(result.format).toBe("mp3");
  });

  it("throws on a non-ok API response", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    } as unknown as Response);

    const provider = new ElevenLabsProvider({ apiKey: "bad", voiceId: "v" });
    await expect(
      provider.render([{ text: "Hi" }], { format: "mp3" })
    ).rejects.toThrow("ElevenLabs API error 401");
  });
});

// ---------------------------------------------------------------------------
// OpenAIProvider
// ---------------------------------------------------------------------------

describe("OpenAIProvider", () => {
  const fakeAudio = makeAudio(8);

  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeAudio.buffer,
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("has name 'openai'", () => {
    const provider = new OpenAIProvider({ apiKey: "key", voice: "nova" });
    expect(provider.name).toBe("openai");
  });

  it("calls the OpenAI speech API with the correct URL and headers", async () => {
    const provider = new OpenAIProvider({ apiKey: "sk-test", voice: "alloy" });
    const options: OpenAIRenderOptions = { format: "mp3" };
    await provider.render([{ text: "Hello" }], options);

    const [url, init] = (fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/audio/speech");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer sk-test",
    });
  });

  it("sends the correct response_format for each AudioFormat", async () => {
    const provider = new OpenAIProvider({ apiKey: "k", voice: "echo" });
    const segments: RenderSegment[] = [{ text: "Test" }];

    const cases: Array<[OpenAIRenderOptions["format"], string]> = [
      ["mp3", "mp3"],
      ["wav", "wav"],
      ["ogg", "opus"],
      ["flac", "flac"],
      ["aac", "aac"],
    ];

    for (const [format, expectedResponseFormat] of cases) {
      (fetch as jest.Mock).mockClear();
      await provider.render(segments, { format });
      const body = JSON.parse(
        (fetch as jest.Mock).mock.calls[0][1].body as string
      );
      expect(body.response_format).toBe(expectedResponseFormat);
    }
  });

  it("uses tts-1 as the default model", async () => {
    const provider = new OpenAIProvider({ apiKey: "k", voice: "shimmer" });
    await provider.render([{ text: "Hi" }], { format: "mp3" });
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body as string);
    expect(body.model).toBe("tts-1");
  });

  it("uses a custom model when provided", async () => {
    const provider = new OpenAIProvider({
      apiKey: "k",
      voice: "fable",
      model: "tts-1-hd",
    });
    await provider.render([{ text: "Hi" }], { format: "mp3" });
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body as string);
    expect(body.model).toBe("tts-1-hd");
  });

  it("returns audio bytes and preserves segmentId", async () => {
    const provider = new OpenAIProvider({ apiKey: "k", voice: "onyx" });
    const options: OpenAIRenderOptions = { format: "wav" };
    const [result] = await provider.render(
      [{ id: "seg-2", text: "World" }],
      options
    );
    expect(result.segmentId).toBe("seg-2");
    expect(result.audio).toBeInstanceOf(Uint8Array);
    expect(result.format).toBe("wav");
  });

  it("throws on a non-ok API response", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "Rate limit exceeded",
    } as unknown as Response);

    const provider = new OpenAIProvider({ apiKey: "k", voice: "nova" });
    await expect(
      provider.render([{ text: "Hi" }], { format: "mp3" })
    ).rejects.toThrow("OpenAI API error 429");
  });
});

// ---------------------------------------------------------------------------
// Public API re-exports
// ---------------------------------------------------------------------------

describe("render pipeline public API", () => {
  it("re-exports all expected symbols from the render module", async () => {
    const renderModule = await import("../render");
    expect(typeof renderModule.render).toBe("function");
    expect(typeof renderModule.extractSegments).toBe("function");
    expect(typeof renderModule.ElevenLabsProvider).toBe("function");
    expect(typeof renderModule.OpenAIProvider).toBe("function");
  });

  it("re-exports render symbols from the main package index", async () => {
    const index = await import("../index");
    expect(typeof index.render).toBe("function");
    expect(typeof index.extractSegments).toBe("function");
    expect(typeof index.ElevenLabsProvider).toBe("function");
    expect(typeof index.OpenAIProvider).toBe("function");
  });
});
