import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  onAuthError: () => void;
}

export default function BuildYourSetManager({ onAuthError }: Props) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/build-your-set`);
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { enabled: boolean };
      setEnabled(!!data.enabled);
    } catch {
      setError("Could not load the Build Your Set setting.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/build-your-set`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { enabled: boolean };
      setEnabled(!!data.enabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save the setting. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-[#5A6178] mb-6">
        Build Your Set lets shoppers curate a custom mahjong set. When turned off, the homepage teaser and shop-menu card are hidden and the Build Your Set page shows a "coming soon" message instead.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-md border border-[#E2DBCD] bg-white p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-[#1E2A5A]">Show Build Your Set</div>
            <div className="text-xs text-[#9A8F7E]">When off, the experience is hidden from all visitors until you turn it back on.</div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex items-center px-0.5 w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              enabled ? "bg-emerald-500" : "bg-[#D0CCBF]"
            }`}
            title={enabled ? "Enabled — click to disable" : "Disabled — click to enable"}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : null}
            {saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
