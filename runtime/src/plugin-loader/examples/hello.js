var CodexPlugin = {
  activate({ config, onDispose }) {
    const badge = document.createElement("div");
    badge.textContent = config.text ?? "Codex Plugin Loader";
    Object.assign(badge.style, { position: "fixed", bottom: "12px", right: "12px", zIndex: "2147483647", padding: "8px 12px", borderRadius: "8px", background: "#173f35", color: "white", pointerEvents: "none" });
    document.body.append(badge);
    onDispose(() => badge.remove());
    return { status: () => ({ mounted: badge.isConnected }) };
  },
};
