import { prisma } from "@/lib/prisma";
import { getValidGoogleAccessToken, fetchReviewsFromGoogle } from "@/lib/google";
import { generateReviewReply } from "@/lib/services/ai-reply";
import { postReviewReply } from "@/lib/services/post-reply";

export async function syncLocationReviews(locationId: string) {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      googleAccount: true,
    },
  });

  if (!location) {
    throw new Error(`Location with ID ${locationId} not found`);
  }

  try {
    const accessToken = await getValidGoogleAccessToken(location.googleAccount.id);
    const externalReviews = await fetchReviewsFromGoogle(accessToken, location.googleLocationId);

    let reviewsFound = externalReviews.length;
    let autoRepliesTriggered = 0;

    for (const extReview of externalReviews) {
      // Upsert Review idempotently by googleReviewId
      const review = await prisma.review.upsert({
        where: { googleReviewId: extReview.reviewId },
        update: {
          reviewerName: extReview.reviewerName,
          rating: extReview.starRating,
          comment: extReview.comment || null,
          reviewedAt: new Date(extReview.createTime),
          googleReplyUpdatedAt: extReview.reviewReply?.updateTime
            ? new Date(extReview.reviewReply.updateTime)
            : undefined,
        },
        create: {
          locationId: location.id,
          googleReviewId: extReview.reviewId,
          reviewerName: extReview.reviewerName,
          rating: extReview.starRating,
          comment: extReview.comment || null,
          reviewedAt: new Date(extReview.createTime),
          googleReplyUpdatedAt: extReview.reviewReply?.updateTime
            ? new Date(extReview.reviewReply.updateTime)
            : null,
        },
        include: {
          replies: true,
        },
      });

      // If Google already returned an existing external reply
      if (extReview.reviewReply?.comment) {
        const hasPostedReply = review.replies.some((r) => r.status === "POSTED");
        if (!hasPostedReply) {
          await prisma.reviewReply.create({
            data: {
              reviewId: review.id,
              content: extReview.reviewReply.comment,
              status: "POSTED",
              generatedBy: "GOOGLE_SYNC",
              postedAt: extReview.reviewReply.updateTime
                ? new Date(extReview.reviewReply.updateTime)
                : new Date(),
            },
          });
        }
      } else if (location.autoReply) {
        // Auto-reply feature enabled: check if review lacks a posted reply
        const hasPostedReply = review.replies.some((r) => r.status === "POSTED");
        if (!hasPostedReply) {
          try {
            const draftReply = await generateReviewReply(review.id);
            await postReviewReply(draftReply.id);
            autoRepliesTriggered++;
          } catch (autoErr) {
            console.error(`Auto reply failed for review ${review.id}:`, autoErr);
          }
        }
      }
    }

    // Log successful sync
    await prisma.syncLog.create({
      data: {
        locationId: location.id,
        status: "SUCCESS",
        reviewsFound,
        message: `Synced ${reviewsFound} reviews successfully. ${autoRepliesTriggered} auto-replies posted.`,
      },
    });

    return {
      success: true,
      reviewsFound,
      autoRepliesTriggered,
    };
  } catch (error: any) {
    console.error(`Sync failed for location ${locationId}:`, error);

    await prisma.syncLog.create({
      data: {
        locationId: location.id,
        status: "FAILED",
        reviewsFound: 0,
        message: error.message || "Failed to fetch reviews from Google API",
      },
    });

    throw error;
  }
}
