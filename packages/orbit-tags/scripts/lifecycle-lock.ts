import { lstat, mkdir, open, rm } from "node:fs/promises";

export async function withLifecycleLock<T>(directory: string, operation: () => Promise<T>) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if ((await lstat(directory)).isSymbolicLink()) throw new Error("Installation directory must not be a symbolic link.");
  const path = `${directory}/.lifecycle.lock`;
  let handle;
  try {
    handle = await open(path, "wx", 0o600);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
    throw new Error(`Another installation may be running. Wait for it to finish. If it crashed, remove only ${path} after confirming no Orbit Tags CLI is running.`);
  }
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    return await operation();
  } finally {
    await handle.close();
    await rm(path, { force: true });
  }
}
