import { prisma } from "@/lib/prisma";
import { ReplyStatus } from "@prisma/client";
import { getValidGoogleAccessToken, postReplyToGoogleApi } from "@/lib/google";

export async function postReviewReply(reviewReplyId: string) {
  const reply = await prisma.reviewReply.findUnique({
    where: { id: reviewReplyId },
    include: {
      review: {
        include: {
          location: {
            include: {
              googleAccount: true,
            },
          },
        },
      },
    },
  });

  if (!reply) {
    throw new Error(`ReviewReply with ID ${reviewReplyId} not found`);
  }
  if (reply.status === ReplyStatus.POSTED) return reply;
  const claim = await prisma.reviewReply.updateMany({
    where: { id: reply.id, status: ReplyStatus.DRAFT },
    data: { status: ReplyStatus.POSTING, failureReason: null },
  });
  if (claim.count !== 1) {
    throw new Error("Reply is already being posted or is no longer a draft");
  }

  const review = reply.review;
  if (review.googleReplyUpdatedAt) {
    throw new Error("This review already has a reply on Google");
  }
  const location = review.location;
  const googleAccount = location.googleAccount;

  try {
    const accessToken = await getValidGoogleAccessToken(googleAccount.id);

    const success = await postReplyToGoogleApi(
      accessToken,
      location.googleLocationId,
      review.googleReviewId,
      reply.content
    );

    if (success) {
      const now = new Date();
      const updatedReply = await prisma.reviewReply.update({
        where: { id: reply.id },
        data: {
          status: ReplyStatus.POSTED,
          postedAt: now,
          failureReason: null,
        },
      });

      await prisma.review.update({
        where: { id: review.id },
        data: {
          googleReplyUpdatedAt: now,
        },
      });

      return updatedReply;
    } else {
      return await prisma.reviewReply.update({
        where: { id: reply.id },
        data: {
          status: ReplyStatus.FAILED,
          failureReason: "Google API returned failure status",
        },
      });
    }
  } catch (error: any) {
    console.error(`Error posting reply ${reviewReplyId} to Google:`, error);

    return await prisma.reviewReply.update({
      where: { id: reply.id },
      data: {
        status: ReplyStatus.FAILED,
        failureReason: "Failed to post reply to Google Business Profile",
      },
    });
  }
}
