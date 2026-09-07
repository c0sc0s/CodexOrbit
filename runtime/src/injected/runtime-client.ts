import {
  createRuntimeMessage,
  parseRuntimeMessage,
  RUNTIME_PROTOCOL_VERSION,
  type RuntimeMessage,
} from "../protocol.mjs";


export class RuntimeClient {
  readonly protocolVersion = RUNTIME_PROTOCOL_VERSION;

  constructor(
    private readonly transport: (message: RuntimeMessage) => Promise<unknown>,
    private readonly onMessage: (message: RuntimeMessage) => boolean,
    private readonly onRejectedMessage: (reason: string) => void,
    private readonly onTransportError: (message: RuntimeMessage) => void,
  ) {}

  send<TPayload extends Record<string, unknown>>(type: string, payload: TPayload, requestId?: number): void {
    const message = createRuntimeMessage(type, payload, requestId);
    void Promise.resolve().then(() => this.transport(message)).catch(() => this.onTransportError(message));
  }

  handle(value: unknown): boolean {
    const parsed = parseRuntimeMessage(value);
    if (!parsed.ok) {
      this.onRejectedMessage(parsed.reason);
      return false;
    }
    return this.onMessage(parsed.message);
  }
}
