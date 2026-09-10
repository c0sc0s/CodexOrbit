import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { InstallationOptions } from "../installation/manager.js";

export async function withRegistryPackage<T>(
  spec: string,
  run: NonNullable<InstallationOptions["run"]>,
  consume: (directory: string) => Promise<T>,
) {
  if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+(?:@[a-zA-Z0-9.^~_-]+)?$/u.test(spec))
    throw new Error("Expected a registry package name/version, not a URL, path or option");
  const temporary = await mkdtemp(join(tmpdir(), "orbit-package-"));
  try {
    await run(
      "npm",
      [
        "install",
        "--prefix",
        temporary,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--registry=https://registry.npmjs.org",
        spec,
      ],
      { timeout: 120_000 },
    );
    const name = spec.startsWith("@") ? spec.split("@").slice(0, 2).join("@") : spec.split("@")[0];
    return await consume(join(temporary, "node_modules", name));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
