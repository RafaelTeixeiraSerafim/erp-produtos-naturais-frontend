import { Suspense } from "react";
import { Loading } from "@/components/feedback";
import { ReturnNew } from "@/components/returns";
export default function Page() {return <Suspense fallback={<Loading/>}><ReturnNew kind="clientes"/></Suspense>;}
