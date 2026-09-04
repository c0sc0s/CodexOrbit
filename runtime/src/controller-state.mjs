export function parseControllerPid(raw) {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return null;
  let value;
  try {
    const parsed = JSON.parse(trimmed);
    value = typeof parsed === "number" ? parsed : parsed?.pid;
  } catch {
    value = Number(trimmed);
  }
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function isOwnedControllerCommand(command, scriptPath) {
  if (typeof command !== "string" || typeof scriptPath !== "string" || !scriptPath) return false;
  return command.trim().endsWith(`${scriptPath} watch`);
}
