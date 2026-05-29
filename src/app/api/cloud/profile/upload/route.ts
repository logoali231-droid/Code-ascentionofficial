import { NextResponse }
from "next/server";

import {
  Storage
} from "@google-cloud/storage";

const storage =
  new Storage({
    projectId:
      process.env.GCP_PROJECT_ID,

    credentials: {
      client_email:
        process.env.GCP_CLIENT_EMAIL,

      private_key:
        process.env.GCP_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n"
        ),
    },
  });

const bucket =
  storage.bucket(
    process.env.GCP_BUCKET!
  );

export async function POST(
  req: Request
) {

  try {

    const body =
      await req.json();

    // futuramente:
    // pegar user google id

    const file =
      bucket.file(
        "profiles/main.caiprofile"
      );

    await file.save(
      JSON.stringify(body),
      {
        contentType:
          "application/json",
      }
    );

    return NextResponse.json({
      ok: true,
    });

  } catch (err) {

    console.error(err);

    return NextResponse.json(
      {
        error: "UPLOAD_FAILED"
      },
      {
        status: 500
      }
    );
  }
}