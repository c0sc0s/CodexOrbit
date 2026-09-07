import assert from "node:assert/strict";
import test from "node:test";

import { buildInjectionExpression, buildRemovalExpression, buildRuntimeMessageExpression, buildSearchResultExpression } from "../src/inject-expression.mjs";

test("builds valid standalone JavaScript expressions", () => {
  assert.doesNotThrow(() => new Function(`return ${buildInjectionExpression()}`));
  assert.doesNotThrow(() => new Function(`return ${buildRemovalExpression()}`));
  assert.doesNotThrow(() => new Function(`return ${buildRuntimeMessageExpression({ protocolVersion: 1, type: "hello", payload: {} })}`));
  assert.doesNotThrow(() => new Function(`return ${buildSearchResultExpression({ type: "searchResult", requestId: 1, query: "test", items: [] })}`));
});

test("injects authoritative settings through the runtime config", () => {
  const expression = buildInjectionExpression({
    settingsSource: "repository",
    tagDefinitions: [{ name: "Review", color: "#123456", description: "人工复核" }],
  });
  assert.match(expression, /"settingsSource":"repository"/u);
  assert.match(expression, /"name":"Review"/u);
});

test("targets only Codex thread title nodes", () => {
  const expression = buildInjectionExpression();
  assert.match(expression, /data-thread-title/);
  assert.match(expression, /codex-sidebar-tag-chip/);
  assert.match(expression, /codex-sidebar-tags-toolbar/);
  assert.match(expression, /codex-sidebar-tags-filter-bar/);
  assert.match(expression, /codex-sidebar-quick-filter/);
  assert.match(expression, /data-codex-sidebar-tags-filtered/);
  assert.match(expression, /codex-sidebar-dashboard-dialog/);
  assert.match(expression, /Tags/);
  assert.doesNotMatch(expression, /Kanban/);
  assert.match(expression, /contentMatches/);
  assert.match(expression, /codex-sidebar-search-input/);
  assert.match(expression, /codex-sidebar-tags-config-v1/);
  assert.match(expression, /codex-sidebar-sort-control/);
  assert.match(expression, /codex-sidebar-sort-menu/);
  assert.match(expression, /codex-sidebar-search-mark/);
  assert.match(expression, /codex-sidebar-tag-description/);
  assert.match(expression, /codex-sidebar-tag-color-preset/);
  assert.match(expression, /codex-sidebar-tag-color-custom/);
  assert.match(expression, /renderResultsList/);
  assert.match(expression, /TitleDecorator/);
  assert.match(expression, /searchRequest/);
  assert.match(expression, /setSearchResult/);
  assert.doesNotMatch(expression, /setContentIndex|contentByThread/);
  assert.match(expression, /role", "listbox/);
  assert.match(expression, /sortOptions/);
  assert.match(expression, /compositionstart/);
  assert.match(expression, /compositionend/);
  assert.match(expression, /SessionRegistry/);
  assert.match(expression, /data-app-action-sidebar-thread-id/);
  assert.match(expression, /codex-sidebar-tags-index-v1/);
  assert.match(expression, /renderedIndexSignature/);
  assert.match(expression, /isRelevantMutation/);
  assert.match(expression, /render-deferred/);
  assert.match(expression, /overflow-anchor/);
  assert.doesNotMatch(expression, /codex-sidebar-tag-time/);
  assert.doesNotMatch(expression, /codex-sidebar-result-time/);
});
