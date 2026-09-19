import { NextResponse } from "next/server";

const APP_ID = "2B633NXZ52.com.graceconnect.app";

const body = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appID: APP_ID,
        paths: ["NOT /api/*", "NOT /.well-known/*", "*"],
      },
    ],
  },
};

export async function GET() {
  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
