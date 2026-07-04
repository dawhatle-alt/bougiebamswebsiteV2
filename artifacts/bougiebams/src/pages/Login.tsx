import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { supabase } from "@/context/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const logoUrl = `${import.meta.env.BASE_URL}bougiebams-logo-transparent.png`;

export default function Login() {
  const [, navigate] = useLocation();
  const { signIn, isAuthenticated, isLoading } = useSupabaseAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect") ?? "/";

  if (!isLoading && isAuthenticated) {
    navigate(redirect);
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      navigate(redirect);
    }
  }

  async function handleForgotPassword(e: React.MouseEvent) {
    e.preventDefault();
    if (!email) {
      setError("Enter your email address above, then click Forgot password.");
      return;
    }
    setResetLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/">
            <img src={logoUrl} alt="BougieBams" className="h-16 w-auto mx-auto mb-6 object-contain" />
          </Link>
          <h1 className="font-serif text-3xl font-semibold">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-2">Sign in to your BougieBams account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-60"
              >
                {resetLoading ? "Sending…" : "Forgot password?"}
              </button>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {resetSent && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Password reset email sent! Check your inbox.
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline underline-offset-4 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
