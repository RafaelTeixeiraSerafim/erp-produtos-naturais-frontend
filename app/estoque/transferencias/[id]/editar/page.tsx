import { TransferEditRecord } from "@/components/transfers";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransferEditRecord id={id} />;
}
