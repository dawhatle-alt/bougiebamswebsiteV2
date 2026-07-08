import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  onAuthError: () => void;
}

interface PressBarSettings {
  enabled: boolean;
  names: string[];
}

const MAX_NAMES = 12;

export default function PressBarManager({ onAuthError }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/press-bar`);
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as PressBarSettings;
      setEnabled(!!data.enabled);
      setNames(data.names ?? []);
    } catch {
      setError("Could not load the Featured In settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function updateName(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  }

  function removeName(index: number) {
    setNames((prev) => prev.filter((_, i) => i !== index));
  }

  function moveName(index: number, delta: -1 | 1) {
    setNames((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/press-bar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enabled,
          names: names.map((n) => n.trim()).filter(Boolean),
        }),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as PressBarSettings;
      setEnabled(!!data.enabled);
      setNames(data.names ?? []);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save. Please try again.");
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

  const previewNames = names.map((n) => n.trim()).filter(Boolean);

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-[#5A6178] mb-6">
        The "As Featured In" strip on the homepage. Toggle it on or off and manage the list of
        publication names shown to visitors.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-md border border-[#E2DBCD] bg-white p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-[#1E2A5A]">Show "As Featured In" section</div>
            <div className="text-xs text-[#9A8F7E]">When off, the section is hidden from the homepage.</div>
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

        <div className="space-y-2">
          <div className="text-sm font-medium text-[#1E2A5A]">Publication names</div>
          {names.length === 0 && (
            <p className="text-xs text-[#9A8F7E]">
              No names yet — the section stays hidden until you add at least one.
            </p>
          )}
          <div className="space-y-2">
            {names.map((name, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Input
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder="Publication name…"
                  maxLength={60}
                  className="flex-1 h-9"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => moveName(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => moveName(i, 1)}
                  disabled={i === names.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0 text-red-400 hover:text-red-600"
                  onClick={() => removeName(i)}
                  aria-label="Remove name"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNames((prev) => [...prev, ""])}
            disabled={names.length >= MAX_NAMES}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add name
          </Button>
          {names.length >= MAX_NAMES && (
            <p className="text-xs text-[#9A8F7E]">Maximum of {MAX_NAMES} names.</p>
          )}
        </div>

        {/* Live preview of how the section will look. */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#9A8F7E] mb-2">Preview</div>
          {enabled && previewNames.length > 0 ? (
            <div className="rounded-md border border-[#E2DBCD] bg-[#FAF7F0] py-6 px-4">
              <p className="text-center text-[10px] tracking-[0.3em] uppercase text-[#9A8F7E] mb-4">
                As Featured In
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                {previewNames.map((name) => (
                  <span
                    key={name}
                    className="text-lg text-[#1E2A5A]/40 whitespace-nowrap"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-[#E2DBCD] text-center text-xs text-[#9A8F7E] py-2 px-4">
              The section will not be shown.
            </div>
          )}
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
