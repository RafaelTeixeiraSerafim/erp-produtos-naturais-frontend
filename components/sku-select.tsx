"use client";
import { Children, isValidElement, useState, type ComponentProps } from "react";
import { Input, Select } from "./ui/input";
export function SkuSelect({children,...props}:ComponentProps<typeof Select>) {
  const [search,setSearch]=useState("");
  const normalize=(v:string)=>v.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLocaleLowerCase("pt-BR");
  return <span className="grid gap-2"><Select {...props}>{Children.toArray(children).filter(child=>{
    if(!isValidElement<{value?:string;children?:unknown}>(child) || !child.props.value || child.props.value===props.value) return true;
    return normalize(String(child.props.children)).includes(normalize(search));
  })}</Select><Input aria-label="Buscar por produto, apresentação ou código" placeholder="Buscar produto, apresentação ou código…" value={search} disabled={props.disabled} onChange={e=>setSearch(e.target.value)}/></span>;
}
