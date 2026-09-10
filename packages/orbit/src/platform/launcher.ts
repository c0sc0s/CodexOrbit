import { chmod, copyFile, lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const quoteShell = (value: string) => `'${value.replaceAll("'", `'"'"'`)}'`;
const escapeXml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

/** Creates the explicit Loader app entry; no product controller is referenced. */
export async function createLauncher({ launcherPath, nodePath, cliPath, configPath, port = 9341, logPath, iconPath, bundleId = "io.github.c0sc0s.codex-plugin-loader" }: { launcherPath: string; nodePath: string; cliPath: string; configPath: string; port?: number; logPath: string; iconPath?: string; bundleId?: string }) {
  try {
    if ((await lstat(launcherPath)).isSymbolicLink()) throw new Error("Launcher must not be a symlink");
    const plist = await readFile(`${launcherPath}/Contents/Info.plist`, "utf8");
    if (!plist.includes(`<string>${escapeXml(bundleId)}</string>`)) throw new Error("Another application owns the launcher path");
  } catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
  const next = `${launcherPath}.next-${process.pid}`;
  const executable = `${next}/Contents/MacOS/codex-plugin-loader`;
  try {
    await mkdir(dirname(executable), { recursive: true });
    await mkdir(`${next}/Contents/Resources`, { recursive: true });
    if (iconPath) await copyFile(iconPath, `${next}/Contents/Resources/icon.icns`);
    const script = `#!/bin/sh\nif ! ${[nodePath, cliPath, "start", "--config", configPath, "--port", String(port)].map(quoteShell).join(" ")} >> ${quoteShell(logPath)} 2>&1 </dev/null; then\n  /usr/bin/osascript -e 'display dialog "Loader could not start. If Codex is open without debugging, quit it completely and reopen this launcher. Otherwise check the Loader log." with title "Orbit" buttons {"OK"} default button "OK"'\n  exit 1\nfi\n`;
    await writeFile(executable, script, { mode: 0o755 });
    await chmod(executable, 0o755);
    await writeFile(`${next}/Contents/Info.plist`, `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0"><dict>
<key>CFBundleDisplayName</key><string>Orbit</string>
<key>CFBundleExecutable</key><string>codex-plugin-loader</string>
<key>CFBundleIdentifier</key><string>${escapeXml(bundleId)}</string>
<key>CFBundleName</key><string>Orbit</string>
${iconPath ? '<key>CFBundleIconFile</key><string>icon.icns</string>' : ''}
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>1.0</string>
<key>LSUIElement</key><true/>
</dict></plist>\n`);
    await rm(launcherPath, { recursive: true, force: true });
    await rename(next, launcherPath);
  } finally { await rm(next, { recursive: true, force: true }); }
  return launcherPath;
}
