import { SaleEditRecord } from "@/components/sales";
export default async function Page({params}:{params:Promise<{id:string}>}) {const {id}=await params;return <SaleEditRecord id={id} />;}
