import { useLayoutEffect, useRef } from "preact/hooks";
import { mountSelect } from "@c0sc0s/orbit/ui";
import type { SelectChoice, SelectControl } from "@c0sc0s/orbit/ui";

interface Props {
  label: string;
  value: string;
  choices: readonly SelectChoice[];
  onChange: (value: string) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}
export function Select({ label, value, choices, onChange, disabled, title, className = "" }: Props) {
  const trigger = useRef<HTMLButtonElement>(null), control = useRef<SelectControl | null>(null), change = useRef(onChange);
  const committed = useRef(false);
  change.current = onChange;
  useLayoutEffect(() => {
    if (!trigger.current) return;
    const instance = mountSelect(trigger.current, { value, choices, onChange: next => { committed.current = true; change.current(next); } });
    control.current = instance;
    return () => { instance.dispose(); control.current = null; };
  }, []);
  useLayoutEffect(() => {
    control.current?.update({ value, choices });
    if (!disabled && committed.current && trigger.current) {
      committed.current = false;
      const root = trigger.current.getRootNode(), doc = trigger.current.ownerDocument;
      const active = root instanceof ShadowRoot ? root.activeElement : doc.activeElement;
      // An async save temporarily disables the trigger; restore only focus lost to the document.
      if (!active || active === doc.body) trigger.current.focus({ preventScroll: true });
    }
  }, [value, choices, disabled]);
  return <button type="button" ref={trigger} class={className} aria-label={label} disabled={disabled} title={title} />;
}
