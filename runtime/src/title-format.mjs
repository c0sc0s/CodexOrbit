const MAX_TAG_LENGTH = 20;
const MAX_TIME_LENGTH = 32;

const BRACKETED_TITLE = /^(?:\[([^\]\r\n]{1,20})\]|【([^】\r\n]{1,20})】)(?:(?:\[([^\]\r\n]{1,32})\]|【([^】\r\n]{1,32})】))?\s*(.+)$/u;

const TAG_TONES = new Map([
  ["pending", "amber"],
  ["todo", "amber"],
  ["待处理", "amber"],
  ["进行中", "blue"],
  ["doing", "blue"],
  ["wip", "blue"],
  ["feature", "blue"],
  ["feat", "blue"],
  ["需求", "blue"],
  ["bug", "red"],
  ["fix", "red"],
  ["blocked", "red"],
  ["阻塞", "red"],
  ["research", "purple"],
  ["调研", "purple"],
  ["design", "purple"],
  ["设计", "purple"],
  ["done", "green"],
  ["完成", "green"],
]);

export function toneForTag(tag) {
  return TAG_TONES.get(tag.trim().toLocaleLowerCase()) ?? "neutral";
}

export function parseSidebarTitle(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const match = BRACKETED_TITLE.exec(raw);
  if (!match) return null;

  const tag = (match[1] ?? match[2] ?? "").trim();
  const time = (match[3] ?? match[4] ?? "").trim();
  const title = match[5].trim();
  if (!tag || !title || tag.length > MAX_TAG_LENGTH || time.length > MAX_TIME_LENGTH) return null;

  return { raw, tag, time, title, tone: toneForTag(tag) };
}

export const titlePatternSource = BRACKETED_TITLE.source;
