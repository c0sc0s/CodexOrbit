export function assertMessageSize(value) {
  if (Buffer.byteLength(JSON.stringify(value) ?? "null") > 1024 * 1024) throw new Error("Service message exceeds 1 MiB");
}
