import Link from "next/link";
import { requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Star,
  Clock,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { triggerManualSync } from "@/app/actions/reviews";

export default async function DashboardPage() {
  const { user, organization } = await requireOrganization();

  // Fetch locations for organization
  const locations = await prisma.location.findMany({
    where: {
      googleAccount: {
        organizationId: organization.id,
      },
    },
    include: {
      googleAccount: true,
      reviews: {
        include: {
          replies: true,
        },
        orderBy: { reviewedAt: "desc" },
      },
    },
  });

  const activeLocation = locations[0];

  // Fetch recent sync logs
  const syncLog = activeLocation
    ? await prisma.syncLog.findFirst({
        where: { locationId: activeLocation.id },
        orderBy: { createdAt: "desc" },
      })
    : null;

  // Compute metrics
  const allReviews = locations.flatMap((l) => l.reviews);
  const totalReviews = allReviews.length;
  
  const avgRating = totalReviews > 0
    ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : "5.0";

  const pendingRepliesCount = allReviews.filter(
    (r) => !r.replies.some((reply) => reply.status === "POSTED")
  ).length;

  const recentReviews = allReviews.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time review summary and AI reply automation status for{" "}
            <span className="font-semibold text-slate-200">{organization.name}</span>
          </p>
        </div>

        {activeLocation && (
          <form
            action={async () => {
              "use server";
              await triggerManualSync(activeLocation.id);
            }}
          >
            <Button type="submit" className="shadow-md shadow-indigo-600/20">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Google Reviews
            </Button>
          </form>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalReviews}</div>
            <p className="text-xs text-slate-500 mt-1">Synced across Google Profiles</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white flex items-center space-x-2">
              <span>{avgRating}</span>
              <span className="text-amber-400 text-lg">★</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Based on customer feedback</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Pending Replies</CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{pendingRepliesCount}</div>
            <p className="text-xs text-amber-400/80 mt-1">Awaiting AI or manual reply</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Last Sync</CardTitle>
            {syncLog?.status === "SUCCESS" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-slate-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-white">
              {syncLog ? syncLog.status : "Not Synced"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {syncLog ? new Date(syncLog.createdAt).toLocaleString() : "Run initial sync"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Auto Reply Status Card */}
      {activeLocation && (
        <Card className="border-indigo-900/40 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  Location: {activeLocation.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Auto-Reply Status:{" "}
                  <span
                    className={`font-semibold ${
                      activeLocation.autoReply ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {activeLocation.autoReply ? "ENABLED (Automatic AI Posting)" : "DISABLED (Manual Approval Required)"}
                  </span>
                </p>
              </div>
            </div>

            <Link href="/settings">
              <Button variant="outline" size="sm">
                Configure Brand Voice & Auto-Reply
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Recent Reviews Feed */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Latest reviews from your connected Google Business profile
            </CardDescription>
          </div>
          <Link href="/reviews">
            <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300">
              View All Reviews
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          {recentReviews.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 text-slate-600" />
              <p className="text-base font-medium">No reviews synced yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Click "Sync Google Reviews" above to import your customer feedback.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentReviews.map((review) => {
                const postedReply = review.replies.find((r) => r.status === "POSTED");
                const draftReply = review.replies.find((r) => r.status === "DRAFT");

                return (
                  <div key={review.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-semibold text-slate-200">
                          {review.reviewerName}
                        </span>
                        <div className="flex items-center text-amber-400 text-xs">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i}>{i < review.rating ? "★" : "☆"}</span>
                          ))}
                        </div>
                      </div>

                      <span className="text-xs text-slate-500">
                        {new Date(review.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300">
                      {review.comment || <span className="italic text-slate-500">No comment text provided</span>}
                    </p>

                    <div className="flex items-center space-x-2 pt-1">
                      {postedReply ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                          ✓ Replied
                        </span>
                      ) : draftReply ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                          Draft Saved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950 text-amber-400 border border-amber-800/50">
                          Pending Reply
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
