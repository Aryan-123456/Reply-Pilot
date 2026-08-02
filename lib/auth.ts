import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Ensures the authenticated user exists in the Prisma database.
 */
export async function syncUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Upsert user in database to ensure relation integrity
  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email || "" },
    create: {
      id: user.id,
      email: user.email || "",
    },
  });

  return dbUser;
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email || "" },
    create: {
      id: user.id,
      email: user.email || "",
    },
  });

  return user;
}

export async function requireOrganization() {
  const user = await requireUser();

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: {
      organization: {
        include: {
          googleAccounts: {
            include: {
              locations: {
                include: {
                  brandVoice: true,
                },
              },
            },
          },
          brandVoices: true,
        },
      },
    },
  });

  if (!member) {
    redirect("/onboarding");
  }

  return {
    user,
    organization: member.organization,
    role: member.role,
  };
}

/**
 * Verifies that a given user belongs to the specified organization ID.
 */
export async function verifyOrgAccess(organizationId: string, userId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!member) {
    throw new Error("Unauthorized: User does not belong to this organization");
  }

  return member;
}
