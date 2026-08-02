"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(data: FormData) {
    setLoading(true); setError("");
    const email = String(data.get("email"));
    const password = String(data.get("password"));
    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setLoading(false);
    if (result.error) return setError(result.error.message);
    if (mode === "login") location.assign("/dashboard");
    else setError("Check your email to confirm your account.");
  }

  const isLogin = mode === "login";
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#fbfbfa] px-6">
    <div className="hero-glow" />
    <form action={submit} className="relative w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-8">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 font-semibold tracking-[-.04em] text-slate-950"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#2857f5] text-sm font-black text-white">R</span>Reply Pilot</Link>
      <div><p className="eyebrow">YOUR ALWAYS-ON TEAMMATE</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.05em] text-slate-950">{isLogin ? "Welcome back" : "Start replying on autopilot"}</h1><p className="mt-2 text-sm text-slate-500">{isLogin ? "Sign in to your customer-care workspace." : "Set up Reply Pilot in just a few minutes."}</p></div>
      <div><label>Email</label><input name="email" type="email" required autoComplete="email" /></div>
      <div><label>Password</label><input name="password" type="password" minLength={8} required autoComplete={isLogin ? "current-password" : "new-password"} /></div>
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
      <Button className="w-full !rounded-full" disabled={loading}>{loading ? "Please wait…" : isLogin ? "Sign in" : "Create free account"}</Button>
      <p className="text-center text-sm text-slate-500">{isLogin ? "New here?" : "Already registered?"} <Link className="font-semibold text-[#2857f5]" href={isLogin ? "/register" : "/login"}>{isLogin ? "Create account" : "Sign in"}</Link></p>
    </form>
  </main>;
}
