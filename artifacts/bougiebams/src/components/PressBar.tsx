import { useQuery } from "@tanstack/react-query";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

interface PressBarSettings {
  enabled: boolean;
  names: string[];
}

export default function PressBar() {
  const { data } = useQuery<PressBarSettings>({
    queryKey: ["press-bar"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/press-bar`);
      if (!res.ok) return { enabled: false, names: [] };
      return res.json() as Promise<PressBarSettings>;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!data?.enabled || data.names.length === 0) return null;

  return (
    <section className="py-12 bg-card border-y border-border">
      <div className="container mx-auto px-4 md:px-8">
        <p className="text-center text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8">
          As Featured In
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-16">
          {data.names.map((name) => (
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
