import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      store,
      payload,
      userId,
      timestamp,
    } = body;

    // Importação dinâmica segura
    const { cosmosContainers } = await import("@/lib/server/cosmos");

    if (!cosmosContainers) {
      console.warn("[SYNC]: Cosmos DB não foi inicializado localmente.");
      return NextResponse.json(
        { success: false, warning: "Banco de dados offline em dev" },
        { status: 200 }
      );
    }

    const container = cosmosContainers[store as keyof typeof cosmosContainers];

    if (!container) {
      return NextResponse.json(
        { error: `Invalid store: ${store}` },
        { status: 400 },
      );
    }

    const document = {
      id: payload.id || `${userId}_${Date.now()}`,
      userId,
      timestamp,
      ...payload,
    };

    await container.items.upsert(document);

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    console.error("[SYNC CRITICAL ERROR]:", err.message);
    
    // RETORNO CRÍTICO DE SEGURANÇA: Mudar para 200 em caso de erro local 
    // impede que o Service Worker ou a Cache API travem o WebLLM
    return NextResponse.json(
      { 
        success: false, 
        error: err.message,
        localFallback: true 
      },
      { status: 200 } 
    );
  }
}