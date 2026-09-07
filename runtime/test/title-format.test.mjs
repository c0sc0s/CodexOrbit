import assert from "node:assert/strict";
import test from "node:test";

import { colorForTag, parseSidebarTitle, parseTitleMetadata } from "../src/title-format.mjs";

test("parses tag, time, and title", () => {
  assert.deepEqual(parseSidebarTitle("[Pending][09-04] mac 键鼠信号迁移"), {
    raw: "[Pending][09-04] mac 键鼠信号迁移",
    tag: "Pending",
    time: "09-04",
    title: "mac 键鼠信号迁移",
    color: "#c98b28",
  });
});

test("supports a tag without time", () => {
  assert.deepEqual(parseSidebarTitle("[Bug] 修复侧栏"), {
    raw: "[Bug] 修复侧栏",
    tag: "Bug",
    time: "",
    title: "修复侧栏",
    color: "#d95c5c",
  });
});

test("supports Chinese brackets", () => {
  assert.deepEqual(parseSidebarTitle("【调研】【今天】侧栏渲染"), {
    raw: "【调研】【今天】侧栏渲染",
    tag: "调研",
    time: "今天",
    title: "侧栏渲染",
    color: "#956ad1",
  });
});

test("leaves ordinary titles unchanged", () => {
  assert.equal(parseSidebarTitle("普通会话标题"), null);
  assert.equal(parseSidebarTitle("[Pending]"), null);
});

test("falls back to a neutral color", () => {
  assert.equal(colorForTag("自定义"), "#7c8798");
});

test("parses portable title metadata without applying renderer colors", () => {
  assert.deepEqual(parseTitleMetadata("[Review][09-07] Inspect architecture"), {
    raw: "[Review][09-07] Inspect architecture",
    tag: "Review",
    time: "09-07",
    title: "Inspect architecture",
  });
});
