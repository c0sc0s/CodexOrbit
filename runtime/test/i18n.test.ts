import { describe, expect, it } from "vitest";

import { resolveUiLocale, RuntimeI18n } from "../src/injected/i18n";

describe("runtime i18n", () => {
  it("follows Codex language values and falls back to English", () => {
    expect(resolveUiLocale("zh-CN")).toBe("zh-CN");
    expect(resolveUiLocale("zh-Hans")).toBe("zh-CN");
    expect(resolveUiLocale("en-US")).toBe("en-US");
    expect(resolveUiLocale("fr-FR")).toBe("en-US");
    expect(resolveUiLocale("")).toBe("en-US");
  });

  it("localizes UI chrome without changing user-provided values", () => {
    const i18n = new RuntimeI18n("en-US");
    expect(i18n.t("sessionCount", { count: 1 })).toBe("1 session");
    expect(i18n.t("sessionCount", { count: 2 })).toBe("2 sessions");
    expect(i18n.t("deleteTag", { name: "调研" })).toBe("Delete 调研 tag configuration");
    expect(i18n.colorName("海蓝")).toBe("Ocean blue");

    expect(i18n.setLocale("zh-CN")).toBe(true);
    expect(i18n.t("sessionCount", { count: 2 })).toBe("2 个会话");
    expect(i18n.t("deleteTag", { name: "Review" })).toBe("删除 Review 标签配置");
    expect(i18n.setLocale("zh-CN")).toBe(false);
  });
});
