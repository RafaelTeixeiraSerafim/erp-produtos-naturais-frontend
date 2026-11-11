"use client";
import { useRouter } from "next/navigation";
import { RecordForm } from "./record-form";
import { Heading } from "./feedback";
export function NewSku(){const router=useRouter();return <><Heading title="Novo SKU" description="Selecione o produto agrupador e a apresentação comercial."/><RecordForm resource="skus" layout="page" onCancel={()=>router.push("/produtos")} onSaved={row=>router.push(`/produtos/${(row as {idProduto:string}).idProduto}`)}/></>;}
