import { describe, expect, it } from "vitest";

import { parseRuntimeConfig } from "../src/injected/runtime-config";

const validConfig = {
  version: "1.0.0",
  protocolVersion: 1,
  tagDefinitions: [{ name: "Bug", color: "#D95C5C", description: "修复" }],
  settingsSource: "repository",
  colorPresets: [{ name: "珊瑚", color: "#D95C5C" }],
  legacyToneColors: { neutral: "#7C8798", blue: "#4F8FD7" },
} as const;

describe("parseRuntimeConfig", () => {
  it("normalizes the versioned injected configuration", () => {
    expect(parseRuntimeConfig(validConfig)).toEqual(expect.objectContaining({
      version: "1.0.0",
      protocolVersion: 1,
      settingsSource: "repository",
      tagDefinitions: [{ name: "Bug", color: "#d95c5c", description: "修复" }],
    }));
  });

  it("fails closed for incompatible protocols and invalid palettes", () => {
    expect(() => parseRuntimeConfig({ ...validConfig, protocolVersion: 2 })).toThrow(/Unsupported/u);
    expect(() => parseRuntimeConfig({ ...validConfig, colorPresets: [] })).toThrow(/color presets/u);
  });
});
