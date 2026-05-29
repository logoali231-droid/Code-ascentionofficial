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

export async function GET() {

  try {

    const file =
      bucket.file(
        "profiles/main.caiprofile"
      );

    const [contents] =
      await file.download();

    return NextResponse.json(
      JSON.parse(
        contents.toString()
      )
    );

  } catch (err) {

    console.error(err);

    return NextResponse.json(
      {
        error: "RESTORE_FAILED"
      },
      {
        status: 500
      }
    );
  }
}