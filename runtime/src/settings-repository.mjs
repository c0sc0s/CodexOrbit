import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { createTagSettings, DEFAULT_TAG_DEFINITIONS, TAG_SETTINGS_SCHEMA_VERSION } from "./tag-settings.mjs";

export class SettingsRepository {
  #serialized = null;
  #writeQueue = Promise.resolve();

  constructor(path, options = {}) {
    this.path = path;
    this.fallback = options.fallback ?? DEFAULT_TAG_DEFINITIONS;
  }

  async read() {
    try {
      const source = await readFile(this.path, "utf8");
      const candidate = JSON.parse(source);
      if (!candidate || typeof candidate !== "object" || ![1, TAG_SETTINGS_SCHEMA_VERSION].includes(candidate.schemaVersion) || !Array.isArray(candidate.tags)) {
        throw new Error("Unsupported or malformed tag settings schema");
      }
      const settings = createTagSettings(candidate.tags);
      this.#serialized = this.#serialize(settings);
      return { settings, exists: true, error: null };
    } catch (error) {
      if (error?.code !== "ENOENT") {
        return {
          settings: createTagSettings(this.fallback),
          exists: false,
          error: `Unable to read tag settings: ${error.message}`,
        };
      }
      return { settings: createTagSettings(this.fallback), exists: false, error: null };
    }
  }

  write(definitions) {
    const operation = this.#writeQueue.then(() => this.#commit(definitions));
    this.#writeQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async #commit(definitions) {
    const settings = createTagSettings(definitions);
    const serialized = this.#serialize(settings);
    if (serialized === this.#serialized) return { settings, changed: false };
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporaryPath = `${this.path}.next-${process.pid}`;
    await writeFile(temporaryPath, serialized, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, this.path);
    this.#serialized = serialized;
    return { settings, changed: true };
  }

  #serialize(settings) {
    return `${JSON.stringify(settings, null, 2)}\n`;
  }
}
