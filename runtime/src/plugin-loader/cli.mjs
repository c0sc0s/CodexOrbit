#!/usr/bin/env node
import { realpath } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { CodexProcess, findCodexApp } from "./codex-process.mjs";
import { PluginTargetRegistry } from "./target-registry.mjs";
import { PluginHost } from "./host.mjs";
import { readManifest, readPlugins, setPluginEnabled } from "./manifest.mjs";
import { acquireOwner, claimOwner, daemonPaths, daemonStatus, releaseOwner, startDaemon, stopDaemon, readHostStatus, writeHostStatus } from "./daemon.mjs";

process.umask(0o077);

const [command = "--help", ...args] = process.argv.slice(2);
if (command === "--help") {
  console.log("Usage: codex-plugin-loader <start|apply|watch|status|remove|stop> --config <local.json> [--port <9341>] [--attach]\nstart runs the Loader in the background; --attach prevents app launch. watch attaches in the foreground. apply injects renderer-only bundles once. stop/remove unload configured modules. status never imports modules.");
} else {
  let registry;
  try {
    if (!["start", "apply", "watch", "status", "remove", "stop"].includes(command)) throw new Error("Unknown loader command");
    const options = {};
    for (let i = 0; i < args.length; i += 1) {
      const key = args[i];
      if (!["--config", "--port", "--token", "--attach", "--plugin"].includes(key) || options[key] !== undefined) throw new Error("Invalid loader options");
      if (key === "--attach") options[key] = true;
      else {
        if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`Missing ${key} value`);
        options[key] = args[++i];
      }
    }
    if (!options["--config"] || (options["--token"] && command !== "watch") || (options["--attach"] && command !== "start") || (options["--plugin"] && command !== "remove")) throw new Error("Invalid options for Loader command; --config is required");
    const manifest = ["status", "stop"].includes(command)
      ? { path: await realpath(options["--config"]), plugins: [] }
      : await readManifest(options["--config"]);
    const port = Number(options["--port"] ?? 9341);
    const app = new CodexProcess({ port });
    const paths = daemonPaths(manifest.path, port);
    registry = new PluginTargetRegistry({ port, ownsEndpoint: () => app.ownsCdpEndpoint(), owner: paths.owner });
    if (command === "start") {
      if (!findCodexApp()) throw new Error("Install the official Codex desktop app first");
      if (!(await app.cdpIsReady(() => registry.discover()))) {
        if (await app.ownsCdpEndpoint() || await app.hasCdpLaunchArguments()) await app.waitForCdp(() => registry.discover());
        else {
          if (options["--attach"]) throw new Error("An already debug-enabled Codex is required");
          if (await app.portIsListening()) throw new Error("The CDP port is already occupied");
          await app.launchWithCdp(() => registry.discover());
        }
      }
      const result = await startDaemon({ configPath: manifest.path, port, paths });
      console.log(JSON.stringify(result));
      if (result.results?.some((item) => item.error)) process.exitCode = 1;
    } else if (command === "status") {
      const windows = [];
      if (await app.ownsCdpEndpoint()) {
        for (const target of await registry.discover()) windows.push({ targetId: target.id, plugins: await registry.evaluate(target, "window.__codexPluginLoader?.status() ?? []") });
      }
      console.log(JSON.stringify({ daemon: await daemonStatus(paths), modules: await readHostStatus(paths), windows }));
    } else if (command === "remove" || command === "stop") {
      const selectedId = options["--plugin"];
      if (selectedId) {
        await setPluginEnabled(manifest.path, selectedId, false);
        if ((await daemonStatus(paths)).running) {
          const deadline = Date.now() + 15_000;
          while (true) {
            const modules = await readHostStatus(paths);
            const state = modules?.find((module) => module.id === selectedId);
            if (modules && !state) break;
            if (state?.state === "cleanup-failed") throw new Error("Module cleanup failed; other modules remain active");
            if (!(await daemonStatus(paths)).running) break;
            if (Date.now() >= deadline) throw new Error("Module removal did not complete; configuration is disabled");
            await delay(100);
          }
        } else if (await app.ownsCdpEndpoint()) await registry.removePlugins([selectedId]);
      } else {
        await stopDaemon(paths);
        if (await app.ownsCdpEndpoint()) await registry.removePlugins(manifest.plugins.map(({ id }) => id));
      }
    } else if (command === "apply") {
      const { results } = await registry.ensurePlugins(await readPlugins(manifest.path, paths.owner));
      console.log(JSON.stringify(results));
      if (results.some((result) => result.error)) process.exitCode = 1;
    } else {
      const token = options["--token"] ?? await acquireOwner(paths);
      await claimOwner(paths, token);
      const stop = new AbortController();
      const onStop = () => stop.abort();
      process.once("SIGINT", onStop);
      process.once("SIGTERM", onStop);
      const host = new PluginHost({ registry, manifest });
      let previous = "";
      let publishedModules = "";
      const publish = async () => {
        const modules = host.status();
        const signature = JSON.stringify(modules);
        if (signature === publishedModules) return;
        await writeHostStatus(paths, token, modules);
        publishedModules = signature;
      };
      try {
        await host.start();
        const initial = await host.sync();
        await publish();
        await claimOwner(paths, token, "running");
        process.send?.({ type: "ready", result: initial });
        while (!stop.signal.aborted) {
          let results;
          try { results = await host.sync(); }
          catch {
            if (!(await app.isRunning())) break;
            results = [{ stage: "discovery", error: "Waiting for an owned Codex renderer" }];
          }
          await publish();
          const state = JSON.stringify(results.map(({ targetId, pluginId, stage, error }) => ({ targetId, pluginId, stage, error })));
          if (state !== previous) { console.log(state); previous = state; }
          await delay(1000, undefined, { signal: stop.signal }).catch(() => {});
        }
      } finally {
        const failures = await host.close();
        if (failures.length && await app.ownsCdpEndpoint()) console.error(JSON.stringify({ cleanup: failures }));
        await releaseOwner(paths, token);
        process.removeListener("SIGINT", onStop);
        process.removeListener("SIGTERM", onStop);
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally { registry?.close(); }
}
