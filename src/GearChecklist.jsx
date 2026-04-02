import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const STORAGE_KEY = "gear-checklist-data";
const generateId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_DATA = {
  categories: [],
  items: {},
  options: {},
  suppliers: {},
  totalBudget: null,
};

async function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch (e) { console.error("Storage save failed:", e); }
}

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
      style={{ flexShrink: 0 }}>{paths[name]}</svg>
  );
};

// ─── Checkbox (44px touch target) ──────────────────────────────
const Checkbox = ({ checked, onChange, size = 20, color = "var(--accent)" }) => (
  <button onClick={(e) => { e.stopPropagation(); onChange(); }} style={{
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
    <span onClick={handleClick} style={{ ...s, cursor: "default", wordBreak: "break-word" }} title="Dubbeltik om te bewerken">
      {value}
    </span>
  );
};

// ─── Add Input ─────────────────────────────────────────────────
const AddInput = ({ onAdd, placeholder, compact = false }) => {
  const [value, setValue] = useState("");
  const submit = () => { if (value.trim()) { onAdd(value.trim()); setValue(""); } };
  return (
    <div className="add-input">
      <input value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder={placeholder}
        style={{
          flex: 1, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8,
          padding: compact ? "8px 10px" : "10px 12px", color: "var(--text)", outline: "none",
          fontSize: compact ? 13 : 14, fontFamily: "inherit", minWidth: 0,
        }} />
      <button onClick={submit} className="add-btn" style={{
        background: "var(--accent)", border: "none", borderRadius: 8, color: "#fff",
        padding: compact ? "8px 12px" : "10px 14px", cursor: "pointer", display: "flex",
        alignItems: "center", gap: 4, fontSize: compact ? 13 : 14, fontFamily: "inherit", fontWeight: 600,
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
        <Icon name="plus" size={16} />
        <span className="add-label">Toevoegen</span>
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
      }} title={note || "Notitie toevoegen"}>
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

// ─── AI Description ────────────────────────────────────────────
const AiDescription = ({ description, onSave, context }) => {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const instruction = `Je bent een behulpzame assistent die beknopte, informatieve beschrijvingen geeft voor uitrustings- en gearitems. Schrijf in het Nederlands. Wees praktisch en direct. Focus op:
- Wat het is en waarvoor het dient
- Waar je op moet letten bij aankoop (materiaal, gewicht, duurzaamheid, prijs/kwaliteit)
- Tips uit ervaring van kampeerders/tourers

${context.type === "option" ? "Dit is een specifiek product/merk. Beschrijf de eigenschappen, voor- en nadelen, en voor wie het geschikt is." : "Dit is een generiek voorwerp. Beschrijf het type product en de belangrijkste keuzes."}

Houd het op maximaal 3-4 zinnen. Geen opsommingstekens, gewoon lopende tekst.`;

      const detail = context.type === "option"
        ? `Categorie: ${context.category}\nVoorwerp: ${context.item}\nOptie/Product: ${context.name}`
        : `Categorie: ${context.category}\nVoorwerp: ${context.name}`;

      const apiKey = localStorage.getItem("gear-checklist-api-key");
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } : {}),
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: `${instruction}\n\n---\n\n${detail}` }],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error("API error:", response.status, errBody);
        setError(`API fout (${response.status})`);
        setLoading(false);
        return;
      }

      const result = await response.json();
      const text = (result.content || [])
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n")
        .trim();

      if (text) { onSave(text); setExpanded(true); }
      else { setError("Geen beschrijving gegenereerd"); console.error("Empty response:", result); }
    } catch (e) {
      setError("Netwerkfout — probeer opnieuw");
      console.error("Fetch error:", e);
    }
    setLoading(false);
  };

  if (description && !expanded) {
    return (
      <div className="ai-desc-bar" onClick={(e) => { e.stopPropagation(); setExpanded(true); }}>
        <Icon name="sparkle" size={12} className="ai-icon" />
        <span className="ai-desc-preview">{description.slice(0, 60)}...</span>
      </div>
    );
  }

  if (description && expanded) {
    return (
      <div className="ai-desc-full" onClick={e => e.stopPropagation()}>
        <div className="ai-desc-header">
          <Icon name="sparkle" size={13} className="ai-icon" />
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.5 }}>AI Beschrijving</span>
          <div style={{ flex: 1 }} />
          <button onClick={generate} disabled={loading} className="ai-action-btn" title="Opnieuw genereren">
            <Icon name="refresh" size={12} />
          </button>
          <button onClick={() => { onSave(null); setExpanded(false); }} className="ai-action-btn" title="Verwijderen">
            <Icon name="trash" size={12} />
          </button>
          <button onClick={() => setExpanded(false)} className="ai-action-btn" title="Inklappen">
            <Icon name="chevronDown" size={12} />
          </button>
        </div>
        <p className="ai-desc-text">{description}</p>
        {loading && <div className="ai-loading">Nieuwe beschrijving genereren...</div>}
      </div>
    );
  }

  // No description yet
  return (
    <div onClick={e => e.stopPropagation()}>
      <button onClick={generate} disabled={loading} className="ai-gen-btn">
        {loading ? (
          <><span className="ai-spinner" /> Beschrijving genereren...</>
        ) : (
          <><Icon name="sparkle" size={13} className="ai-icon" /> AI Beschrijving</>
        )}
      </button>
      {error && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>{error}</div>}
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
    <button onClick={(e) => { e.stopPropagation(); setConfirm(true); }} style={{
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
export default function GearChecklist() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("category");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [supplierFilter, setSupplierFilter] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const saveTimeout = useRef(null);

  useEffect(() => { loadData().then(d => { setData(d || { ...DEFAULT_DATA }); setLoading(false); }); }, []);

  const persist = useCallback((nd) => {
    setData(nd);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveData(nd), 300);
  }, []);

  // ─── CRUD ──────────────────────────────────────────────────
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
    persist({ ...data, categories: data.categories.filter(c => c.id !== id), items: ni, options: no, suppliers: ns });
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
    persist({ ...data, categories: data.categories.map(c => c.id === item.categoryId ? { ...c, itemIds: (c.itemIds||[]).filter(i => i !== id) } : c), items: ni, options: no, suppliers: ns });
  };
  const addOption = (itemId, name) => {
    const id = generateId();
    persist({ ...data, items: { ...data.items, [itemId]: { ...data.items[itemId], optionIds: [...(data.items[itemId].optionIds||[]), id] } }, options: { ...data.options, [id]: { id, name, itemId, checked: false, supplierIds: [] } } });
  };
  const updateOption = (id, u) => persist({ ...data, options: { ...data.options, [id]: { ...data.options[id], ...u } } });
  const deleteOption = (id) => {
    const o = data.options[id]; const ns = { ...data.suppliers }, no = { ...data.options };
    (o.supplierIds||[]).forEach(sid => delete ns[sid]); delete no[id];
    persist({ ...data, items: { ...data.items, [o.itemId]: { ...data.items[o.itemId], optionIds: (data.items[o.itemId].optionIds||[]).filter(x => x !== id) } }, options: no, suppliers: ns });
  };
  const addSupplier = (optId, name) => {
    const id = generateId();
    persist({ ...data, options: { ...data.options, [optId]: { ...data.options[optId], supplierIds: [...(data.options[optId].supplierIds||[]), id] } }, suppliers: { ...data.suppliers, [id]: { id, name, optionId: optId, price: null, url: null, checked: false } } });
  };
  const updateSupplier = (id, u) => persist({ ...data, suppliers: { ...data.suppliers, [id]: { ...data.suppliers[id], ...u } } });
  const deleteSupplier = (id) => {
    const s = data.suppliers[id]; const ns = { ...data.suppliers }; delete ns[id];
    persist({ ...data, options: { ...data.options, [s.optionId]: { ...data.options[s.optionId], supplierIds: (data.options[s.optionId].supplierIds||[]).filter(x => x !== id) } }, suppliers: ns });
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

  const exportData = () => { const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); const a = document.createElement("a"); a.href=URL.createObjectURL(b); a.download="gear-checklist.json"; a.click(); };
  const importData = () => { const i = document.createElement("input"); i.type="file"; i.accept=".json"; i.onchange=async(e)=>{ const f=e.target.files[0]; if(!f) return; try{const d=JSON.parse(await f.text()); if(d.categories&&d.items) persist(d);}catch{alert("Ongeldig bestand");}}; i.click(); };
  const resetData = () => { if (confirm("Alle data wissen?")) persist({ ...DEFAULT_DATA }); };
  const setApiKey = () => {
    const current = localStorage.getItem("gear-checklist-api-key") || "";
    const key = prompt("Anthropic API key (voor AI beschrijvingen).\nLaat leeg om te wissen:", current);
    if (key === null) return;
    if (key.trim()) localStorage.setItem("gear-checklist-api-key", key.trim());
    else localStorage.removeItem("gear-checklist-api-key");
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",color:"var(--text)",fontFamily:"var(--font)" }}>Laden...</div>;

  // ─── Supplier Row (2-line on mobile) ───────────────────────
  const SupRow = ({ sup, cheapId }) => (
    <div className="supplier-row" style={{ opacity: sup.checked ? 0.6 : 1 }}>
      <div className="supplier-main">
        <Checkbox checked={sup.checked} onChange={() => checkSupplier(sup.id)} size={16} color="var(--success)" />
        <InlineEdit value={sup.name} onSave={n => updateSupplier(sup.id, { name: n })}
          style={{ fontSize: 13, flex: 1, textDecoration: sup.checked ? "line-through" : "none", minWidth: 0 }} />
        <DeleteBtn onDelete={() => deleteSupplier(sup.id)} size={13} />
      </div>
      <div className="supplier-meta">
        {sup.id === cheapId && <span className="cheap-badge">GOEDKOOPST</span>}
        <PriceInput value={sup.price} onChange={p => updateSupplier(sup.id, { price: p })} />
        <UrlDisplay url={sup.url} onEdit={u => updateSupplier(sup.id, { url: u })} />
      </div>
    </div>
  );

  // ─── CATEGORY VIEW ─────────────────────────────────────────
  const renderCategoryView = () => (
    <div className="view-list">
      {data.categories.filter(c => {
        if (!search) return true; if (matchesSearch(c.name)) return true;
        return (c.itemIds||[]).some(iid => { const i = data.items[iid]; return i && matchesSearch(i.name); });
      }).map(cat => {
        const items = (cat.itemIds||[]).map(iid => data.items[iid]).filter(Boolean);
        const done = items.filter(i => i.checked).length;
        const isC = collapsed[cat.id];
        return (
          <div key={cat.id} className="card">
            <div className="cat-header" onClick={() => toggle(cat.id)}>
              <div className="cat-top">
                <Icon name={isC?"chevronRight":"chevronDown"} size={16} />
                <Icon name="grid" size={16} className="cat-icon" />
                <InlineEdit value={cat.name} onSave={n => updateCategory(cat.id,{name:n})} style={{ fontWeight:700, fontSize:15, flex:1, minWidth:0 }} />
                <DeleteBtn onDelete={() => deleteCategory(cat.id)} />
              </div>
              <div className="cat-progress"><ProgressBar done={done} total={items.length} /></div>
            </div>
            {!isC && (
              <div className="cat-body">
                {items.filter(it => !search || matchesSearch(it.name)).map(item => {
                  const opts = (item.optionIds||[]).map(oid => data.options[oid]).filter(Boolean);
                  const isIC = collapsed[item.id];
                  return (
                    <div key={item.id} className="item-card">
                      <div className="item-header">
                        <Checkbox checked={item.checked} onChange={() => checkItem(item.id)} />
                        <div style={{ cursor:"pointer", display:"flex", alignItems:"center", padding:4 }} onClick={() => toggle(item.id)}>
                          <Icon name={isIC?"chevronRight":"chevronDown"} size={14} />
                        </div>
                        <InlineEdit value={item.name} onSave={n => updateItem(item.id,{name:n})}
                          style={{ fontWeight:600, fontSize:14, flex:1, textDecoration: item.checked?"line-through":"none", opacity: item.checked?0.5:1, minWidth:0 }} />
                        <NoteEditor note={item.note} onSave={n => updateItem(item.id,{note:n})} />
                        <span className="hide-mobile meta-count">{opts.length} optie{opts.length!==1?"s":""}</span>
                        <DeleteBtn onDelete={() => deleteItem(item.id)} />
                      </div>
                      <AiDescription
                        description={item.aiDesc}
                        onSave={d => updateItem(item.id, { aiDesc: d })}
                        context={{ type: "item", category: cat.name, name: item.name }}
                      />
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
                                  <div style={{ cursor:"pointer", display:"flex", alignItems:"center", padding:4 }} onClick={() => toggle(opt.id)}>
                                    <Icon name={isOC?"chevronRight":"chevronDown"} size={12} />
                                  </div>
                                  <InlineEdit value={opt.name} onSave={n => updateOption(opt.id,{name:n})}
                                    style={{ fontSize:13, flex:1, textDecoration: opt.checked?"line-through":"none", opacity: opt.checked?0.5:1, minWidth:0 }} />
                                  <span className="hide-mobile meta-count">{sups.length} aanb.</span>
                                  <DeleteBtn onDelete={() => deleteOption(opt.id)} size={12} />
                                </div>
                                <AiDescription
                                  description={opt.aiDesc}
                                  onSave={d => updateOption(opt.id, { aiDesc: d })}
                                  context={{ type: "option", category: cat.name, item: item.name, name: opt.name }}
                                />
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
                <div style={{ marginTop: 6 }}>
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
    const all = Object.values(data.items).filter(i => matchesSearch(i.name)).sort((a,b) => a.name.localeCompare(b.name));
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

        .app-root{min-height:100vh;background:var(--bg);color:var(--text);font-family:var(--font);padding:env(safe-area-inset-top,16px) 12px 80px;max-width:800px;margin:0 auto}
        .view-list{display:flex;flex-direction:column;gap:10px}
        .card{background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden}
        .empty{color:var(--text-muted);text-align:center;padding:32px}

        .cat-header{cursor:pointer;user-select:none;padding:12px}
        .cat-top{display:flex;align-items:center;gap:6px}
        .cat-progress{margin-top:6px;padding-left:38px}
        .cat-body{padding:0 8px 10px}

        .item-card{margin-top:6px;padding:8px;background:var(--bg-nested);border-radius:8px;border:1px solid var(--border-light)}
        .item-header{display:flex;align-items:center;gap:2px;flex-wrap:nowrap}
        .item-body{margin-top:6px;padding-left:12px}

        .option-card{margin-top:4px;padding:6px 8px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-light)}
        .option-header{display:flex;align-items:center;gap:2px}
        .option-body{margin-top:4px;padding-left:8px}

        .supplier-row{padding:6px 0;border-bottom:1px solid var(--border-light)}
        .supplier-row:last-of-type{border-bottom:none}
        .supplier-main{display:flex;align-items:center;gap:2px}
        .supplier-meta{display:flex;align-items:center;gap:8px;margin-top:2px;padding-left:44px;flex-wrap:wrap}
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

        .add-input{display:flex;gap:6px;align-items:center}

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

        /* ─ AI Description ─ */
        .ai-desc-bar{display:flex;align-items:center;gap:6px;padding:4px 8px;margin-top:4px;cursor:pointer;border-radius:6px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.12);transition:background 0.15s}
        .ai-desc-bar:hover{background:rgba(59,130,246,0.1)}
        .ai-desc-preview{font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
        .ai-icon{color:var(--accent);flex-shrink:0}
        .ai-desc-full{margin-top:4px;padding:8px 10px;border-radius:8px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.12)}
        .ai-desc-header{display:flex;align-items:center;gap:6px;margin-bottom:6px}
        .ai-desc-text{font-size:12px;line-height:1.5;color:var(--text);margin:0;opacity:0.85}
        .ai-action-btn{background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;display:flex;align-items:center;border-radius:4px;min-width:28px;min-height:28px;justify-content:center}
        .ai-action-btn:hover{color:var(--accent);background:rgba(59,130,246,0.1)}
        .ai-gen-btn{display:flex;align-items:center;gap:6px;padding:6px 10px;margin-top:4px;background:rgba(59,130,246,0.08);border:1px dashed rgba(59,130,246,0.25);border-radius:6px;color:var(--accent);font-size:12px;cursor:pointer;font-family:inherit;font-weight:500;transition:all 0.15s}
        .ai-gen-btn:hover{background:rgba(59,130,246,0.15);border-color:var(--accent)}
        .ai-gen-btn:disabled{opacity:0.6;cursor:wait}
        .ai-loading{font-size:11px;color:var(--accent);margin-top:4px;opacity:0.7}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ai-spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(59,130,246,0.3);border-top-color:var(--accent);border-radius:50%;animation:spin 0.6s linear infinite;flex-shrink:0}

        /* ─── DESKTOP ─── */
        @media(min-width:640px){
          .app-root{padding:24px 20px 60px}
          .cat-body{padding:0 16px 12px}
          .cat-progress{padding-left:38px}
          .item-body{padding-left:24px}
          .option-body{padding-left:16px}
          .supplier-meta{padding-left:48px}
          .budget-value{font-size:26px}
          .item-header{gap:4px}
          .option-header{gap:4px}
          .supplier-main{gap:4px}
        }

        /* ─── MOBILE ─── */
        @media(max-width:480px){
          .hide-mobile{display:none!important}
          .add-label{display:none}
          .item-body{padding-left:4px}
          .option-body{padding-left:2px}
          .supplier-meta{padding-left:40px}
          .budget-grid{grid-template-columns:1fr 1fr 1fr;gap:4px}
          .budget-value{font-size:18px}
          .note-popup{width:calc(100vw - 48px);right:-20px}
          .cat-progress{padding-left:0}
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

      {/* Header */}
      <div style={{ marginBottom:14, paddingTop: 4 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <h1 style={{ fontSize:21,fontWeight:800,letterSpacing:-0.5 }}>
            <span style={{ color:"var(--accent)" }}>⬡</span> Gear Checklist
          </h1>
          <button onClick={() => setShowActions(!showActions)} style={{ background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",padding:8,minWidth:40,minHeight:40,display:"flex",alignItems:"center",justifyContent:"center" }}>
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
        </div>
      </div>

      {showActions && (
        <div className="action-row">
          <button onClick={exportData} className="action-btn"><Icon name="download" size={14} /> Export</button>
          <button onClick={importData} className="action-btn"><Icon name="upload" size={14} /> Import</button>
          <button onClick={resetData} className="action-btn danger"><Icon name="reset" size={14} /> Wissen</button>
          <button onClick={setApiKey} className="action-btn"><Icon name="sparkle" size={14} /> API Key</button>
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
    </div>
  );
}
