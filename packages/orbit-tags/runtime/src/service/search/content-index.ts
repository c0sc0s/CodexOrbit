import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

const SESSION_ROOTS = [
  join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "sessions"),
  join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "archived_sessions"),
];
const TEXT_FIELD = '"text":"';
const MAX_FIELD_LENGTH = 24_000;
const MAX_THREAD_LENGTH = 500_000;
const SESSION_FILE_DISCOVERY_TTL_MS = 30_000;
let sessionFiles: Map<string, string> | null = null;
let sessionFilesScannedAt = 0;

export async function discoverSessionFiles(force = false) {
  if (!force && sessionFiles && Date.now() - sessionFilesScannedAt < SESSION_FILE_DISCOVERY_TTL_MS) return sessionFiles;
  const files = new Map<string, string>();
  for (const root of SESSION_ROOTS) {
    let paths = [];
    try { paths = await readdir(root, { recursive: true }); } catch { continue; }
    for (const relativePath of paths) {
      if (!relativePath.endsWith(".jsonl")) continue;
      const match = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i.exec(basename(relativePath));
      if (match) files.set(match[1], join(root, relativePath));
    }
  }
  sessionFiles = files;
  sessionFilesScannedAt = Date.now();
  return files;
}

function decodeJsonString(value: string): string {
  try { return JSON.parse(`"${value}"`); } catch {
    return value.replace(/\\n/g, " ").replace(/\\r/g, " ").replace(/\\t/g, " ").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

export async function extractConversationText(path: string) {
  const chunks: Array<{ role: string; text: string }> = [];
  let totalLength = 0;
  let prefix = "";
  let eligible = false;
  let role = "";
  let inText = false;
  let escaped = false;
  let rawText = "";
  let fieldTruncated = false;
  let patternCarry = "";

  const resetLine = () => {
    prefix = "";
    eligible = false;
    role = "";
    inText = false;
    escaped = false;
    rawText = "";
    fieldTruncated = false;
    patternCarry = "";
  };

  const finishText = () => {
    let text = decodeJsonString(rawText).replace(/\s+/gu, " ").trim();
    const requestMarker = text.lastIndexOf("## My request:");
    if (requestMarker !== -1) text = text.slice(requestMarker + "## My request:".length).trim();
    if (text) {
      const clipped = text.slice(0, MAX_THREAD_LENGTH - totalLength);
      chunks.push({ role, text: clipped + (fieldTruncated ? "…" : "") });
      totalLength += clipped.length;
    }
    inText = false;
    escaped = false;
    rawText = "";
    fieldTruncated = false;
  };

  const scanEligibleSegment = (segment: string) => {
    let offset = 0;
    while (offset < segment.length && totalLength < MAX_THREAD_LENGTH) {
      if (!inText) {
        const searchable = patternCarry + segment.slice(offset);
        const fieldIndex = searchable.indexOf(TEXT_FIELD);
        if (fieldIndex === -1) {
          patternCarry = searchable.slice(-(TEXT_FIELD.length - 1));
          return;
        }
        offset += Math.max(0, fieldIndex + TEXT_FIELD.length - patternCarry.length);
        patternCarry = "";
        inText = true;
      }

      let cursor = offset;
      for (; cursor < segment.length; cursor += 1) {
        const character = segment[cursor];
        if (escaped) {
          if (!fieldTruncated) rawText += character;
          escaped = false;
          continue;
        }
        if (character === "\\") {
          if (!fieldTruncated) rawText += character;
          escaped = true;
          continue;
        }
        if (character === '"') {
          finishText();
          offset = cursor + 1;
          break;
        }
        if (!fieldTruncated) {
          rawText += character;
          if (rawText.length >= MAX_FIELD_LENGTH) fieldTruncated = true;
        }
      }
      if (cursor >= segment.length) return;
    }
  };

  for await (const rawBlock of createReadStream(path, { encoding: "utf8", highWaterMark: 64 * 1024 })) {
    const block = String(rawBlock);
    let blockOffset = 0;
    while (blockOffset < block.length) {
      const newline = block.indexOf("\n", blockOffset);
      const lineEnds = newline !== -1;
      const segment = block.slice(blockOffset, lineEnds ? newline : block.length);
      if (!eligible) {
        if (prefix.length < 4096) prefix += segment.slice(0, 4096 - prefix.length);
        if (prefix.includes('"type":"UserMessage"')) { eligible = true; role = "你"; }
        else if (prefix.includes('"type":"response_item"') && prefix.includes('"role":"user"')) { eligible = true; role = "你"; }
        else if (prefix.includes('"type":"response_item"') && prefix.includes('"role":"assistant"')) { eligible = true; role = "Codex"; }
      }
      if (eligible) scanEligibleSegment(segment);
      if (lineEnds) resetLine();
      blockOffset = lineEnds ? newline + 1 : block.length;
    }
  }
  return chunks;
}
