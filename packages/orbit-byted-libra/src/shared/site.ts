export function libraSite(config: Record<string, unknown>) {
  const site = config.site ?? "i18n-tt";
  if (site !== "cn" && site !== "i18n-tt") throw new Error("Unsupported Libra site");
  return { site, host: site === "cn" ? "data.bytedance.net" : "libra-sg.tiktok-row.net" };
}
