import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  loadLocal, saveLocal, subscribeRemote, saveRemote,
  subscribeAuth, signInAnon, signInEmail, registerEmail, linkEmail, signOut, resetPassword,
  loadLocalApiKey, saveLocalApiKey, loadSettings, saveSettings,
} from "./storage";

const AUTH_ERRORS = {
  "auth/wrong-password": "Onjuist wachtwoord",
  "auth/invalid-credential": "Onjuiste inloggegevens",
  "auth/user-not-found": "Geen account gevonden met dit e-mailadres",
  "auth/email-already-in-use": "Dit e-mailadres is al in gebruik",
  "auth/weak-password": "Wachtwoord moet minimaal 6 tekens bevatten",
  "auth/invalid-email": "Ongeldig e-mailadres",
  "auth/too-many-requests": "Te veel pogingen — probeer later opnieuw",
  "auth/network-request-failed": "Netwerkfout — controleer je verbinding",
  "auth/credential-already-in-use": "Deze inloggegevens zijn al gekoppeld aan een ander account",
};

function humanizeAuthError(e) {
  const code = e?.code || "";
  return AUTH_ERRORS[code] || e?.message || "Er ging iets mis";
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_DATA = {
  categories: [],
  items: {},
  options: {},
  suppliers: {},
  totalBudget: null,
};

// ─── Icons ─────────────────────────────────────────────────────
const Icon = ({ name, size = 18, className = "" }) => {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="M20 6L9 17l-5-5" />,
    chevronDown: <path d="M6 9l6 6 6-6" />,
    chevronRight: <path d="M9 18l6-6-6-6" />,
    trash: <><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></>,
    search: <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>,
    store: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
    list: <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>,
    download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    upload: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
    link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></>,
    euro: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>,
    note: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    reset: <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></>,
    more: <><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></>,
    sparkle: <><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" /><path d="M5 3v4M3 5h4M19 17v4M17 19h4" /></>,
    refresh: <><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ flexShrink: 0 }} aria-hidden="true">{paths[name]}</svg>
  );
};

// ─── Checkbox (44px touch target) ──────────────────────────────
const Checkbox = ({ checked, onChange, size = 20, color = "var(--accent)" }) => (
  <button role="checkbox" aria-checked={checked} aria-label={checked ? "Uitvinken" : "Aanvinken"} onClick={(e) => { e.stopPropagation(); onChange(); }} style={{
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0, background: "none", border: "none", cursor: "pointer",
    minWidth: 40, minHeight: 40, flexShrink: 0,
  }}>
    <span style={{
      width: size, height: size, borderRadius: 4,
      border: `2px solid ${checked ? color : "var(--border)"}`,
      background: checked ? color : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.15s ease",
    }}>
      {checked && <Icon name="check" size={size - 6} className="check-icon" />}
    </span>
  </button>
);

// ─── Inline Edit (tap or double-click) ─────────────────────────
const InlineEdit = ({ value, onSave, placeholder = "", style: s = {} }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const ref = useRef(null);
  const tapTimer = useRef(null);

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  useEffect(() => { setText(value); }, [value]);

  const save = () => {
    setEditing(false);
    if (text.trim() && text.trim() !== value) onSave(text.trim());
    else setText(value);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.detail === 2) { setEditing(true); return; }
    if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; setEditing(true); return; }
    tapTimer.current = setTimeout(() => { tapTimer.current = null; }, 300);
  };

  if (editing) return (
    <input ref={ref} value={text} onChange={e => setText(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(value); setEditing(false); } }}
      onClick={e => e.stopPropagation()}
      style={{ ...s, background: "var(--bg-input)", border: "1px solid var(--accent)", borderRadius: 6, padding: "4px 8px", color: "var(--text)", outline: "none", font: "inherit", width: "100%", minWidth: 0 }}
      placeholder={placeholder} />
  );

  return (
    <span onClick={handleClick} className="inline-editable" style={{ ...s, cursor: "default", wordBreak: "break-word", borderBottom: "1px dashed transparent", transition: "border-color 0.15s" }} title="Dubbeltik om te bewerken">
      {value}
    </span>
  );
};

// ─── Add Input ─────────────────────────────────────────────────
const AddInput = ({ onAdd, placeholder, compact = false }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  const submit = () => { if (value.trim()) { onAdd(value.trim()); setValue(""); setOpen(false); } };

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="add-trigger" aria-label={placeholder || "Toevoegen"}>
        <Icon name="plus" size={compact ? 14 : 16} />
        <span>{placeholder || "Toevoegen..."}</span>
      </button>
    );
  }

  return (
    <div className="add-popover" onClick={e => e.stopPropagation()}>
      <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setValue(""); setOpen(false); } }}
        placeholder={placeholder}
        style={{
          flex: 1, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8,
          padding: compact ? "8px 10px" : "10px 12px", color: "var(--text)", outline: "none",
          fontSize: compact ? 13 : 14, fontFamily: "inherit", minWidth: 0,
        }} />
      <button onClick={submit} aria-label="Toevoegen" className="add-btn" style={{
        background: "var(--accent)", border: "none", borderRadius: 8, color: "#fff",
        padding: compact ? "8px 10px" : "10px 12px", cursor: "pointer", display: "flex",
        alignItems: "center", gap: 4, fontSize: compact ? 13 : 14, fontFamily: "inherit", fontWeight: 600,
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
        <Icon name="plus" size={14} />
      </button>
      <button onClick={() => { setValue(""); setOpen(false); }} aria-label="Annuleren" style={{
        background: "none", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)",
        padding: compact ? "8px 10px" : "10px 12px", cursor: "pointer", display: "flex",
        alignItems: "center", fontSize: compact ? 13 : 14, fontFamily: "inherit", flexShrink: 0,
      }}>
        <Icon name="x" size={14} />
      </button>
    </div>
  );
};

// ─── Price Input ───────────────────────────────────────────────
const PriceInput = ({ value, onChange }) => {
  const [text, setText] = useState(value != null ? String(value).replace(".", ",") : "");
  useEffect(() => { setText(value != null ? String(value).replace(".", ",") : ""); }, [value]);
  const save = () => { const n = parseFloat(text.replace(",", ".")); onChange(isNaN(n) ? null : n); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>€</span>
      <input value={text} onChange={e => setText(e.target.value)} onBlur={save}
        onKeyDown={e => e.key === "Enter" && save()} inputMode="decimal"
        placeholder="—" style={{
          width: 58, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6,
          padding: "6px 8px", color: "var(--text)", outline: "none", fontSize: 13, fontFamily: "inherit", textAlign: "right",
        }} />
    </div>
  );
};

// ─── URL Display ───────────────────────────────────────────────
const UrlDisplay = ({ url, onEdit }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(url || "");
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  useEffect(() => { setText(url || ""); }, [url]);
  const save = () => { setEditing(false); onEdit(text.trim() || null); };

  if (editing) return (
    <input ref={ref} value={text} onChange={e => setText(e.target.value)} onBlur={save}
      onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(url || ""); setEditing(false); } }}
      placeholder="https://..."
      style={{ flex: 1, minWidth: 80, maxWidth: 200, background: "var(--bg-input)", border: "1px solid var(--accent)", borderRadius: 6, padding: "6px 8px", color: "var(--text)", outline: "none", fontSize: 12, fontFamily: "inherit" }} />
  );

  if (url) return (
    <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
      style={{ color: "var(--accent)", fontSize: 12, display: "flex", alignItems: "center", gap: 3, padding: "6px 2px", flexShrink: 0 }}
      title={url}>
      <Icon name="link" size={14} /> Link
    </a>
  );

  return (
    <button onClick={() => setEditing(true)} style={{
      background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 3, padding: "6px 2px", fontFamily: "inherit", flexShrink: 0,
    }}>
      <Icon name="link" size={14} />
      <span className="hide-mobile">+ URL</span>
    </button>
  );
};

// ─── Note Editor ───────────────────────────────────────────────
const NoteEditor = ({ note, onSave }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(note || "");
  useEffect(() => { setText(note || ""); }, [note]);

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} style={{
        background: "none", border: "none", color: note ? "var(--accent)" : "var(--text-muted)",
        cursor: "pointer", padding: 6, display: "flex", alignItems: "center",
        minWidth: 34, minHeight: 34, justifyContent: "center",
      }} title={note || "Notitie toevoegen"} aria-label="Notitie">
        <Icon name="note" size={16} />
      </button>
      {open && (
        <div className="note-popup" onClick={e => e.stopPropagation()} style={{
          position: "absolute", top: "100%", zIndex: 100, background: "var(--bg-card)",
          border: "1px solid var(--border)", borderRadius: 10, padding: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            placeholder="Notitie..."
            style={{
              width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6,
              padding: 8, color: "var(--text)", outline: "none", fontSize: 13, fontFamily: "inherit", resize: "vertical",
              boxSizing: "border-box",
            }} />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button onClick={() => { onSave(text.trim() || null); setOpen(false); }}
              style={{ flex: 1, background: "var(--accent)", border: "none", borderRadius: 6, color: "#fff", padding: "10px 0", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              Opslaan
            </button>
            <button onClick={() => { setText(note || ""); setOpen(false); }}
              style={{ flex: 1, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", padding: "10px 0", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Annuleer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


// ─── Delete Button ─────────────────────────────────────────────
const DeleteBtn = ({ onDelete, size = 14 }) => {
  const [confirm, setConfirm] = useState(false);
  if (confirm) return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); setConfirm(false); }}
        style={{ background: "var(--danger)", border: "none", borderRadius: 6, color: "#fff", padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Ja</button>
      <button onClick={(e) => { e.stopPropagation(); setConfirm(false); }}
        style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Nee</button>
    </div>
  );
  return (
    <button aria-label="Verwijderen" onClick={(e) => { e.stopPropagation(); setConfirm(true); }} style={{
      background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
      padding: 6, opacity: 0.4, minWidth: 34, minHeight: 34, display: "flex",
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <Icon name="trash" size={size} />
    </button>
  );
};

// ─── Progress Bar ──────────────────────────────────────────────
const ProgressBar = ({ done, total, height = 4 }) => {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 80 }}>
      <div style={{ flex: 1, height, background: "var(--bg-input)", borderRadius: height / 2, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: pct === 100 ? "var(--success)" : "var(--accent)",
          borderRadius: height / 2, transition: "width 0.3s ease",
        }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {done}/{total}
      </span>
    </div>
  );
};

// ─── Budget Bar ────────────────────────────────────────────────
const BudgetBar = ({ spent, budget, height = 6 }) => {
  const pct = budget === 0 ? 0 : Math.min((spent / budget) * 100, 100);
  const over = spent > budget;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height, background: "var(--bg-input)", borderRadius: height / 2, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: over ? "var(--danger)" : pct > 80 ? "#f59e0b" : "var(--success)",
          borderRadius: height / 2, transition: "width 0.3s ease",
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "right",
        color: over ? "var(--danger)" : "var(--text-muted)" }}>
        {Math.round((spent / (budget || 1)) * 100)}%
      </span>
    </div>
  );
};

const formatPrice = (p) => p == null ? "—" : `€${p.toFixed(2).replace(".", ",")}`;

// ─── Budget Field ──────────────────────────────────────────────
const BudgetField = ({ value, onChange, placeholder = "Budget...", compact = false }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value != null ? String(value).replace(".", ",") : "");
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  useEffect(() => { setText(value != null ? String(value).replace(".", ",") : ""); }, [value]);
  const save = () => {
    setEditing(false);
    if (!text.trim()) { onChange(null); return; }
    const n = parseFloat(text.replace(",", "."));
    onChange(isNaN(n) ? null : n);
  };

  if (editing) return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ color: "var(--text-muted)", fontSize: compact ? 12 : 13 }}>€</span>
      <input ref={ref} value={text} onChange={e => setText(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(value != null ? String(value).replace(".", ",") : ""); setEditing(false); } }}
        inputMode="decimal" placeholder="0,00"
        style={{
          width: compact ? 70 : 90, background: "var(--bg-input)", border: "1px solid var(--accent)", borderRadius: 6,
          padding: "6px 8px", color: "var(--text)", outline: "none", fontSize: compact ? 12 : 13,
          fontFamily: "inherit", textAlign: "right",
        }} />
    </div>
  );

  return (
    <button onClick={() => setEditing(true)} style={{
      background: value != null ? "rgba(59,130,246,0.1)" : "transparent",
      border: `1px dashed ${value != null ? "var(--accent)" : "var(--border)"}`,
      borderRadius: 8, color: value != null ? "var(--accent)" : "var(--text-muted)",
      padding: compact ? "6px 10px" : "8px 14px", fontSize: compact ? 12 : 13,
      cursor: "pointer", fontFamily: "inherit", fontWeight: value != null ? 600 : 400,
      fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center", gap: 4,
      whiteSpace: "nowrap",
    }}>
      <Icon name="euro" size={compact ? 12 : 13} />
      {value != null ? formatPrice(value) : placeholder}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════
// ─── Sync Status Indicator ────────────────────────────────────
const SyncIndicator = ({ status, compact = false }) => {
  const colors = { local: "#6b7280", syncing: "#f59e0b", synced: "#4ade80", offline: "#6b7280", error: "#ef4444" };
  const labels = { local: "Lokaal", syncing: "Synchroniseren...", synced: "Gesynchroniseerd", offline: "Offline", error: "Sync fout" };
  const icons = { local: "more", syncing: "refresh", synced: "check", offline: "x", error: "x" };
  if (compact) {
    return (
      <span title={labels[status] || "Lokaal"} className={status === "syncing" ? "sync-dot-pulse" : ""} style={{
        display: "inline-flex", alignItems: "center", width: 8, height: 8, borderRadius: "50%",
        background: colors[status] || colors.local, flexShrink: 0, position: "relative",
      }}>
        <span className="sr-only">{labels[status] || "Lokaal"}</span>
      </span>
    );
  }
  return (
    <span title={labels[status] || "Lokaal"} className={status === "syncing" ? "sync-dot-pulse" : ""} style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11,
      color: colors[status] || colors.local, flexShrink: 0, fontWeight: 500,
    }}>
      <Icon name={icons[status] || "more"} size={12} />
      {labels[status] || "Lokaal"}
    </span>
  );
};

// ─── Account Panel ────────────────────────────────────────────
const AccountPanel = ({ user, syncStatus, onSignIn, onRegister, onLink, onSignOut }) => {
  const [mode, setMode] = useState(null); // null | 'login' | 'register' | 'link'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (action) => {
    setBusy(true); setError(null); setInfo(null);
    try {
      await action(email, password);
      setMode(null); setEmail(""); setPassword("");
    } catch (e) {
      setError(humanizeAuthError(e));
    }
    setBusy(false);
  };

  const handleResetPassword = async () => {
    if (!email.trim()) { setError("Vul eerst je e-mailadres in"); return; }
    setBusy(true); setError(null); setInfo(null);
    try {
      await resetPassword(email);
      setInfo("Herstel-e-mail verstuurd — check je inbox");
    } catch (e) {
      setError(humanizeAuthError(e));
    }
    setBusy(false);
  };

  if (mode) {
    const action = mode === "login" ? onSignIn : mode === "register" ? onRegister : onLink;
    const label = mode === "login" ? "Inloggen" : mode === "register" ? "Registreren" : "Account koppelen";
    const subtitle = mode === "link"
      ? "Koppel een e-mailadres om je gegevens op meerdere apparaten te gebruiken"
      : mode === "register"
      ? "Maak een account aan om je gegevens veilig in de cloud op te slaan"
      : null;
    return (
      <div className="account-panel">
        <div className="account-form">
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{label}</span>
          {subtitle && <span style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4, marginBottom: 2 }}>{subtitle}</span>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mailadres"
            className="account-input" autoComplete="email" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Wachtwoord (min. 6 tekens)"
            onKeyDown={e => e.key === "Enter" && submit(action)}
            className="account-input" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {error && <div style={{ fontSize: 11, color: "var(--danger)", padding: "2px 0" }}>{error}</div>}
          {info && <div style={{ fontSize: 11, color: "var(--success)", padding: "2px 0" }}>{info}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => submit(action)} disabled={busy} className="account-btn account-btn-primary" style={{ flex: 1 }}>
              {busy ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : label}
            </button>
            <button onClick={() => { setMode(null); setError(null); setInfo(null); }} className="account-btn account-btn-secondary" style={{ padding: "10px 16px" }}>
              Annuleer
            </button>
          </div>
          {mode === "login" && (
            <button onClick={handleResetPassword} disabled={busy}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: "2px 0", textAlign: "left", opacity: 0.8 }}>
              Wachtwoord vergeten?
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="account-panel">
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <SyncIndicator status={syncStatus} />
        <div style={{ flex: 1, minWidth: 0 }} />
        {user && !user.isAnonymous ? (<>
          <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{user.email}</span>
          <button onClick={onSignOut} className="action-btn" style={{ fontSize: 11, padding: "6px 10px" }}>Uitloggen</button>
        </>) : user && user.isAnonymous ? (<>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Niet gekoppeld</span>
          <button onClick={() => setMode("link")} className="action-btn" style={{ fontSize: 11, padding: "6px 10px", borderColor: "var(--accent)", color: "var(--accent)" }}>Account koppelen</button>
        </>) : (<>
          <button onClick={() => setMode("login")} className="action-btn" style={{ fontSize: 11, padding: "6px 10px" }}>Inloggen</button>
          <button onClick={() => setMode("register")} className="action-btn" style={{ fontSize: 11, padding: "6px 10px", borderColor: "var(--accent)", color: "var(--accent)" }}>Registreren</button>
        </>)}
      </div>
    </div>
  );
};

export default function GearChecklist() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("category");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [supplierFilter, setSupplierFilter] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState("local");
  const [conflictData, setConflictData] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [dialog, setDialog] = useState(null); // { type:'confirm'|'input'|'alert', title, message, defaultValue?, onConfirm, onCancel? }
  const [aiLoadingItems, setAiLoadingItems] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);
  const undoRef = useRef(null);
  const saveTimeout = useRef(null);
  const userRef = useRef(null);
  const dataRef = useRef(null);
  const localUpdatedAt = useRef(0);
  const unsubRemote = useRef(null);
  const lastSavedAt = useRef(0);
  const signingIn = useRef(false);

  // Keep refs in sync
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { dataRef.current = data; }, [data]);

  // ─── Init: load local, then set up auth + remote sync ──────
  useEffect(() => {
    let cancelled = false;

    loadLocal().then(d => {
      if (cancelled) return;
      const localData = d || { ...DEFAULT_DATA };
      localUpdatedAt.current = localData.updatedAt || 0;
      setData(localData);
      setLoading(false);
    });

    let isFirstAuthCallback = true;

    // Track online/offline for sync status
    const goOffline = () => { if (!cancelled) setSyncStatus(s => s === "local" ? s : "offline"); };
    const goOnline = () => { if (!cancelled) setSyncStatus(s => s === "offline" ? "syncing" : s); };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    function setupRemoteSync(u) {
      // Clean up previous remote subscription
      if (unsubRemote.current) { unsubRemote.current(); unsubRemote.current = null; }

      setSyncStatus(navigator.onLine ? "syncing" : "offline");

      // Sync API key for non-anonymous users
      if (!u.isAnonymous) {
        loadSettings(u.uid).then(settings => {
          if (cancelled) return;
          if (settings?.apiKey) {
            const localKey = loadLocalApiKey();
            if (!localKey) saveLocalApiKey(settings.apiKey);
          }
        });
      }

      let firstSnapshot = true;
      unsubRemote.current = subscribeRemote(u.uid, (remoteData) => {
        if (cancelled) return;

        const remoteTime = remoteData?.updatedAt || 0;

        // Skip echoes of our own writes
        if (remoteTime && remoteTime === lastSavedAt.current) { setSyncStatus("synced"); return; }

        if (!remoteData) {
          // No remote data — push local data up on first connect
          if (firstSnapshot) {
            firstSnapshot = false;
            loadLocal().then(ld => {
              if (cancelled) return;
              if (ld && ld.categories && ld.categories.length > 0) {
                lastSavedAt.current = ld.updatedAt || 0;
                saveRemote(u.uid, ld).then(() => setSyncStatus("synced")).catch(() => setSyncStatus("error"));
              } else {
                setSyncStatus("synced");
              }
            });
          }
          return;
        }

        if (firstSnapshot) {
          firstSnapshot = false;
          // Check for conflict: both local and remote have data
          loadLocal().then(ld => {
            if (cancelled) return;
            const hasLocal = ld && ld.categories && ld.categories.length > 0;
            const localTime = ld?.updatedAt || 0;

            if (hasLocal && localTime > 0 && remoteTime > 0 && localTime !== remoteTime) {
              // Conflict — let user choose
              setConflictData({ local: ld, remote: remoteData });
              setSyncStatus("synced");
            } else if (remoteTime >= localTime) {
              // Remote is newer or same — use remote
              setData(remoteData);
              saveLocal(remoteData);
              localUpdatedAt.current = remoteTime;
              setSyncStatus("synced");
            } else {
              setSyncStatus("synced");
            }
          });
          return;
        }

        // Subsequent snapshots: remote wins if newer
        if (remoteTime > localUpdatedAt.current) {
          setData(remoteData);
          saveLocal(remoteData);
          localUpdatedAt.current = remoteTime;
        }
        setSyncStatus("synced");
      }, () => { if (!cancelled) setSyncStatus("error"); });
    }

    // Flush pending save on tab close
    const flushOnUnload = () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
        // Synchronous localStorage write — saveRemote can't run here
        try { localStorage.setItem("gear-checklist-data", JSON.stringify(dataRef.current)); } catch {}
      }
    };
    window.addEventListener("beforeunload", flushOnUnload);

    const unsubAuth = subscribeAuth((u) => {
      if (cancelled) return;

      if (!u && signingIn.current) {
        // Ignore intermediate null during sign-in/sign-out transition
        return;
      }

      setUser(u);

      if (u) {
        signingIn.current = false;
        setupRemoteSync(u);
      } else if (isFirstAuthCallback) {
        // No existing session — sign in anonymously
        signInAnon().catch(() => setSyncStatus("local"));
      } else {
        // User explicitly signed out
        if (unsubRemote.current) { unsubRemote.current(); unsubRemote.current = null; }
        setSyncStatus("local");
      }

      isFirstAuthCallback = false;
    });

    return () => {
      cancelled = true;
      unsubAuth();
      if (unsubRemote.current) unsubRemote.current();
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("beforeunload", flushOnUnload);
    };
  }, []);

  const persist = useCallback((nd) => {
    const stamped = { ...nd, updatedAt: Date.now() };
    localUpdatedAt.current = stamped.updatedAt;
    lastSavedAt.current = stamped.updatedAt;
    setData(stamped);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveLocal(stamped);
      const u = userRef.current;
      if (u) {
        setSyncStatus("syncing");
        saveRemote(u.uid, stamped).then(() => { setSyncStatus("synced"); setLastSyncedAt(new Date()); }).catch(() => setSyncStatus("error"));
      }
    }, 300);
  }, []);

  const resolveConflict = (choice) => {
    const chosen = choice === "local" ? conflictData.local : conflictData.remote;
    const stamped = { ...chosen, updatedAt: Date.now() };
    localUpdatedAt.current = stamped.updatedAt;
    lastSavedAt.current = stamped.updatedAt;
    setData(stamped);
    saveLocal(stamped);
    if (userRef.current) {
      saveRemote(userRef.current.uid, stamped).catch(() => {});
    }
    setConflictData(null);
  };

  const handleSignIn = async (email, password) => {
    signingIn.current = true;
    if (unsubRemote.current) { unsubRemote.current(); unsubRemote.current = null; }
    try {
      await signInEmail(email, password);
    } catch (e) {
      signingIn.current = false;
      throw e;
    }
  };

  const handleRegister = async (email, password) => {
    signingIn.current = true;
    if (unsubRemote.current) { unsubRemote.current(); unsubRemote.current = null; }
    try {
      await registerEmail(email, password);
    } catch (e) {
      signingIn.current = false;
      throw e;
    }
  };

  const handleLink = async (email, password) => {
    await linkEmail(email, password);
    // onAuthStateChanged may not fire for linkWithCredential — update user manually
    setUser({ uid: userRef.current.uid, isAnonymous: false, email });
    // Sync API key and existing data under the now-linked account
    const apiKey = loadLocalApiKey();
    if (apiKey && userRef.current) {
      saveSettings(userRef.current.uid, { apiKey });
    }
  };

  const handleSignOut = async () => {
    signingIn.current = true; // suppress intermediate null
    if (unsubRemote.current) { unsubRemote.current(); unsubRemote.current = null; }
    await signOut();
    // Re-sign-in anonymously; onAuthStateChanged will fire with the new anon user
    signInAnon().catch(() => { signingIn.current = false; setSyncStatus("local"); });
  };

  // ─── CRUD ──────────────────────────────────────────────────
  const deleteWithUndo = (label, newData) => {
    const prev = data;
    undoRef.current = prev;
    persist(newData);
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message: `${label} verwijderd`, type: "info", undo: true }]);
    const timer = setTimeout(() => { setToasts(t => t.filter(x => x.id !== id)); undoRef.current = null; }, 5000);
    // Store timer so undo can clear it
    undoRef.current = { prev, timerId: timer, toastId: id };
  };
  const handleUndo = () => {
    if (!undoRef.current) return;
    const { prev, timerId, toastId } = undoRef.current;
    clearTimeout(timerId);
    setToasts(t => t.filter(x => x.id !== toastId));
    persist(prev);
    undoRef.current = null;
    addToast("Ongedaan gemaakt", "success");
  };

  const addCategory = (name) => persist({ ...data, categories: [...data.categories, { id: generateId(), name, itemIds: [], budget: null }] });
  const updateCategory = (id, u) => persist({ ...data, categories: data.categories.map(c => c.id === id ? { ...c, ...u } : c) });
  const deleteCategory = (id) => {
    const cat = data.categories.find(c => c.id === id);
    const ni = { ...data.items }, no = { ...data.options }, ns = { ...data.suppliers };
    (cat.itemIds || []).forEach(iid => {
      const item = ni[iid];
      if (item) (item.optionIds || []).forEach(oid => { const o = no[oid]; if (o) (o.supplierIds || []).forEach(sid => delete ns[sid]); delete no[oid]; });
      delete ni[iid];
    });
    deleteWithUndo(cat.name, { ...data, categories: data.categories.filter(c => c.id !== id), items: ni, options: no, suppliers: ns });
  };
  const addItem = (catId, name) => {
    const id = generateId();
    persist({ ...data, categories: data.categories.map(c => c.id === catId ? { ...c, itemIds: [...(c.itemIds||[]), id] } : c), items: { ...data.items, [id]: { id, name, categoryId: catId, checked: false, optionIds: [], note: null } } });
  };
  const updateItem = (id, u) => persist({ ...data, items: { ...data.items, [id]: { ...data.items[id], ...u } } });
  const deleteItem = (id) => {
    const item = data.items[id]; const no = { ...data.options }, ns = { ...data.suppliers }, ni = { ...data.items };
    (item.optionIds||[]).forEach(oid => { const o = no[oid]; if (o) (o.supplierIds||[]).forEach(sid => delete ns[sid]); delete no[oid]; });
    delete ni[id];
    deleteWithUndo(item.name, { ...data, categories: data.categories.map(c => c.id === item.categoryId ? { ...c, itemIds: (c.itemIds||[]).filter(i => i !== id) } : c), items: ni, options: no, suppliers: ns });
  };
  const addOption = (itemId, name) => {
    const id = generateId();
    persist({ ...data, items: { ...data.items, [itemId]: { ...data.items[itemId], optionIds: [...(data.items[itemId].optionIds||[]), id] } }, options: { ...data.options, [id]: { id, name, itemId, checked: false, supplierIds: [] } } });
  };
  const updateOption = (id, u) => persist({ ...data, options: { ...data.options, [id]: { ...data.options[id], ...u } } });
  const deleteOption = (id) => {
    const o = data.options[id]; const ns = { ...data.suppliers }, no = { ...data.options };
    (o.supplierIds||[]).forEach(sid => delete ns[sid]); delete no[id];
    deleteWithUndo(o.name, { ...data, items: { ...data.items, [o.itemId]: { ...data.items[o.itemId], optionIds: (data.items[o.itemId].optionIds||[]).filter(x => x !== id) } }, options: no, suppliers: ns });
  };
  const addSupplier = (optId, name) => {
    const id = generateId();
    persist({ ...data, options: { ...data.options, [optId]: { ...data.options[optId], supplierIds: [...(data.options[optId].supplierIds||[]), id] } }, suppliers: { ...data.suppliers, [id]: { id, name, optionId: optId, price: null, url: null, checked: false } } });
  };
  const updateSupplier = (id, u) => persist({ ...data, suppliers: { ...data.suppliers, [id]: { ...data.suppliers[id], ...u } } });
  const deleteSupplier = (id) => {
    const s = data.suppliers[id]; const ns = { ...data.suppliers }; delete ns[id];
    deleteWithUndo(s.name, { ...data, options: { ...data.options, [s.optionId]: { ...data.options[s.optionId], supplierIds: (data.options[s.optionId].supplierIds||[]).filter(x => x !== id) } }, suppliers: ns });
  };

  // ─── Check logic (upward only) ────────────────────────────
  const checkSupplier = (id) => {
    const s = data.suppliers[id]; const nc = !s.checked;
    const ns = { ...data.suppliers, [id]: { ...s, checked: nc } }, no = { ...data.options }, ni = { ...data.items };
    if (nc) { const o = data.options[s.optionId]; no[o.id] = { ...o, checked: true }; const it = data.items[o.itemId]; ni[it.id] = { ...it, checked: true }; }
    persist({ ...data, items: ni, options: no, suppliers: ns });
  };
  const checkOption = (id) => {
    const o = data.options[id]; const nc = !o.checked;
    const no = { ...data.options, [id]: { ...o, checked: nc } }, ni = { ...data.items };
    if (nc) { const it = data.items[o.itemId]; ni[it.id] = { ...it, checked: true }; }
    persist({ ...data, items: ni, options: no });
  };
  const checkItem = (id) => { const it = data.items[id]; persist({ ...data, items: { ...data.items, [id]: { ...it, checked: !it.checked } } }); };

  const toggle = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  // ─── Computed ──────────────────────────────────────────────
  const allSupplierNames = useMemo(() => {
    if (!data) return []; const s = new Set(); Object.values(data.suppliers).forEach(x => s.add(x.name)); return [...s].sort();
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return { totalItems: 0, checkedItems: 0, checkedBudget: 0, setBudget: null };
    const items = Object.values(data.items); const sups = Object.values(data.suppliers); const ch = sups.filter(s => s.checked);
    return { totalItems: items.length, checkedItems: items.filter(i => i.checked).length, checkedBudget: ch.reduce((s, x) => s + (x.price||0), 0), setBudget: data.totalBudget };
  }, [data]);

  const matchesSearch = useCallback((t) => !search || t.toLowerCase().includes(search.toLowerCase()), [search]);

  const cheapestForOption = (optId) => {
    const o = data.options[optId]; if (!o) return null;
    const ss = (o.supplierIds||[]).map(sid => data.suppliers[sid]).filter(s => s && s.price != null);
    if (ss.length < 2) return null; return ss.reduce((m, s) => s.price < m.price ? s : m).id;
  };

  const setApiKey = () => {
    const current = loadLocalApiKey();
    setDialog({
      type: "input", title: "API Key", message: "Anthropic API key (voor AI aanbevelingen).\nLaat leeg om te wissen:",
      defaultValue: current || "",
      onConfirm: (key) => {
        saveLocalApiKey(key);
        if (user && !user.isAnonymous) saveSettings(user.uid, { apiKey: key.trim() || null });
        addToast(key.trim() ? "API key opgeslagen" : "API key verwijderd", "success");
      },
    });
  };

  // ─── AI Recommend / Suggest ───────────────────────────────
  const aiForItem = async (itemId) => {
    const apiKey = loadLocalApiKey();
    if (!apiKey) { setDialog({ type: "alert", title: "API Key nodig", message: "Stel eerst een Anthropic API key in via het acties menu (⋮)." }); return; }

    const item = data.items[itemId];
    const cat = data.categories.find(c => c.id === item.categoryId);
    const opts = (item.optionIds || []).map(oid => data.options[oid]).filter(Boolean);
    const hasOptions = opts.length >= 2;

    // Build context
    const optionDetails = opts.map(o => {
      const sups = (o.supplierIds || []).map(sid => data.suppliers[sid]).filter(Boolean);
      const prices = sups.filter(s => s.price != null).map(s => `${s.name}: €${s.price.toFixed(2)}`);
      return `- ${o.name}${prices.length ? ` (${prices.join(", ")})` : ""}`;
    }).join("\n");

    const noteCtx = item.note ? `\nNotities van de gebruiker: "${item.note}"` : "";

    let prompt;
    if (hasOptions) {
      prompt = `Je bent een ervaren outdoor/gear adviseur. Analyseer de volgende opties voor "${item.name}" (categorie: ${cat?.name || "onbekend"}) en kies de beste aanbeveling voor dit gebruik.${noteCtx}

Opties:
${optionDetails}

Antwoord in JSON: { "recommendedIndex": <0-based index>, "reason": "<korte reden in het Nederlands, max 15 woorden>" }
Alleen JSON, geen andere tekst.`;
    } else {
      prompt = `Je bent een ervaren outdoor/gear adviseur. Stel 3 goede opties voor voor "${item.name}" (categorie: ${cat?.name || "onbekend"}).${noteCtx}

Focus op opties met een goede prijs-kwaliteitverhouding die populair zijn onder kampeerders/hikers. Geef ook aan welke optie je het meest aanbeveelt.

Antwoord in JSON: { "suggestions": ["naam1", "naam2", "naam3"], "recommendedIndex": <0-based index van de beste>, "reason": "<korte reden in het Nederlands, max 15 woorden>" }
Alleen JSON, geen andere tekst.`;
    }

    setAiLoadingItems(s => new Set(s).add(itemId));

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey, "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) { addToast(`API fout (${response.status})`, "error"); return; }

      const result = await response.json();
      const text = (result.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
      const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/,"").trim();
      const parsed = JSON.parse(jsonStr);

      const freshData = dataRef.current;

      if (hasOptions) {
        const recOpt = opts[parsed.recommendedIndex];
        if (recOpt) {
          persist({ ...freshData, items: { ...freshData.items, [itemId]: { ...freshData.items[itemId], recommended: { optionId: recOpt.id, reason: parsed.reason } } } });
          addToast(`"${recOpt.name}" aanbevolen`, "success");
        }
      } else {
        let newData = { ...freshData };
        const newIds = [];
        for (const name of (parsed.suggestions || [])) {
          const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
          newIds.push(id);
          newData = {
            ...newData,
            options: { ...newData.options, [id]: { id, name, itemId, checked: false, supplierIds: [] } },
          };
        }
        const recId = newIds[parsed.recommendedIndex] || newIds[0];
        const recReason = parsed.reason || "Beste keuze";
        newData = { ...newData, items: { ...newData.items, [itemId]: { ...newData.items[itemId], optionIds: [...(newData.items[itemId].optionIds || []), ...newIds], recommended: { optionId: recId, reason: recReason } } } };
        persist(newData);
        const recName = parsed.suggestions?.[parsed.recommendedIndex] || parsed.suggestions?.[0];
        addToast(`${parsed.suggestions?.length || 0} opties voorgesteld — "${recName}" aanbevolen`, "success");
      }
    } catch (e) {
      console.error("AI error:", e);
      addToast("AI fout — probeer opnieuw", "error");
    } finally {
      setAiLoadingItems(s => { const n = new Set(s); n.delete(itemId); return n; });
    }
  };

  const exportData = () => { const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); const a = document.createElement("a"); a.href=URL.createObjectURL(b); a.download="gear-checklist.json"; a.click(); };
  const importData = () => { const i = document.createElement("input"); i.type="file"; i.accept=".json"; i.onchange=async(e)=>{ const f=e.target.files[0]; if(!f) return; try{const d=JSON.parse(await f.text()); if(d.categories&&d.items){ persist(d); addToast("Data geïmporteerd", "success"); }else{ addToast("Ongeldig bestand", "error"); }}catch{ addToast("Ongeldig bestand", "error"); }}; i.click(); };
  const resetData = () => {
    setDialog({ type:"confirm", title:"Data wissen", message:"Alle data wissen? Dit kan niet ongedaan worden.", onConfirm: () => { persist({ ...DEFAULT_DATA }); addToast("Data gewist", "success"); } });
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", padding:"24px 12px", maxWidth:800, margin:"0 auto", fontFamily:"var(--font)" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
        .skel{background:linear-gradient(90deg,var(--bg-card) 25%,#252830 50%,var(--bg-card) 75%);background-size:400px 100%;animation:shimmer 1.5s infinite;border-radius:8px}
      `}</style>
      <div className="skel" style={{ height:28, width:180, marginBottom:16 }} />
      <div className="skel" style={{ height:44, marginBottom:16 }} />
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[1,2,3].map(i => <div key={i} className="skel" style={{ height:80 }} />)}
      </div>
    </div>
  );

  // ─── Supplier Row (2-line on mobile) ───────────────────────
  const SupRow = ({ sup, cheapId }) => (
    <div className="supplier-row" style={{ opacity: sup.checked ? 0.6 : 1 }}>
      <div className="supplier-main">
        <Checkbox checked={sup.checked} onChange={() => checkSupplier(sup.id)} size={16} color="var(--success)" />
        <InlineEdit value={sup.name} onSave={n => updateSupplier(sup.id, { name: n })}
          style={{ fontSize: 12, flex: 1, color: sup.checked ? undefined : "var(--text-muted)", textDecoration: sup.checked ? "line-through" : "none", minWidth: 0 }} />
        {sup.id === cheapId && <span className="cheap-badge">GOEDKOOPST</span>}
        <PriceInput value={sup.price} onChange={p => updateSupplier(sup.id, { price: p })} />
        <UrlDisplay url={sup.url} onEdit={u => updateSupplier(sup.id, { url: u })} />
        <DeleteBtn onDelete={() => deleteSupplier(sup.id)} size={13} />
      </div>
    </div>
  );

  // ─── CATEGORY VIEW ─────────────────────────────────────────
  const renderCategoryView = () => (
    <div className="view-list">
      {data.categories.filter(c => {
        if (!search) return true; if (matchesSearch(c.name)) return true;
        return (c.itemIds||[]).some(iid => {
          const i = data.items[iid]; if (!i) return false;
          if (matchesSearch(i.name)) return true;
          return (i.optionIds||[]).some(oid => {
            const o = data.options[oid]; if (!o) return false;
            if (matchesSearch(o.name)) return true;
            return (o.supplierIds||[]).some(sid => { const s = data.suppliers[sid]; return s && matchesSearch(s.name); });
          });
        });
      }).map(cat => {
        const items = (cat.itemIds||[]).map(iid => data.items[iid]).filter(Boolean);
        const isC = collapsed[cat.id];
        return (
          <div key={cat.id} className="card">
            <div className="cat-header" role="button" aria-expanded={!isC} onClick={() => toggle(cat.id)}>
              <div className="cat-top">
                <Icon name={isC?"chevronRight":"chevronDown"} size={16} />
                <Icon name="grid" size={16} className="cat-icon" />
                <InlineEdit value={cat.name} onSave={n => updateCategory(cat.id,{name:n})} style={{ fontWeight:700, fontSize:15, flex:1, minWidth:0 }} />
                <DeleteBtn onDelete={() => deleteCategory(cat.id)} />
              </div>
            </div>
            {!isC && (
              <div className="cat-body">
                {items.filter(it => {
                  if (!search) return true; if (matchesSearch(it.name)) return true;
                  return (it.optionIds||[]).some(oid => {
                    const o = data.options[oid]; if (!o) return false;
                    if (matchesSearch(o.name)) return true;
                    return (o.supplierIds||[]).some(sid => { const s = data.suppliers[sid]; return s && matchesSearch(s.name); });
                  });
                }).map(item => {
                  const opts = (item.optionIds||[]).map(oid => data.options[oid]).filter(Boolean);
                  const isIC = collapsed[item.id];
                  return (
                    <div key={item.id} className="item-card">
                      <div className="item-header">
                        <Checkbox checked={item.checked} onChange={() => checkItem(item.id)} />
                        <div style={{ cursor:"pointer", display:"flex", alignItems:"center", padding:4 }} role="button" aria-expanded={!isIC} aria-label={isIC?"Uitklappen":"Inklappen"} onClick={() => toggle(item.id)}>
                          <Icon name={isIC?"chevronRight":"chevronDown"} size={14} />
                        </div>
                        <InlineEdit value={item.name} onSave={n => updateItem(item.id,{name:n})}
                          style={{ fontWeight:600, fontSize:14, flex:1, textDecoration: item.checked?"line-through":"none", opacity: item.checked?0.5:1, minWidth:0 }} />
                        <NoteEditor note={item.note} onSave={n => updateItem(item.id,{note:n})} />
                        <button onClick={(e) => { e.stopPropagation(); aiForItem(item.id); }} disabled={aiLoadingItems.has(item.id)}
                          aria-label={opts.length >= 2 ? "AI aanbeveling" : "AI opties voorstellen"}
                          title={opts.length >= 2 ? "AI: beste optie aanbevelen" : "AI: opties voorstellen"}
                          className="ai-item-btn">
                          {aiLoadingItems.has(item.id) ? <span className="spinner" /> : <Icon name="sparkle" size={14} />}
                        </button>
                        {isIC && (() => {
                          const cheapest = opts.reduce((min, o) => {
                            (o.supplierIds||[]).forEach(sid => { const s = data.suppliers[sid]; if (s?.price != null && (min===null||s.price<min)) min = s.price; });
                            return min;
                          }, null);
                          return <span className="meta-count" style={{ display:"flex", gap:6, alignItems:"center" }}>
                            {opts.length} optie{opts.length!==1?"s":""}
                            {cheapest != null && <span style={{ color:"var(--success)", fontWeight:600 }}>€{cheapest.toFixed(2)}</span>}
                          </span>;
                        })()}
                        {!isIC && <span className="hide-mobile meta-count">{opts.length} optie{opts.length!==1?"s":""}</span>}
                        <DeleteBtn onDelete={() => deleteItem(item.id)} />
                      </div>
                      {!isIC && (
                        <div className="item-body">
                          {opts.map(opt => {
                            const sups = (opt.supplierIds||[]).map(sid => data.suppliers[sid]).filter(Boolean);
                            const cheapId = cheapestForOption(opt.id);
                            const isOC = collapsed[opt.id];
                            return (
                              <div key={opt.id} className="option-card">
                                <div className="option-header">
                                  <Checkbox checked={opt.checked} onChange={() => checkOption(opt.id)} size={16} color="var(--accent-alt)" />
                                  <div style={{ cursor:"pointer", display:"flex", alignItems:"center", padding:4 }} role="button" aria-expanded={!isOC} aria-label={isOC?"Uitklappen":"Inklappen"} onClick={() => toggle(opt.id)}>
                                    <Icon name={isOC?"chevronRight":"chevronDown"} size={12} />
                                  </div>
                                  <InlineEdit value={opt.name} onSave={n => updateOption(opt.id,{name:n})}
                                    style={{ fontSize:13, fontWeight:500, flex:1, textDecoration: opt.checked?"line-through":"none", opacity: opt.checked?0.5:0.9, minWidth:0 }} />
                                  {item.recommended?.optionId === opt.id && (
                                    <span className="rec-badge" title={item.recommended.reason}>AANBEVOLEN</span>
                                  )}
                                  {isOC && (() => {
                                    const cheapest = sups.reduce((min, s) => s.price != null && (min===null||s.price<min) ? s.price : min, null);
                                    return <span className="meta-count" style={{ display:"flex", gap:6, alignItems:"center" }}>
                                      {sups.length} aanb.
                                      {cheapest != null && <span style={{ color:"var(--success)", fontWeight:600 }}>€{cheapest.toFixed(2)}</span>}
                                    </span>;
                                  })()}
                                  {!isOC && <span className="hide-mobile meta-count">{sups.length} aanb.</span>}
                                  <DeleteBtn onDelete={() => deleteOption(opt.id)} size={12} />
                                </div>
                                {!isOC && (
                                  <div className="option-body">
                                    {sups.map(s => <SupRow key={s.id} sup={s} cheapId={cheapId} />)}
                                    <AddInput onAdd={n => addSupplier(opt.id,n)} placeholder="Aanbieder..." compact />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <AddInput onAdd={n => addOption(item.id,n)} placeholder="Optie..." compact />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ marginTop: 12 }}>
                  <AddInput onAdd={n => addItem(cat.id,n)} placeholder="Voorwerp..." compact />
                </div>
              </div>
            )}
          </div>
        );
      })}
      <AddInput onAdd={addCategory} placeholder="Nieuwe categorie..." />
    </div>
  );

  // ─── ITEM VIEW ─────────────────────────────────────────────
  const renderItemView = () => {
    const all = Object.values(data.items).filter(i => {
      if (matchesSearch(i.name)) return true;
      return (i.optionIds||[]).some(oid => {
        const o = data.options[oid]; if (!o) return false;
        if (matchesSearch(o.name)) return true;
        return (o.supplierIds||[]).some(sid => { const s = data.suppliers[sid]; return s && matchesSearch(s.name); });
      });
    }).sort((a,b) => a.name.localeCompare(b.name));
    return (
      <div className="view-list">
        {all.map(item => {
          const cat = data.categories.find(c => c.id === item.categoryId);
          const cheapest = (item.optionIds||[]).reduce((min, oid) => {
            const o = data.options[oid]; if (!o) return min;
            (o.supplierIds||[]).forEach(sid => { const s = data.suppliers[sid]; if (s?.price != null && (min===null||s.price<min)) min = s.price; });
            return min;
          }, null);
          return (
            <div key={item.id} className="item-list-row">
              <Checkbox checked={item.checked} onChange={() => checkItem(item.id)} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14, textDecoration: item.checked?"line-through":"none", opacity: item.checked?0.5:1, wordBreak:"break-word" }}>{item.name}</div>
                <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>{cat?cat.name:"—"}</div>
              </div>
              {cheapest!=null && <span style={{ fontSize:13, color:"var(--success)", fontWeight:600, whiteSpace:"nowrap" }}>v.a. {formatPrice(cheapest)}</span>}
            </div>
          );
        })}
        {all.length===0 && <div className="empty">Geen voorwerpen gevonden</div>}
      </div>
    );
  };

  // ─── SUPPLIER VIEW ─────────────────────────────────────────
  const renderSupplierView = () => {
    const grouped = {}; Object.values(data.suppliers).forEach(s => { if (!grouped[s.name]) grouped[s.name]=[]; grouped[s.name].push(s); });
    const names = Object.keys(grouped).sort().filter(n => !supplierFilter || n===supplierFilter);
    return (
      <div className="view-list">
        {allSupplierNames.length>0 && (
          <div className="chip-row">
            <button onClick={() => setSupplierFilter(null)} className={`chip ${!supplierFilter?"chip-active":""}`}>Alle</button>
            {allSupplierNames.map(n => <button key={n} onClick={() => setSupplierFilter(supplierFilter===n?null:n)} className={`chip ${supplierFilter===n?"chip-active":""}`}>{n}</button>)}
          </div>
        )}
        {names.map(name => {
          const sups = grouped[name]; const total = sups.reduce((s,x) => s+(x.price||0),0);
          return (
            <div key={name} className="card">
              <div className="sup-card-header">
                <Icon name="store" size={16} />
                <span style={{ fontWeight:700, fontSize:15, flex:1, minWidth:0 }}>{name}</span>
                <span className="sup-summary">{sups.length} item{sups.length!==1?"s":""} · {formatPrice(total)}</span>
              </div>
              <div className="sup-card-body">
                {sups.map(sup => {
                  const o = data.options[sup.optionId]; const it = o?data.items[o.itemId]:null; const cat = it?data.categories.find(c=>c.id===it.categoryId):null;
                  return (
                    <div key={sup.id} className="sup-view-row">
                      <Checkbox checked={sup.checked} onChange={() => checkSupplier(sup.id)} size={16} color="var(--success)" />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, textDecoration: sup.checked?"line-through":"none", wordBreak:"break-word" }}>
                          {it?it.name:"?"} <span style={{ fontWeight:400, color:"var(--text-muted)" }}>— {o?o.name:"?"}</span>
                        </div>
                        <div style={{ fontSize:11, color:"var(--text-muted)" }}>{cat?cat.name:"—"}</div>
                      </div>
                      <span style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap" }}>{formatPrice(sup.price)}</span>
                      {sup.url && <a href={sup.url.startsWith("http")?sup.url:`https://${sup.url}`} target="_blank" rel="noopener noreferrer" style={{ color:"var(--accent)", padding:6 }}><Icon name="link" size={14} /></a>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {names.length===0 && <div className="empty">Geen aanbieders gevonden</div>}
      </div>
    );
  };

  // ─── BUDGET VIEW ───────────────────────────────────────────
  const renderBudgetView = () => {
    const over = stats.setBudget!=null && stats.checkedBudget>stats.setBudget;
    return (
      <div className="view-list">
        <div className="card" style={{ padding:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
            <span className="section-label">Totaalbudget</span>
            <BudgetField value={data.totalBudget} onChange={v => persist({...data,totalBudget:v})} placeholder="Stel in..." />
          </div>
          <div className="budget-grid">
            <div className="budget-cell"><div className="budget-label">Geselecteerd</div><div className="budget-value" style={{ color: over?"var(--danger)":"var(--success)" }}>{formatPrice(stats.checkedBudget)}</div></div>
            <div className="budget-cell"><div className="budget-label">Budget</div><div className="budget-value">{stats.setBudget!=null?formatPrice(stats.setBudget):"—"}</div></div>
            <div className="budget-cell"><div className="budget-label">Resterend</div><div className="budget-value" style={{ color: over?"var(--danger)":"var(--text-muted)" }}>{stats.setBudget!=null?formatPrice(stats.setBudget-stats.checkedBudget):"—"}</div></div>
          </div>
          {stats.setBudget!=null && <div style={{ marginTop:12 }}><BudgetBar spent={stats.checkedBudget} budget={stats.setBudget} /></div>}
        </div>

        {data.categories.map(cat => {
          const its = (cat.itemIds||[]).map(iid => data.items[iid]).filter(Boolean);
          let catTotal=0, catChecked=0;
          its.forEach(it => { (it.optionIds||[]).forEach(oid => { const o=data.options[oid]; if(o)(o.supplierIds||[]).forEach(sid => { const s=data.suppliers[sid]; if(s?.price){catTotal+=s.price; if(s.checked) catChecked+=s.price;}}); }); });
          const cb=cat.budget, ov=cb!=null&&catChecked>cb;
          return (
            <div key={cat.id} className="card" style={{ padding:"12px 14px", borderColor: ov?"var(--danger)":undefined }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontWeight:700, fontSize:14, flex:1, minWidth:0, wordBreak:"break-word" }}>{cat.name}</span>
                <BudgetField value={cb} onChange={v => updateCategory(cat.id,{budget:v})} placeholder="Budget..." compact />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:13, fontWeight:600 }}>
                  <span style={{ color: ov?"var(--danger)":"var(--success)" }}>{formatPrice(catChecked)}</span>
                  {cb!=null && <span style={{ color:"var(--text-muted)" }}> / {formatPrice(cb)}</span>}
                  {cb==null && <span style={{ color:"var(--text-muted)" }}> geselecteerd</span>}
                </span>
                <span style={{ fontSize:11, color:"var(--text-muted)" }}>(totaal: {formatPrice(catTotal)})</span>
              </div>
              <div style={{ marginTop:6 }}>{cb!=null?<BudgetBar spent={catChecked} budget={cb} />:<ProgressBar done={catChecked} total={catTotal||1} height={6} />}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const views = { category: renderCategoryView, item: renderItemView, supplier: renderSupplierView, budget: renderBudgetView };

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        :root {
          --bg:#111318; --bg-card:#1a1d24; --bg-nested:#15171d; --bg-input:#0e1016;
          --border:#2a2e38; --border-light:#22252e;
          --text:#e8eaf0; --text-muted:#6b7280;
          --accent:#3b82f6; --accent-alt:#8b5cf6;
          --success:#4ade80; --danger:#ef4444;
          --font:'DM Sans','Segoe UI',system-ui,sans-serif;
        }
        *{box-sizing:border-box;margin:0;padding:0}
        input::placeholder,textarea::placeholder{color:var(--text-muted)}
        .check-icon{color:#fff} .cat-icon{color:var(--accent)}
        button:active{transform:scale(0.97)} a{text-decoration:none}

        .app-root{min-height:100vh;background:var(--bg);color:var(--text);font-family:var(--font);padding:env(safe-area-inset-top,20px) 16px 80px;max-width:800px;margin:0 auto}
        .view-list{display:flex;flex-direction:column;gap:16px}
        .card{background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden}
        .empty{color:var(--text-muted);text-align:center;padding:32px}

        .cat-header{cursor:pointer;user-select:none;padding:14px 16px}
        .cat-top{display:flex;align-items:center;gap:8px}
        .cat-body{padding:4px 16px 18px}

        .item-card{margin-top:12px;padding:14px 16px;background:var(--bg-nested);border-radius:10px;border:1px solid var(--border-light);border-left:3px solid var(--accent)}
        .item-header{display:flex;align-items:center;gap:8px;flex-wrap:nowrap}
        .item-body{margin-top:14px;padding-left:16px;display:flex;flex-direction:column;gap:12px}

        .option-card{padding:12px 14px;background:rgba(139,92,246,0.06);border-radius:8px;border:1px solid var(--border-light);border-left:3px solid var(--accent-alt)}
        .option-header{display:flex;align-items:center;gap:8px}
        .option-body{margin-top:12px;padding-left:12px;display:flex;flex-direction:column;gap:10px}

        .supplier-row{padding:8px 10px;border-left:3px solid var(--success);background:rgba(74,222,128,0.06);border-radius:6px}
        .supplier-row+.supplier-row{margin-top:6px}
        .supplier-main{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .cheap-badge{font-size:10px;color:var(--success);font-weight:700;padding:2px 6px;background:rgba(76,175,80,0.15);border-radius:4px;white-space:nowrap}

        .meta-count{font-size:11px;color:var(--text-muted);white-space:nowrap}

        .item-list-row{display:flex;align-items:center;gap:6px;padding:10px 10px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border)}
        .sup-view-row{display:flex;align-items:center;gap:6px;padding:8px 0;border-bottom:1px solid var(--border-light)}
        .sup-view-row:last-child{border-bottom:none}
        .sup-card-header{display:flex;align-items:center;gap:8px;padding:12px;border-bottom:1px solid var(--border-light);flex-wrap:wrap}
        .sup-card-body{padding:4px 12px 8px}
        .sup-summary{font-size:12px;color:var(--accent);font-weight:600;white-space:nowrap}

        .toolbar{display:flex;gap:6px;margin-bottom:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:2px}
        .toolbar::-webkit-scrollbar{display:none}
        .tab-btn{display:flex;align-items:center;gap:5px;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:13px;cursor:pointer;font-family:inherit;font-weight:500;white-space:nowrap;flex-shrink:0}
        .tab-btn.active{border-color:var(--accent);background:rgba(59,130,246,0.15);color:var(--accent);font-weight:700}

        .action-row{display:flex;gap:6px;margin-bottom:12px;justify-content:flex-end;flex-wrap:wrap}
        .action-btn{background:none;border:1px solid var(--border);border-radius:8px;color:var(--text-muted);cursor:pointer;padding:8px 12px;display:flex;align-items:center;gap:5px;font-size:12px;font-family:inherit}
        .action-btn.danger{color:var(--danger)}

        .search-wrap{position:relative;margin-bottom:12px}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none}
        .search-input{width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px 12px 12px 38px;color:var(--text);outline:none;font-size:14px;font-family:inherit}

        .add-trigger{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1px dashed var(--border);background:none;color:var(--text-muted);cursor:pointer;font-size:12px;font-family:inherit;font-weight:500;transition:all 0.15s;width:100%}
        .add-trigger:hover{border-color:var(--accent);color:var(--accent);background:rgba(59,130,246,0.06)}
        .add-popover{display:flex;gap:6px;align-items:center;animation:fadeIn 0.15s ease}

        .chip-row{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;scrollbar-width:none}
        .chip-row::-webkit-scrollbar{display:none}
        .chip{padding:8px 14px;border-radius:20px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0}
        .chip-active{background:var(--accent);color:#fff;border-color:var(--accent)}

        .budget-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
        .budget-cell{text-align:center}
        .budget-label{font-size:11px;color:var(--text-muted)}
        .budget-value{font-size:22px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums;color:var(--text)}
        .section-label{font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;font-weight:600}

        .note-popup{width:260px;right:0}

        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(59,130,246,0.3);border-top-color:var(--accent);border-radius:50%;animation:spin 0.6s linear infinite;flex-shrink:0}

        /* ─ Sync ─ */
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .sync-dot-pulse{animation:pulse 1.5s ease-in-out infinite}
        .account-panel{padding:10px 12px;background:var(--bg-nested);border:1px solid var(--border-light);border-radius:10px;margin-top:8px}
        .account-form{display:flex;flex-direction:column;gap:8px}
        .account-input{background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);outline:none;font-size:13px;font-family:inherit;transition:border-color 0.15s}
        .account-input:focus{border-color:var(--accent)}
        .account-btn{border:none;border-radius:8px;padding:10px 0;font-size:13px;cursor:pointer;font-family:inherit;font-weight:600;transition:opacity 0.15s}
        .account-btn:disabled{opacity:0.5;cursor:wait}
        .account-btn-primary{background:var(--accent);color:#fff}
        .account-btn-secondary{background:var(--bg-input);border:1px solid var(--border);color:var(--text)}
        .conflict-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.2s ease}
        .conflict-card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:24px;max-width:380px;width:100%;animation:slideUp 0.25s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

        /* ─ AI ─ */
        .ai-item-btn{background:none;border:1px solid var(--border);border-radius:6px;color:var(--accent);cursor:pointer;padding:4px 6px;display:flex;align-items:center;justify-content:center;min-width:30px;min-height:30px;flex-shrink:0;transition:all 0.15s}
        .ai-item-btn:hover{background:rgba(59,130,246,0.1);border-color:var(--accent)}
        .ai-item-btn:disabled{opacity:0.5;cursor:wait}
        .rec-badge{font-size:10px;color:var(--accent-alt);font-weight:700;padding:2px 6px;background:rgba(139,92,246,0.15);border-radius:4px;white-space:nowrap;flex-shrink:0}

        /* ─ Inline Edit ─ */
        .inline-editable:hover{border-bottom-color:var(--border)!important}

        /* ─ Toast ─ */
        .toast-container{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:1100;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:360px;width:calc(100% - 32px)}
        .toast{pointer-events:auto;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:500;font-family:var(--font);animation:slideUp 0.25s ease;box-shadow:0 8px 24px rgba(0,0,0,0.4)}
        .toast-info{background:var(--bg-card);border:1px solid var(--border);color:var(--text)}
        .toast-success{background:rgba(74,222,128,0.15);border:1px solid var(--success);color:var(--success)}
        .toast-error{background:rgba(239,68,68,0.15);border:1px solid var(--danger);color:var(--danger)}

        /* ─ Accessibility ─ */
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
        :focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        input:focus:not(:focus-visible),textarea:focus:not(:focus-visible),button:focus:not(:focus-visible){outline:none}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}

        /* ─── DESKTOP ─── */
        @media(min-width:640px){
          .app-root{padding:28px 24px 60px}
          .cat-header{padding:16px 20px}
          .cat-body{padding:4px 20px 20px}

          .item-card{padding:16px 20px}
          .item-body{padding-left:20px;gap:12px}
          .option-card{padding:14px 16px}
          .option-body{padding-left:16px;gap:10px}
          .supplier-row{padding:10px 12px}
          .supplier-meta{padding-left:48px}
          .budget-value{font-size:26px}
          .item-header{gap:10px}
          .option-header{gap:10px}
          .supplier-main{gap:10px}
        }

        /* ─── MOBILE ─── */
        @media(max-width:480px){
          .hide-mobile{display:none!important}
          .add-label{display:none}
          .item-card{padding:10px 12px}
          .item-body{padding-left:8px}
          .option-card{padding:10px 12px}
          .option-body{padding-left:6px}
          .supplier-meta{padding-left:40px}
          .budget-grid{grid-template-columns:1fr 1fr 1fr;gap:4px}
          .budget-value{font-size:18px}
          .note-popup{width:calc(100vw - 48px);right:-20px}
          .tab-btn{padding:10px 12px;font-size:12px}
          .sup-card-header{padding:10px}
          .sup-card-body{padding:4px 10px 8px}
        }

        /* ─── VERY SMALL ─── */
        @media(max-width:360px){
          .budget-grid{grid-template-columns:1fr;gap:10px}
          .budget-value{font-size:20px}
          .note-popup{width:calc(100vw - 32px);right:-10px}
        }
      `}</style>

      {/* Conflict Dialog */}
      {conflictData && (
        <div className="conflict-overlay">
          <div className="conflict-card">
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
              <Icon name="refresh" size={20} className="cat-icon" />
              <h3 style={{ fontSize:16,fontWeight:700 }}>Sync conflict</h3>
            </div>
            <p style={{ fontSize:13,color:"var(--text-muted)",marginBottom:8,lineHeight:1.6 }}>
              Er zijn verschillende gegevens gevonden op dit apparaat en in de cloud.
            </p>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16 }}>
              <div style={{ background:"var(--bg-nested)",borderRadius:8,padding:10,border:"1px solid var(--border-light)" }}>
                <div style={{ fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4,fontWeight:600 }}>Dit apparaat</div>
                <div style={{ fontSize:13,fontWeight:600 }}>{conflictData.local.categories?.length || 0} categorieën</div>
                <div style={{ fontSize:11,color:"var(--text-muted)" }}>{Object.keys(conflictData.local.items || {}).length} voorwerpen</div>
              </div>
              <div style={{ background:"var(--bg-nested)",borderRadius:8,padding:10,border:"1px solid var(--border-light)" }}>
                <div style={{ fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4,fontWeight:600 }}>Cloud</div>
                <div style={{ fontSize:13,fontWeight:600 }}>{conflictData.remote.categories?.length || 0} categorieën</div>
                <div style={{ fontSize:11,color:"var(--text-muted)" }}>{Object.keys(conflictData.remote.items || {}).length} voorwerpen</div>
              </div>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={() => resolveConflict("local")} className="account-btn account-btn-secondary" style={{ flex:1 }}>
                Lokaal behouden
              </button>
              <button onClick={() => resolveConflict("remote")} className="account-btn account-btn-primary" style={{ flex:1 }}>
                Cloud gebruiken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Dialog */}
      {dialog && (() => {
        const DialogInput = () => {
          const [val, setVal] = useState(dialog.defaultValue || "");
          return <>
            <input autoFocus value={val} onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { dialog.onConfirm?.(val); setDialog(null); } if (e.key === "Escape") setDialog(null); }}
              className="account-input" style={{ marginBottom: 12, width: "100%" }} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setDialog(null)} className="account-btn account-btn-secondary" style={{ flex:1 }}>Annuleren</button>
              <button onClick={() => { dialog.onConfirm?.(val); setDialog(null); }} className="account-btn account-btn-primary" style={{ flex:1 }}>OK</button>
            </div>
          </>;
        };
        return (
          <div className="conflict-overlay" onClick={() => setDialog(null)}>
            <div className="conflict-card" onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>{dialog.title}</h3>
              {dialog.message && <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:12, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{dialog.message}</p>}
              {dialog.type === "confirm" && (
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => setDialog(null)} className="account-btn account-btn-secondary" style={{ flex:1 }}>Annuleren</button>
                  <button onClick={() => { dialog.onConfirm?.(); setDialog(null); }} className="account-btn account-btn-primary" style={{ flex:1, background:"var(--danger)" }}>Bevestigen</button>
                </div>
              )}
              {dialog.type === "input" && <DialogInput />}
              {dialog.type === "alert" && (
                <button onClick={() => setDialog(null)} className="account-btn account-btn-primary" style={{ width:"100%" }}>OK</button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div style={{ marginBottom:14, paddingTop: 4 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <h1 style={{ fontSize:21,fontWeight:800,letterSpacing:-0.5,display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ color:"var(--accent)" }}>⬡</span> Gear Checklist
            <SyncIndicator status={syncStatus} compact />
          </h1>
          <button aria-label="Acties menu" onClick={() => setShowActions(!showActions)} style={{ background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",padding:8,minWidth:40,minHeight:40,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Icon name="more" size={20} />
          </button>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginTop:4,flexWrap:"wrap",fontSize:13 }}>
          <span style={{ color:"var(--text-muted)" }}>{stats.checkedItems}/{stats.totalItems} voorwerpen</span>
          <span style={{ color:"var(--success)",fontWeight:600 }}>{formatPrice(stats.checkedBudget)}</span>
          {stats.setBudget!=null && (
            <span style={{ color: stats.checkedBudget>stats.setBudget?"var(--danger)":"var(--text-muted)", fontWeight:600 }}>
              {stats.checkedBudget>stats.setBudget?"⚠ ":""}rest: {formatPrice(stats.setBudget-stats.checkedBudget)}
            </span>
          )}
          {lastSyncedAt && (
            <span style={{ color:"var(--text-muted)", fontSize:11, marginLeft:"auto" }} title={lastSyncedAt.toLocaleTimeString()}>
              Sync: {lastSyncedAt.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
            </span>
          )}
        </div>
      </div>

      {showActions && (
        <div style={{ marginBottom: 12 }}>
          <div className="action-row" style={{ marginBottom: 0 }}>
            <button onClick={exportData} className="action-btn"><Icon name="download" size={14} /> Export</button>
            <button onClick={importData} className="action-btn"><Icon name="upload" size={14} /> Import</button>
            <button onClick={setApiKey} className="action-btn"><Icon name="sparkle" size={14} /> API Key</button>
            <button onClick={resetData} className="action-btn danger"><Icon name="reset" size={14} /> Wissen</button>
          </div>
          <AccountPanel user={user} syncStatus={syncStatus}
            onSignIn={handleSignIn} onRegister={handleRegister} onLink={handleLink} onSignOut={handleSignOut} />
        </div>
      )}

      <div className="toolbar">
        {[{id:"category",icon:"grid",label:"Categorieën"},{id:"item",icon:"list",label:"Items"},{id:"supplier",icon:"store",label:"Aanbieders"},{id:"budget",icon:"euro",label:"Budget"}].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} className={`tab-btn ${view===v.id?"active":""}`}>
            <Icon name={v.icon} size={14} /> {v.label}
          </button>
        ))}
      </div>

      {view!=="budget" && (
        <div className="search-wrap">
          <div className="search-icon"><Icon name="search" size={16} /></div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoeken..." className="search-input" />
        </div>
      )}

      {views[view]()}

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="toast-container" role="status" aria-live="polite">
          {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
            <span>{t.message}</span>
            {t.undo && <button onClick={handleUndo} style={{ background:"none", border:"1px solid var(--accent)", borderRadius:6, color:"var(--accent)", padding:"4px 10px", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600, whiteSpace:"nowrap" }}>Ongedaan maken</button>}
          </div>)}
        </div>
      )}
    </div>
  );
}
