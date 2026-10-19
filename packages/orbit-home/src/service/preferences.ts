import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { defaultPreferences, parsePreferencePatch, parsePreferences } from "../shared/preferences.js";
import type { HomePreferences } from "../shared/preferences.js";

export class HomePreferencesRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly directory: string) {}
  async read(): Promise<HomePreferences> {
    try { return parsePreferences(JSON.parse(await readFile(join(this.directory, "home.json"), "utf8"))); }
    catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return defaultPreferences();
      throw new Error("无法读取首页设置");
    }
  }
  update(value: unknown): Promise<HomePreferences> {
    const patch = parsePreferencePatch(value);
    const operation = this.queue.catch(() => {}).then(async () => {
      const current = await this.read();
      const visibility = { ...current.moduleVisibility };
      if (patch.module) visibility[patch.module.id] = patch.module.visible;
      const next = parsePreferences({ ...current, revision: current.revision + 1, displayName: patch.displayName ?? current.displayName, clockVisible: patch.clockVisible ?? current.clockVisible, moduleVisibility: visibility });
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const temporary = join(this.directory, `.home-${randomUUID()}.json`);
      try { await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 }); await rename(temporary, join(this.directory, "home.json")); }
      finally { await rm(temporary, { force: true }); }
      return next;
    });
    this.queue = operation;
    return operation;
  }
}
