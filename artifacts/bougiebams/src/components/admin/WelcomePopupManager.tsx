import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PopupConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  body: string;
  buttonLabel: string;
  dismissLabel: string;
  // The code the signup flow issues; editable here, managed under Discount Codes.
  discountCode?: string;
}

interface Props {
  onAuthError: () => void;
}

export default function WelcomePopupManager({ onAuthError }: Props) {
  const [config, setConfig] = useState<PopupConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/welcome-popup`);
      if (!res.ok) throw new Error("Failed");
      setConfig((await res.json()) as PopupConfig);
    } catch {
      setError("Could not load the welcome popup settings.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function field<K extends keyof PopupConfig>(key: K, value: PopupConfig[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/welcome-popup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      setConfig((await res.json()) as PopupConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <div className="py-16 flex items-center justify-center">
        {error ? <p className="text-sm text-red-600">{error}</p> : <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-[#5A6178] mb-6">
        The offer popup shown to first-time visitors a couple of seconds after they arrive. Edit the wording below or turn it off entirely. Visitors who have already seen it (dismissed or claimed) won't see it again on the same device.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-md border border-[#E2DBCD] bg-white p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-[#1E2A5A]">Show welcome popup</div>
            <div className="text-xs text-[#9A8F7E]">When off, no visitor sees the popup.</div>
          </div>
          <button
            type="button"
            onClick={() => field("enabled", !config.enabled)}
            className={`relative inline-flex items-center px-0.5 w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              config.enabled ? "bg-emerald-500" : "bg-[#D0CCBF]"
            }`}
            title={config.enabled ? "On — click to turn off" : "Off — click to turn on"}
          >
            <span className={`w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${config.enabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Small Top Line</label>
          <Input value={config.eyebrow} onChange={(e) => field("eyebrow", e.target.value)} maxLength={60} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Headline</label>
          <Textarea value={config.title} onChange={(e) => field("title", e.target.value)} rows={2} maxLength={120} className="resize-none" />
          <p className="text-xs text-[#9A8F7E] mt-1.5">Line breaks are kept — press Enter to split the headline onto two lines.</p>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Message</label>
          <Textarea value={config.body} onChange={(e) => field("body", e.target.value)} rows={3} maxLength={400} className="resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Button Text</label>
            <Input value={config.buttonLabel} onChange={(e) => field("buttonLabel", e.target.value)} maxLength={60} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Decline Link Text</label>
            <Input value={config.dismissLabel} onChange={(e) => field("dismissLabel", e.target.value)} maxLength={80} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-[#5A6178] block mb-1.5">Discount Code</label>
          <Input
            value={config.discountCode ?? ""}
            onChange={(e) => field("discountCode", e.target.value.toUpperCase())}
            maxLength={30}
            className="max-w-[220px] font-semibold tracking-widest"
          />
          <p className="text-xs text-[#9A8F7E] mt-1.5">
            The code issued when someone signs up (letters, numbers, and dashes). Renaming it creates the new code under{" "}
            <span className="font-medium">Discount Codes</span> automatically (at 15% if new) — <span className="font-medium">set its
            percentage there</span> so the discount matches what the popup promises. The old code stays until you deactivate it.
          </p>
        </div>

        {/* Live preview in the popup's real colors */}
        <div className="rounded-md bg-[#1E2A5A] text-white px-6 py-8 text-center">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] mb-2">{config.eyebrow}</p>
          <p className="font-serif text-2xl leading-tight mb-2 whitespace-pre-line" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{config.title}</p>
          <p className="text-xs text-white/70 mb-4 max-w-sm mx-auto">{config.body}</p>
          <div className="max-w-xs mx-auto space-y-2">
            <div className="h-9 rounded bg-white/10 border border-white/20 text-white/40 text-xs flex items-center justify-center">Enter your email</div>
            <div className="h-9 rounded bg-[#D4AF37] text-[#1E2A5A] text-xs font-semibold uppercase tracking-widest flex items-center justify-center">{config.buttonLabel}</div>
            <p className="text-[10px] text-white/50">{config.dismissLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : null}
            {saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
