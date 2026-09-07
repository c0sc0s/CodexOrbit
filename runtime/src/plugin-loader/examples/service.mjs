export function activate({ id, rpc }) {
  rpc.handle("greeting", () => `Hello from ${id}`);
}
