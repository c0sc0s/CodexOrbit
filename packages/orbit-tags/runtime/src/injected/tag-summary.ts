import type { SessionEntry, TagDefinition } from "./models";

export function summarizeTags(entries: readonly SessionEntry[], definitions: readonly TagDefinition[]) {
  const tags = new Map(definitions.map(item => [item.name.toLocaleLowerCase(), { name: item.name, color: item.color, count: 0 }]));
  for (const entry of entries) {
    const key = entry.tag.toLocaleLowerCase(), item = tags.get(key) ?? { name: entry.tag, color: entry.color, count: 0 };
    item.count++; tags.set(key, item);
  }
  return [...tags.values()];
}
