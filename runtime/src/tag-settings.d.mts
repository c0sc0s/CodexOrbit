export interface TagDefinition {
  name: string;
  color: string;
  description: string;
}

export interface TagSettings {
  schemaVersion: 2;
  tags: TagDefinition[];
}

export const TAG_SETTINGS_SCHEMA_VERSION: 2;
export const TAG_COLOR_PRESETS: ReadonlyArray<Readonly<{ name: string; color: string }>>;
export const LEGACY_TONE_COLORS: Readonly<Record<string, string>>;
export const DEFAULT_TAG_DEFINITIONS: ReadonlyArray<Readonly<TagDefinition>>;

export function normalizeTagDefinitions(value: unknown, fallback?: ReadonlyArray<Readonly<TagDefinition>>): TagDefinition[];
export function createTagSettings(definitions: unknown): TagSettings;
