export interface HomePreferences {
  schemaVersion: 1;
  revision: number;
  displayName: string;
  clockVisible: boolean;
  moduleVisibility: Record<string, boolean>;
}
export interface HomePreferencePatch {
  displayName?: string;
  clockVisible?: boolean;
  module?: { id: string; visible: boolean };
}
export function defaultPreferences(): HomePreferences {
  return { schemaVersion: 1, revision: 0, displayName: "", clockVisible: true, moduleVisibility: {} };
}
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export const validModuleId = (value: unknown): value is string => typeof value === "string" && /^[a-z][a-z0-9.-]{0,63}$/u.test(value);
function validName(value: unknown): value is string { return typeof value === "string" && value.length <= 80 && !/[\r\n\x00-\x1f]/u.test(value); }
export function parsePreferences(value: unknown): HomePreferences {
  if (!record(value) || value.schemaVersion !== 1 || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0 || !validName(value.displayName)
    || typeof value.clockVisible !== "boolean" || !record(value.moduleVisibility) || Object.keys(value.moduleVisibility).length > 256
    || Object.entries(value.moduleVisibility).some(([id, visible]) => !validModuleId(id) || typeof visible !== "boolean")) throw new Error("首页设置无效");
  return { schemaVersion: 1, revision: value.revision as number, displayName: value.displayName.trim(), clockVisible: value.clockVisible, moduleVisibility: { ...value.moduleVisibility } as Record<string, boolean> };
}
export function parsePreferencePatch(value: unknown): HomePreferencePatch {
  if (!record(value) || !Object.keys(value).length || Object.keys(value).some(key => !["displayName", "clockVisible", "module"].includes(key))
    || (Object.hasOwn(value, "displayName") && !validName(value.displayName)) || (Object.hasOwn(value, "clockVisible") && typeof value.clockVisible !== "boolean")
    || (Object.hasOwn(value, "module") && (!record(value.module) || Object.keys(value.module).some(key => !["id", "visible"].includes(key)) || !validModuleId(value.module.id) || typeof value.module.visible !== "boolean"))) throw new Error("首页设置更新无效");
  return value as HomePreferencePatch;
}
