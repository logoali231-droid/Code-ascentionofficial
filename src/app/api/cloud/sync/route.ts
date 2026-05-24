import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    console.log(
      "[SYNC ROUTE] Request received"
    );

    const body = await req.json();

    console.log(
      "[SYNC ROUTE] Body parsed"
    );

    const {
      store,
      payload,
      userId,
      timestamp,
    } = body;

    console.log(
      "[SYNC ROUTE] Store:",
      store
    );

    console.log(
      "[SYNC ROUTE] User:",
      userId
    );

    /*
      IMPORT COSMOS
    */
    console.log(
      "[SYNC ROUTE] Importing cosmos module..."
    );

    const cosmosModule = await import(
      "@/lib/server/cosmos"
    );

    console.log(
      "[SYNC ROUTE] Cosmos module imported"
    );

    const cosmosContainers =
      cosmosModule.cosmosContainers;

    console.log(
      "[SYNC ROUTE] Containers exists:",
      !!cosmosContainers
    );

    if (!cosmosContainers) {
      console.error(
        "[SYNC ROUTE] cosmosContainers undefined"
      );

      return NextResponse.json(
        {
          error:
            "COSMOS_CONTAINERS_UNDEFINED",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "[SYNC ROUTE] Available containers:",
      Object.keys(cosmosContainers)
    );

    /*
      GET CONTAINER
    */
    const container =
      cosmosContainers[
      store as keyof typeof cosmosContainers
      ];

    console.log(
      "[SYNC ROUTE] Container found:",
      !!container
    );

    if (!container) {
      console.error(
        "[SYNC ROUTE] Invalid store:",
        store
      );

      return NextResponse.json(
        {
          error: `Invalid store: ${store}`,
          available:
            Object.keys(cosmosContainers),
        },
        {
          status: 400,
        }
      );
    }

    /*
      DOCUMENT
    */
    const document = {
      id:
        payload?.id ||
        `${userId}_${Date.now()}`,

      userId,
      timestamp,

      ...payload,
    };

    console.log(
      "[SYNC ROUTE] Document prepared"
    );

    console.log(
      "[SYNC ROUTE] Document ID:",
      document.id
    );

    /*
      UPSERT
    */
    console.log(
      "[SYNC ROUTE] Starting upsert..."
    );

    const result =
      await container.items.upsert(
        document
      );

    console.log(
      "[SYNC ROUTE] Upsert success"
    );

    console.log(
      "[SYNC ROUTE] Cosmos status:",
      result?.statusCode
    );

    return NextResponse.json({
      success: true,
      statusCode:
        result?.statusCode || 200,
    });
  } catch (err: any) {
    console.error(
      "[SYNC ROUTE FATAL ERROR]"
    );

    console.error(err);

    console.error(
      err?.stack
    );

    return NextResponse.json(
      {
        success: false,

        error:
          err?.message ||
          "UNKNOWN_ERROR",

        stack:
          process.env.NODE_ENV ===
          "development"
            ? err?.stack
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}