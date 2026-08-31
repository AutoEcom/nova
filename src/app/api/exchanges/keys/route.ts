import { NextResponse } from "next/server";
import {
  listExchangeConnections,
  revokeExchangeConnection,
  upsertExchangeConnection,
  validateExchangeCredentials,
  verifyExchangeHandshake,
} from "@/lib/exchanges/registry";
import { getExchangeById } from "@/config/exchanges";

export const runtime = "nodejs";

function validAddress(address: string): boolean {
  return /^erd1[a-z0-9]{58}$/i.test(address);
}

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function configErrorResponse() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is required to store exchange API keys",
    },
    { status: 503 },
  );
}

/** GET /api/exchanges/keys?address=erd1... */
export async function GET(request: Request) {
  try {
    if (!supabaseConfigured()) return configErrorResponse();

    const address = new URL(request.url).searchParams.get("address")?.trim() ?? "";
    if (!validAddress(address)) {
      return NextResponse.json(
        { ok: false, error: "Valid MultiversX address required" },
        { status: 400 },
      );
    }
    const connections = await listExchangeConnections(address);
    return NextResponse.json({ ok: true, connections });
  } catch (err) {
    console.error("[exchanges/keys GET]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to load connections",
      },
      { status: 500 },
    );
  }
}

/**
 * POST — Test & Save
 * { address, exchangeId, apiKey, apiSecret }
 */
export async function POST(request: Request) {
  try {
    if (!supabaseConfigured()) return configErrorResponse();

    const body = (await request.json()) as {
      address?: string;
      exchangeId?: string;
      apiKey?: string;
      apiSecret?: string;
    };
    const address = body.address?.trim() ?? "";
    const exchangeId = body.exchangeId?.trim() ?? "";
    const apiKey = body.apiKey ?? "";
    const apiSecret = body.apiSecret ?? "";

    if (!validAddress(address)) {
      return NextResponse.json(
        { ok: false, error: "Valid MultiversX address required" },
        { status: 400 },
      );
    }

    const check = validateExchangeCredentials({ exchangeId, apiKey, apiSecret });
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: check.error }, { status: 400 });
    }

    const handshake = await verifyExchangeHandshake({
      exchangeId,
      apiKey,
      apiSecret,
    });
    if (!handshake.ok) {
      return NextResponse.json(
        { ok: false, error: handshake.error },
        { status: 400 },
      );
    }

    const connection = await upsertExchangeConnection({
      walletAddress: address,
      exchangeId,
      apiKey,
      apiSecret,
    });

    const exchange = getExchangeById(exchangeId);

    return NextResponse.json({
      ok: true,
      tested: true,
      status: "connected",
      verified: true,
      scopes: handshake.scopes,
      endpoint: handshake.endpoint,
      latencyMs: handshake.latencyMs,
      exchangeName: exchange?.name ?? exchangeId,
      connection,
      message: `Connected · ${exchange?.name ?? exchangeId} · ${handshake.scopes}`,
    });
  } catch (err) {
    console.error("[exchanges/keys POST]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to save connection",
      },
      { status: 500 },
    );
  }
}

/** DELETE { address, connectionId } */
export async function DELETE(request: Request) {
  try {
    if (!supabaseConfigured()) return configErrorResponse();

    const body = (await request.json()) as {
      address?: string;
      connectionId?: string;
    };
    const address = body.address?.trim() ?? "";
    const connectionId = body.connectionId?.trim() ?? "";
    if (!validAddress(address) || !connectionId) {
      return NextResponse.json(
        { ok: false, error: "address and connectionId required" },
        { status: 400 },
      );
    }
    await revokeExchangeConnection({ walletAddress: address, connectionId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[exchanges/keys DELETE]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to revoke connection",
      },
      { status: 500 },
    );
  }
}
