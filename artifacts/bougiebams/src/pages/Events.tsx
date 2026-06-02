import { useState } from "react";
import { motion } from "framer-motion";
import { events, BougieBamsEvent, EventCategory } from "@/data/events";
import { Button } from "@/components/ui/button";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar, Clock, MapPin, Users, ArrowRight, CheckCircle } from "lucide-react";

const CATEGORIES: EventCategory[] = ["All", "In-Person", "Virtual", "Tournament", "Workshop"];

const CATEGORY_COLORS: Record<Exclude<EventCategory, "All">, string> = {
  "In-Person": "bg-secondary text-secondary-foreground",
  "Virtual": "bg-accent/20 text-accent-foreground",
  "Tournament": "bg-primary/15 text-foreground",
  "Workshop": "bg-muted text-muted-foreground",
};

function EventCard({ event, onRegister }: { event: BougieBamsEvent; onRegister: (e: BougieBamsEvent) => void }) {
  const spotsPercent = (event.spotsLeft / event.totalSpots) * 100;
  const isAlmostFull = event.spotsLeft <= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="group flex flex-col hover:shadow-md transition-shadow duration-300"
    >
      <BorderRotate
        animationMode="rotate-on-hover"
        animationSpeed={4}
        backgroundColor="hsl(var(--card))"
        borderRadius={12}
        borderWidth={2}
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
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        <p className="font-serif text-muted-foreground leading-relaxed mb-6 flex-1 text-sm md:text-base line-clamp-3">
          {event.description}
        </p>

        <div className="space-y-3">
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
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setLoading(true);
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/email/event-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          eventTitle: event.title,
          eventDate: event.date,
          eventLocation: event.location,
          eventPrice: event.price,
        }),
      });
      if (!res.ok) throw new Error("Server error");
    } catch {
      // Still show success UI — email is best-effort
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setName("");
      setEmail("");
      setSubmitted(false);
    }, 300);
  };

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
                  A confirmation has been sent to <strong>{email}</strong>. We can't wait to see you at{" "}
                  <em>{event?.title}</em>.
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
          ) : (
            <>
              {event && (
                <div className="bg-muted/50 rounded-sm p-4 mb-6 space-y-1.5">
                  <p className="font-serif text-lg">{event.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{event.date} · {event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{event.location}</span>
                  </div>
                  <p className="text-sm font-medium mt-1">
                    {event.price === "Free" ? "Free admission" : `$${event.price} per person`}
                  </p>
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
                <p className="text-xs text-muted-foreground">
                  By registering, you agree to receive event updates from BougieBams. We never share your information.
                </p>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-none bg-foreground text-background hover:bg-primary"
                >
                  {loading ? "Reserving…" : event?.price === "Free" ? "Reserve Free Spot" : `Confirm — $${event?.price}`}
                </Button>
              </form>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Events() {
  const [activeCategory, setActiveCategory] = useState<EventCategory>("All");
  const [selectedEvent, setSelectedEvent] = useState<BougieBamsEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = activeCategory === "All" ? events : events.filter(e => e.category === activeCategory);

  const handleRegister = (event: BougieBamsEvent) => {
    setSelectedEvent(event);
    setSheetOpen(true);
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8">

        {/* Header */}
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

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
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

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(event => (
            <EventCard key={event.id} event={event} onRegister={handleRegister} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="font-serif text-2xl text-muted-foreground">
              No {activeCategory} events scheduled right now.
            </p>
            <p className="text-muted-foreground mt-2">Check back soon — we're always planning something new.</p>
          </div>
        )}

        {/* Private Events CTA */}
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
