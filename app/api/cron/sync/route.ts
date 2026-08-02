import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { syncLocationReviews } from "@/lib/services/sync-reviews";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const received = Buffer.from(authHeader ?? "");
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const locations = await prisma.location.findMany({
      include: {
        googleAccount: true,
      },
    });

    const results = [];

    for (const loc of locations) {
      try {
        const syncRes = await syncLocationReviews(loc.id);
        results.push({
          locationId: loc.id,
          locationName: loc.name,
          status: "SUCCESS",
          reviewsFound: syncRes.reviewsFound,
          autoRepliesTriggered: syncRes.autoRepliesTriggered,
        });
      } catch (err: any) {
        results.push({
          locationId: loc.id,
          locationName: loc.name,
          status: "FAILED",
          error: err.message || "Sync failed",
        });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      locationsProcessed: locations.length,
      results,
    });
  } catch (error: any) {
    console.error("Cron sync endpoint error:", error);
    return NextResponse.json(
      { error: error.message || "Cron review sync execution failed" },
      { status: 500 }
    );
  }
}
