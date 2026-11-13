"use client";
import { Children, cloneElement, isValidElement, useId, type ReactNode, type ReactElement } from "react";

export function FieldHeader({ children, actions, htmlFor }: { children: ReactNode; actions?: ReactNode; htmlFor?: string }) {
  return <div className="mb-[7px] flex min-h-[34px] items-center gap-2 text-[12px] font-semibold text-[#49614e]" data-field-header>
    {htmlFor ? <label htmlFor={htmlFor}>{children}</label> : <span>{children}</span>}{actions}
  </div>;
}

export function Field({ label, actions, children }: { label: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const generatedId = useId();
  const elements = Children.toArray(children);
  const index = elements.findIndex(isValidElement);
  const control = elements[index] as ReactElement<{ id?: string }> | undefined;
  const controlId = control?.props.id || generatedId;
  const content = elements.map((child, i) => i === index && control ? cloneElement(control, {id: controlId}) : child);
  return <div className="min-w-0"><FieldHeader htmlFor={controlId} actions={actions}>{label}</FieldHeader>{content}</div>;
}
