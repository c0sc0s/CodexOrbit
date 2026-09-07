import type { DashboardState, SortMode, TagErrorCode } from "./models";

export type RuntimeAction =
  | { type: "query.set"; value: string }
  | { type: "tag.set"; value: string }
  | { type: "sort.set"; value: SortMode }
  | { type: "sort-menu.set"; value: boolean }
  | { type: "view.set"; value: DashboardState["view"] }
  | { type: "tag-error.set"; value: TagErrorCode }
  | { type: "dashboard.open" }
  | { type: "dashboard.close" }
  | { type: "entry.open" };

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

export function reduceRuntimeState(state: DashboardState, action: RuntimeAction): DashboardState {
  if (action.type === "query.set") return { ...state, query: action.value };
  if (action.type === "tag.set") return { ...state, tag: action.value };
  if (action.type === "sort.set") return { ...state, sort: action.value, sortOpen: false };
  if (action.type === "sort-menu.set") return { ...state, sortOpen: action.value };
  if (action.type === "view.set") return { ...state, view: action.value, sortOpen: false, tagError: "" };
  if (action.type === "tag-error.set") return { ...state, tagError: action.value };
  if (action.type === "dashboard.open") return { ...state, open: true, view: "sessions", sortOpen: false };
  if (action.type === "dashboard.close") return { ...state, open: false, sortOpen: false };
  return { ...state, query: "", tag: "all", sortOpen: false };
}

export class RuntimeStore {
  readonly state: DashboardState;

  constructor(initialState = createInitialState()) {
    this.state = initialState;
  }

  dispatch(action: RuntimeAction): void {
    Object.assign(this.state, reduceRuntimeState(this.state, action));
  }
}
