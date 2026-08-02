import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

export async function generateReviewReply(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      location: {
        include: {
          brandVoice: true,
          googleAccount: {
            include: {
              organization: {
                include: {
                  brandVoices: true,
                },
              },
            },
          },
        },
      },
      replies: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!review) {
    throw new Error(`Review with ID ${reviewId} not found`);
  }
  if (review.googleReplyUpdatedAt) {
    throw new Error("This review already has a reply on Google");
  }

  const location = review.location;
  const org = location.googleAccount.organization;

  // Determine active brand voice settings
  const brandVoice = location.brandVoice || org.brandVoices[0];
  const voiceKind = brandVoice?.kind || "PROFESSIONAL";
  const customInstructions = brandVoice?.customInstructions || "";

  const replyLength = location.replyLength || 90;
  const language = location.language || "English";
  const modelName = process.env.OPENAI_MODEL || location.aiModel || "gpt-5.6-luna";

  const systemPrompt = `You are an expert AI customer relations manager representing "${location.name}".
Your task is to write a warm, professional, and authentic reply to a Google review.

Tone & Brand Voice: ${voiceKind}
${customInstructions ? `Custom Brand Guidelines: ${customInstructions}` : ""}
Language: ${language}
Target Length: Approximately ${replyLength} words or fewer.

Guidelines:
- Personalize the response by mentioning the reviewer's name ("${review.reviewerName}") if appropriate.
- For positive reviews (${review.rating} stars), express genuine gratitude and invite them back.
- For lower star reviews (1-3 stars), express empathy, apologize for any shortcomings, and invite them to reach out directly to resolve the issue.
- Keep the response clean, direct, and ready for publication without any meta-commentary or placeholders.`;

  const userPrompt = `Customer Name: ${review.reviewerName}
Star Rating: ${review.rating} out of 5 stars
Review Comment: ${review.comment ? `"${review.comment}"` : "[No text provided, star rating only]"}`;

  let replyContent = "";

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      replyContent = completion.choices[0]?.message?.content?.trim() || "";
    } catch {
      throw new Error("AI reply generation failed; no reply was created");
    }
  } else {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  // Upsert or create ReviewReply in DRAFT state
  const existingReply = review.replies[0];

  if (existingReply && existingReply.status === "DRAFT") {
    return await prisma.reviewReply.update({
      where: { id: existingReply.id },
      data: {
        content: replyContent,
        generatedBy: "AI",
        status: "DRAFT",
        failureReason: null,
      },
    });
  }

  return await prisma.reviewReply.create({
    data: {
      reviewId: review.id,
      content: replyContent,
      status: "DRAFT",
      generatedBy: "AI",
    },
  });
}
