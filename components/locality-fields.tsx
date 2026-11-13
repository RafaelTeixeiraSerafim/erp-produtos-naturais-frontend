"use client";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { authRequest } from "@/lib/auth-client";
import { Field } from "./ui/field";
import { RefreshCw } from "lucide-react";
import { Select } from "./ui/input";
import { Button } from "./ui/button";
import type { UseFormReturn } from "react-hook-form";
import type { Values } from "@/lib/catalog";
type Catalog={dados:{id:number;nome:string;sigla?:string}[];desatualizado:boolean};
export function LocalityFields({form,disabled}:{form:UseFormReturn<Values>;disabled:boolean}) {
  const uf=form.watch("estado") || "", city=form.watch("cidade") || "", code=form.watch("municipioIbge") || "";
  const changed=useRef(false);
  const states=useQuery({queryKey:["localidades","estados"],queryFn:()=>authRequest<Catalog>("localidades/estados"),staleTime:86400000});
  const cities=useQuery({queryKey:["localidades","municipios",uf],queryFn:()=>authRequest<Catalog>(`localidades/estados/${uf}/municipios`),enabled:!!states.data?.dados.some(s=>s.sigla===uf),staleTime:86400000});
  useEffect(()=>{
    if(code || changed.current || !cities.data)return;
    const matches=cities.data.dados.filter(c=>c.nome.trim().toLocaleLowerCase("pt-BR")===city.trim().toLocaleLowerCase("pt-BR"));
    if(matches.length===1){form.setValue("municipioIbge",String(matches[0].id));form.setValue("cidade",matches[0].nome);}
  },[cities.data,city,code,form]);
  function refresh(query:typeof states,label:string){return <Button type="button" variant="ghost" size="icon" disabled={query.isFetching || disabled} aria-label={`Atualizar ${label}`} onClick={()=>void query.refetch()}><RefreshCw size={15} className={query.isFetching?"animate-spin":""}/></Button>;}
  function status(query:typeof states){return <>
    {query.isFetching && <small className="block" role="status">Carregando…</small>}{query.isError && <small className="block" role="alert">Catálogo indisponível. Atualize este campo.</small>}{query.data?.desatualizado && <small className="block" role="status">Usando catálogo em cache durante indisponibilidade do IBGE.</small>}
  </>;}
  return <><Field label="Estado *" actions={refresh(states,"estados")}><Select id="locality-state" aria-label="Estado" disabled={disabled || !states.data} value={uf} onChange={e=>{
    changed.current=true;form.setValue("estado",e.target.value,{shouldDirty:true});form.setValue("cidade","",{shouldDirty:true});form.setValue("municipioIbge","",{shouldDirty:true});
  }}><option value="">Selecione…</option>{uf && !states.data?.dados.some(s=>s.sigla===uf) && <option value={uf}>{uf} (endereço anterior)</option>}{states.data?.dados.map(s=><option key={s.id} value={s.sigla}>{s.nome} ({s.sigla})</option>)}</Select>{status(states)}</Field>
  <Field label="Cidade *" actions={refresh(cities,"municípios")}><Select id="locality-city" aria-label="Cidade" disabled={disabled || !uf || cities.isFetching || !cities.isSuccess} value={code} onChange={e=>{
    changed.current=true;const selected=cities.data?.dados.find(c=>String(c.id)===e.target.value);form.setValue("municipioIbge",e.target.value,{shouldDirty:true});form.setValue("cidade",selected?.nome || "",{shouldDirty:true});
  }}><option value="">Selecione…</option>{cities.data?.dados.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</Select>{status(cities)}{city && !code && <p>Endereço anterior: {city} / {uf}. Se alterar o endereço, selecione o município.</p>}
  {form.formState.errors.cidade && <p role="alert">{form.formState.errors.cidade.message}</p>}</Field></>;
}
