import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createCliQuery } from "@c0sc0s/orbit-byted/service";
import { createMeegoMentions, nativeConfig } from "./mentions.js";

try {
  const config = await nativeConfig();
  serveStdio(() => createMeegoMentions(createCliQuery(config), config));
} catch {
  process.stderr.write("Meego could not start. Check the Orbit installation and Meego login.\n");
  process.exitCode = 1;
}
