import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowUp, Check, Copy, MessageCircle, Minus, Sparkles, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

// AASW live-assistant styled after the Infobip Live Chat widget used by the
// Smile Foundation homepage: a round green launcher pinned to the LEFT
// bottom, a proactive eye-catcher greeting bubble, and a white chat window
// with a brand header, agent greeting + quick reply button, user/agent
// bubbles and a pill input. Answers stream in with a typewriter reveal.
// Internal member, MIS and admin workspaces intentionally omit it.

type ChatMessage = { role: "user" | "assistant"; content: string; at: number };

type Topic = { label: string; question: string };

const TOPICS: Topic[] = [
  { label: "Programmes", question: "What programmes does AASW Foundation run?" },
  { label: "Membership", question: "How do I become a member?" },
  { label: "Volunteer", question: "How can I volunteer with AASW?" },
  { label: "Donate", question: "How can I donate and will I get a receipt?" },
  { label: "Contact", question: "How do I contact the Foundation office?" },
  { label: "Impact", question: "What impact has AASW Foundation made so far?" },
];

const GREETING_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "**Namaste!** Welcome to AASW Foundation.\n\nI'm the AASW assistant — ask me about our programmes, membership, volunteering, donations or how to reach the team.",
  at: 0,
};

const timeOf = (at: number) => new Date(at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

function isProtectedWorkspace(location: string) {
  const pathname = location.split("?")[0] ?? location;
  return /^(?:\/member|\/foundation-admin|\/mis)(?:\/|$)/.test(pathname);
}

/** Markdown-lite → safe HTML: **bold**, [label](href), bullet lines, line breaks. */
function renderRich(text: string) {
  const withInline = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) =>
      href.startsWith("/") ? `<a href="${href}">${label}</a>` : `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>`
    );
  return withInline
    .split("\n")
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const content = trimmed.replace(/^[•\-*]\s*/, "");
        return `<span class="rich-line">• ${content}</span>`;
      }
      return line;
    })
    .join("<br />");
}

export function AssistantChat() {
  const [location] = useLocation();
  if (isProtectedWorkspace(location)) return null;
  return <AssistantChatPanel />;
}

function AssistantChatPanel() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [eyeCatcher, setEyeCatcher] = useState(false);
  const [eyeDismissed, setEyeDismissed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING_MESSAGE]);
  const [input, setInput] = useState("");
  const [streamed, setStreamed] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamTimer = useRef<number | null>(null);

  const chat = trpc.assistant.chat.useMutation({
    onSuccess: result => {
      let i = 0;
      const text = result.reply;
      setStreamed("");
      if (streamTimer.current) window.clearInterval(streamTimer.current);
      streamTimer.current = window.setInterval(() => {
        i += 3;
        setStreamed(text.slice(0, i));
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        if (i >= text.length) {
          if (streamTimer.current) window.clearInterval(streamTimer.current);
          setStreamed(null);
          setMessages(previous => [...previous, { role: "assistant", content: text, at: Date.now() }]);
        }
      }, 12);
    },
    onError: error =>
      setMessages(previous => [
        ...previous,
        { role: "assistant", content: `I couldn't reply just now — please try again, or email **aaswfoundation06@gmail.com** and the team will respond. (${error.message})`, at: Date.now() },
      ]),
  });

  const busy = chat.isPending || streamed !== null;

  // Proactive eye-catcher greeting appears ~5s after load (like the Infobip
  // widget Smile Foundation uses) unless it was dismissed or chat is open.
  useEffect(() => {
    if (open || eyeDismissed) return;
    const timer = window.setTimeout(() => setEyeCatcher(true), 5000);
    return () => window.clearTimeout(timer);
  }, [open, eyeDismissed]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chat.isPending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => () => { if (streamTimer.current) window.clearInterval(streamTimer.current); }, []);

  const send = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || busy) return;
    const history = [...messages.map(({ role, content: text }) => ({ role, content: text })), { role: "user" as const, content: trimmed }];
    setMessages(previous => [...previous, { role: "user", content: trimmed, at: Date.now() }]);
    setInput("");
    setEyeCatcher(false);
    setEyeDismissed(true);
    chat.mutate({ messages: history });
  };

  const openChat = () => { setOpen(true); setEyeCatcher(false); setEyeDismissed(true); };

  const copy = async (index: number, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(index); window.setTimeout(() => setCopied(null), 1600); } catch { /* clipboard unavailable */ }
  };

  const handleListClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (href && href.startsWith("/")) {
      event.preventDefault();
      setLocation(href);
    }
  };

  return (
    <>
      {/* Launcher + eye-catcher (Infobip LEFT_BOTTOM pattern) */}
      <div className={cn("ib-launcher-dock", open && "ib-dock-hidden")}>
        {eyeCatcher && (
          <div className="ib-eyecatcher" role="status">
            <div className="ib-eyecatcher-bubble">
              <img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="" className="ib-eyecatcher-logo" />
              <p>Welcome to AASW Foundation! Ask me anything — programmes, membership, donations…</p>
              <button type="button" className="ib-eyecatcher-close" onClick={() => { setEyeCatcher(false); setEyeDismissed(true); }} aria-label="Dismiss greeting"><X size={13} /></button>
            </div>
            <button type="button" className="ib-eyecatcher-cta" onClick={openChat}>Start the chat</button>
          </div>
        )}
        <button type="button" className="ib-launcher" onClick={openChat} aria-label="Chat with AASW Foundation" aria-expanded={open}>
          <span className="ib-launcher-icon">{open ? <Minus size={24} /> : <MessageCircle size={24} strokeWidth={2.2} />}</span>
        </button>
      </div>

      {/* Chat window (Infobip white-panel pattern) */}
      <section className={cn("ib-panel", open && "ib-panel-open")} aria-label="AASW Foundation chat" aria-hidden={!open} role="dialog">
        <header className="ib-header">
          <div className="ib-header-id">
            <img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="AASW Foundation" className="ib-header-logo" />
            <span className="ib-header-text">
              <strong>AASW Foundation</strong>
              <small><span className="ib-online-dot" /> We reply instantly</small>
            </span>
          </div>
          <button type="button" className="ib-close" onClick={() => setOpen(false)} aria-label="Close chat"><X size={17} /></button>
        </header>

        <div className="ib-list" ref={listRef} onClick={handleListClick}>
          <div className="ib-day">Today</div>
          {messages.map((message, index) => (
            <div key={`${message.at}-${index}`} className={cn("ib-msg", message.role === "user" ? "ib-msg-user" : "ib-msg-agent")}>
              {message.role === "assistant" && <img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="" className="ib-msg-avatar" />}
              <div className="ib-col">
                <div className={cn("ib-bubble", message.role === "user" ? "ib-bubble-user" : "ib-bubble-agent")} dangerouslySetInnerHTML={{ __html: renderRich(message.content) }} />
                {message.role === "assistant" && message.at > 0 && (
                  <div className="ib-tools">
                    <button type="button" onClick={() => copy(index, message.content)}>{copied === index ? <Check size={11} /> : <Copy size={11} />}{copied === index ? "Copied" : "Copy"}</button>
                    <span className="ib-time">{timeOf(message.at)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {(chat.isPending || streamed !== null) && (
            <div className="ib-msg ib-msg-agent">
              <img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="" className="ib-msg-avatar" />
              <div className="ib-col">
                {streamed !== null
                  ? <div className="ib-bubble ib-bubble-agent ib-caret-wrap" dangerouslySetInnerHTML={{ __html: renderRich(streamed) + '<span class="ib-caret"></span>' }} />
                  : <div className="ib-bubble ib-bubble-agent ib-typing" aria-label="Assistant is typing"><span /><span /><span /></div>}
              </div>
            </div>
          )}

          {messages.length <= 1 && !busy && (
            <div className="ib-quick" role="group" aria-label="Quick topics">
              <div className="ib-quick-grid">
                {TOPICS.map(topic => (
                  <button key={topic.label} type="button" onClick={() => send(topic.question)} disabled={busy}>{topic.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form className="ib-composer" onSubmit={event => { event.preventDefault(); send(input); }}>
          <input ref={inputRef} value={input} onChange={event => setInput(event.target.value)} placeholder="Write a message…" aria-label="Write a message" maxLength={2000} disabled={busy} />
          <button type="submit" className="ib-send" disabled={!input.trim() || busy} aria-label="Send message"><ArrowUp size={17} /></button>
        </form>
        <footer className="ib-foot">Powered by the AASW assistant <Sparkles size={10} className="ib-foot-spark" /> · general questions</footer>
      </section>
    </>
  );
}

