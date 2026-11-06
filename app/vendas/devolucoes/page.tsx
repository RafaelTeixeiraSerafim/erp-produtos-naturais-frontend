import { Suspense } from "react";
import { Loading } from "@/components/feedback";
import { ReturnList } from "@/components/returns";
export default function Page() {return <Suspense fallback={<Loading/>}><ReturnList kind="clientes"/></Suspense>;}
