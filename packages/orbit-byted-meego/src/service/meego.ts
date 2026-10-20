import { classifyCliError } from "@c0sc0s/orbit-byted/service";
import { record } from "@c0sc0s/orbit-byted/model";

export function meegoData(value: unknown): Record<string, unknown> {
  const response = record(value);
  if (!("result" in response) && !("content" in response)) return response;
  const result = record(response.result ?? response);
  if (result.isError === true) throw classifyCliError(result);
  if (result.structuredContent) return record(result.structuredContent);
  if (Array.isArray(result.content)) {
    for (const value of result.content) {
      const block = record(value);
      if (block.type !== "text" || typeof block.text !== "string") continue;
      try { return record(JSON.parse(block.text)); } catch { /* Log IDs are separate text blocks. */ }
    }
  }
  throw new Error("Invalid Meego response");
}
