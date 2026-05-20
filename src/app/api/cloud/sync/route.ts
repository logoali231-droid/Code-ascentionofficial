import { NextResponse } from "next/server";

import { cosmosContainers } from "@/lib/server/cosmos";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      store,
      payload,
      userId,
      timestamp,
    } = body;

    const container =
      cosmosContainers[
        store as keyof typeof cosmosContainers
      ];

    if (!container) {
      return NextResponse.json(
        {
          error: `Invalid store: ${store}`,
        },
        {
          status: 400,
        },
      );
    }

    const document = {
      id:
        payload.id ||
        `${userId}_${Date.now()}`,

      userId,
      timestamp,
      ...payload,
    };

    await container.items.upsert(document);

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    );
  }
}