export interface ParsedTitleMetadata {
  raw: string;
  tag: string;
  time: string;
  title: string;
}

export function colorForTag(tag: string): string;
export function parseTitleMetadata(value: unknown): ParsedTitleMetadata | null;
export function parseSidebarTitle(value: unknown): (ParsedTitleMetadata & { color: string }) | null;
export const titlePatternSource: string;
