import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { Link } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = text.split("\n");

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) nodes.push(<br key={`br-${lineIdx}`} />);

    const combined = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*)/g;
    let last = 0;
    let match: RegExpExecArray | null;
    const lineNodes: React.ReactNode[] = [];

    combined.lastIndex = 0;
    while ((match = combined.exec(line)) !== null) {
      if (match.index > last) {
        lineNodes.push(line.slice(last, match.index));
      }
      if (match[0].startsWith("[")) {
        const label = match[2];
        const href = match[3];
        const isInternal = href.startsWith("/");
        if (isInternal) {
          lineNodes.push(
            <Link
              key={`link-${lineIdx}-${match.index}`}
              href={href}
              className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
            >
              {label}
            </Link>,
          );
        } else {
          lineNodes.push(
            <a
              key={`link-${lineIdx}-${match.index}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
            >
              {label}
            </a>,
          );
        }
      } else if (match[0].startsWith("**")) {
        lineNodes.push(
          <strong key={`bold-${lineIdx}-${match.index}`}>{match[4]}</strong>,
        );
      }
      last = match.index + match[0].length;
    }

    if (last < line.length) {
      lineNodes.push(line.slice(last));
    }

    nodes.push(...lineNodes);
  });

  return nodes;
}

function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed">
        {renderMarkdown(content)}
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
        {content}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm the BougieBams Assistant 🀄 I can help you with Mahjong rules, strategy, and anything about BougieBams products or events. What would you like to know?",
    },
  ]);
  const [streaming, setStreaming] = useState(false);
  // null = not yet known (render nothing to avoid a flash); fails open on error.
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/api/chatbot`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active) setEnabled(data ? !!data.enabled : true); })
      .catch(() => { if (active) setEnabled(true); });
    return () => { active = false; };
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    const updatedMessages = [...messages, userMsg];
    setMessages([...updatedMessages, assistantMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

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
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: data.error } : m,
                ),
              );
              break;
            }
            if (data.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.content }
                    : m,
                ),
              );
            }
          } catch {
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Sorry, I ran into an issue. Please try again.",
                }
              : m,
          ),
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Hidden while the setting loads, and when the admin has turned the bot off.
  if (!enabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="w-[360px] max-w-[calc(100vw-2rem)] h-[500px] flex flex-col rounded-2xl border border-border/50 bg-background shadow-2xl overflow-hidden"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-border/40"
              style={{
                background: "linear-gradient(135deg, #181D37 0%, #252c55 100%)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-base">🀄</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">BougieBams Assistant</p>
                  <p className="text-[10px] text-white/60 tracking-wide">Mahjong & Products</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <UserMessage key={msg.id} content={msg.content} />
                ) : (
                  <AssistantMessage
                    key={msg.id}
                    content={
                      msg.content ||
                      (streaming && msg.id === messages[messages.length - 1]?.id
                        ? "▋"
                        : "")
                    }
                  />
                ),
              )}
              {streaming && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-center gap-2 pl-9">
                  <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/40 bg-background">
              <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 focus-within:border-primary/50 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about Mahjong or BougieBams…"
                  rows={1}
                  disabled={streaming}
                  className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 max-h-24 leading-relaxed disabled:opacity-50"
                  style={{ scrollbarWidth: "none" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                  className="flex-shrink-0 p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  aria-label="Send message"
                >
                  {streaming ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble toggle */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? "Close chat" : "Open BougieBams Assistant"}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-primary-foreground relative"
        style={{
          background: "linear-gradient(135deg, #181D37 0%, #252c55 100%)",
          boxShadow: "0 8px 30px rgba(201,162,39,0.3), 0 4px 12px rgba(24,29,55,0.4)",
        }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
