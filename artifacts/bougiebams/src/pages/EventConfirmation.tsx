import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Calendar, MapPin, User, Mail, CheckCircle2, Clock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateCT } from "@/lib/dateUtils";

interface ConfirmationData {
  id: number;
  name: string;
  email: string;
  notes: string | null;
  status: string;
  createdAt: string;
  event: {
    id: number;
    title: string;
    date: string;
    time: string;
    location: string;
    host: string;
    priceCents: number;
    imagePath: string | null;
  };
}

export default function EventConfirmation() {
  const params = new URLSearchParams(window.location.search);
  const referenceId = params.get("referenceId");

  const [data, setData] = useState<ConfirmationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!referenceId) {
      setError("No registration reference found.");
      setLoading(false);
      return;
    }

    const id = parseInt(referenceId, 10);
    if (Number.isNaN(id)) {
      setError("Invalid registration reference.");
      setLoading(false);
      return;
    }

    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

    const fetchConfirmation = async () => {
      try {
        const res = await fetch(`${base}/api/registrations/${id}/confirmation`);
        if (!res.ok) {
          setError("Registration not found. It may have been cancelled or expired.");
          setLoading(false);
          return;
        }
        const json = await res.json() as { registration: ConfirmationData };
        setData(json.registration);
        setLoading(false);
      } catch {
        setError("Could not load registration details. Please check your email for confirmation.");
        setLoading(false);
      }
    };

    fetchConfirmation();
  }, [referenceId]);

  useEffect(() => {
    if (!data || data.status === "confirmed") return;
    if (!referenceId) return;

    const id = parseInt(referenceId, 10);
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

    const verify = async () => {
      try {
        const res = await fetch(`${base}/api/registrations/${id}/verify-payment`, { method: "POST" });
        if (res.ok) {
          const json = await res.json() as { status: string };
          if (json.status === "confirmed") {
            const confRes = await fetch(`${base}/api/registrations/${id}/confirmation`);
            if (confRes.ok) {
              const confJson = await confRes.json() as { registration: ConfirmationData };
              setData(confJson.registration);
              return;
            }
          }
        }
      } catch {}

      if (pollCount < 6) {
        setTimeout(() => setPollCount(c => c + 1), 4000);
      }
    };

    verify();
  }, [data?.status, pollCount, referenceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-6">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <div>
          <p className="font-serif text-2xl mb-2">Something went wrong</p>
          <p className="text-muted-foreground">{error ?? "Could not load registration."}</p>
        </div>
        <Link href="/events">
          <Button variant="outline" className="rounded-full">Back to Events</Button>
        </Link>
      </div>
    );
  }

  const { event } = data;
  const isPending = data.status === "pending";
  const price = event.priceCents ? `$${(event.priceCents / 100).toFixed(0)}` : "Free";

  const heroImage = event.imagePath
    ? (event.imagePath.startsWith("http") || event.imagePath.startsWith("/api/")
        ? event.imagePath
        : `${import.meta.env.BASE_URL}${event.imagePath.replace(/^\//, "")}`)
    : `${import.meta.env.BASE_URL}bougie-zebra-banner.png`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative h-48 w-full overflow-hidden">
        <img src={heroImage} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <div className="container mx-auto px-4 max-w-2xl -mt-8 relative z-10">
        <div className="bg-card rounded-3xl shadow-lg border border-border overflow-hidden">
          <div className="bg-primary/5 border-b border-border px-8 py-8 text-center">
            {isPending ? (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto mb-4">
                  <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="font-serif text-3xl font-medium mb-2">Payment Processing</h1>
                <p className="text-muted-foreground text-sm">
                  Your payment is being confirmed — this usually takes just a moment.
                  {pollCount < 8 && <span className="inline-block ml-1"><Loader2 className="w-3 h-3 animate-spin inline" /></span>}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="font-serif text-3xl font-medium mb-2">You're Registered!</h1>
                <p className="text-muted-foreground text-sm">
                  A confirmation email has been sent to <strong>{data.email}</strong>
                </p>
              </>
            )}
          </div>

          <div className="px-8 py-8 space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-medium mb-4">{event.title}</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{formatDateCT(event.date)}</span>
                    <span className="text-muted-foreground ml-2">{event.time} CT</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="font-medium">{event.location}</span>
                </div>
                {event.host && (
                  <div className="flex items-start gap-3 text-sm">
                    <User className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Hosted by <span className="font-medium text-foreground">{event.host}</span></span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-6 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Your Details</h3>
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>{data.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>{data.email}</span>
              </div>
              {data.notes && (
                <div className="bg-muted/50 rounded-xl px-4 py-3 text-sm text-muted-foreground mt-2">
                  <span className="font-medium text-foreground">Notes:</span> {data.notes}
                </div>
              )}
            </div>

            {event.priceCents > 0 && (
              <div className="border-t border-border pt-6 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Amount paid</span>
                <span className="font-serif text-xl font-medium">{price}</span>
              </div>
            )}
          </div>

          <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
            <Link href="/my-events" className="flex-1">
              <Button className="w-full rounded-xl h-12">View My Events</Button>
            </Link>
            <Link href="/events" className="flex-1">
              <Button variant="outline" className="w-full rounded-xl h-12">Browse More Events</Button>
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Questions? Email us at{" "}
          <a href="mailto:hello@bougiebams.com" className="underline hover:text-foreground transition-colors">
            hello@bougiebams.com
          </a>
        </p>
      </div>
    </div>
  );
}
