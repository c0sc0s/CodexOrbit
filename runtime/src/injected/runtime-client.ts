import {
  createRuntimeMessage,
  parseRuntimeMessage,
  RUNTIME_PROTOCOL_VERSION,
  type RuntimeMessage,
} from "../protocol.mjs";

type RuntimeBinding = (serializedMessage: string) => void;

export class RuntimeClient {
  readonly protocolVersion = RUNTIME_PROTOCOL_VERSION;

  constructor(
    private readonly bindingName: string,
    private readonly onMessage: (message: RuntimeMessage) => boolean,
    private readonly onRejectedMessage: (reason: string) => void,
    private readonly resolveBinding: (name: string) => unknown = (name) => (window as unknown as Record<string, unknown>)[name],
  ) {}

  get connected(): boolean {
    return typeof this.resolveBinding(this.bindingName) === "function";
  }

  send<TPayload extends Record<string, unknown>>(type: string, payload: TPayload, requestId?: number): boolean {
    const binding = this.resolveBinding(this.bindingName);
    if (typeof binding !== "function") return false;
    (binding as RuntimeBinding)(JSON.stringify(createRuntimeMessage(type, payload, requestId)));
    return true;
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
