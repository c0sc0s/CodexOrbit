export function splitDescription(value: string): { body: string; source: string | null; suffix: string } {
  const match = /(?:^|\n\n)飞书任务：(https:\/\/applink\.larkoffice\.com\/client\/todo\/detail\?[^\s]+)\s*$/u.exec(value);
  if (!match) return { body: value, source: null, suffix: "" };
  return { body: value.slice(0, match.index), source: match[1], suffix: value.slice(match.index) };
}

export function DescriptionText({ value }: { value: string }) {
  return <div class="ot-description-text">{value.split(/(https?:\/\/[^\s]+)/u).map((part, index) =>
    /^https?:\/\//u.test(part) ? <a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : part,
  )}</div>;
}
