"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const OnboardingSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  locationName: z.string().optional(),
});

export async function completeOnboardingAction(data: z.infer<typeof OnboardingSchema>) {
  const parsed = OnboardingSchema.parse(data);
  const user = await requireUser();

  const existingMembership = await prisma.organizationMember.findFirst({ where: { userId: user.id } });
  if (existingMembership) return { success: true, organizationId: existingMembership.organizationId };

  const organization = await prisma.organization.create({
    data: {
      name: parsed.organizationName,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
      brandVoices: {
        create: {
          kind: "PROFESSIONAL",
          customInstructions: "Thank customers politely and maintain a helpful tone.",
        },
      },
    },
  });

  return {
    success: true,
    organizationId: organization.id,
  };
}
