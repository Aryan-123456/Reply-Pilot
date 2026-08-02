"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  updateOrganizationAction,
  updateLocationSettingsAction,
  updateBrandVoiceAction,
  selectGoogleLocationAction,
} from "@/app/actions/settings";
import {
  Building2,
  Sparkles,
  Bot,
  Globe,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { BrandVoiceKind } from "@prisma/client";

interface SettingsFormProps {
  organization: {
    id: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
    autoReply: boolean;
    replyLength: number;
    language: string;
    aiModel: string;
    googleAccount: {
      email: string;
      createdAt: Date;
    };
    brandVoice?: {
      kind: BrandVoiceKind;
      customInstructions: string | null;
    } | null;
  } | null;
  googleAccount: { email: string } | null;
  availableLocations: { name: string; title: string; address?: string }[];
}

export function SettingsForm({ organization, location, googleAccount, availableLocations }: SettingsFormProps) {
  const [orgName, setOrgName] = useState(organization.name);
  const [orgSaving, setOrgSaving] = useState(false);

  const [autoReply, setAutoReply] = useState(location?.autoReply ?? false);
  const [replyLength, setReplyLength] = useState(location?.replyLength ?? 90);
  const [language, setLanguage] = useState(location?.language ?? "English");
  const [aiModel, setAiModel] = useState(location?.aiModel ?? "gpt-5.6-luna");
  const [locSaving, setLocSaving] = useState(false);

  const [voiceKind, setVoiceKind] = useState<BrandVoiceKind>(
    location?.brandVoice?.kind || "PROFESSIONAL"
  );
  const [customInstructions, setCustomInstructions] = useState(
    location?.brandVoice?.customInstructions || ""
  );
  const [voiceSaving, setVoiceSaving] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState(false);

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgSaving(true);
    setMsg(null);
    try {
      await updateOrganizationAction(orgName);
      setMsg({ type: "success", text: "Organization name updated successfully!" });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to update organization" });
    } finally {
      setOrgSaving(false);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;
    setLocSaving(true);
    setMsg(null);
    try {
      await updateLocationSettingsAction({
        locationId: location.id,
        autoReply,
        replyLength: Number(replyLength),
        language,
        aiModel,
      });
      setMsg({ type: "success", text: "Location automation settings saved!" });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to save location settings" });
    } finally {
      setLocSaving(false);
    }
  };

  const handleUpdateBrandVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;
    setVoiceSaving(true);
    setMsg(null);
    try {
      await updateBrandVoiceAction({
        locationId: location.id,
        kind: voiceKind,
        customInstructions,
      });
      setMsg({ type: "success", text: "Brand voice guidelines updated!" });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to update brand voice" });
    } finally {
      setVoiceSaving(false);
    }
  };
  const handleSelectLocation = async (googleLocationId: string) => {
    setSelectingLocation(true);
    setMsg(null);
    try {
      await selectGoogleLocationAction(googleLocationId);
      window.location.reload();
    } catch (err: unknown) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to select location" });
    } finally {
      setSelectingLocation(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {msg && (
        <div
          className={`rounded-lg p-3.5 text-xs font-medium border flex items-center justify-between ${
            msg.type === "success"
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
              : "bg-rose-950/60 border-rose-800 text-rose-300"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Organization Details */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-indigo-400" />
            <span>Organization Settings</span>
          </CardTitle>
          <CardDescription>Update your company workspace details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateOrg} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <Button type="submit" disabled={orgSaving} size="sm">
              {orgSaving ? "Saving..." : "Save Organization"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Google Business Connection Status */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-indigo-400" />
            <span>Google Business Integration</span>
          </CardTitle>
          <CardDescription>
            OAuth connection for Google My Business review synchronization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {googleAccount ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Google Business Account Connected</p>
                  <p className="text-xs text-slate-400">{googleAccount.email}</p>
                </div>
              </div>

              <a href="/api/google/connect">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Reconnect Account
                </Button>
              </a>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-amber-950/20 border border-amber-800/40">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Google Account Not Connected</p>
                  <p className="text-xs text-slate-400">Connect Google to sync real customer reviews</p>
                </div>
              </div>

              <a href="/api/google/connect">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500">
                  Connect Google Business
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {googleAccount && !location && (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader><CardTitle>Select your business location</CardTitle><CardDescription>Choose the one location to manage in this MVP workspace.</CardDescription></CardHeader>
          <CardContent>
            {availableLocations.length ? <div className="space-y-2">
              {availableLocations.map((candidate) => <button key={candidate.name} type="button" disabled={selectingLocation} onClick={() => handleSelectLocation(candidate.name)} className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-left text-sm hover:border-indigo-500 disabled:opacity-50"><span><span className="block font-medium text-white">{candidate.title}</span>{candidate.address && <span className="text-xs text-slate-400">{candidate.address}</span>}</span><span className="text-indigo-400">Select</span></button>)}
            </div> : <p className="text-sm text-slate-400">No locations could be loaded. Reconnect Google or confirm that this account can manage a verified Business Profile.</p>}
          </CardContent>
        </Card>
      )}

      {/* Brand Voice Customization */}
      {location && (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <span>Brand Voice & Persona</span>
            </CardTitle>
            <CardDescription>
              Define the tone and guidelines used by AI when generating review responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateBrandVoice} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Tone Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {(["PROFESSIONAL", "FRIENDLY", "LUXURY", "CASUAL", "CUSTOM"] as BrandVoiceKind[]).map(
                    (kind) => (
                      <button
                        type="button"
                        key={kind}
                        onClick={() => setVoiceKind(kind)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                          voiceKind === kind
                            ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {kind}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Custom Brand Instructions
                </label>
                <textarea
                  rows={3}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Always thank the customer by name, invite them to visit our rooftop bar, and sign off as 'The Acme Management Team'."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <Button type="submit" disabled={voiceSaving} size="sm">
                {voiceSaving ? "Saving Persona..." : "Save Brand Voice"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Location Automation Settings */}
      {location && (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sliders className="h-5 w-5 text-indigo-400" />
              <span>Location Automation Settings</span>
            </CardTitle>
            <CardDescription>
              Configure auto-posting rules and AI parameters for {location.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateLocation} className="space-y-5">
              {/* Auto Reply Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-white">Auto-Post AI Replies</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automatically generate and publish AI replies to Google as soon as new reviews arrive
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoReply}
                  onChange={(e) => setAutoReply(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Max Reply Length (words)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={300}
                    value={replyLength}
                    onChange={(e) => setReplyLength(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Response Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    AI Engine Model
                  </label>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="gpt-5.6-luna">gpt-5.6-luna (Default)</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-4o">gpt-4o</option>
                  </select>
                </div>
              </div>

              <Button type="submit" disabled={locSaving} size="sm">
                {locSaving ? "Saving Settings..." : "Save Location Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
