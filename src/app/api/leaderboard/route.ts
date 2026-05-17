import { NextResponse } from "next/server";
import { CosmosClient } from "@azure/cosmos";

// Inicializa o cliente do Cosmos DB usando a string de conexão da Azure
const connectionString = process.env.DATABASE_URL;
const client = connectionString ? new CosmosClient(connectionString) : null;

// Configuração do teu Banco no Cosmos DB
const DATABASE_ID = "code-ascension-db"; // Altere se o nome do teu banco no painel for diferente
const CONTAINER_ID = "leaderboard";     // Nome da tabela/coleção para o ranking

export async function POST(request: Request) {
  try {
    if (!client) {
      return NextResponse.json({ error: "CONEXÃO_NUVEM_OFFLINE" }, { status: 500 });
    }

    const { userId, username, xp, factionId } = await request.json();

    if (!userId || !username || typeof xp !== "number") {
      return NextResponse.json({ error: "PAYLOAD_CORROMPIDO" }, { status: 400 });
    }

    const container = client.database(DATABASE_ID).container(CONTAINER_ID);

    // Upsert: Grava o registro do utilizador se não existir, ou atualiza se já existir
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
    if (!client) {
      return NextResponse.json({ error: "CONEXÃO_NUVEM_OFFLINE" }, { status: 500 });
    }

    const container = client.database(DATABASE_ID).container(CONTAINER_ID);

    // 1. Procura os 30 melhores operadores ordenados por XP decrescente
    const { resources: players } = await container.items
      .query({
        query: "SELECT TOP 30 c.id, c.username, c.xp, c.factionId FROM c ORDER BY c.xp DESC"
      })
      .fetchAll();

    // 2. Calcula dinamicamente o XP total de cada facção para a guerra global
    const { resources: factionSums } = await container.items
      .query({
        query: "SELECT c.factionId, SUM(c.xp) as totalXp FROM c GROUP BY c.factionId"
      })
      .fetchAll();

    const totalGlobalXp = factionSums.reduce((acc, f) => acc + (f.totalXp || 0), 0) || 1;

    // Distribuição base padrão equilibrada
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