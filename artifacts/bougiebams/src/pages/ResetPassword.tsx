import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/context/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const logoUrl = `${import.meta.env.BASE_URL}bougiebams-logo-transparent.png`;

export default function ResetPassword() {
  const [, navigate] = useLocation();

  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase reports recovery-link problems (e.g. an expired token) in the URL hash.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("error")) {
      setLinkError(
        hash.get("error_description")?.replace(/\+/g, " ") ??
          "This password reset link is invalid or has expired.",
      );
      setChecking(false);
      return;
    }

    let active = true;

    // The recovery link carries a one-time token that supabase-js parses from the
    // URL on load, establishing a temporary session and firing PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setChecking(false);
      }
    });

    // If the event already fired before this component mounted, the session persists.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) setReady(true);
      setChecking(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate("/account"), 1500);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/">
            <img src={logoUrl} alt="BougieBams" className="h-16 w-auto mx-auto mb-6 object-contain" />
          </Link>
          <h1 className="font-serif text-3xl font-semibold">Reset password</h1>
          <p className="text-muted-foreground text-sm mt-2">Choose a new password for your account</p>
        </div>

        {checking ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying link…
          </div>
        ) : linkError || !ready ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {linkError ?? "This password reset link is invalid or has expired. Request a new one from the sign-in page."}
            </p>
            <Link
              href="/login"
              className="block text-center text-sm text-primary hover:underline underline-offset-4 font-medium"
            >
              Back to sign in
            </Link>
          </div>
        ) : done ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
            Password updated! Redirecting…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
