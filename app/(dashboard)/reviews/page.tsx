import { requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewList, ReviewItemData } from "@/components/review-list";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default async function ReviewsPage() {
  const { organization } = await requireOrganization();

  // Fetch location and all reviews for organization
  const location = await prisma.location.findFirst({
    where: {
      googleAccount: {
        organizationId: organization.id,
      },
    },
    include: {
      reviews: {
        include: {
          replies: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { reviewedAt: "desc" },
      },
    },
  });

  if (!location) {
    return (
      <div className="py-12 text-center">
        <Card className="border-slate-800 bg-slate-900/60 p-8 max-w-md mx-auto">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-indigo-400" />
          <h2 className="text-xl font-bold text-white mb-2">No Location Connected</h2>
          <p className="text-sm text-slate-400">
            Please navigate to Settings to connect your Google Business account and location.
          </p>
        </Card>
      </div>
    );
  }

  // Format reviews for client component
  const formattedReviews: ReviewItemData[] = location.reviews.map((r) => ({
    id: r.id,
    reviewerName: r.reviewerName,
    rating: r.rating,
    comment: r.comment,
    reviewedAt: r.reviewedAt.toISOString(),
    googleReviewId: r.googleReviewId,
    locationId: r.locationId,
    replies: r.replies.map((rep) => ({
      id: rep.id,
      content: rep.content,
      status: rep.status,
      postedAt: rep.postedAt ? rep.postedAt.toISOString() : null,
      failureReason: rep.failureReason,
      generatedBy: rep.generatedBy,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Customer Reviews
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage, generate AI replies, and post directly to Google for{" "}
          <span className="font-semibold text-slate-200">{location.name}</span>
        </p>
      </div>

      <ReviewList initialReviews={formattedReviews} locationId={location.id} />
    </div>
  );
}
