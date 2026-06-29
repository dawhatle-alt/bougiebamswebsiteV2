import { useAuth } from "@workspace/replit-auth-web";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { formatDateCT } from "@/lib/dateUtils";
import { Calendar, MapPin, LogIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useListEvents } from "@workspace/api-client-react";
import type { ApiEvent } from "@workspace/api-client-react";

interface RegistrationRecord {
  id: number;
  eventId: number;
  name: string;
  email: string;
  notes?: string | null;
  status: string;
  createdAt: string;
}

export default function MyEvents() {
  const { user, isLoading, isAuthenticated, login } = useAuth();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: allEventsData } = useListEvents({});
  const allEvents = allEventsData?.events;

  const eventsById = new Map<number, ApiEvent>(
    (allEvents ?? []).map(e => [e.id, e])
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    setFetching(true);
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    fetch(`${base}/api/registrations/mine`, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ registrations: RegistrationRecord[] }>;
      })
      .then(data => {
        setRegistrations(data.registrations ?? []);
        setFetching(false);
      })
      .catch(err => {
        setError(err.message);
        setFetching(false);
      });
  }, [isAuthenticated]);

  function handleCancelled(regId: number) {
    setRegistrations(prev =>
      prev.map(r => r.id === regId ? { ...r, status: "cancelled" } : r)
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-6">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold">My Events</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Log in to view the events you've registered for.
        </p>
        <Button onClick={login} size="lg" className="rounded-full px-8">
          <LogIn className="mr-2 h-4 w-4" />
          Log in
        </Button>
      </div>
    );
  }

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "U";
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Member";

  const now = new Date();
  const upcoming = registrations.filter(r => {
    const ev = eventsById.get(r.eventId);
    return ev ? new Date(ev.date) >= now : true;
  });
  const past = registrations.filter(r => {
    const ev = eventsById.get(r.eventId);
    return ev ? new Date(ev.date) < now : false;
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl px-6 py-5 mb-10 flex items-center gap-5"
      >
        <Avatar className="h-16 w-16 shrink-0">
          {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={fullName} />}
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight truncate">{fullName}</h1>
          {user?.email && <p className="text-sm text-muted-foreground mt-1 truncate">{user.email}</p>}
        </div>
      </motion.div>

      <div className="mb-8">
        <h2 className="font-serif text-xl font-semibold">My Registrations</h2>
        <p className="text-muted-foreground text-sm mt-1">Your upcoming and past event registrations.</p>
      </div>

      {fetching && <p className="text-muted-foreground text-center py-12">Loading your registrations…</p>}
      {error && <p className="text-destructive text-center py-12">Could not load registrations: {error}</p>}

      {!fetching && !error && registrations.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground text-lg">You haven't registered for any events yet.</p>
          <Link href="/events">
            <Button className="rounded-full px-8">Browse Events</Button>
          </Link>
        </div>
      )}

      {!fetching && !error && upcoming.length > 0 && (
        <section className="mb-12">
          <h2 className="font-serif text-xl font-semibold mb-4 text-primary">Upcoming</h2>
          <div className="space-y-4">
            {upcoming.map((reg, i) => (
              <RegistrationCard
                key={reg.id}
                registration={reg}
                event={eventsById.get(reg.eventId)}
                index={i}
                onCancelled={handleCancelled}
              />
            ))}
          </div>
        </section>
      )}

      {!fetching && !error && past.length > 0 && (
        <section>
          <h2 className="font-serif text-xl font-semibold mb-4 text-muted-foreground">Past Events</h2>
          <div className="space-y-4 opacity-75">
            {past.map((reg, i) => (
              <RegistrationCard
                key={reg.id}
                registration={reg}
                event={eventsById.get(reg.eventId)}
                index={i}
                isPast
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RegistrationCard({
  registration,
  event,
  index,
  isPast = false,
  onCancelled,
}: {
  registration: RegistrationRecord;
  event: ApiEvent | undefined;
  index: number;
  isPast?: boolean;
  onCancelled?: (id: number) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const isCancelled = registration.status === "cancelled";
  const canCancel = !isPast && !isCancelled && !!onCancelled;

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/registrations/${registration.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onCancelled?.(registration.id);
    } catch (err: any) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-border rounded-xl overflow-hidden bg-card flex flex-col sm:flex-row"
    >
      <div className="flex-1 p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-serif font-semibold text-lg leading-tight">
              {event?.title ?? `Event #${registration.eventId}`}
            </h3>
            {event && (
              <Badge variant="outline" className="mt-1 text-xs">{event.category}</Badge>
            )}
          </div>
          <Badge
            variant={isCancelled ? "destructive" : registration.status === "confirmed" ? "default" : "secondary"}
            className="shrink-0"
          >
            {registration.status}
          </Badge>
        </div>

        {event && (
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{formatDateCT(event.date)} · {event.time} CT</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{event.location}</span>
            </div>
          </div>
        )}

        {cancelError && <p className="text-destructive text-xs">{cancelError}</p>}

        <div className="flex items-center gap-2 flex-wrap">
          {event && !isCancelled && (
            <Link href={`/events/${event.id}`}>
              <Button variant={isPast ? "ghost" : "outline"} size="sm" className="rounded-full text-xs">
                View Event
              </Button>
            </Link>
          )}
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={cancelling}
                >
                  <X className="h-3 w-3 mr-1" />
                  {cancelling ? "Cancelling…" : "Cancel Registration"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your registration?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel your registration for <strong>{event?.title ?? "this event"}</strong> and release your spot. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Registration</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </motion.div>
  );
}
