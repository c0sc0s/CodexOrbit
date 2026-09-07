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
  { name: "Pending", color: PRESET_COLORS["琥珀"], description: "尚未开始、等待处理或等待排期的任务" },
  { name: "进行中", color: PRESET_COLORS["海蓝"], description: "已经开始处理且仍在推进中的任务" },
  { name: "需求", color: PRESET_COLORS["海蓝"], description: "新增能力、产品需求或明确的功能改动" },
  { name: "Feature", color: PRESET_COLORS["海蓝"], description: "新增功能、能力建设或产品增强" },
  { name: "Bug", color: PRESET_COLORS["珊瑚"], description: "修复错误、异常行为、回归或稳定性问题" },
  { name: "阻塞", color: PRESET_COLORS["珊瑚"], description: "当前无法继续，需要外部输入、权限或依赖解除" },
  { name: "调研", color: PRESET_COLORS["鸢紫"], description: "分析现状、查找资料、定位原因或评估可行性" },
  { name: "设计", color: PRESET_COLORS["鸢紫"], description: "交互、视觉、架构或技术方案设计" },
  { name: "完成", color: PRESET_COLORS["松绿"], description: "目标已经完成，仅需记录、复盘或交付结果" },
]);

function normalizeColor(value, legacyTone, fallbackColor) {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/iu.test(value.trim())) return value.trim().toLocaleLowerCase();
  return LEGACY_TONE_COLORS[legacyTone] ?? fallbackColor ?? LEGACY_TONE_COLORS.neutral;
}

function normalizeDescription(value, fallbackDescription = "") {
  if (typeof value !== "string") return fallbackDescription;
  return value.replace(/\s+/gu, " ").trim().slice(0, 240);
}

export function normalizeTagDefinitions(value, fallback = DEFAULT_TAG_DEFINITIONS) {
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

export function createTagSettings(definitions) {
  return {
    schemaVersion: TAG_SETTINGS_SCHEMA_VERSION,
    tags: normalizeTagDefinitions(definitions),
  };
}
