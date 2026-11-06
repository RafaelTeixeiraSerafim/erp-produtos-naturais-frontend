import { AdjustmentEditRecord } from "@/components/adjustments";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdjustmentEditRecord id={id} />;
}
