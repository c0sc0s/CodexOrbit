import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { record } from "@c0sc0s/orbit-byted/model";
import type { BugPreferences } from "../shared/model.js";

export class BugPreferencesRepository {
  private current: BugPreferences = { revision: 0, projectKey: null };
  private queue = Promise.resolve();
  readonly ready: Promise<void>;
  constructor(private directory: string) {
    this.ready = (async () => {
      try {
        const value = record(JSON.parse(await readFile(join(directory, "preferences.json"), "utf8")));
        if (value.schemaVersion === 1 && (value.projectKey === null || typeof value.projectKey === "string" && /^[a-zA-Z0-9_-]{1,80}$/u.test(value.projectKey))) {
          this.current.projectKey = value.projectKey;
          if (Number.isSafeInteger(value.revision) && Number(value.revision) >= 0) this.current.revision = Number(value.revision);
        }
      } catch { /* Preferences are optional; query data and credentials are independent. */ }
    })();
  }
  async read() { await this.ready; return { ...this.current }; }
  update(input: unknown): Promise<BugPreferences> {
    const patch = record(input), key = patch.projectKey;
    if (Object.keys(patch).some(key => key !== "projectKey") || key !== null && (typeof key !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/u.test(key))) throw new Error("Invalid preferences");
    const pending = this.queue.then(async () => {
      await this.ready;
      const next = { revision: this.current.revision + 1, projectKey: key as string | null };
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const destination = join(this.directory, "preferences.json"), temporary = `${destination}.${randomUUID()}.tmp`;
      try { await writeFile(temporary, JSON.stringify({ schemaVersion: 1, ...next }), { mode: 0o600 }); await rename(temporary, destination); }
      finally { await rm(temporary, { force: true }); }
      this.current = next; return { ...next };
    });
    this.queue = pending.then(() => {}, () => {}); return pending;
  }
}
