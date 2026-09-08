// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { sidebarSectionHeading } from "../src/injected/codex-dom-adapter";

it("anchors before the full heading including its native menu", () => {
  const section = document.createElement("div");
  section.innerHTML = '<div class="group/nav-section-title"><div><div><button>Pinned</button></div></div><div><button aria-label="Sort">…</button></div></div>';
  const toggle = section.querySelector("button")!;
  const heading = sidebarSectionHeading(toggle);
  expect(heading).toBe(section.firstElementChild);
  expect(heading.contains(section.querySelector('[aria-label="Sort"]'))).toBe(true);
});
