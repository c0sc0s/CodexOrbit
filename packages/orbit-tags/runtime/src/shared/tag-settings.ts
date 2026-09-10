export interface TagDefinition { name: string; color: string; description: string }
export interface TagSettings { schemaVersion: 2; tags: TagDefinition[] }
export const TAG_SETTINGS_SCHEMA_VERSION = 2;

export const TAG_COLOR_PRESETS = Object.freeze([
  { name: "海蓝", color: "#4f8fd7" },
  { name: "鸢紫", color: "#956ad1" },
  { name: "珊瑚", color: "#d95c5c" },
  { name: "琥珀", color: "#c98b28" },
  { name: "松绿", color: "#3f9a6b" },
  { name: "雾灰", color: "#7c8798" },
]);

const PRESET_COLORS = Object.fromEntries(TAG_COLOR_PRESETS.map(({ name, color }) => [name, color]));
export const LEGACY_TONE_COLORS = Object.freeze({
  amber: PRESET_COLORS["琥珀"],
  blue: PRESET_COLORS["海蓝"],
  red: PRESET_COLORS["珊瑚"],
  purple: PRESET_COLORS["鸢紫"],
  green: PRESET_COLORS["松绿"],
  neutral: PRESET_COLORS["雾灰"],
});

export const DEFAULT_TAG_DEFINITIONS = Object.freeze([
  { name: "Feature", color: PRESET_COLORS["海蓝"], description: "Build or extend functionality. Use when the main goal is to implement a new capability or improve existing behavior, rather than fix a defect." },
  { name: "Bug", color: PRESET_COLORS["珊瑚"], description: "Diagnose and fix incorrect behavior, errors, or regressions. Use when the goal is to restore expected behavior, including investigation needed for the fix." },
  { name: "Design", color: PRESET_COLORS["鸢紫"], description: "Define how a solution should look or work: UI, interactions, architecture, or technical plans. Use when the main deliverable is a design or specification." },
  { name: "Research", color: PRESET_COLORS["松绿"], description: "Explore a topic, understand existing code, compare options, or assess feasibility. Use when the main deliverable is findings or an explanation, rather than a design or implementation." },
]);

function normalizeColor(value: unknown, legacyTone: unknown, fallbackColor?: string) {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/iu.test(value.trim())) return value.trim().toLocaleLowerCase();
  return (typeof legacyTone === "string" ? (LEGACY_TONE_COLORS as Readonly<Record<string, string>>)[legacyTone] : undefined) ?? fallbackColor ?? LEGACY_TONE_COLORS.neutral;
}

function normalizeDescription(value: unknown, fallbackDescription = "") {
  if (typeof value !== "string") return fallbackDescription;
  return value.replace(/\s+/gu, " ").trim().slice(0, 240);
}

export function normalizeTagDefinitions(value: unknown, fallback: ReadonlyArray<Readonly<TagDefinition>> = DEFAULT_TAG_DEFINITIONS): TagDefinition[] {
  if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));
  const defaultsByName = new Map(fallback.map((item) => [item.name.toLocaleLowerCase(), item]));
  const seen = new Set();
  const definitions = [];
  for (const item of value) {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const key = name.toLocaleLowerCase();
    if (!name || name.length > 32 || /[\[\]【】\r\n]/u.test(name) || seen.has(key)) continue;
    const defaultDefinition = defaultsByName.get(key);
    seen.add(key);
    definitions.push({
      name,
      color: normalizeColor(item?.color, item?.tone, defaultDefinition?.color),
      description: normalizeDescription(item?.description, defaultDefinition?.description),
    });
    if (definitions.length >= 32) break;
  }
  return definitions;
}

export function createTagSettings(definitions: unknown): TagSettings {
  return {
    schemaVersion: TAG_SETTINGS_SCHEMA_VERSION,
    tags: normalizeTagDefinitions(definitions),
  };
}
