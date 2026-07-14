import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Check, Copy } from "lucide-react";

const STORAGE_KEY = "bougiebams_welcome_offer_seen";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function WelcomeOfferDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadySeen = window.localStorage.getItem(STORAGE_KEY);
    if (alreadySeen) return;
    const timer = window.setTimeout(() => setOpen(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }
      setDiscountCode(data.discountCode || "BOUGIE15");
      setStatus("success");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(discountCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md max-h-[85dvh] overflow-y-auto p-0 gap-0 border-primary/30 rounded-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">15% off your first order</DialogTitle>
        <DialogDescription className="sr-only">
          Join the BougieBams community to receive 15% off your first order.
        </DialogDescription>
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 p-3 text-secondary-foreground/60 hover:text-secondary-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {status === "success" ? (
          <div className="bg-secondary text-secondary-foreground px-6 py-10 sm:px-8 sm:py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-7 h-7 text-primary" />
            </div>
            <p className="text-xs tracking-[0.2em] uppercase text-primary mb-3">You're In</p>
            <h2 className="font-serif text-3xl mb-3">Welcome to BougieBams</h2>
            <p className="text-secondary-foreground/70 mb-8 leading-relaxed">
              Here's your 15% off code. We've also sent it to your inbox.
            </p>
            <button
              onClick={copyCode}
              className="group w-full border-2 border-dashed border-primary rounded-md py-4 px-6 flex items-center justify-center gap-3 hover:bg-primary/10 transition-colors"
            >
              <span className="font-sans text-2xl font-bold tracking-[0.3em] text-primary">
                {discountCode}
              </span>
              {copied ? (
                <Check className="w-5 h-5 text-primary" />
              ) : (
                <Copy className="w-5 h-5 text-primary/70 group-hover:text-primary" />
              )}
            </button>
            <p className="text-xs text-secondary-foreground/50 mt-4">
              {copied ? "Copied to clipboard" : "Tap to copy · Use at checkout"}
            </p>
          </div>
        ) : (
          <div className="bg-secondary text-secondary-foreground px-6 py-10 sm:px-8 sm:py-12 text-center">
            <p className="text-xs tracking-[0.2em] uppercase text-primary mb-3">An Invitation</p>
            <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">
              Enjoy 15% Off<br />Your First Order
            </h2>
            <p className="text-secondary-foreground/70 mb-8 leading-relaxed">
              Join the BougieBams community for exclusive offers, early access, and the art of the game — delivered to your inbox.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-12 text-center bg-background/10 border-secondary-foreground/20 text-secondary-foreground placeholder:text-secondary-foreground/40 focus-visible:border-primary"
              />
              {status === "error" && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}
              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full h-12 text-sm tracking-widest uppercase"
              >
                {status === "loading" ? "Claiming…" : "Claim My 15% Off"}
              </Button>
            </form>
            <button
              onClick={dismiss}
              className="text-xs text-secondary-foreground/50 hover:text-secondary-foreground/80 transition-colors mt-5"
            >
              No thanks, I'll pay full price
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
