import { NextResponse } from "next/server";
import { syncSyndicateReferralTier } from "@/lib/staking/syncSyndicateTier";

function isBech32Address(address: string): boolean {
  return /^erd1[a-z0-9]{58}$/i.test(address.trim());
}

/**
 * GET /api/staking/syndicate?address=erd1...
 * POST { address: "erd1..." }
 *
 * Checks on-chain 90D Syndicate stake (≥10k NOVA) and syncs referral tier.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";
  return handleSync(address);
}

export async function POST(request: Request) {
  let body: { address?: string } = {};
  try {
    body = (await request.json()) as { address?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  return handleSync(body.address?.trim() ?? "");
}

async function handleSync(address: string) {
  if (!isBech32Address(address)) {
    return NextResponse.json(
      { ok: false, error: "Valid MultiversX address required" },
      { status: 400 },
    );
  }

  try {
    const result = await syncSyndicateReferralTier(address);
    return NextResponse.json({
      ok: true,
      address: result.address,
      contractConfigured: result.contractConfigured,
      syndicateEligible: result.syndicateEligible,
      syndicateStakedAtomic: result.syndicateStakedAtomic,
      tier: result.tier,
      tierLabel: result.tierLabel,
      tierUpdated: result.tierUpdated,
      code: result.record?.code ?? null,
    });
  } catch (err) {
    console.error("[staking/syndicate]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Syndicate sync failed",
      },
      { status: 500 },
    );
  }
}
