interface CodexTagsRuntimeApi {
  version: string;
  status(): unknown;
  dispose?(): boolean;
  handleMessage(value: unknown): boolean;
}

interface Window {
  __codexSidebarTags?: CodexTagsRuntimeApi;
}
