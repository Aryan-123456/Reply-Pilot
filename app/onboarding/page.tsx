"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { completeOnboardingAction } from "@/app/actions/onboarding";
import { Building2, MapPin, Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const orgName = String(formData.get("organizationName") || "").trim();
    const locName = String(formData.get("locationName") || "").trim();

    try {
      const res = await completeOnboardingAction({
        organizationName: orgName,
        locationName: locName || undefined,
      });

      if (res.success) {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete setup");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell relative min-h-screen overflow-hidden bg-[#fbfbfa] text-slate-950 flex items-center justify-center p-6">
      <div className="hero-glow" />
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 text-xl">
            R
          </div>
          <span className="text-2xl font-bold tracking-[-.05em] text-slate-950">
            Reply Pilot
          </span>
        </div>

        <Card className="relative border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Reply Pilot</CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Let's set up your business workspace to manage Google reviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center space-x-1.5">
                  <Building2 className="h-4 w-4 text-indigo-400" />
                  <span>Organization Name</span>
                </label>
                <input
                  name="organizationName"
                  type="text"
                  required
                  placeholder="e.g. Acme Hospitality Group"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center space-x-1.5">
                  <MapPin className="h-4 w-4 text-indigo-400" />
                  <span>Primary Business Location</span>
                </label>
                <input
                  name="locationName"
                  type="text"
                  placeholder="e.g. Acme Downtown Store"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  You can connect your official Google Business Profile later in Settings.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-950/50 border border-rose-800/60 p-3 text-xs text-rose-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-semibold shadow-lg shadow-indigo-600/30"
              >
                {loading ? (
                  "Setting up your workspace..."
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <span>Continue to Dashboard</span>
                    <Sparkles className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
