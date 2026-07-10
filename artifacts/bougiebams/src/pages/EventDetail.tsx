import { useParams, useLocation } from "wouter";
import { formatDateCT } from "@/lib/dateUtils";
import { Calendar, MapPin, Users, ArrowLeft, Loader2, ExternalLink, Share2, Check } from "lucide-react";
import { useGetEvent } from "@workspace/api-client-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const eventId = parseInt(id || "0", 10);

  const { data: eventData, isLoading } = useGetEvent(eventId, {
    query: { enabled: !!eventId }
  });
  const event = eventData?.event;
  usePageTitle(event?.title, event ? `${event.date} · ${event.location}` : undefined);

  const { user, isAuthenticated, login } = useAuth();
  const { user: shopperUser, isAuthenticated: shopperAuthenticated, accessToken } = useSupabaseAuth();
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: "", email: "", notes: "" });

  useEffect(() => {
    if (shopperAuthenticated && shopperUser) {
      const meta = shopperUser.user_metadata;
      const firstName: string = meta?.first_name ?? meta?.firstName ?? "";
      const lastName: string = meta?.last_name ?? meta?.lastName ?? "";
      setFormData(prev => ({
        ...prev,
        name: prev.name || [firstName, lastName].filter(Boolean).join(" ") || shopperUser.email?.split("@")[0] || "",
        email: prev.email || shopperUser.email || "",
      }));
    } else if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || [user.firstName, user.lastName].filter(Boolean).join(" "),
        email: prev.email || user.email || "",
      }));
    }
  }, [isAuthenticated, user, shopperAuthenticated, shopperUser]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: event?.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    }
  };

  const parseEventDateTime = (date: string, time: string): Date => {
    const [year, month, day] = date.split("-").map(Number);
    const timeClean = time.replace(/\s*CT\s*$/i, "").trim();
    const [timePart, meridiem] = timeClean.split(/\s+/);
    const [hRaw, mRaw] = timePart.split(":").map(Number);
    let h = hRaw;
    if (meridiem?.toUpperCase() === "PM" && h !== 12) h += 12;
    if (meridiem?.toUpperCase() === "AM" && h === 12) h = 0;
    return new Date(year, month - 1, day, h, mRaw || 0);
  };

  const fmtCalDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  // An unparseable date/time makes .toISOString() throw "Invalid time value";
  // this gate lets callers (and the render below) skip calendar links safely.
  const hasCalendarDate = (): boolean =>
    !!event && !Number.isNaN(parseEventDateTime(event.date, event.time).getTime());

  const googleCalUrl = () => {
    if (!hasCalendarDate()) return "";
    const start = fmtCalDate(parseEventDateTime(event!.date, event!.time));
    const end = fmtCalDate(new Date(parseEventDateTime(event!.date, event!.time).getTime() + 2 * 3600000));
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event!.title)}&dates=${start}/${end}&details=${encodeURIComponent(event!.description || "")}&location=${encodeURIComponent(event!.location)}`;
  };

  const downloadIcs = () => {
    if (!hasCalendarDate()) return;
    const start = fmtCalDate(parseEventDateTime(event!.date, event!.time));
    const end = fmtCalDate(new Date(parseEventDateTime(event!.date, event!.time).getTime() + 2 * 3600000));
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BougieBams//Events//EN",
      "BEGIN:VEVENT",
      `DTSTART:${start}`, `DTEND:${end}`,
      `SUMMARY:${event!.title}`,
      `DESCRIPTION:${(event!.description || "").replace(/\n/g, "\\n")}`,
      `LOCATION:${event!.location}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `${event!.title.replace(/[^a-z0-9]/gi, "-")}.ics`;
    a.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (shopperAuthenticated && accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }
      const res = await fetch(`${base}/api/registrations/checkout`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          eventId: event.id,
          name: formData.name,
          email: formData.email,
          notes: formData.notes || undefined,
          redirectBase: window.location.origin + (import.meta.env.BASE_URL ?? "/").replace(/\/$/, ""),
        }),
      });
      if (res.status === 401) {
        if (shopperAuthenticated || isAuthenticated) {
          const data = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(data.error || "Authentication error. Please try signing in again.");
        }
        const currentPath = encodeURIComponent(window.location.pathname);
        setLocation(`/login?redirect=${currentPath}`);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || "Registration failed. Please try again.");
      }
      const data = await res.json() as { url?: string };
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        setLocation("/my-events");
      }
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center font-serif text-xl text-muted-foreground">Event not found</div>;
  }

  const isSoldOut = event.spotsLeft <= 0;
  const price = event.priceCents ? `$${(event.priceCents / 100).toFixed(0)}` : "Free";
  const heroImage = event.imagePath
    ? (event.imagePath.startsWith("http")
        ? event.imagePath
        : event.imagePath.startsWith("/api/")
          ? event.imagePath
          : event.imagePath.startsWith("/")
            ? `/api/storage${event.imagePath}`
            : `${import.meta.env.BASE_URL}${event.imagePath}`)
    : `${import.meta.env.BASE_URL}bougie-zebra-banner.png`;

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <div className="relative h-[40vh] min-h-[300px] w-full bg-[#181D37]">
        <img
          src={heroImage}
          alt={event.title}
          className="w-full h-full object-cover object-[50%_center] md:object-[70%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="container mx-auto px-4 max-w-5xl -mt-32 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <Link href="/events" className="inline-flex items-center text-sm font-medium text-foreground bg-background/80 backdrop-blur px-4 py-2 rounded-full hover:bg-background transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Events
          </Link>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground bg-background/80 backdrop-blur px-4 py-2 rounded-full hover:bg-background transition-colors shadow-sm"
          >
            {shareState === "copied"
              ? <><Check className="w-4 h-4 text-green-600" /> Copied!</>
              : <><Share2 className="w-4 h-4" /> Share</>}
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left: event info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card p-8 md:p-12 rounded-3xl shadow-sm border border-border">
              <h1 className="font-serif text-4xl md:text-5xl font-medium mb-6 text-foreground">
                {event.title}
              </h1>

              <div className="flex flex-wrap gap-6 mb-8 text-muted-foreground border-b border-border pb-8">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="font-medium text-foreground">{formatDateCT(event.date) || event.date}</div>
                    <div className="text-sm">{event.time} CT</div>
                    {hasCalendarDate() && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <a href={googleCalUrl()} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-medium">
                          + Google Calendar
                        </a>
                        <span className="text-border">·</span>
                        <button onClick={downloadIcs} className="text-xs text-primary hover:underline font-medium">
                          + Apple / .ics
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 group"
                >
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                    {event.location}
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </div>
                </a>

                {event.totalSpots > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className={`font-medium ${event.spotsLeft <= 5 ? "text-destructive" : "text-foreground"}`}>
                      {isSoldOut ? "Sold out" : event.spotsLeft <= 5 ? `Only ${event.spotsLeft} spot${event.spotsLeft !== 1 ? "s" : ""} left!` : `${event.spotsLeft} of ${event.totalSpots} spots available`}
                    </span>
                  </div>
                )}
              </div>

              <div className="prose prose-lg prose-headings:font-serif dark:prose-invert max-w-none">
                <h3 className="text-2xl font-serif font-medium text-foreground">About this experience</h3>
                <p className="whitespace-pre-wrap font-light leading-relaxed text-muted-foreground">{event.description}</p>
              </div>
            </div>
          </div>

          {/* Right: registration */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-card p-8 rounded-3xl shadow-lg border border-primary/20">
              <div className="mb-6">
                <span className="text-3xl font-serif font-medium">{price}</span>
                {event.priceCents ? <span className="text-muted-foreground ml-2">per person</span> : null}
              </div>

              {event.totalSpots > 0 && (
                <div className="mb-6">
                  {(() => {
                    const filled = event.totalSpots - event.spotsLeft;
                    const pct = Math.min(100, Math.round((filled / event.totalSpots) * 100));
                    return (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{event.spotsLeft} spot{event.spotsLeft !== 1 ? "s" : ""} left</span>
                          <span>{pct}% full</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${event.spotsLeft <= 5 ? "bg-destructive" : "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {isSoldOut ? (
                <div className="text-center py-6">
                  <p className="font-serif text-lg text-muted-foreground mb-2">This event is sold out</p>
                  <Link href="/events">
                    <Button variant="outline" className="rounded-full w-full">Browse Other Events</Button>
                  </Link>
                </div>
              ) : event.externalRegistrationUrl ? (
                <div className="space-y-3">
                  <a
                    href={event.externalRegistrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full h-14 text-lg rounded-xl">
                      Register
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                  <p className="text-xs text-muted-foreground text-center">
                    Registration for this event is handled on an external site.
                  </p>
                </div>
              ) : !isAuthenticated && !shopperAuthenticated ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">Sign in to reserve your spot</p>
                  <Link href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}>
                    <Button className="w-full h-12 rounded-xl">
                      Sign in to Register
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">
                      Notes
                      <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Dietary restrictions, seating preferences, etc."
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="bg-background resize-none"
                      rows={3}
                    />
                  </div>

                  {submitError && (
                    <p className="text-xs text-destructive">{submitError}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-14 text-lg rounded-xl mt-4"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {event.priceCents ? `Reserve & Pay — ${price}` : "Reserve Free Spot"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
