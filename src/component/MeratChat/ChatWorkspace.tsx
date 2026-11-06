"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight, Check, CheckCheck, Download, FileText, Headphones,
  LoaderCircle, MessageCircle, Paperclip, Plus, Search, Send, UserRound, Wifi, WifiOff, X,
} from "lucide-react";
import { listenForChatChanges } from "./chatRealtime";
import styles from "./ChatWorkspace.module.css";

type User = { userId: number; fullName: string; postTitle: string };
type Conversation = { conversationId: number; otherUserId: number; fullName: string; postTitle: string; lastMessage: string; lastAt: string; unread: number };
type Message = { id: number; conversationId: number; senderUserId: number; messageText: string; messageType: "text" | "image" | "audio" | "video" | "file"; originalFileName: string | null; mimeType: string | null; fileSize: number | null; isRead: boolean; createdAt: string; readAt: string | null; isMine: boolean };
type Envelope<T> = { success: boolean; data: T; message?: string };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !payload?.success) throw new Error(payload?.message || "خطا در ارتباط با سرور پیام‌رسان.");
  return payload.data;
}
function sendRequest<T>(data: object): Promise<T> {
  return request<T>("/Api/ChatRoom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}
function formatTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(date);
}
function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeZone: "Asia/Tehran" }).format(date);
}
function digits(value: unknown) { return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]); }
function avatar(name: string) { const words = name.trim().split(/\s+/); return (words.length > 1 ? words[0].slice(0, 1) + words.at(-1)?.slice(0, 1) : name.slice(0, 1)) || "؟"; }
function fileSize(bytes: number | null) { return bytes ? digits(`${(bytes / 1024).toFixed(1)} KB`) : ""; }
function attachment(message: Message) {
  const url = `/Api/ChatRoom/Attachment?id=${encodeURIComponent(String(message.id))}`;
  if (message.messageType === "image") return <a href={url} target="_blank" rel="noreferrer" className={styles.imageLink}><img src={url} alt={message.originalFileName || "تصویر"} loading="lazy" /></a>;
  if (message.messageType === "audio") return <audio controls src={url} className={styles.media} preload="metadata" />;
  if (message.messageType === "video") return <video controls src={url} className={styles.media} preload="metadata" />;
  if (message.messageType !== "text") return <a className={styles.fileLink} href={url} download={message.originalFileName || "attachment"}><FileText size={20} /><span>{message.originalFileName || "فایل پیوست"}<small>{fileSize(message.fileSize)}</small></span><Download size={17} /></a>;
  return null;
}

export default function ChatWorkspace({ compact = false }: { compact?: boolean }) {
  const [me, setMe] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [newSearch, setNewSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(0);
  const activeRef = useRef(true);
  const lastMessageIdRef = useRef(0);

  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);
  useEffect(() => { return () => { activeRef.current = false; }; }, []);

  const refreshConversations = useCallback(async () => {
    const data = await request<Conversation[]>("/Api/ChatRoom?mode=conversations");
    if (activeRef.current) setConversations(data);
    return data;
  }, []);
  const refreshMessages = useCallback(async (id: number, read = false) => {
    if (!id) return;
    const data = await request<Message[]>(`/Api/ChatRoom?mode=messages&id=${id}`);
    if (!activeRef.current || selectedRef.current !== id) return;
    const latestId = data.at(-1)?.id || 0;
    setMessages(data);
    if (latestId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = latestId;
      window.setTimeout(() => endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }), 100);
    }
    if (read && data.some((item) => !item.isMine && !item.isRead)) {
      await sendRequest<{ ok: boolean }>({ action: "read", conversationId: id });
      window.dispatchEvent(new Event("merat-chat:refresh"));
    }
  }, []);
  const refreshAll = useCallback(async () => {
    try {
      await refreshConversations();
      const current = selectedRef.current;
      if (current) await refreshMessages(current, true);
      setError("");
    } catch (e) {
      if (activeRef.current) setError(e instanceof Error ? e.message : "ارتباط با پیام‌رسان برقرار نشد.");
    }
  }, [refreshConversations, refreshMessages]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await request<User>("/Api/ChatRoom?mode=me");
        const list = await refreshConversations();
        if (!cancelled) {
          setMe(profile);
          if (!selectedRef.current && list.length) setSelectedId(list[0].conversationId);
        }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "خطا در دریافت گفتگوها."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [refreshConversations]);

  useEffect(() => {
    lastMessageIdRef.current = 0;
    if (!selectedId) { setMessages([]); return; }
    void refreshMessages(selectedId, true).catch((e: unknown) => setError(e instanceof Error ? e.message : "خطا در دریافت پیام‌ها."));
  }, [selectedId, refreshMessages]);

  useEffect(() => {
    const cleanup = listenForChatChanges(() => { void refreshAll(); }, setConnected);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshAll();
    }, 7000);
    const refresh = () => { void refreshAll(); };
    window.addEventListener("merat-chat:refresh", refresh);
    return () => { cleanup(); window.clearInterval(poll); window.removeEventListener("merat-chat:refresh", refresh); };
  }, [refreshAll]);

  useEffect(() => {
    if (!showNew) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const data = await request<User[]>(`/Api/ChatRoom?mode=users&search=${encodeURIComponent(newSearch)}`);
        if (!cancelled) setUsers(data);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "خطا در فهرست کاربران."); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [newSearch, showNew]);

  const selected = conversations.find((c) => c.conversationId === selectedId);
  const filtered = useMemo(() => conversations.filter((c) => `${c.fullName} ${c.postTitle}`.includes(search.trim())), [conversations, search]);

  async function start(otherId: number) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await sendRequest<{ conversationId: number }>({ action: "start", otherUserId: otherId });
      await refreshConversations();
      setSelectedId(result.conversationId); setMobileDetail(true); setShowNew(false); setNewSearch("");
    } catch (e) { setError(e instanceof Error ? e.message : "شروع گفتگو انجام نشد."); }
    finally { setBusy(false); }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || busy || (!draft.trim() && !file)) return;
    setBusy(true); setError("");
    try {
      if (file) {
        const data = new FormData();
        data.append("action", "send"); data.append("conversationId", String(selectedId));
        data.append("messageText", draft.trim()); data.append("file", file);
        await request<{ id: number }>("/Api/ChatRoom", { method: "POST", body: data });
      } else {
        await sendRequest<{ id: number }>({ action: "send", conversationId: selectedId, messageText: draft.trim() });
      }
      setDraft(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await refreshAll();
      window.dispatchEvent(new Event("merat-chat:refresh"));
    } catch (e) { setError(e instanceof Error ? e.message : "ارسال پیام انجام نشد."); }
    finally { setBusy(false); }
  }

  return (
    <section className={`${styles.workspace} ${compact ? styles.compact : ""}`} dir="rtl" aria-label="پیام‌رسان مرآت">
      <aside className={`${styles.sidebar} ${mobileDetail ? styles.mobileHidden : ""}`}>
        <header className={styles.sideHeader}>
          <div className={styles.heading}><MessageCircle size={21} /><span>پیام‌رسان</span></div>
          <button type="button" onClick={() => { setShowNew(true); setNewSearch(""); }} className={styles.smallButton} title="گفتگوی جدید" aria-label="گفتگوی جدید"><Plus size={21} /></button>
        </header>
        <div className={styles.search}><Search size={18} /><input aria-label="جستجوی گفتگوها" placeholder="جستجوی همکار یا گفتگو..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className={styles.contacts}>
          {loading ? <p className={styles.empty}>در حال دریافت گفتگوها...</p> : null}
          {!loading && filtered.length === 0 ? <p className={styles.empty}>هنوز گفتگویی ندارید. از علامت + شروع کنید.</p> : null}
          {filtered.map((item) => (
            <button key={item.conversationId} type="button" className={`${styles.contact} ${selectedId === item.conversationId ? styles.activeContact : ""}`} onClick={() => { setSelectedId(item.conversationId); setMobileDetail(true); }}>
              <span className={styles.avatar}>{avatar(item.fullName)}</span>
              <span className={styles.contactContent}><strong>{item.fullName}</strong><small>{item.lastMessage || item.postTitle}</small></span>
              <span className={styles.contactAside}><small>{formatTime(item.lastAt)}</small>{item.unread > 0 ? <b>{digits(item.unread)}</b> : null}</span>
            </button>
          ))}
        </div>
        <footer className={styles.sideFooter}>{me ? `ورود با حساب ${me.fullName}` : "ارتباط داخلی همکاران"}</footer>
      </aside>

      <div className={`${styles.chatPane} ${!mobileDetail ? styles.mobileHidden : ""}`}>
        {selected ? (
          <>
            <header className={styles.chatHeader}>
              <button type="button" className={styles.backMobile} onClick={() => setMobileDetail(false)} aria-label="بازگشت به فهرست"><ArrowRight size={22} /></button>
              <span className={styles.avatar}>{avatar(selected.fullName)}</span>
              <span className={styles.peerTitle}><strong>{selected.fullName}</strong><small>{selected.postTitle}</small></span>
              <span className={`${styles.connection} ${connected ? styles.connected : ""}`} title={connected ? "وب‌سوکت متصل" : "دریافت خودکار دوره‌ای فعال"}>{connected ? <Wifi size={17} /> : <WifiOff size={17} />}{connected ? "آنلاین" : "بروزرسانی دوره‌ای"}</span>
            </header>
            <div className={styles.messages}>
              {messages.length === 0 ? <div className={styles.noMessages}><MessageCircle size={37} /><span>اولین پیام را ارسال کنید.</span></div> : null}
              {messages.map((m, idx) => (
                <div key={m.id}>
                  {(!idx || formatDay(messages[idx - 1].createdAt) !== formatDay(m.createdAt)) && <div className={styles.day}><span>{formatDay(m.createdAt)}</span></div>}
                  <div className={`${styles.bubble} ${m.isMine ? styles.mine : styles.theirs}`}>
                    {m.messageText ? <p>{m.messageText}</p> : null}
                    {attachment(m)}
                    <div className={styles.messageFooter}><time>{formatTime(m.createdAt)}</time>{m.isMine ? (m.isRead ? <CheckCheck size={15} aria-label="خوانده‌شده" /> : <Check size={15} aria-label="ارسال‌شده" />) : null}</div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form className={styles.composer} onSubmit={(event) => { void send(event); }}>
              {file && <div className={styles.fileSelection}><Paperclip size={16} />{file.name} ({fileSize(file.size)})<button type="button" aria-label="حذف فایل" onClick={() => setFile(null)}><X size={16} /></button></div>}
              <div className={styles.composeRow}>
                <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif,audio/*,video/mp4,video/webm,.pdf,.txt,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button type="button" className={styles.attachButton} title="پیوست فایل" aria-label="پیوست فایل" onClick={() => fileRef.current?.click()}><Paperclip size={20} /></button>
                <textarea value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} placeholder="پیام خود را بنویسید..." rows={1} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.closest("form")?.requestSubmit(); } }} />
                <button type="submit" className={styles.sendButton} disabled={busy || (!draft.trim() && !file)} aria-label="ارسال پیام">{busy ? <LoaderCircle size={20} className={styles.spinner} /> : <Send size={19} />}</button>
              </div>
            </form>
          </>
        ) : <div className={styles.placeholder}><Headphones size={44} /><strong>گفتگوی همکاران</strong><span>یک گفتگو را انتخاب کنید یا گفتگوی جدیدی بسازید.</span><button type="button" onClick={() => setShowNew(true)}><Plus size={18} /> گفتگوی جدید</button></div>}
      </div>

      {error && <div className={styles.error} role="alert">{error}<button type="button" onClick={() => setError("")} aria-label="بستن خطا"><X size={17} /></button></div>}
      {showNew && <div className={styles.dialogLayer}>
        <button type="button" className={styles.dialogBackdrop} onClick={() => setShowNew(false)} aria-label="بستن" />
        <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="گفتگوی جدید">
          <header><strong>شروع گفتگوی جدید</strong><button type="button" onClick={() => setShowNew(false)} aria-label="بستن"><X size={19} /></button></header>
          <div className={styles.search}><Search size={18} /><input autoFocus value={newSearch} placeholder="نام همکار را جستجو کنید..." onChange={(e) => setNewSearch(e.target.value)} /></div>
          <div className={styles.users}>{users.map((u) => <button disabled={busy} key={u.userId} type="button" onClick={() => { void start(u.userId); }}><span className={styles.avatar}>{avatar(u.fullName)}</span><span><strong>{u.fullName}</strong><small>{u.postTitle}</small></span><Plus size={18} /></button>)}{users.length === 0 && <p className={styles.empty}>کاربری یافت نشد.</p>}</div>
        </section>
      </div>}
    </section>
  );
}
