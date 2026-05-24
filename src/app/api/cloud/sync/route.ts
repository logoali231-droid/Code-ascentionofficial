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

    // Import dinâmico protegido
    const { cosmosContainers } = await import("@/lib/server/cosmos");

    // Validação se o banco de dados/cosmosContainers falhou ao ser instanciado globalmente
    if (!cosmosContainers) {
      console.warn("CosmosDB client não está inicializado.");
      return NextResponse.json({ success: false, warning: "Database offline localmente" }, { status: 200 });
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
    console.error("Erro na rota Cloud Sync:", err);
    
    // IMPORTANTE: Em desenvolvimento local, se o banco falhar, retornar um fallback estruturado 
    // com status 200 ou 202 impede o travamento catastrófico da Cache API do navegador no WebLLM.
    return NextResponse.json(
      { 
        success: false, 
        error: err.message,
        fallbackMode: true 
      },
      { status: 200 } // Mudado de 500 para 200 temporariamente para salvar o fluxo offline
    );
  }
}