import { Suspense } from "react";
import { Loading } from "@/components/feedback";
import { TransferList } from "@/components/transfers";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <TransferList />
    </Suspense>
  );
}
