import { useState, useEffect, useMemo } from "react";

/*
 * ═══════════════════════════════════════════════════════════════
 *  INVENTORY SNAPSHOT — The Book Nest Ops Dashboard
 *  Route: /inventory (add to your Next.js pages or app directory)
 * ═══════════════════════════════════════════════════════════════
 *
 *  SETUP:
 *  1. Drop this file into your dashboard as a page component
 *  2. Update the Supabase import below to match your project's client
 *  3. Set DEMO_MODE to false
 *  4. That's it — queries bins, book_copies, and book_titles
 *
 *  TABLES USED:
 *  - bins (age_group, theme, current_count, capacity, is_active, display_name)
 *  - book_copies (bin_id, status, book_title_id, isbn, condition)
 *  - book_titles (id → title, author, isbn)
 */

// ──────────────────────────────────────────────
//  ⬇️  UPDATE THIS IMPORT to match your project
// ──────────────────────────────────────────────
// import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────────
//  DEMO MODE — set false once Supabase is wired
// ──────────────────────────────────────────────
const DEMO_MODE = false;

const DEMO_BINS = [
  { bin_code:"BN-HATCH-ADVENTURE-01", display_name:"HATCH-ADVENTURE-01", age_group:"hatchlings", theme:"adventure", current_count:14, capacity:50, is_active:true },
  { bin_code:"BN-HATCH-ADVENTURE-02", display_name:"HATCH-ADVENTURE-02", age_group:"hatchlings", theme:"adventure", current_count:8, capacity:50, is_active:true },
  { bin_code:"BN-HATCH-HUMOR-01", display_name:"HATCH-HUMOR-01", age_group:"hatchlings", theme:"humor", current_count:22, capacity:50, is_active:true },
  { bin_code:"BN-HATCH-NATURE-01", display_name:"HATCH-NATURE-01", age_group:"hatchlings", theme:"nature", current_count:5, capacity:50, is_active:true },
  { bin_code:"BN-HATCH-LIFE-01", display_name:"HATCH-LIFE-01", age_group:"hatchlings", theme:"life", current_count:18, capacity:50, is_active:true },
  { bin_code:"BN-HATCH-LEARN-01", display_name:"HATCH-LEARN-01", age_group:"hatchlings", theme:"learn", current_count:11, capacity:50, is_active:true },
  { bin_code:"BN-HATCH-SEASONAL-01", display_name:"HATCH-SEASONAL-01", age_group:"hatchlings", theme:"seasonal", current_count:3, capacity:50, is_active:true },
  { bin_code:"BN-FLED-ADVENTURE-01", display_name:"FLED-ADVENTURE-01", age_group:"fledglings", theme:"adventure", current_count:27, capacity:50, is_active:true },
  { bin_code:"BN-FLED-ADVENTURE-02", display_name:"FLED-ADVENTURE-02", age_group:"fledglings", theme:"adventure", current_count:19, capacity:50, is_active:true },
  { bin_code:"BN-FLED-HUMOR-01", display_name:"FLED-HUMOR-01", age_group:"fledglings", theme:"humor", current_count:31, capacity:50, is_active:true },
  { bin_code:"BN-FLED-HUMOR-02", display_name:"FLED-HUMOR-02", age_group:"fledglings", theme:"humor", current_count:12, capacity:50, is_active:true },
  { bin_code:"BN-FLED-NATURE-01", display_name:"FLED-NATURE-01", age_group:"fledglings", theme:"nature", current_count:9, capacity:50, is_active:true },
  { bin_code:"BN-FLED-LIFE-01", display_name:"FLED-LIFE-01", age_group:"fledglings", theme:"life", current_count:24, capacity:50, is_active:true },
  { bin_code:"BN-FLED-LEARN-01", display_name:"FLED-LEARN-01", age_group:"fledglings", theme:"learn", current_count:16, capacity:50, is_active:true },
  { bin_code:"BN-FLED-SEASONAL-01", display_name:"FLED-SEASONAL-01", age_group:"fledglings", theme:"seasonal", current_count:7, capacity:50, is_active:true },
  { bin_code:"BN-SOAR-ADVENTURE-01", display_name:"SOAR-ADVENTURE-01", age_group:"soarers", theme:"adventure", current_count:20, capacity:50, is_active:true },
  { bin_code:"BN-SOAR-HUMOR-01", display_name:"SOAR-HUMOR-01", age_group:"soarers", theme:"humor", current_count:4, capacity:50, is_active:true },
  { bin_code:"BN-SOAR-NATURE-01", display_name:"SOAR-NATURE-01", age_group:"soarers", theme:"nature", current_count:13, capacity:50, is_active:true },
  { bin_code:"BN-SOAR-NATURE-02", display_name:"SOAR-NATURE-02", age_group:"soarers", theme:"nature", current_count:6, capacity:50, is_active:true },
  { bin_code:"BN-SOAR-LIFE-01", display_name:"SOAR-LIFE-01", age_group:"soarers", theme:"life", current_count:10, capacity:50, is_active:true },
  { bin_code:"BN-SOAR-LEARN-01", display_name:"SOAR-LEARN-01", age_group:"soarers", theme:"learn", current_count:2, capacity:50, is_active:true },
  { bin_code:"BN-SOAR-SEASONAL-01", display_name:"SOAR-SEASONAL-01", age_group:"soarers", theme:"seasonal", current_count:15, capacity:50, is_active:true },
  { bin_code:"BN-SKY-ADVENTURE-01", display_name:"SKY-ADVENTURE-01", age_group:"sky readers", theme:"adventure", current_count:15, capacity:50, is_active:true },
  { bin_code:"BN-SKY-ADVENTURE-02", display_name:"SKY-ADVENTURE-02", age_group:"sky readers", theme:"adventure", current_count:11, capacity:50, is_active:true },
  { bin_code:"BN-SKY-HUMOR-01", display_name:"SKY-HUMOR-01", age_group:"sky readers", theme:"humor", current_count:8, capacity:50, is_active:true },
  { bin_code:"BN-SKY-NATURE-01", display_name:"SKY-NATURE-01", age_group:"sky readers", theme:"nature", current_count:1, capacity:50, is_active:true },
  { bin_code:"BN-SKY-LIFE-01", display_name:"SKY-LIFE-01", age_group:"sky readers", theme:"life", current_count:21, capacity:50, is_active:true },
  { bin_code:"BN-SKY-LEARN-01", display_name:"SKY-LEARN-01", age_group:"sky readers", theme:"learn", current_count:17, capacity:50, is_active:true },
  { bin_code:"BN-SKY-LEARN-02", display_name:"SKY-LEARN-02", age_group:"sky readers", theme:"learn", current_count:9, capacity:50, is_active:true },
  { bin_code:"BN-SKY-SEASONAL-01", display_name:"SKY-SEASONAL-01", age_group:"sky readers", theme:"seasonal", current_count:5, capacity:50, is_active:true },
];

const DEMO_BOOKS = [
  { isbn:"9780545294973", title:"Diary of a Wimpy Kid: Cabin Fever", author:"Jeff Kinney", bin_id:"SOAR-HUMOR-01", condition:"good" },
  { isbn:"9781338568721", title:"Dog Man: Fetch-22", author:"Dav Pilkey", bin_id:"SOAR-HUMOR-01", condition:"good" },
  { isbn:"9780064400558", title:"Where the Wild Things Are", author:"Maurice Sendak", bin_id:"HATCH-ADVENTURE-01", condition:"good" },
  { isbn:"9780439023481", title:"The Hunger Games", author:"Suzanne Collins", bin_id:"SKY-ADVENTURE-01", condition:"good" },
  { isbn:"9780590353427", title:"Harry Potter and the Sorcerer's Stone", author:"J.K. Rowling", bin_id:"SKY-ADVENTURE-01", condition:"good" },
  { isbn:"9780064401883", title:"Frog and Toad Are Friends", author:"Arnold Lobel", bin_id:"FLED-HUMOR-01", condition:"good" },
  { isbn:"9780142410318", title:"Charlotte's Web", author:"E.B. White", bin_id:"FLED-NATURE-01", condition:"good" },
];

// ──────────────────────────────────────────────
//  Constants
// ──────────────────────────────────────────────
const AGE_META = {
  hatchlings:    { key:"HATCH", label:"Hatchlings",  range:"0–2 yrs", emoji:"🥚", color:"#D4853A" },
  fledglings:    { key:"FLED",  label:"Fledglings",  range:"3–5 yrs", emoji:"🐣", color:"#2A9D8F" },
  soarers:       { key:"SOAR",  label:"Soarers",     range:"6–8 yrs", emoji:"🪶", color:"#264653" },
  "sky readers": { key:"SKY",   label:"Sky Readers", range:"9–12 yrs",emoji:"🦅", color:"#C44536" },
};
const AGE_ORDER = ["hatchlings", "fledglings", "soarers", "sky readers"];
const LOW = 10;
const WARN = 20;

// ──────────────────────────────────────────────
//  Supabase fetchers (uncomment when wired up)
// ──────────────────────────────────────────────
async function fetchBins() {
  if (DEMO_MODE) return DEMO_BINS;

  /*
  const { data, error } = await supabase
    .from("bins")
    .select("bin_code, display_name, age_group, theme, current_count, capacity, is_active")
    .order("age_group")
    .order("theme")
    .order("display_name");
  if (error) { console.error("fetchBins error:", error); return []; }
  return data;
  */
  return [];
}

async function fetchBooksForBin(displayName) {
  if (DEMO_MODE) return DEMO_BOOKS.filter(b => b.bin_id === displayName);

  /*
  const { data, error } = await supabase
    .from("book_copies")
    .select(`
      isbn, condition, bin_id, book_title_id,
      book_titles!inner ( title, author, isbn )
    `)
    .eq("bin_id", displayName)
    .eq("status", "in_house")
    .order("created_at", { ascending: false });

  if (error) { console.error("fetchBooks error:", error); return []; }

  return data.map(r => ({
    isbn:   r.book_titles?.isbn || r.isbn,
    title:  r.book_titles?.title  || "—",
    author: r.book_titles?.author || "—",
    bin_id: r.bin_id,
    condition: r.condition,
  }));
  */
  return [];
}

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────
const chipCls = c => c <= LOW ? "chip-low" : c <= WARN ? "chip-warn" : "chip-good";
const chipTxt = c => c <= LOW ? "Low" : c <= WARN ? "OK" : "Stocked";
const barClr  = c => c <= LOW ? "#DC2626" : c <= WARN ? "#D97706" : "#059669";

function heatBg(count, cap) {
  if (count === 0) return "rgba(0,0,0,0.03)";
  const p = count / (cap || 50);
  if (count <= LOW) return `rgba(220,38,38,${0.08 + p * 0.2})`;
  if (count <= WARN) return `rgba(217,119,6,${0.06 + p * 0.15})`;
  return `rgba(5,150,105,${0.08 + p * 0.25})`;
}

// ──────────────────────────────────────────────
//  Styles
// ──────────────────────────────────────────────
const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
:root {
  --bg:#F7F6F3; --card:#fff; --brd:#ECEAE5;
  --t1:#1C1917; --t2:#78716C; --t3:#A8A29E;
  --low:#DC2626; --low-bg:#FEF2F2;
  --warn:#D97706; --warn-bg:#FFFBEB;
  --ok:#059669; --ok-bg:#ECFDF5;
  --accent:#264653;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',-apple-system,sans-serif;background:var(--bg);color:var(--t1);-webkit-font-smoothing:antialiased}
.pg{max-width:1200px;margin:0 auto;padding:32px 24px}
.hdr h1{font-size:24px;font-weight:800;letter-spacing:-0.5px}
.hdr .sub{font-size:14px;color:var(--t2);margin-top:4px;font-weight:500}
.demo{display:inline-block;margin-top:8px;padding:3px 10px;background:#DBEAFE;color:#1D4ED8;font-size:11px;font-weight:700;border-radius:99px;letter-spacing:.3px;text-transform:uppercase}

.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:28px 0}
@media(max-width:768px){.kpi-row{grid-template-columns:repeat(2,1fr)}}
.kpi{background:var(--card);border:1.5px solid var(--brd);border-radius:14px;padding:20px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
.kpi:hover{border-color:#D6D3D1;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.kpi.on{border-color:var(--accent);box-shadow:0 0 0 3px rgba(38,70,83,.1)}
.kpi .bg-e{position:absolute;top:-6px;right:-2px;font-size:44px;opacity:.07}
.kpi .lbl{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.kpi .lbl .e{font-size:16px}
.kpi .lbl .n{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}
.kpi .ct{font-size:36px;font-weight:800;line-height:1}
.kpi .meta{display:flex;align-items:center;gap:8px;margin-top:10px}
.kpi .rng{font-size:11px;color:var(--t3);font-weight:600}
.kpi .bins{font-size:11px;color:var(--t2);font-weight:500}

.chip{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase}
.chip-low{background:var(--low-bg);color:var(--low)}
.chip-warn{background:var(--warn-bg);color:var(--warn)}
.chip-good{background:var(--ok-bg);color:var(--ok)}

.card{background:var(--card);border:1.5px solid var(--brd);border-radius:14px;padding:24px;margin-bottom:24px}
.card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
.card-hdr h2{font-size:16px;font-weight:700}
.legend{display:flex;gap:14px;flex-wrap:wrap}
.legend span{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--t3)}
.legend i{width:10px;height:10px;border-radius:3px;display:inline-block}

.hg{display:grid;gap:4px}
.hg .ch{text-align:center;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;padding:8px 0}
.hg .rl{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding-right:8px;white-space:nowrap}
.hg .cell{border-radius:10px;padding:12px 8px;text-align:center;cursor:pointer;border:2px solid transparent;transition:all .15s;position:relative;min-height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center}
.hg .cell:hover{transform:scale(1.03)}
.hg .cell.on{border-color:var(--accent)}
.hg .cell .v{font-size:20px;font-weight:800}
.hg .cell .v.lo{color:var(--low)}
.hg .cell .f{font-size:9px;font-weight:700;margin-top:2px}
.hg .cell .f.lo{color:var(--low)}
.hg .cell .f.em{color:var(--t3)}
.hg .cell .cb{position:absolute;bottom:4px;left:8px;right:8px;height:3px;background:rgba(0,0,0,.06);border-radius:99px;overflow:hidden}
.hg .cell .cb div{height:100%;border-radius:99px;transition:width .3s}

.drill{animation:si .2s ease}
@keyframes si{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.drill-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:8px}
.drill-hdr h2{font-size:16px;font-weight:700}
.close-btn{background:none;border:1.5px solid var(--brd);border-radius:8px;padding:5px 14px;font-size:12px;font-weight:600;color:var(--t2);cursor:pointer;font-family:inherit;transition:all .15s}
.close-btn:hover{border-color:#D6D3D1;color:var(--t1)}

.bg{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.bc{border:1.5px solid var(--brd);border-radius:12px;padding:16px;cursor:pointer;transition:all .2s}
.bc:hover{border-color:#D6D3D1;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.bc.on{border-color:var(--accent);background:#FAFAF8}
.bc.lo{background:#FFFBF5}
.bc .bn{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:500;color:var(--t2);margin-bottom:8px}
.bc .cr{display:flex;align-items:baseline;gap:6px}
.bc .ct{font-size:28px;font-weight:800;line-height:1}
.bc .ct.lo{color:var(--low)}
.bc .cap{font-size:11px;color:var(--t3);font-weight:500}
.bc .bar{margin-top:10px;height:5px;background:#F0EFEB;border-radius:99px;overflow:hidden}
.bc .bar div{height:100%;border-radius:99px;transition:width .3s}

.bl{margin-top:14px;border-top:1px solid var(--brd);padding-top:12px}
.bl .bt{font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px}
.br{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F5F4F0;font-size:13px}
.br:last-child{border-bottom:none}
.br .tt{font-weight:600;color:var(--t1);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.br .au{color:var(--t2);font-size:12px;white-space:nowrap}
.br .is{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--t3)}
.bload{padding:16px 0;text-align:center;color:var(--t3);font-size:13px}

.ftog{display:flex;align-items:center;gap:6px;padding:6px 14px;border:1.5px solid var(--brd);border-radius:99px;font-size:12px;font-weight:600;color:var(--t2);cursor:pointer;background:var(--card);font-family:inherit;transition:all .15s}
.ftog.on{border-color:var(--accent);color:var(--accent);background:rgba(38,70,83,.04)}
.ftog:hover{border-color:#D6D3D1}
.empty{padding:24px;text-align:center;color:var(--t3);font-size:13px}
`;

// ──────────────────────────────────────────────
//  Component
// ──────────────────────────────────────────────
export default function InventorySnapshot() {
  const [bins, setBins]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [drillAge, setDrillAge]       = useState(null);
  const [drillTheme, setDrillTheme]   = useState(null);
  const [expandedBin, setExpandedBin] = useState(null);
  const [binBooks, setBinBooks]       = useState({});
  const [loadingBooks, setLoadingBooks] = useState(null);
  const [activeOnly, setActiveOnly]   = useState(true);

  useEffect(() => { (async () => { setLoading(true); setBins(await fetchBins()); setLoading(false); })(); }, []);

  const shown = useMemo(() => activeOnly ? bins.filter(b => b.is_active) : bins, [bins, activeOnly]);

  const themes = useMemo(() => [...new Set(shown.map(b => b.theme))].sort(), [shown]);

  const { ageTotals, ageCap, ageBinN, grid, total } = useMemo(() => {
    const ageTotals={}, ageCap={}, ageBinN={}, grid={};
    AGE_ORDER.forEach(a => { ageTotals[a]=0; ageCap[a]=0; ageBinN[a]=0; grid[a]={}; });
    shown.forEach(b => {
      const a = b.age_group;
      if (!(a in ageTotals)) return;
      ageTotals[a] += b.current_count;
      ageCap[a]    += b.capacity || 50;
      ageBinN[a]   += 1;
      if (!grid[a][b.theme]) grid[a][b.theme] = { count:0, cap:0 };
      grid[a][b.theme].count += b.current_count;
      grid[a][b.theme].cap   += (b.capacity || 50);
    });
    return { ageTotals, ageCap, ageBinN, grid, total: Object.values(ageTotals).reduce((s,v)=>s+v,0) };
  }, [shown]);

  const drillBins = useMemo(() => {
    if (!drillAge) return [];
    return shown.filter(b => b.age_group===drillAge && (!drillTheme || b.theme===drillTheme)).sort((a,b) => a.current_count - b.current_count);
  }, [shown, drillAge, drillTheme]);

  const close = () => { setDrillAge(null); setDrillTheme(null); setExpandedBin(null); };

  const clickKpi = age => { drillAge===age && !drillTheme ? close() : (setDrillAge(age), setDrillTheme(null), setExpandedBin(null)); };
  const clickCell = (age, theme) => { drillAge===age && drillTheme===theme ? close() : (setDrillAge(age), setDrillTheme(theme), setExpandedBin(null)); };
  const clickBin = async dn => {
    if (expandedBin===dn) { setExpandedBin(null); return; }
    setExpandedBin(dn);
    if (!binBooks[dn]) {
      setLoadingBooks(dn);
      const bks = await fetchBooksForBin(dn);
      setBinBooks(p => ({ ...p, [dn]: bks }));
      setLoadingBooks(null);
    }
  };

  if (loading) return (<div className="pg"><style>{styles}</style><div className="empty" style={{padding:"80px 0"}}>Loading inventory…</div></div>);

  return (
    <div className="pg">
      <style>{styles}</style>

      {/* Header */}
      <div className="hdr" style={{marginBottom:24}}>
        <h1>Inventory Snapshot</h1>
        <div className="sub">{total} books across {shown.length} active bins</div>
        {DEMO_MODE && <span className="demo">Demo Data — wire up Supabase to see real counts</span>}
      </div>

      {/* Filter toggle */}
      <div style={{marginBottom:20}}>
        <button className={`ftog ${activeOnly?"on":""}`} onClick={()=>setActiveOnly(!activeOnly)}>
          <span>{activeOnly?"●":"○"}</span> Active bins only
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-row">
        {AGE_ORDER.map(age => {
          const m = AGE_META[age], ct = ageTotals[age], on = drillAge===age && !drillTheme;
          return (
            <div key={age} className={`kpi ${on?"on":""}`} onClick={()=>clickKpi(age)}>
              <span className="bg-e">{m.emoji}</span>
              <div className="lbl"><span className="e">{m.emoji}</span><span className="n" style={{color:m.color}}>{m.label}</span></div>
              <div className="ct">{ct}</div>
              <div className="meta">
                <span className="rng">{m.range}</span>
                <span className="bins">{ageBinN[age]} bins</span>
                <span className={`chip ${chipCls(ct)}`}>{chipTxt(ct)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Heatmap */}
      <div className="card">
        <div className="card-hdr">
          <h2>Books by Age × Topic</h2>
          <div className="legend">
            <span><i className="legend-dot" style={{background:"rgba(220,38,38,.2)"}}/>Low (≤{LOW})</span>
            <span><i className="legend-dot" style={{background:"rgba(217,119,6,.15)"}}/>OK</span>
            <span><i className="legend-dot" style={{background:"rgba(5,150,105,.25)"}}/>Stocked</span>
          </div>
        </div>
        <div className="hg" style={{gridTemplateColumns:`120px repeat(${themes.length},1fr)`}}>
          <div/>
          {themes.map(t => <div key={t} className="ch">{t}</div>)}
          {AGE_ORDER.map(age => {
            const m = AGE_META[age];
            return [
              <div key={`l-${age}`} className="rl"><span>{m.emoji}</span><span style={{color:m.color}}>{m.key}</span></div>,
              ...themes.map(theme => {
                const c = grid[age]?.[theme] || {count:0,cap:50};
                const on = drillAge===age && drillTheme===theme;
                const pct = Math.min(100, (c.count/(c.cap||50))*100);
                return (
                  <div key={`${age}-${theme}`} className={`cell ${on?"on":""}`} style={{background:heatBg(c.count,c.cap)}} onClick={()=>clickCell(age,theme)}>
                    <div className={`v ${c.count<=LOW?"lo":""}`}>{c.count}</div>
                    {c.count<=LOW && c.count>0 && <div className="f lo">⚠ LOW</div>}
                    {c.count===0 && <div className="f em">EMPTY</div>}
                    <div className="cb"><div style={{width:`${pct}%`,background:barClr(c.count)}}/></div>
                  </div>
                );
              })
            ];
          })}
        </div>
      </div>

      {/* Drill-down */}
      {drillAge && (
        <div className="card drill">
          <div className="drill-hdr">
            <h2>{AGE_META[drillAge].emoji} {AGE_META[drillAge].label}{drillTheme ? ` › ${drillTheme}` : ""} — Bin Detail</h2>
            <button className="close-btn" onClick={close}>Close ✕</button>
          </div>
          {drillBins.length===0 ? <div className="empty">No bins found</div> : (
            <div className="bg">
              {drillBins.map(b => {
                const ex = expandedBin===b.display_name;
                const pct = Math.min(100,(b.current_count/(b.capacity||50))*100);
                const bks = binBooks[b.display_name];
                return (
                  <div key={b.bin_code} className={`bc ${ex?"on":""} ${b.current_count<=LOW?"lo":""}`} onClick={()=>clickBin(b.display_name)}>
                    <div className="bn">{b.display_name}</div>
                    <div className="cr">
                      <span className={`ct ${b.current_count<=LOW?"lo":""}`}>{b.current_count}</span>
                      <span className="cap">/ {b.capacity||50}</span>
                      <span className={`chip ${chipCls(b.current_count)}`} style={{marginLeft:"auto"}}>{chipTxt(b.current_count)}</span>
                    </div>
                    <div className="bar"><div style={{width:`${pct}%`,background:barClr(b.current_count)}}/></div>

                    {/* Book list */}
                    {ex && (
                      <div className="bl" onClick={e=>e.stopPropagation()}>
                        <div className="bt">Books in this bin</div>
                        {loadingBooks===b.display_name ? <div className="bload">Loading…</div>
                          : bks && bks.length>0 ? bks.map((bk,i)=>(
                            <div key={i} className="br">
                              <span className="tt">{bk.title}</span>
                              <span className="au">{bk.author}</span>
                              <span className="is">{bk.isbn}</span>
                            </div>
                          )) : <div className="bload">{bks?"No books found in this bin":"Click to load"}</div>
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}