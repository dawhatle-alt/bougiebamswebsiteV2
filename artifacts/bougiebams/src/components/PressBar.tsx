import { Gem, Truck, RotateCcw, ShieldCheck } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: Gem,
    label: "Handcrafted Quality",
    sub: "Made with intention",
  },
  {
    icon: Truck,
    label: "Fast, Tracked Shipping",
    sub: "On every order",
  },
  {
    icon: RotateCcw,
    label: "30-Day Returns",
    sub: "Simple and hassle-free",
  },
  {
    icon: ShieldCheck,
    label: "Secure Checkout",
    sub: "Encrypted payments",
  },
];

export default function PressBar() {
  return (
    <section className="py-12 bg-card border-y border-border">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-wrap items-start justify-center gap-x-12 gap-y-10 md:justify-between">
          {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="flex flex-col items-center text-center gap-3 min-w-[8rem] flex-1"
            >
              <Icon
                aria-hidden="true"
                strokeWidth={1.5}
                className="w-6 h-6 text-primary"
              />
              <div>
                <p className="font-sans text-sm font-medium tracking-wide text-foreground">
                  {label}
                </p>
                <p className="font-sans text-xs tracking-wide text-muted-foreground mt-1">
                  {sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
