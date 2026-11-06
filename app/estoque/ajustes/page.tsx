import { Suspense } from "react";
import { Loading } from "@/components/feedback";
import { AdjustmentList } from "@/components/adjustments";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AdjustmentList />
    </Suspense>
  );
}
