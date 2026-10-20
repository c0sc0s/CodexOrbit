export function readableMarkdown(value: string): string {
  let fence: { character: string; length: number } | null = null;
  return value.split("\n").map(line => {
    const marker = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = { character: marker[0], length: marker.length };
      else if (marker[0] === fence.character && marker.length >= fence.length) fence = null;
      return line;
    }
    if (fence) return line;
    // Meego emits inline style spans in Markdown; preserve code examples verbatim.
    return line.replace(/(`+)(.*?)\1|<\/?span\b(?:[^<>"']|"[^"]*"|'[^']*')*>/giu, (match: string, code: string | undefined) => code ? match : "");
  }).join("\n");
}
