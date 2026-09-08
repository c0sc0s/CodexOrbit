// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { UpdatePanel } from "../src/injected/update-panel";
import { RuntimeI18n } from "../src/injected/i18n";

it("checks on opening and updates independently of tag drafts", async () => {
  const check = vi.fn(), install = vi.fn(); const panel = new UpdatePanel(new RuntimeI18n("en"), check, install);
  const form = document.createElement("input"); form.value = "Unsaved tag";
  const parent = document.createElement("div"); const element = panel.mount(); parent.append(form, element);
  await Promise.resolve(); expect(check).toHaveBeenCalledWith(false);
  panel.update({ phase: "available", currentVersion: "0.6.1", latestVersion: "0.7.0" });
  expect(element.textContent).toContain("0.7.0"); element.querySelectorAll("button")[1].click();
  expect(install).toHaveBeenCalledTimes(1); expect(element.querySelector("button")?.disabled).toBe(true);
  expect(parent.firstChild).toBe(form); expect(form.value).toBe("Unsaved tag");
});
it("renders localized errors and a retry action", () => {
  const check = vi.fn(); const panel = new UpdatePanel(new RuntimeI18n("zh-CN"), check, vi.fn());
  const element = panel.mount(); panel.update({ phase: "error", error: "check" });
  expect(element.textContent).toContain("检查失败"); element.querySelector("button")?.click();
  expect(check).toHaveBeenCalledWith(true);
});
