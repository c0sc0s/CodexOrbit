import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") throw new Error("Icon conversion requires macOS sips and iconutil");
const assets = fileURLToPath(new URL("../assets/", import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), "orbit-icon-"));
try {
  const iconset = join(temporary, "Orbit.iconset");
  await mkdir(iconset);
  for (const size of [16, 32, 128, 256, 512]) {
    for (const scale of [1, 2]) {
      const pixels = String(size * scale);
      execFileSync("/usr/bin/sips", ["-z", pixels, pixels, join(assets, "app-icon.png"), "--out",
        join(iconset, `icon_${size}x${size}${scale === 2 ? "@2x" : ""}.png`)], { stdio: "ignore" });
    }
  }
  execFileSync("/usr/bin/iconutil", ["-c", "icns", iconset, "-o", join(assets, "icon.icns")]);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
