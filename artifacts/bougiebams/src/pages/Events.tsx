import { useState } from "react";
import { motion } from "framer-motion";
import { BougieBamsEvent, EventCategory } from "@/data/events";
import { useEvents } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  LayoutGrid,
  MapPin,
  RefreshCw,
  ArrowRight,
  Users,
} from "lucide-react";

const CATEGORIES: EventCategory[] = ["All", "In-Person", "Virtual", "Tournament", "Workshop"];

const CATEGORY_COLORS: Record<Exclude<EventCategory, "All">, string> = {
  "In-Person": "bg-secondary text-secondary-foreground",
  "Virtual": "bg-accent/20 text-accent-foreground",
  "Tournament": "bg-primary/15 text-foreground",
  "Workshop": "bg-muted text-muted-foreground",
};

const CATEGORY_PILL_COLORS: Record<Exclude<EventCategory, "All">, string> = {
  "In-Person":   "bg-[#1E2A5A] text-white",
  "Virtual":     "bg-[#4A7C8E] text-white",
  "Tournament":  "bg-[#D4AF37] text-[#1E2A5A]",
  "Workshop":    "bg-[#8E7A6A] text-white",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function parseEventDate(dateStr: string): Date | null {
  const cleaned = dateStr
    .replace(/\u2013|\u2014/g, "-")
    .replace(/–|-/g, "-")
    .trim();

  const rangeMatch = cleaned.match(/^([A-Za-z]+)\s+(\d+)\s*-\s*\d+,?\s*(\d{4})/);
  if (rangeMatch) {
    return new Date(`${rangeMatch[1]} ${rangeMatch[2]}, ${rangeMatch[3]}`);
  }

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

function isRecurring(dateStr: string): boolean {
  return /every|weekly|monthly|thursday|friday|saturday|sunday|monday|tuesday|wednesday/i.test(dateStr);
}

function EventCard({ event, onRegister }: { event: BougieBamsEvent; onRegister: (e: BougieBamsEvent) => void }) {
  const spotsPercent = event.totalSpots > 0 ? (event.spotsLeft / event.totalSpots) * 100 : 100;
  const isAlmostFull = event.spotsLeft > 0 && event.spotsLeft <= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="group flex flex-col hover:shadow-md transition-shadow duration-300"
    >
      <BorderRotate
        animationMode="auto-rotate"
        animationSpeed={4}
        backgroundColor="hsl(var(--card))"
        borderRadius={12}
        borderWidth={3}
        className="overflow-hidden flex flex-col h-full"
      >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-4 left-4">
          <span className={`text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-sm ${CATEGORY_COLORS[event.category]}`}>
            {event.category}
          </span>
        </div>
        {event.price === "Free" && (
          <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-sm">
            Free
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white font-serif text-xl leading-tight">{event.title}</p>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="space-y-2 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
            <span>{event.date}</span>
          </div>
          {event.time && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{event.time}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        <p className="font-serif text-muted-foreground leading-relaxed mb-6 flex-1 text-sm md:text-base line-clamp-3">
          {event.description}
        </p>

        <div className="space-y-3">
          {event.totalSpots > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span className={isAlmostFull ? "text-destructive font-medium" : ""}>
                    {isAlmostFull ? `Only ${event.spotsLeft} spots left!` : `${event.spotsLeft} of ${event.totalSpots} spots available`}
                  </span>
                </div>
                <span className="font-medium text-foreground">
                  {event.price === "Free" ? "Free" : `$${event.price}`}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isAlmostFull ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${100 - spotsPercent}%` }}
                />
              </div>
            </>
          )}
          {event.totalSpots === 0 && (
            <div className="flex justify-end text-xs font-medium text-foreground">
              {event.price === "Free" ? "Free" : `$${event.price}`}
            </div>
          )}
          <Button
            className="w-full h-11 rounded-none group/btn bg-foreground text-background hover:bg-primary transition-colors"
            onClick={() => onRegister(event)}
          >
            Register Now
            <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
      </BorderRotate>
    </motion.div>
  );
}

function CalendarView({
  events,
  onRegister,
}: {
  events: BougieBamsEvent[];
  onRegister: (e: BougieBamsEvent) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const placedEvents = events.filter(e => !isRecurring(e.date));
  const recurringEvents = events.filter(e => isRecurring(e.date));

  const eventsByDay: Record<number, BougieBamsEvent[]> = {};
  for (const e of placedEvents) {
    const d = parseEventDate(e.date);
    if (!d) continue;
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(e);
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="font-serif text-2xl text-foreground">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold tracking-widest uppercase text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-t border-border">
        {cells.map((day, i) => {
          const dayEvents = day ? (eventsByDay[day] ?? []) : [];
          return (
            <div
              key={i}
              className={`min-h-[100px] border-r border-b border-border p-1.5 ${
                day ? "bg-background" : "bg-muted/30"
              }`}
            >
              {day && (
                <>
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 ${
                      isToday(day)
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="space-y-1">
                    {dayEvents.map(e => (
                      <button
                        key={e.id}
                        onClick={() => onRegister(e)}
                        title={`${e.title}${e.time ? " · " + e.time : ""}`}
                        className={`w-full text-left text-[10px] font-semibold leading-tight px-1.5 py-0.5 rounded-sm truncate transition-opacity hover:opacity-80 ${CATEGORY_PILL_COLORS[e.category]}`}
                      >
                        {e.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-5">
        {(Object.entries(CATEGORY_PILL_COLORS) as [Exclude<EventCategory, "All">, string][]).map(([cat, cls]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded-sm ${cls}`} />
            <span className="text-xs text-muted-foreground">{cat}</span>
          </div>
        ))}
      </div>

      {recurringEvents.length > 0 && (
        <div className="mt-10">
          <h3 className="font-serif text-lg text-foreground mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Recurring Events
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recurringEvents.map(e => (
              <div key={e.id} className="border border-border rounded-sm p-4 flex items-start gap-4 bg-background hover:border-primary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{e.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{e.date}</span>
                    {e.time && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <Clock className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{e.time}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${CATEGORY_PILL_COLORS[e.category]}`}>
                      {e.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {e.price === "Free" ? "Free" : `$${e.price}`}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onRegister(e)}
                  className="rounded-none text-xs h-8 bg-foreground text-background hover:bg-primary flex-shrink-0"
                >
                  Register
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegisterSheet({
  event,
  open,
  onClose,
}: {
  event: BougieBamsEvent | null;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setLoading(true);
    setError(null);
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/registrations/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventId: parseInt(event.id, 10),
          name,
          email,
          notes: notes || undefined,
        }),
      });

      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      const data = await res.json() as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setName("");
      setEmail("");
      setNotes("");
      setSubmitted(false);
      setError(null);
      setNeedsAuth(false);
    }, 300);
  };

  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col border-l-0 p-0 font-sans">
        <SheetHeader className="p-6 border-b border-border">
          <SheetTitle className="font-serif text-2xl font-medium text-left">
            {submitted ? "You're Registered!" : "Reserve Your Spot"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 p-6 overflow-y-auto">
          {submitted ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-serif text-xl mb-2">See you there, {name.split(" ")[0]}!</p>
                <p className="text-muted-foreground font-serif leading-relaxed">
                  You're confirmed for <em>{event?.title}</em>. Check your email for details.
                </p>
              </div>
              <div className="bg-muted rounded-sm p-4 w-full text-left space-y-1 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{event?.date}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{event?.location}</span>
                </div>
              </div>
              <Button variant="outline" onClick={handleClose} className="rounded-none w-full">
                Close
              </Button>
            </div>
          ) : needsAuth ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-serif text-xl mb-2">Sign in to Register</p>
                <p className="text-muted-foreground font-serif leading-relaxed">
                  You need to be signed in to reserve a spot at BougieBams events.
                </p>
              </div>
              <Button
                className="w-full h-12 rounded-none bg-foreground text-background hover:bg-primary"
                onClick={() => { window.location.href = `${apiBase}/api/auth/login`; }}
              >
                Sign in with Replit
              </Button>
              <Button variant="outline" onClick={handleClose} className="rounded-none w-full">
                Cancel
              </Button>
            </div>
          ) : (
            <>
              {event && (
                <div className="bg-muted/50 rounded-sm p-4 mb-6 space-y-1.5">
                  <p className="font-serif text-lg">{event.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{event.date}{event.time ? ` · ${event.time}` : ""}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  <p className="text-sm font-medium mt-1">
                    {event.price === "Free" ? "Free admission" : `$${event.price} per person`}
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-sm text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="w-full h-12 border border-border bg-background px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors rounded-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full h-12 border border-border bg-background px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors rounded-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block mb-2">
                    Notes <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Dietary restrictions, questions, etc."
                    rows={2}
                    className="w-full border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors rounded-sm resize-none text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  By registering, you agree to receive event updates from BougieBams. We never share your information.
                </p>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-none bg-foreground text-background hover:bg-primary"
                >
                  {loading
                    ? "Processing…"
                    : event?.price === "Free"
                    ? "Reserve Free Spot"
                    : `Proceed to Payment — $${event?.price}`}
                </Button>
              </form>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type ViewMode = "list" | "calendar";

export default function Events() {
  const { events, loading, error } = useEvents();
  const [activeCategory, setActiveCategory] = useState<EventCategory>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedEvent, setSelectedEvent] = useState<BougieBamsEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered =
    activeCategory === "All" ? events : events.filter(e => e.category === activeCategory);

  const handleRegister = (event: BougieBamsEvent) => {
    setSelectedEvent(event);
    setSheetOpen(true);
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8">

        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-primary font-semibold tracking-[0.2em] uppercase text-xs mb-4 block">
              Gather & Play
            </span>
            <h1 className="font-serif text-5xl md:text-6xl mb-6">Upcoming Events</h1>
            <p className="text-muted-foreground font-serif text-xl leading-relaxed">
              Game nights, beginner workshops, high-stakes tournaments — find your table and join the community.
            </p>
          </motion.div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 text-sm font-medium tracking-widest uppercase transition-all duration-200 rounded-sm border ${
                  activeCategory === cat
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center border border-border rounded-sm overflow-hidden flex-shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              List
            </button>
            <div className="w-px h-5 bg-border" />
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "calendar"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-24">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-24">
            <p className="font-serif text-xl text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {viewMode === "calendar" ? (
              <CalendarView events={filtered} onRegister={handleRegister} />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filtered.map(event => (
                    <EventCard key={event.id} event={event} onRegister={handleRegister} />
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div className="text-center py-24">
                    <p className="font-serif text-2xl text-muted-foreground">
                      {activeCategory === "All"
                        ? "No events scheduled right now."
                        : `No ${activeCategory} events scheduled right now.`}
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Check back soon — we're always planning something new.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-24 bg-secondary text-secondary-foreground rounded-sm p-12 text-center"
        >
          <span className="text-primary font-semibold tracking-[0.2em] uppercase text-xs mb-4 block">
            Private Experiences
          </span>
          <h2 className="font-serif text-4xl mb-6">Host Your Own Event</h2>
          <p className="font-serif text-xl text-secondary-foreground/80 max-w-xl mx-auto mb-8">
            Birthdays, bachelorettes, corporate team building. We bring the tiles, the expertise, and the luxury experience — you bring the guests.
          </p>
          <Button
            asChild
            className="h-14 px-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-none font-medium tracking-widest uppercase text-sm"
          >
            <a href="/contact">Enquire Now</a>
          </Button>
        </motion.div>
      </div>

      <RegisterSheet
        event={selectedEvent}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
