import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

interface Profile {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  marketingConsent?: boolean;
}

export default function Account() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading, accessToken, signOut } = useSupabaseAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile>({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login?redirect=/account");
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!accessToken) return;
    setProfileLoading(true);
    fetch(`${API_BASE}/api/account/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => (res.status === 404 ? null : res.json()))
      .then(data => {
        if (data?.profile) {
          const p = data.profile as Profile;
          setProfile(p);
          setFirstName(p.firstName ?? "");
          setLastName(p.lastName ?? "");
          setPhone(p.phone ?? "");
          setMarketingConsent(p.marketingConsent ?? false);
        } else if (!data?.profile) {
          setFirstName(user?.user_metadata?.first_name ?? "");
          setLastName(user?.user_metadata?.last_name ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [accessToken, user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/account/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ firstName, lastName, phone, marketingConsent }),
      });
      if (!res.ok) throw new Error("Could not save profile");
      toast({ title: "Profile saved" });
    } catch {
      toast({ title: "Could not save profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  if (isLoading || profileLoading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "U";

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center gap-5">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight">
              {firstName || lastName ? `${firstName} ${lastName}`.trim() : "My Account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 truncate">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5 bg-card border border-border rounded-2xl p-6">
          <h2 className="font-serif text-lg font-semibold">Profile details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Chen"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
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

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </form>

        <div className="border border-border rounded-2xl p-6 space-y-3">
          <h2 className="font-serif text-lg font-semibold">Sign out</h2>
          <p className="text-sm text-muted-foreground">You'll be returned to the homepage.</p>
          <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
