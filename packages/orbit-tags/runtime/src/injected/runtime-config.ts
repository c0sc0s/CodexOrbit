import { normalizeTagDefinitions, type TagDefinition } from "../shared/tag-settings.js";
import { RUNTIME_PROTOCOL_VERSION } from "../shared/protocol.js";

export interface RuntimeConfig {
  version: string;
  protocolVersion: number;
  tagDefinitions: TagDefinition[];
  settingsSource: "repository" | "defaults";
  colorPresets: Array<{ name: string; color: string }>;
  legacyToneColors: Record<string, string> & { neutral: string; blue: string };
}

const HEX_COLOR = /^#[0-9a-f]{6}$/iu;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseRuntimeConfig(value: unknown): RuntimeConfig {
  if (!isRecord(value)) throw new Error("Invalid Orbit Tags runtime config");
  if (typeof value.version !== "string" || !value.version.trim()) throw new Error("Invalid Orbit Tags runtime version");
  if (value.protocolVersion !== RUNTIME_PROTOCOL_VERSION) throw new Error(`Unsupported Orbit Tags protocol ${String(value.protocolVersion)}`);
  if (value.settingsSource !== "repository" && value.settingsSource !== "defaults") throw new Error("Invalid Orbit Tags settings source");
  if (!Array.isArray(value.tagDefinitions)) throw new Error("Invalid Orbit Tags tag definitions");

  const colorPresets = Array.isArray(value.colorPresets)
    ? value.colorPresets.flatMap((item) => {
      if (!isRecord(item) || typeof item.name !== "string" || typeof item.color !== "string" || !HEX_COLOR.test(item.color)) return [];
      return [{ name: item.name.trim(), color: item.color.toLocaleLowerCase() }];
    })
    : [];
  if (colorPresets.length === 0) throw new Error("Invalid Orbit Tags color presets");
  if (!isRecord(value.legacyToneColors)) throw new Error("Invalid Orbit Tags legacy colors");
  const legacyToneColors = Object.fromEntries(
    Object.entries(value.legacyToneColors).filter((entry): entry is [string, string] => typeof entry[1] === "string" && HEX_COLOR.test(entry[1])),
  );
  if (!legacyToneColors.neutral || !legacyToneColors.blue) throw new Error("Orbit Tags neutral and blue colors are required");

  return {
    version: value.version,
    protocolVersion: value.protocolVersion,
    tagDefinitions: normalizeTagDefinitions(value.tagDefinitions, []),
    settingsSource: value.settingsSource,
    colorPresets,
    legacyToneColors: legacyToneColors as RuntimeConfig["legacyToneColors"],
  };
}
