interface CodexTagsRuntimeApi {
  version: string;
  status(): unknown;
  dispose?(): boolean;
}

interface Window {
  __codexSidebarTags?: CodexTagsRuntimeApi;
}
