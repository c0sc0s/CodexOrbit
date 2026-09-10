export interface HealthStatus {
  runtime?: { installed?: boolean; activeVersions?: string[]; sourceVersion?: string; cdp?: boolean; controllerPid?: number | null; error?: string; tagSettings?: { tags: unknown[] }; tagSettingsError?: string | null; searchIndex?: { indexedSessions?: number; error?: string }; catalog?: { complete?: boolean; error?: string | null }; activeWindows?: Array<{ toolbar?: boolean }> };
  plugin?: { installed?: boolean; enabled?: boolean; payloadPresent?: boolean; error?: string };
  supervisor?: { loaded?: boolean };
}
export type Health = ReturnType<typeof activationHealth>;
export function runtimeHealthChecks({ runtime = {}, plugin = {}, supervisor = {} }: HealthStatus) {
  const versions = runtime.activeVersions;
  return [
    { id: "runtime-installed", ok: runtime.installed === true, message: "Local runtime installed" },
    { id: "legacy-supervisor-stopped", ok: supervisor.loaded !== true, message: "No automatic app takeover running" },
    { id: "plugin-installed", ok: plugin.installed === true && plugin.enabled === true && plugin.payloadPresent === true && !plugin.error, message: "Plugin installed and enabled" },
    { id: "cdp", ok: runtime.cdp === true, message: "Owned loopback connection active" },
    { id: "controller", ok: Number.isSafeInteger(runtime.controllerPid) && (runtime.controllerPid ?? 0) > 0 && !runtime.error, message: "Local controller running" },
    { id: "injected", ok: typeof runtime.sourceVersion === "string" && Array.isArray(versions) && versions.length > 0 && versions.every((version) => version === runtime.sourceVersion), message: "Current Tags UI loaded in every discovered window" },
    { id: "settings", ok: Array.isArray(runtime.tagSettings?.tags) && !runtime.tagSettingsError, message: "Tag settings readable" },
    { id: "search", ok: Number.isInteger(runtime.searchIndex?.indexedSessions) && !runtime.searchIndex?.error, message: "Local search index readable" },
    { id: "catalog", ok: runtime.catalog?.complete === true && !runtime.catalog?.error, message: "Active local session catalog readable" },
    { id: "sidebar", ok: Array.isArray(runtime.activeWindows) && runtime.activeWindows.some((window) => window?.toolbar === true), message: "Tags navigation available" },
  ];
}

export function activationHealth(status: HealthStatus) {
  const checks = runtimeHealthChecks(status);
  return { ok: checks.every(({ ok }) => ok), checks, hookAuthorization: "Review and enable all three Orbit Tags hooks in Codex Plugins. CLI does not verify or grant hook trust." };
}
