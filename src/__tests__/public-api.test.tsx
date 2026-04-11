/** @jsxImportSource react */
import React from "react";
import { Agent, Pronunciation, Redub, compile, serialize } from "../index";
import * as ast from "../ast";
import * as components from "../components";
import * as serializer from "../serializer";

describe("public API", () => {
  it("re-exports the compiler, serializer, and authoring components", () => {
    expect(compile).toBe(ast.compile);
    expect(serialize).toBe(serializer.serialize);
    expect(Redub).toBe(components.Redub);
    expect(Agent).toBe(components.Agent);
    expect(Pronunciation).toBe(components.Pronunciation);
  });

  it("renders authoring components as null when invoked directly", () => {
    expect(Redub({ xmlLang: "en" })).toBeNull();
    expect(Redub.Head({ children: null })).toBeNull();
    expect(Redub.Metadata({ children: null })).toBeNull();
    expect(Agent({ id: "speaker-1" })).toBeNull();
    expect(Pronunciation({ target: "SQL" })).toBeNull();
  });

  it("supports compile and serialize via the package entrypoint", () => {
    const xml = serialize(
      compile(
        <Redub xmlLang="en">
          <div begin="0s" end="1s">
            <p>
              <span>Hello</span>
            </p>
          </div>
        </Redub>
      )
    );

    expect(xml).toContain('xml:lang="en"');
    expect(xml).toContain('<span>Hello</span>');
  });
});
