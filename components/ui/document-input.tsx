"use client";
import { useRef, type ComponentProps } from "react";
import { maskDocument, normalizeDocument } from "@/lib/documents";
import { Input } from "./input";
export function DocumentInput({ cnpj=false, value, onChange, ...props }: Omit<ComponentProps<"input">,"onChange"> & {cnpj?:boolean;value:string;onChange:(value:string)=>void}) {
  const ref=useRef<HTMLInputElement>(null);
  return <Input {...props} ref={ref} inputMode={cnpj?"text":"numeric"} value={maskDocument(value,cnpj)} onChange={e=>{
    const raw=normalizeDocument(e.target.value);
    if(!(cnpj?/^[A-Z0-9]{0,12}[0-9]{0,2}$/:/^\d{0,11}$/).test(raw))return;
    const before=normalizeDocument(e.target.value.slice(0,e.target.selectionStart??0)).length;
    const formatted=maskDocument(raw,cnpj);onChange(formatted);
    requestAnimationFrame(()=>{let pos=0,count=0;while(pos<formatted.length && count<before){if(/[A-Z0-9]/.test(formatted[pos]))count++;pos++;}ref.current?.setSelectionRange(pos,pos);});
  }} />;
}
