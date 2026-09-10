import { open, rm } from "node:fs/promises";

export async function withInstallationLock<T>(configPath: string, operation: () => Promise<T>) {
  const path = `${configPath}.lock`;
  const handle = await open(path, "wx", 0o600).catch((error) => {
    if (error.code === "EEXIST")
      throw new Error(
        "Another Orbit configuration operation is running; stale locks require explicit inspection",
      );
    throw error;
  });
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: Date.now() }));
    return await operation();
  } finally {
    await handle.close();
    await rm(path, { force: true });
  }
}
