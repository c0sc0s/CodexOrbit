import type { DashboardState } from "./models";

export function createInitialState(): DashboardState {
  return {
    query: "",
    tag: "all",
    sort: "sidebar",
    sortOpen: false,
    open: false,
    view: "sessions",
    tagError: "",
  };
}
