"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOrganization, verifyOrgAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncLocationReviews } from "@/lib/services/sync-reviews";
import { generateReviewReply } from "@/lib/services/ai-reply";
import { postReviewReply } from "@/lib/services/post-reply";

const LocationIdSchema = z.object({
  locationId: z.string().min(1, "Location ID is required"),
});

const ReviewIdSchema = z.object({
  reviewId: z.string().min(1, "Review ID is required"),
});

const UpdateDraftSchema = z.object({
  reviewReplyId: z.string().min(1, "Reply ID is required"),
  content: z.string().min(1, "Reply content cannot be empty"),
});

const PostReplySchema = z.object({
  reviewReplyId: z.string().min(1, "Reply ID is required"),
});

export async function triggerManualSync(locationIdInput: string) {
  const { locationId } = LocationIdSchema.parse({ locationId: locationIdInput });
  const { user, organization } = await requireOrganization();

  // Verify location belongs to user's organization
  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      googleAccount: {
        organizationId: organization.id,
      },
    },
  });

  if (!location) {
    throw new Error("Unauthorized access to location");
  }

  const result = await syncLocationReviews(location.id);
  revalidatePath("/dashboard");
  revalidatePath("/reviews");
  return result;
}

export async function generateAiReplyAction(reviewIdInput: string) {
  const { reviewId } = ReviewIdSchema.parse({ reviewId: reviewIdInput });
  const { organization } = await requireOrganization();

  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      location: {
        googleAccount: {
          organizationId: organization.id,
        },
      },
    },
  });

  if (!review) {
    throw new Error("Unauthorized access to review");
  }

  const reply = await generateReviewReply(review.id);
  revalidatePath("/reviews");
  return { success: true, reply };
}

export async function updateReplyDraftAction(reviewReplyIdInput: string, contentInput: string) {
  const { reviewReplyId, content } = UpdateDraftSchema.parse({
    reviewReplyId: reviewReplyIdInput,
    content: contentInput,
  });
  const { organization } = await requireOrganization();

  const reply = await prisma.reviewReply.findFirst({
    where: {
      id: reviewReplyId,
      status: "DRAFT",
      review: {
        location: {
          googleAccount: {
            organizationId: organization.id,
          },
        },
      },
    },
  });

  if (!reply) {
    throw new Error("Unauthorized access to review reply");
  }

  const updated = await prisma.reviewReply.update({
    where: { id: reply.id },
    data: {
      content,
    },
  });

  revalidatePath("/reviews");
  return { success: true, reply: updated };
}

export async function postReplyAction(reviewReplyIdInput: string) {
  const { reviewReplyId } = PostReplySchema.parse({ reviewReplyId: reviewReplyIdInput });
  const { organization } = await requireOrganization();

  const reply = await prisma.reviewReply.findFirst({
    where: {
      id: reviewReplyId,
      review: {
        location: {
          googleAccount: {
            organizationId: organization.id,
          },
        },
      },
    },
  });

  if (!reply) {
    throw new Error("Unauthorized access to review reply");
  }

  const updated = await postReviewReply(reply.id);
  revalidatePath("/reviews");
  revalidatePath("/dashboard");
  return { success: true, reply: updated };
}
