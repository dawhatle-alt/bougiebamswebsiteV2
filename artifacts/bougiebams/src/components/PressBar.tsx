// Placeholder press mentions — swap these names (or drop in real logo images)
// for the publications and retailers that have actually featured BougieBams.
const OUTLETS = [
  "The Tile Edit",
  "Modern Hostess",
  "Salon & Soirée",
  "Heritage Living",
  "Atelier Weekly",
];

export default function PressBar() {
  return (
    <section className="py-12 bg-card border-y border-border">
      <div className="container mx-auto px-4 md:px-8">
        <p className="text-center text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8">
          As Featured In
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-16">
          {OUTLETS.map((name) => (
            <span
              key={name}
              className="font-serif text-xl md:text-2xl text-foreground/40 hover:text-foreground/70 transition-colors duration-300 whitespace-nowrap"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
