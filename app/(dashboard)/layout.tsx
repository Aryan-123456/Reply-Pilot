import { requireOrganization } from "@/lib/auth";
import { Navigation } from "@/components/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, organization } = await requireOrganization();

  return (
    <div className="app-shell min-h-screen bg-[#fbfbfa] text-slate-950 flex flex-col font-sans">
      <Navigation
        organizationName={organization.name}
        userEmail={user.email || ""}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
