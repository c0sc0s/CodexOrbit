import { DEFAULT_TAG_DEFINITIONS, LEGACY_TONE_COLORS } from "./tag-settings.mjs";

const MAX_TAG_LENGTH = 32;
const MAX_TIME_LENGTH = 32;

const BRACKETED_TITLE = /^(?:\[([^\]\r\n]{1,32})\]|【([^】\r\n]{1,32})】)(?:(?:\[([^\]\r\n]{1,32})\]|【([^】\r\n]{1,32})】))?\s*(.+)$/u;

const TAG_COLORS = new Map(DEFAULT_TAG_DEFINITIONS.map(({ name, color }) => [name.toLocaleLowerCase(), color]));

export function colorForTag(tag) {
  return TAG_COLORS.get(tag.trim().toLocaleLowerCase()) ?? LEGACY_TONE_COLORS.neutral;
}

export function parseTitleMetadata(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const match = BRACKETED_TITLE.exec(raw);
  if (!match) return null;

  const tag = (match[1] ?? match[2] ?? "").trim();
  const time = (match[3] ?? match[4] ?? "").trim();
  const title = match[5].trim();
  if (!tag || !title || tag.length > MAX_TAG_LENGTH || time.length > MAX_TIME_LENGTH) return null;

  return { raw, tag, time, title };
}

export function parseSidebarTitle(value) {
  const parsed = parseTitleMetadata(value);
  return parsed ? { ...parsed, color: colorForTag(parsed.tag) } : null;
}

export const titlePatternSource = BRACKETED_TITLE.source;
