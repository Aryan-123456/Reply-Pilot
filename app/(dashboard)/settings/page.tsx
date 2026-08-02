import { requireOrganization } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings-form";
import { fetchGoogleBusinessLocations, getValidGoogleAccessToken } from "@/lib/google";

export default async function SettingsPage() {
  const { organization } = await requireOrganization();

  // Fetch primary location and brand voice settings
  const location = await prisma.location.findFirst({
    where: {
      googleAccount: {
        organizationId: organization.id,
      },
    },
    include: {
      googleAccount: true,
      brandVoice: true,
    },
  });
  const googleAccount = location?.googleAccount ?? await prisma.googleAccount.findFirst({
    where: { organizationId: organization.id },
  });
  let availableLocations: { name: string; title: string; address?: string }[] = [];
  if (googleAccount && !location) {
    try {
      const token = await getValidGoogleAccessToken(googleAccount.id);
      availableLocations = await fetchGoogleBusinessLocations(token, googleAccount.googleAccountId);
    } catch {
      // The settings screen remains usable and offers reconnect if Google discovery fails.
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Workspace Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your organization details, Google Business OAuth connection, and AI reply rules
        </p>
      </div>

      <SettingsForm
        organization={{
          id: organization.id,
          name: organization.name,
        }}
        location={location}
        googleAccount={googleAccount ? { email: googleAccount.email } : null}
        availableLocations={availableLocations}
      />
    </div>
  );
}
