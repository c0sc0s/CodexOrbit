export const DEFAULT_TAG_DEFINITIONS = Object.freeze([
  { name: "Pending", tone: "amber" },
  { name: "进行中", tone: "blue" },
  { name: "需求", tone: "blue" },
  { name: "Feature", tone: "blue" },
  { name: "Bug", tone: "red" },
  { name: "阻塞", tone: "red" },
  { name: "调研", tone: "purple" },
  { name: "设计", tone: "purple" },
  { name: "完成", tone: "green" },
]);

const VALID_TONES = new Set(["amber", "blue", "red", "purple", "green", "neutral"]);

export function normalizeTagDefinitions(value, fallback = DEFAULT_TAG_DEFINITIONS) {
  if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));
  const seen = new Set();
  const definitions = [];
  for (const item of value) {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const tone = typeof item?.tone === "string" ? item.tone : "neutral";
    const key = name.toLocaleLowerCase();
    if (!name || name.length > 32 || /[\[\]【】\r\n]/u.test(name) || seen.has(key)) continue;
    seen.add(key);
    definitions.push({ name, tone: VALID_TONES.has(tone) ? tone : "neutral" });
    if (definitions.length >= 32) break;
  }
  return definitions;
}

export function createTagSettings(definitions) {
  return {
    schemaVersion: 1,
    tags: normalizeTagDefinitions(definitions),
  };
}
