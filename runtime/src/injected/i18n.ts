export type UiLocale = "en-US" | "zh-CN";

type MessageParams = Record<string, number | string>;
type Message = (params: MessageParams) => string;

const zhCN = {
  add: () => "添加",
  cancel: () => "取消",
  save: () => "保存",
  editTag: ({ name }: MessageParams) => `编辑 ${name} 的颜色和描述`,
  confirmDelete: () => "确认删除",
  deleteImpact: ({ count }: MessageParams) => `已发现 ${count} 个会话使用此标签；只删除配置，不修改会话标题。再次点击确认。`,
  undoDelete: ({ name }: MessageParams) => `撤销删除 ${name}`,
  tagLimit: () => "最多支持 32 个标签",
  settingsSaveFailed: () => "标签保存失败，已恢复已保存的配置。请运行 CLI doctor 检查。",
  catalogUnavailable: () => "本地会话目录暂不可用，当前仅展示侧边栏已发现的会话。",
  all: () => "全部",
  classificationDescription: () => "分类描述",
  classificationDescriptionOptional: () => "分类描述（可选）",
  close: () => "关闭",
  closeDashboard: () => "关闭会话看板",
  configuredTags: ({ count }: MessageParams) => `${count} 个已配置标签`,
  custom: () => "自定义",
  customColor: () => "自定义颜色",
  customTagColor: () => "自定义标签颜色",
  deleteTag: ({ name }: MessageParams) => `删除 ${name} 标签配置`,
  descriptionPlaceholder: () => "例如：需要定位原因或评估可行性的任务",
  duplicateTag: () => "这个标签已经存在",
  filterByTag: () => "按标签筛选",
  filterSidebarByTag: () => "按标签筛选侧边栏会话",
  indexOnDemand: ({ count }: MessageParams) => `${count} 个会话 · 本地索引按需加载`,
  indexReady: ({ count }: MessageParams) => `${count} 个会话 · 本地索引已就绪`,
  invalidTagName: () => "请输入 1–32 个字符，不含括号；Uncategorized 为保留名称",
  launcherLabel: () => "打开 Tags",
  nameAndContent: () => "名称与正文",
  newTagName: () => "新标签名称",
  noClassificationDescription: () => "未设置分类描述",
  noMatches: () => "没有匹配的会话",
  presetColors: () => "预设颜色",
  resultCount: ({ visible, total }: MessageParams) => `${visible} / ${total} 个会话`,
  searchLabel: () => "搜索会话",
  searchPlaceholder: () => "搜索会话名称或内容…",
  searchUnavailable: () => "本地搜索服务尚未连接",
  searchingContent: () => "正在搜索正文…",
  selectCustomColor: () => "选择自定义颜色",
  sessionCount: ({ count }: MessageParams) => `${count} 个会话`,
  sessions: () => "会话",
  sessionsDashboard: () => "会话看板",
  settingsNote: () => "描述帮助 AI 在首次命名时选择标签；颜色仅用于显示。",
  sort: () => "排序",
  sortAria: () => "会话排序",
  sortDateDescending: () => "最近更新",
  sortDefault: () => "默认",
  sortTag: () => "标签",
  sortTitle: () => "标题",
  tagColor: () => "标签颜色",
  tagDescription: () => "标签分类描述",
  tagHeader: ({ count }: MessageParams) => `标签 · ${count}`,
  tagName: () => "标签名称",
  tagNamePlaceholder: () => "例如 Review",
  tagSettings: () => "标签设置",
  tags: () => "标签",
  unconfigured: ({ names }: MessageParams) => `未配置：${names}`,
  uncategorized: () => "未分类",
} satisfies Record<string, Message>;

type MessageKey = keyof typeof zhCN;

const enUS: Record<MessageKey, Message> = {
  add: () => "Add tag",
  cancel: () => "Cancel",
  save: () => "Save",
  editTag: ({ name }) => `Edit color and description for ${name}`,
  confirmDelete: () => "Confirm",
  deleteImpact: ({ count }) => `${count} known sessions use this tag. Only the configuration is removed; titles are unchanged. Click again to confirm.`,
  undoDelete: ({ name }) => `Undo deletion of ${name}`,
  tagLimit: () => "Up to 32 tags are supported",
  settingsSaveFailed: () => "Tags could not be saved. Saved settings were restored. Run CLI doctor to investigate.",
  catalogUnavailable: () => "Local catalog unavailable. Results currently include only sessions discovered in the sidebar.",
  all: () => "All",
  classificationDescription: () => "Classification description",
  classificationDescriptionOptional: () => "Classification description (optional)",
  close: () => "Close",
  closeDashboard: () => "Close session dashboard",
  configuredTags: ({ count }) => `${count} configured ${Number(count) === 1 ? "tag" : "tags"}`,
  custom: () => "Custom",
  customColor: () => "Custom color",
  customTagColor: () => "Custom tag color",
  deleteTag: ({ name }) => `Delete ${name} tag configuration`,
  descriptionPlaceholder: () => "For example: tasks that require investigation or feasibility analysis",
  duplicateTag: () => "This tag already exists",
  filterByTag: () => "Filter by tag",
  filterSidebarByTag: () => "Filter sidebar sessions by tag",
  indexOnDemand: ({ count }) => `${count} ${Number(count) === 1 ? "session" : "sessions"} · Index loads on demand`,
  indexReady: ({ count }) => `${count} ${Number(count) === 1 ? "session" : "sessions"} · Local index ready`,
  invalidTagName: () => "Enter 1–32 characters without brackets; Uncategorized is reserved",
  launcherLabel: () => "Open Tags",
  nameAndContent: () => "Title and content",
  newTagName: () => "New tag name",
  noClassificationDescription: () => "No classification description",
  noMatches: () => "No matching sessions",
  presetColors: () => "Preset colors",
  resultCount: ({ visible, total }) => `${visible} / ${total} ${Number(total) === 1 ? "session" : "sessions"}`,
  searchLabel: () => "Search sessions",
  searchPlaceholder: () => "Search session titles or content…",
  searchUnavailable: () => "Local search service is not connected",
  searchingContent: () => "Searching content…",
  selectCustomColor: () => "Choose a custom color",
  sessionCount: ({ count }) => `${count} ${Number(count) === 1 ? "session" : "sessions"}`,
  sessions: () => "Sessions",
  sessionsDashboard: () => "Sessions",
  settingsNote: () => "Descriptions help AI choose a tag when first naming a session; colors only affect display.",
  sort: () => "Sort",
  sortAria: () => "Sort sessions",
  sortDateDescending: () => "Recently updated",
  sortDefault: () => "Default",
  sortTag: () => "Tag",
  sortTitle: () => "Title",
  tagColor: () => "Tag color",
  tagDescription: () => "Tag classification description",
  tagHeader: ({ count }) => `Tags · ${count}`,
  tagName: () => "Tag name",
  tagNamePlaceholder: () => "For example: Review",
  tagSettings: () => "Tag settings",
  tags: () => "Tags",
  unconfigured: ({ names }) => `Not configured: ${names}`,
  uncategorized: () => "Uncategorized",
};

const messages: Record<UiLocale, Record<MessageKey, Message>> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

const colorNames: Record<UiLocale, Record<string, string>> = {
  "en-US": {
    "海蓝": "Ocean blue",
    "鸢紫": "Violet",
    "珊瑚": "Coral",
    "琥珀": "Amber",
    "松绿": "Pine green",
    "雾灰": "Mist gray",
  },
  "zh-CN": {
    "海蓝": "海蓝",
    "鸢紫": "鸢紫",
    "珊瑚": "珊瑚",
    "琥珀": "琥珀",
    "松绿": "松绿",
    "雾灰": "雾灰",
  },
};

export function resolveUiLocale(language: string | null | undefined): UiLocale {
  return language?.trim().toLocaleLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

export function readCodexLocale(): UiLocale {
  return resolveUiLocale(document.documentElement.lang || navigator.language);
}

export class RuntimeI18n {
  private currentLocale: UiLocale;

  constructor(language?: string | null) {
    this.currentLocale = language === undefined ? readCodexLocale() : resolveUiLocale(language);
  }

  get locale(): UiLocale {
    return this.currentLocale;
  }

  setLocale(locale: UiLocale): boolean {
    if (locale === this.currentLocale) return false;
    this.currentLocale = locale;
    return true;
  }

  t(key: MessageKey, params: MessageParams = {}): string {
    return messages[this.currentLocale][key](params);
  }

  compare(left: string, right: string): number {
    return left.localeCompare(right, this.currentLocale);
  }

  colorName(name: string): string {
    return colorNames[this.currentLocale][name] ?? name;
  }
}

export function observeCodexLocale(onChange: (locale: UiLocale) => void): () => void {
  const observer = new MutationObserver(() => onChange(readCodexLocale()));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  return () => observer.disconnect();
}
