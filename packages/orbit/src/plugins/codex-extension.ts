import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { findCodexApp } from "../platform/codex-process.js";
import { atomicJson, exists, inside } from "../installation/files.js";
import type { PlatformConfig, InstallationOptions } from "../installation/manager.js";

type Runner = NonNullable<InstallationOptions["run"]>;
export function createCodexExtensionManager(root: string, run: Runner, binary?: string) {
  async function command(args: string[]) {
    const app = findCodexApp();
    const executable = binary ?? (app ? join(app.appPath, "Contents/Resources/codex") : undefined);
    if (!executable)
      throw new Error("Official Codex CLI is required for this plugin's naming extension");
    return run(executable, args, { timeout: 90_000, maxBuffer: 8 * 1024 * 1024 });
  }
  async function listMarketplaces(name: string, allowedRoots: string[]) {
    const args = ["plugin", "marketplace", "list", "--json"];
    try {
      return JSON.parse((await command(args)).stdout);
    } catch (error) {
      const stderr = error && typeof error === "object" && "stderr" in error
        ? String(error.stderr) : "";
      const failures = stderr.split("\n").filter(line => line.startsWith("- "));
      // Recover only this plugin's missing, platform-owned marketplace. Never infer
      // authority from an arbitrary CLI error or remove another installation's source.
      if (failures.length !== 1) throw error;
      const match = /^- `([^`]+)` at (.+): marketplace root does not contain a supported manifest$/u.exec(failures[0]);
      if (!match || match[1] !== name || !allowedRoots.some(path => resolve(path) === resolve(match[2]))) throw error;
      const missingRoot = match[2];
      if (await exists(missingRoot)) throw error;
      await command(["plugin", "marketplace", "remove", name, "--json"]);
      return JSON.parse((await command(args)).stdout);
    }
  }
  async function inspect(id: string, config: PlatformConfig) {
    const extension = config.orbit.packages[id]?.manifest.codex;
    if (!extension) return { installed: false, enabled: false, payloadPresent: false, marketplaceOwned: false };
    try {
      const listing = JSON.parse((await command(["plugin", "marketplace", "list", "--json"])).stdout);
      const marketplace = listing.marketplaces?.find((item: { name: string }) => item.name === extension.marketplace);
      const state = JSON.parse((await command(["plugin", "list", "--json"])).stdout);
      const plugin = state.installed?.find((item: { pluginId: string }) => item.pluginId === `${extension.name}@${extension.marketplace}`);
      const payload = plugin?.source?.path;
      const expected = join(root, "marketplaces", id, "plugins", extension.name);
      const manifestPresent = typeof payload === "string" && await exists(join(payload, ".codex-plugin/plugin.json"));
      const hooksPresent = !(await exists(join(expected, "hooks/hooks.json"))) ||
        (typeof payload === "string" && await exists(join(payload, "hooks/hooks.json")));
      return {
        installed: Boolean(plugin), enabled: plugin?.enabled === true,
        payloadPresent: manifestPresent && hooksPresent && await exists(join(expected, ".codex-plugin/plugin.json")),
        marketplaceOwned: marketplace?.root === join(root, "marketplaces", id),
      };
    } catch (error) {
      return { installed: false, enabled: false, payloadPresent: false, marketplaceOwned: false,
        error: error instanceof Error ? error.message : "Official extension inspection failed" };
    }
  }
  async function remove(
    name: string,
    marketplace: string,
    unregister: boolean,
    expectedRoot: string,
  ) {
    const marketplaces = await listMarketplaces(marketplace, [expectedRoot]);
    const registered = marketplaces.marketplaces?.find(
      (entry: { name: string; root: string }) => entry.name === marketplace,
    );
    if (registered && registered.root !== expectedRoot)
      throw new Error(`Marketplace ${marketplace} belongs to another installation`);
    const state = JSON.parse((await command(["plugin", "list", "--json"])).stdout);
    if (
      state.installed?.some(
        (plugin: { pluginId: string }) => plugin.pluginId === `${name}@${marketplace}`,
      )
    )
      await command(["plugin", "remove", `${name}@${marketplace}`, "--json"]);
    if (unregister) {
      const state = JSON.parse((await command(["plugin", "marketplace", "list", "--json"])).stdout);
      if (state.marketplaces?.some((entry: { name: string }) => entry.name === marketplace))
        await command(["plugin", "marketplace", "remove", marketplace, "--json"]);
    }
  }
  async function reconcile(previous: PlatformConfig, next: PlatformConfig) {
    for (const [id, record] of Object.entries(previous.orbit.packages)) {
      if (!record.manifest.codex) continue;
      const replacement = next.orbit.packages[id];
      const enabled = next.plugins.find((plugin) => plugin.id === id)?.enabled !== false;
      if (!replacement || !enabled)
        await remove(
          record.manifest.codex.name,
          record.manifest.codex.marketplace,
          !replacement,
          join(root, "marketplaces", id),
        );
    }
    for (const [id, record] of Object.entries(next.orbit.packages)) {
      const extension = record.manifest.codex;
      if (!extension || next.plugins.find((plugin) => plugin.id === id)?.enabled === false)
        continue;
      if (
        previous.orbit.packages[id]?.path === record.path &&
        previous.plugins.find((plugin) => plugin.id === id)?.enabled !== false
      ) {
        const actual = await inspect(id, next);
        if (actual.installed && actual.enabled && actual.payloadPresent && actual.marketplaceOwned) continue;
      }
      const marketplaceRoot = inside(root, `marketplaces/${id}`);
      const payload = inside(marketplaceRoot, `plugins/${extension.name}`);
      const source = join(root, record.path);
      if (!(await exists(join(source, ".codex-plugin/plugin.json"))))
        throw new Error("Missing official extension manifest");
      const pluginManifest = JSON.parse(
        await readFile(join(source, ".codex-plugin/plugin.json"), "utf8"),
      );
      if (pluginManifest.name !== extension.name)
        throw new Error("Official extension name mismatch");
      await mkdir(join(marketplaceRoot, ".agents/plugins"), { recursive: true });
      await rm(payload, { recursive: true, force: true });
      await cp(source, payload, { recursive: true });
      await atomicJson(join(marketplaceRoot, ".agents/plugins/marketplace.json"), {
        name: extension.marketplace,
        interface: { displayName: "Orbit extensions" },
        plugins: [
          {
            name: extension.name,
            source: { source: "local", path: `./plugins/${extension.name}` },
            policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
            category: "Productivity",
          },
        ],
      });
      const listing = await listMarketplaces(extension.marketplace,
        [id, ...(record.manifest.legacyIds ?? [])].map(alias => inside(root, `marketplaces/${alias}`)));
      const registered = listing.marketplaces?.find(
        (entry: { name: string; root: string }) => entry.name === extension.marketplace,
      );
      if (registered && registered.root !== marketplaceRoot)
        throw new Error(
          `Marketplace ${extension.marketplace} is registered elsewhere; migrate it explicitly before registering this plugin`,
        );
      if (!registered) await command(["plugin", "marketplace", "add", marketplaceRoot, "--json"]);
      await command(["plugin", "add", `${extension.name}@${extension.marketplace}`, "--json"]);
    }
  }
  return { reconcile, command, remove, inspect };
}
