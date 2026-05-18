import { NextResponse } from "next/server";
import { CosmosClient } from "@azure/cosmos";

// Configuração do teu Banco no Cosmos DB
const DATABASE_ID = "code-ascension-db"; 
const CONTAINER_ID = "leaderboard";     

// Função auxiliar para obter o cliente de forma segura apenas quando necessário
function getCosmosClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL não configurada no ambiente.");
    return null;
  }
  try {
    return new CosmosClient(connectionString);
  } catch (err) {
    console.error("❌ Falha crítica ao inicializar CosmosClient:", err);
    return null;
  }
}

// Força a rota a ser tratada como dinâmica (evita que o Next.js tente pré-compilar no build)
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const client = getCosmosClient();
    if (!client) {
      return NextResponse.json({ error: "CONEXÃO_NUVEM_OFFLINE" }, { status: 500 });
    }

    const { userId, username, xp, factionId } = await request.json();

    if (!userId || !username || typeof xp !== "number") {
      return NextResponse.json({ error: "PAYLOAD_CORROMPIDO" }, { status: 400 });
    }

    const container = client.database(DATABASE_ID).container(CONTAINER_ID);

    await container.items.upsert({
      id: userId,
      username,
      xp,
      factionId: factionId || "unaligned",
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, status: "NÚCLEO_SINCRONIZADO" });
  } catch (err) {
    console.error("Erro Cosmos POST:", err);
    return NextResponse.json({ error: "FALHA_GRAVACAO_GRADE" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = getCosmosClient();
    if (!client) {
      return NextResponse.json({ error: "CONEXÃO_NUVEM_OFFLINE" }, { status: 500 });
    }

    const container = client.database(DATABASE_ID).container(CONTAINER_ID);

    const { resources: players } = await container.items
      .query({
        query: "SELECT TOP 30 c.id, c.username, c.xp, c.factionId FROM c ORDER BY c.xp DESC"
      })
      .fetchAll();

    const { resources: factionSums } = await container.items
      .query({
        query: "SELECT c.factionId, SUM(c.xp) as totalXp FROM c GROUP BY c.factionId"
      })
      .fetchAll();

    const totalGlobalXp = factionSums.reduce((acc, f) => acc + (f.totalXp || 0), 0) || 1;
    const dominance: Record<string, number> = { zap: 25, shield: 25, cpu: 25, target: 25 };

    factionSums.forEach((f) => {
      if (f.factionId && f.factionId !== "unaligned" && dominance[f.factionId] !== undefined) {
        dominance[f.factionId] = Math.round(((f.totalXp || 0) / totalGlobalXp) * 100);
      }
    });

    return NextResponse.json({
      leaderboard: players,
      dominance
    });
  } catch (err) {
    console.error("Erro Cosmos GET:", err);
    return NextResponse.json({ error: "FALHA_LEITURA_GRADE" }, { status: 500 });
  }
}
