import assert from "node:assert/strict";
import test from "node:test";

import { buildContentIndexExpression, buildInjectionExpression, buildRemovalExpression } from "../src/inject-expression.mjs";

test("builds valid standalone JavaScript expressions", () => {
  assert.doesNotThrow(() => new Function(`return ${buildInjectionExpression()}`));
  assert.doesNotThrow(() => new Function(`return ${buildRemovalExpression()}`));
  assert.doesNotThrow(() => new Function(`return ${buildContentIndexExpression([])}`));
});

test("targets only Codex thread title nodes", () => {
  const expression = buildInjectionExpression();
  assert.match(expression, /data-thread-title/);
  assert.match(expression, /codex-sidebar-tag-chip/);
  assert.match(expression, /codex-sidebar-tags-toolbar/);
  assert.match(expression, /codex-sidebar-dashboard-dialog/);
  assert.match(expression, /Tags/);
  assert.doesNotMatch(expression, /Kanban/);
  assert.match(expression, /contentByThread/);
  assert.match(expression, /搜索会话名称或内容/);
  assert.match(expression, /codex-sidebar-tags-config-v1/);
  assert.match(expression, /新增标签会立即获得配色/);
  assert.match(expression, /会话排序/);
  assert.match(expression, /codex-sidebar-sort-control/);
  assert.match(expression, /codex-sidebar-sort-menu/);
  assert.match(expression, /codex-sidebar-search-mark/);
  assert.match(expression, /appendHighlightedText/);
  assert.match(expression, /originalNodeState/);
  assert.match(expression, /nextContentIndexJson === contentIndexJson/);
  assert.match(expression, /role", "listbox/);
  assert.match(expression, /\["sidebar", "默认"\]/);
  assert.match(expression, /compositionstart/);
  assert.match(expression, /compositionend/);
  assert.match(expression, /entryCache/);
  assert.match(expression, /data-app-action-sidebar-thread-id/);
  assert.match(expression, /codex-sidebar-tags-index-v1/);
  assert.match(expression, /renderedIndexSignature/);
  assert.match(expression, /isRelevantMutation/);
  assert.match(expression, /render-deferred/);
  assert.match(expression, /overflow-anchor/);
  assert.doesNotMatch(expression, /codex-sidebar-tag-time/);
  assert.doesNotMatch(expression, /codex-sidebar-result-time/);
});
