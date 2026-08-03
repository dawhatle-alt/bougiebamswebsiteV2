import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Config {
  enabled: boolean;
  hoursAfter: number;
  subject: string;
  body: string;
  discountCode: string;
  discountBlurb: string;
}

interface EventStatus {
  eventId: number;
  title: string;
  date: string;
  sentAt: string | null;
  recipients: number;
}

export default function EventFollowupManager({ onAuthError }: { onAuthError: () => void }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [events, setEvents] = useState<EventStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/event-followup`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("load failed");
      const data = await res.json() as { config: Config; events: EventStatus[] };
      setConfig(data.config);
      setEvents(data.events ?? []);
    } catch {
      setError("Could not load the follow-up settings.");
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!config) return;
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/event-followup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "save failed");
      }
      setMsg("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function sendNow(eventId: number, title: string) {
    if (!window.confirm(`Send the follow-up email to everyone who attended "${title}" now?`)) return;
    setSendingId(eventId);
    setMsg("");
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/event-followup/send/${eventId}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) { onAuthError(); return; }
      if (!res.ok) throw new Error("send failed");
      const r = await res.json() as { emailsSent: number };
      setMsg(`Sent ${r.emailsSent} email${r.emailsSent === 1 ? "" : "s"}.`);
      await load();
    } catch {
      setError("Could not send the follow-up.");
    } finally {
      setSendingId(null);
    }
  }

  if (loading || !config) {
    return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" /></div>;
  }

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setConfig({ ...config, [k]: v });
  const labelCls = "block text-xs font-medium text-[#5A6178] uppercase tracking-wider mb-1";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-md border border-[#E2DBCD] bg-white p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-sm font-medium text-[#1E2A5A]">Send a thank-you after every event</div>
            <div className="text-xs text-[#9A8F7E] mt-0.5 max-w-xl">
              Goes to everyone confirmed for the event once it's over. Recipients are added to your email list so they
              have a working unsubscribe link, and anyone who has opted out is skipped.
            </div>
          </div>
          <button
            type="button"
            onClick={() => set("enabled", !config.enabled)}
            className={`relative inline-flex items-center px-0.5 w-11 h-6 rounded-full transition-colors flex-shrink-0 ${config.enabled ? "bg-emerald-500" : "bg-[#D0CCBF]"}`}
            title={config.enabled ? "On — click to turn off" : "Off — click to turn on"}
          >
            <span className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${config.enabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className={labelCls}>Send this many hours after</label>
            <Input type="number" min="0" max="720" value={config.hoursAfter} onChange={(e) => set("hoursAfter", Number(e.target.value))} />
            <p className="text-[11px] text-[#9A8F7E] mt-1">20 = next morning. Sending happens on the daily job, so it's approximate.</p>
          </div>
          <div>
            <label className={labelCls}>Discount code (optional)</label>
            <Input value={config.discountCode} onChange={(e) => set("discountCode", e.target.value)} placeholder="e.g. BOUGIE10" />
            <p className="text-[11px] text-[#9A8F7E] mt-1">Leave blank for no offer block.</p>
          </div>
          <div>
            <label className={labelCls}>Offer line</label>
            <Input value={config.discountBlurb} onChange={(e) => set("discountBlurb", e.target.value)} />
          </div>
        </div>

        <div className="mb-3">
          <label className={labelCls}>Subject</label>
          <Input value={config.subject} onChange={(e) => set("subject", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Message</label>
          <textarea
            value={config.body}
            onChange={(e) => set("body", e.target.value)}
            rows={12}
            className="w-full rounded-md border border-[#E2DBCD] bg-white px-3 py-2 text-sm text-[#1E2A5A] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
          />
          <p className="text-[11px] text-[#9A8F7E] mt-1">
            Use <code>{"{{name}}"}</code> for the guest's first name, <code>{"{{event}}"}</code> for the event title and{" "}
            <code>{"{{date}}"}</code> for its date. An unsubscribe link and your mailing address are added automatically.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button onClick={() => void save()} disabled={saving} className="bg-[#1E2A5A] text-[#FAF7F0] hover:bg-[#172248]">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
          {msg && <span className="text-sm text-green-700">{msg}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      <div className="rounded-md border border-[#E2DBCD] bg-white">
        <div className="px-5 py-3 border-b border-[#E2DBCD]">
          <div className="text-sm font-medium text-[#1E2A5A]">Past events</div>
          <div className="text-xs text-[#9A8F7E]">
            Events that finished before you switched this on won't send automatically — use Send now to catch up.
          </div>
        </div>
        {events.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#5A6178] text-center">No past events yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[#E2DBCD]/60">
              {events.map((e) => (
                <tr key={e.eventId}>
                  <td className="px-5 py-3">
                    <div className="font-medium text-[#1E2A5A]">{e.title}</div>
                    <div className="text-xs text-[#9A8F7E]">{e.date}</div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {e.sentAt ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sent to {e.recipients}
                      </span>
                    ) : (
                      <Button variant="outline" size="sm" disabled={sendingId === e.eventId} onClick={() => void sendNow(e.eventId, e.title)}>
                        {sendingId === e.eventId ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                        Send now
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
