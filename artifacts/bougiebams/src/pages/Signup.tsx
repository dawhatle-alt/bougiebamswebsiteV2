import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const logoUrl = `${import.meta.env.BASE_URL}bougiebams-logo-transparent.png`;

export default function Signup() {
  const [, navigate] = useLocation();
  const { signUp, isAuthenticated, isLoading } = useSupabaseAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect") ?? "/";

  if (!isLoading && isAuthenticated) {
    navigate(redirect);
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    const { error } = await signUp(email, password, firstName, lastName, marketingConsent);
    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      navigate(redirect);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/">
            <img src={logoUrl} alt="BougieBams" className="h-16 w-auto mx-auto mb-6 object-contain" />
          </Link>
          <h1 className="font-serif text-3xl font-semibold">Create an account</h1>
          <p className="text-muted-foreground text-sm mt-2">Join the BougieBams community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                placeholder="Jade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Chen"
              />
            </div>
          </div>

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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              id="marketing"
              type="checkbox"
              checked={marketingConsent}
              onChange={e => setMarketingConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <Label htmlFor="marketing" className="text-sm text-muted-foreground font-normal leading-snug cursor-pointer">
              Send me news about events, products, and exclusive offers
            </Label>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline underline-offset-4 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
