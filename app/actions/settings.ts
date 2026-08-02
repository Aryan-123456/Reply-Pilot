"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BrandVoiceKind } from "@prisma/client";
import { fetchGoogleBusinessLocations, getValidGoogleAccessToken } from "@/lib/google";

const UpdateOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
});

const UpdateLocationSettingsSchema = z.object({
  locationId: z.string().min(1),
  autoReply: z.boolean(),
  replyLength: z.number().min(20).max(300),
  language: z.string().min(2),
  aiModel: z.string().min(2),
});

const UpdateBrandVoiceSchema = z.object({
  locationId: z.string().min(1),
  kind: z.nativeEnum(BrandVoiceKind),
  customInstructions: z.string().optional().nullable(),
});
const SelectGoogleLocationSchema = z.object({
  googleLocationId: z.string().regex(/^accounts\/[^/]+\/locations\/[^/]+$/, "Invalid Google location resource"),
});

export async function selectGoogleLocationAction(googleLocationIdInput: string) {
  const { googleLocationId } = SelectGoogleLocationSchema.parse({ googleLocationId: googleLocationIdInput });
  const { organization } = await requireOrganization();
  const googleAccount = await prisma.googleAccount.findFirst({ where: { organizationId: organization.id } });
  if (!googleAccount) throw new Error("Connect a Google Business account first");
  const existingLocation = await prisma.location.findFirst({ where: { googleAccountId: googleAccount.id } });
  if (existingLocation) throw new Error("A Google Business location is already selected for this workspace");

  const accessToken = await getValidGoogleAccessToken(googleAccount.id);
  const availableLocations = await fetchGoogleBusinessLocations(accessToken, googleAccount.googleAccountId);
  const selected = availableLocations.find((location) => location.name === googleLocationId);
  if (!selected) throw new Error("The selected Google Business location is not available to this account");

  const location = await prisma.location.create({
    data: {
      googleAccountId: googleAccount.id,
      googleLocationId: selected.name,
      name: selected.title,
      address: selected.address,
      brandVoice: { create: { organizationId: organization.id, kind: "PROFESSIONAL" } },
    },
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true, location };
}

export async function updateOrganizationAction(nameInput: string) {
  const { name } = UpdateOrganizationSchema.parse({ name: nameInput });
  const { organization } = await requireOrganization();

  const updated = await prisma.organization.update({
    where: { id: organization.id },
    data: { name },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true, organization: updated };
}

export async function updateLocationSettingsAction(data: z.infer<typeof UpdateLocationSettingsSchema>) {
  const parsed = UpdateLocationSettingsSchema.parse(data);
  const { organization } = await requireOrganization();

  const location = await prisma.location.findFirst({
    where: {
      id: parsed.locationId,
      googleAccount: {
        organizationId: organization.id,
      },
    },
  });

  if (!location) {
    throw new Error("Unauthorized access to location settings");
  }

  const updated = await prisma.location.update({
    where: { id: location.id },
    data: {
      autoReply: parsed.autoReply,
      replyLength: parsed.replyLength,
      language: parsed.language,
      aiModel: parsed.aiModel,
    },
  });

  revalidatePath("/settings");
  return { success: true, location: updated };
}

export async function updateBrandVoiceAction(data: z.infer<typeof UpdateBrandVoiceSchema>) {
  const parsed = UpdateBrandVoiceSchema.parse(data);
  const { organization } = await requireOrganization();

  const location = await prisma.location.findFirst({
    where: {
      id: parsed.locationId,
      googleAccount: {
        organizationId: organization.id,
      },
    },
  });

  if (!location) {
    throw new Error("Unauthorized access to location brand voice");
  }

  const brandVoice = await prisma.brandVoice.upsert({
    where: { locationId: location.id },
    update: {
      kind: parsed.kind,
      customInstructions: parsed.customInstructions || null,
    },
    create: {
      organizationId: organization.id,
      locationId: location.id,
      kind: parsed.kind,
      customInstructions: parsed.customInstructions || null,
    },
  });

  revalidatePath("/settings");
  return { success: true, brandVoice };
}
