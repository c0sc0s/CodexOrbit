import assert from "node:assert/strict";
import test from "node:test";

import { buildInjectionExpression, buildRemovalExpression, buildSearchResultExpression } from "../src/inject-expression.mjs";

test("builds valid standalone JavaScript expressions", () => {
  assert.doesNotThrow(() => new Function(`return ${buildInjectionExpression()}`));
  assert.doesNotThrow(() => new Function(`return ${buildRemovalExpression()}`));
  assert.doesNotThrow(() => new Function(`return ${buildSearchResultExpression({ type: "searchResult", requestId: 1, query: "test", items: [] })}`));
});

test("targets only Codex thread title nodes", () => {
  const expression = buildInjectionExpression();
  assert.match(expression, /data-thread-title/);
  assert.match(expression, /codex-sidebar-tag-chip/);
  assert.match(expression, /codex-sidebar-tags-toolbar/);
  assert.match(expression, /codex-sidebar-dashboard-dialog/);
  assert.match(expression, /Tags/);
  assert.doesNotMatch(expression, /Kanban/);
  assert.match(expression, /contentMatches/);
  assert.match(expression, /codex-sidebar-search-input/);
  assert.match(expression, /codex-sidebar-tags-config-v1/);
  assert.match(expression, /codex-sidebar-sort-control/);
  assert.match(expression, /codex-sidebar-sort-menu/);
  assert.match(expression, /codex-sidebar-search-mark/);
  assert.match(expression, /renderResultsList/);
  assert.match(expression, /originalNodeState/);
  assert.match(expression, /searchRequest/);
  assert.match(expression, /setSearchResult/);
  assert.doesNotMatch(expression, /setContentIndex|contentByThread/);
  assert.match(expression, /role", "listbox/);
  assert.match(expression, /sortOptions/);
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
