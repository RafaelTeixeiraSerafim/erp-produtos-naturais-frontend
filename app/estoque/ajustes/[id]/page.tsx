import { AdjustmentRecord } from "@/components/adjustments";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdjustmentRecord id={id} />;
}
