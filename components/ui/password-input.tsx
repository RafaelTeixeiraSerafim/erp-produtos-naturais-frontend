"use client";
import { useRef, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./input";
export function PasswordInput(props: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return <span className="relative block"><Input {...props} ref={input} type={visible ? "text" : "password"} className={`pr-12 ${props.className || ""}`} /><button type="button" disabled={props.disabled} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible} className="absolute inset-y-0 right-0 px-3 text-muted" onMouseDown={event => event.preventDefault()} onClick={() => {
    const start=input.current?.selectionStart, end=input.current?.selectionEnd;
    setVisible(!visible);
    requestAnimationFrame(() => { input.current?.focus(); if(start!=null && end!=null)input.current?.setSelectionRange(start,end); });
  }}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>;
}
