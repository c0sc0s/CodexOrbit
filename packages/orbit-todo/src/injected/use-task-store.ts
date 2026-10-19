import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { PAGE_SIZE } from "../shared/model.js";
import type { TaskPage, TaskSummary } from "../shared/model.js";

export type Api = <T>(method: string, payload?: unknown) => Promise<T>;
export type Mutate = <T>(method: string, payload: unknown) => Promise<T | undefined>;
interface Snapshot { items: TaskSummary[]; loading: boolean; error: string; generation: number }
const empty = (): Snapshot => ({ items: [], loading: true, error: "", generation: 0 });

export function useTaskStore(api: Api, subscribe: (refresh: () => void) => () => void) {
  const [active, setActive] = useState(empty);
  const [pending, setPending] = useState(0), [operationError, setOperationError] = useState("");
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    const update = (patch: Partial<Snapshot>) => {
      if (request === sequence.current) setActive(before => ({ ...before, ...patch }));
    };
    update({ loading: true });
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const items: TaskSummary[] = [];
        let generation: number | undefined, retry = false;
        for (let offset = 0; ; offset += PAGE_SIZE) {
          const page = await api<TaskPage>("list", { offset, limit: PAGE_SIZE });
          if (request !== sequence.current) return;
          if (generation !== undefined && page.generation !== generation) { retry = true; break; }
          generation = page.generation; items.push(...page.items);
          if (items.length >= page.total) break;
        }
        if (retry) continue;
        update({ items, error: "", generation: generation! }); return;
      }
      throw new Error("任务正在频繁更新，请稍后刷新。");
    } catch (failure) { update({ error: `任务列表未能刷新：${(failure as Error).message}` }); }
    finally { update({ loading: false }); }
  }, [api]);
  useEffect(() => {
    void refresh();
    const unsubscribe = subscribe(() => { void refresh(); });
    return () => { sequence.current++; unsubscribe(); };
  }, [refresh, subscribe]);
  const mutate: Mutate = async <T,>(method: string, payload: unknown): Promise<T | undefined> => {
    setPending(value => value + 1); setOperationError("");
    try {
      const result = await api<T>(method, payload);
      // A confirmed write remains successful if the following list refresh fails.
      await refresh(); return result;
    } catch (failure) { setOperationError((failure as Error).message); return undefined; }
    finally { setPending(value => value - 1); }
  };
  return { active, busy: pending > 0, error: operationError, setError: setOperationError, mutate, refresh };
}
