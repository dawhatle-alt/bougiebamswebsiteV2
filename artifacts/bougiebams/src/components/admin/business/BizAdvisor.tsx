import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Trash2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { bizFetch } from "./api";

// AI business advisor, grounded in live Business HQ + real store data.
// Ported from BBOS's floating chat, rendered here as a full tab panel.

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function useConversation() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const ensureConversation = useCallback(async (): Promise<number> => {
    if (conversationId) return conversationId;
    const res = await bizFetch("/advisor/conversations", {
      method: "POST",
      body: JSON.stringify({ title: "Business HQ Chat" }),
    });
    if (!res.ok) throw new Error("Failed to start conversation");
    const convo = await res.json();
    setConversationId(convo.id);
    return convo.id;
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content };
      const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const id = await ensureConversation();
        const res = await bizFetch(`/advisor/conversations/${id}/messages`, {
          method: "POST",
          body: JSON.stringify({ content }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error("Request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.error) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: data.error } : m))
                );
                break;
              }
              if (data.content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: m.content + data.content } : m
                  )
                );
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: "Something went wrong. Please try again." }
                : m
            )
          );
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [ensureConversation]
  );

  const clearChat = useCallback(async () => {
    if (conversationId) {
      await bizFetch(`/advisor/conversations/${conversationId}`, { method: "DELETE" });
    }
    setConversationId(null);
    setMessages([]);
  }, [conversationId]);

  return { messages, streaming, sendMessage, clearChat };
}

const SUGGESTIONS = [
  "How are actual sales tracking against my Year 1 forecast?",
  "Which product is selling best, and what's its margin in my plan?",
  "How are my events performing — fill rate and revenue?",
  "What should I focus on this month to hit my targets?",
];

export default function BizAdvisor() {
  const [input, setInput] = useState("");
  const { messages, streaming, sendMessage, clearChat } = useConversation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    await sendMessage(text);
  }, [input, streaming, sendMessage]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Business Advisor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI advisor with live access to your plan and real store performance
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive border border-border rounded-lg px-4 py-2 transition-colors hover:bg-muted/60"
          >
            <Trash2 size={14} />
            Clear Chat
          </button>
        )}
      </div>

      <div className="bg-card border border-card-border rounded-xl shadow-sm flex flex-col h-[calc(100vh-320px)] min-h-[420px]">
        {/* Messages */}
        <ScrollArea className="flex-1 px-5 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 text-center py-12">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Ask me anything about your business</p>
              <div className="flex flex-col gap-1.5 w-full max-w-md">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      textareaRef.current?.focus();
                    }}
                    className="text-xs text-left px-3 py-2 rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    {msg.content || (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Thinking…
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="px-4 pb-4 pt-3 border-t border-border">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your data…"
              className="min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl py-2.5"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              size="sm"
              className="h-10 w-10 p-0 rounded-xl flex-shrink-0"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
