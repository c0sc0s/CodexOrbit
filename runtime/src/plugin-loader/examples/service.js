var CodexPlugin = {
  async activate({ rpc, onDispose }) {
    const badge = document.createElement("div");
    badge.textContent = await rpc.call("greeting");
    Object.assign(badge.style, { position: "fixed", bottom: "12px", right: "12px", padding: "8px", background: "#173f35", color: "white", zIndex: "2147483647" });
    onDispose(() => badge.remove());
    document.body.append(badge);
    return { status: () => ({ mounted: badge.isConnected }) };
  },
};
