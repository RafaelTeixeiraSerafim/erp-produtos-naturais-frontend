import { relayOfficialIbge } from "@/lib/ibge-relay";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "gru1";
export const maxDuration = 30;
export async function GET(request: Request, context: { params: Promise<{ uf: string }> }) {
  return relayOfficialIbge(request, (await context.params).uf);
}
