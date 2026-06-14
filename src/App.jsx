import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oecxytsvwtetuwtolrhs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3h5dHN2d3RldHV3dG9scmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDUxMjUsImV4cCI6MjA5NjYyMTEyNX0.azs6Gx2v9xrAVazznFOBcl2fkHfMHXhXocedeFjmw8w";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SESSION_ID = "muzeum-demo";
const SLOT_SECONDS = 30;

const COLORS = {
  bg: "#0f0f0f", surface: "#1a1a1a",
  border: "#2a2a2a", accent: "#c8a96e", accentLight: "#e8c98e",
  accentDim: "#8a7048", text: "#f0ece4", textMuted: "#888070",
  textDim: "#555048", green: "#4caf7d", red: "#e05252", orange: "#e09452",
};

// ─── Supabase helpers ─────────────────────────────────────────
async function dbFetchQueue() {
  const { data, error } = await supabase
    .from("queue_entries").select("*")
    .eq("session_id", SESSION_ID)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((e, i) => ({ ...e, position: i + 1 }));
}

async function dbJoin() {
  const num = String(Math.floor(Math.random() * 900) + 100);
  const { data, error } = await supabase
    .from("queue_entries")
    .insert({ session_id: SESSION_ID, name: `Gość #${num}`, status: "waiting" })
    .select().single();
  if (error) throw error;
  return data;
}

async function dbAdmit(id) {
  const { error } = await supabase.from("queue_entries").delete().eq("id", id);
  if (error) throw error;
}

async function dbAddDemo() {
  const names = ["Anna K.", "Marek W.", "Julia P.", "Tomasz B.", "Katarzyna M."];
  for (const name of names) {
    await supabase.from("queue_entries").insert({ session_id: SESSION_ID, name, status: "waiting" });
    await new Promise(r => setTimeout(r, 120));
  }
}

async function dbClear() {
  await supabase.from("queue_entries").delete().eq("session_id", SESSION_ID);
}

// ─── CountdownRing ────────────────────────────────────────────
function CountdownRing({ seconds, total, mode }) {
  const r = 36, circ = 2 * Math.PI * r;
  const pct = seconds / total;
  const color = pct > 0.5 ? COLORS.green : pct > 0.25 ? COLORS.orange : COLORS.red;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
      <svg width="88" height="88" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="44" cy="44" r={r} fill="none" stroke={COLORS.border} strokeWidth="5" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{mm}:{ss}</div>
        <div style={{ color: COLORS.textDim, fontSize: 9, letterSpacing: 1, marginTop: 2 }}>
          {mode === "auto" ? "AUTO" : mode === "manual" ? "RĘCZNY" : "HYBRYDA"}
        </div>
      </div>
    </div>
  );
}

// ─── GuestView ────────────────────────────────────────────────
function GuestView({ onBack, queue, myEntryId, onJoin, isDirectGuest = false }) {
  const [scanning, setScanning] = useState(false);
  const my = queue.find(e => e.id === myEntryId);
  const ahead = my ? my.position - 1 : 0;
  const isReady = my?.position === 1;
  const wasAdmitted = myEntryId && !my;

  const handleScan = async () => {
    setScanning(true);
    try { await onJoin(); } catch(e) { console.error(e); }
    setScanning(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 40 }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", alignItems: "center", padding: "20px 24px 0", gap: 12 }}>
        {!isDirectGuest && (
          <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 22, padding: 0 }}>←</button>
        )}
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.accent, fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>Twoja Marka</div>
          <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text, fontSize: 18 }}>Queue Joy</div>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 420, padding: "32px 24px 0" }}>

        {wasAdmitted && (
          <div style={{ background: `${COLORS.green}18`, border: `1px solid ${COLORS.green}`, borderRadius: 12, padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 18, fontFamily: "'Playfair Display', serif" }}>Zostałeś wpuszczony!</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>Miłego zwiedzania.</div>
          </div>
        )}

        {!my && !wasAdmitted && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text, fontSize: 26, lineHeight: 1.3, marginBottom: 8 }}>Dołącz do kolejki</div>
              <div style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.6 }}>Zeskanuj kod QR przy wejściu,<br/>a możesz spokojnie zwiedzać okolicę.</div>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ width: 200, height: 200, border: `1px solid ${COLORS.border}`, borderRadius: 16, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <rect x="0" y="0" width="40" height="40" fill="none" stroke={COLORS.accent} strokeWidth="3" rx="4"/>
                  <rect x="6" y="6" width="28" height="28" fill={COLORS.accent} rx="2"/>
                  <rect x="100" y="0" width="40" height="40" fill="none" stroke={COLORS.accent} strokeWidth="3" rx="4"/>
                  <rect x="106" y="6" width="28" height="28" fill={COLORS.accent} rx="2"/>
                  <rect x="0" y="100" width="40" height="40" fill="none" stroke={COLORS.accent} strokeWidth="3" rx="4"/>
                  <rect x="6" y="106" width="28" height="28" fill={COLORS.accent} rx="2"/>
                  {[50,60,70,80,90].map((x,i)=>[50,60,70,80,90].map((y,j)=>(i+j)%2===0?<rect key={`${i}${j}`} x={x} y={y} width="8" height="8" fill={COLORS.accentDim} rx="1"/>:null))}
                </svg>
                {scanning && <div style={{ position: "absolute", inset: 0, background: "rgba(200,169,110,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "100%", height: 2, background: COLORS.accent, animation: "scan 1.2s ease-in-out infinite", boxShadow: `0 0 12px ${COLORS.accent}` }}/></div>}
              </div>
            </div>
            <button onClick={handleScan} disabled={scanning} style={{ background: scanning ? COLORS.accentDim : COLORS.accent, color: "#0f0f0f", border: "none", borderRadius: 12, padding: "16px 24px", fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", cursor: scanning ? "default" : "pointer" }}>
              {scanning ? "Dołączanie…" : "Symuluj skanowanie QR"}
            </button>
            <div style={{ background: COLORS.surface, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}` }}>
              <div style={{ color: COLORS.textMuted, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Aktualna kolejka</div>
              <div style={{ color: COLORS.text, fontSize: 28, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{queue.length} <span style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: "sans-serif", fontWeight: 400 }}>osób oczekuje</span></div>
              <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>Szacowany czas: ~{queue.length * 5} minut</div>
            </div>
          </div>
        )}

        {my && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {isReady && (
              <div style={{ background: `${COLORS.green}18`, border: `1px solid ${COLORS.green}`, borderRadius: 12, padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 28 }}>🔔</div>
                <div>
                  <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 16 }}>Twoja kolej!</div>
                  <div style={{ color: COLORS.textMuted, fontSize: 13 }}>Proszę udać się do wejścia głównego.</div>
                </div>
              </div>
            )}
            {!isReady && ahead <= 2 && (
              <div style={{ background: `${COLORS.orange}18`, border: `1px solid ${COLORS.orange}`, borderRadius: 12, padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 24 }}>⏰</div>
                <div>
                  <div style={{ color: COLORS.orange, fontWeight: 700, fontSize: 14 }}>Zbliża się Twoja kolej</div>
                  <div style={{ color: COLORS.textMuted, fontSize: 13 }}>Przed Tobą: {ahead} {ahead === 1 ? "osoba" : "osoby"}</div>
                </div>
              </div>
            )}
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, overflow: "hidden" }}>
              <div style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`, padding: "24px 28px" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", color: "#0f0f0f", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>Bilet kolejkowy</div>
                <div style={{ fontFamily: "'Playfair Display', serif", color: "#0f0f0f", fontSize: 48, fontWeight: 700, lineHeight: 1 }}>#{my.position}</div>
                <div style={{ color: "#3a2a10", fontSize: 13, marginTop: 4 }}>{my.name} · Wejście główne</div>
              </div>
              <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Przed Tobą</div>
                    <div style={{ color: isReady ? COLORS.green : COLORS.text, fontSize: 32, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                      {isReady ? "Wejdź!" : ahead}
                      {!isReady && <span style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: "sans-serif", fontWeight: 400 }}> {ahead === 1 ? "osoba" : "osób"}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Pozycja</div>
                    <div style={{ color: COLORS.text, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{my.position}<span style={{ fontSize: 14, color: COLORS.textDim }}>/{queue.length}</span></div>
                  </div>
                </div>
                <div style={{ height: 1, background: COLORS.border }} />
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 1 }}>POSTĘP</div>
                    <div style={{ color: COLORS.accent, fontSize: 11 }}>{Math.round((1 - (my.position - 1) / Math.max(queue.length, 1)) * 100)}%</div>
                  </div>
                  <div style={{ height: 4, background: COLORS.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${COLORS.accentDim}, ${COLORS.accent})`, width: `${Math.round((1 - (my.position - 1) / Math.max(queue.length, 1)) * 100)}%`, transition: "width 0.8s ease" }} />
                  </div>
                </div>
                <div style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6 }}>💡 Możesz teraz odwiedzić kawiarnię lub sklep z pamiątkami. Powiadomimy Cię gdy zbliży się Twoja kolej.</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {["☕ Kawiarnia", "🛍️ Sklep", "🗺️ Mapa", "📞 Pomoc"].map(item => (
                <div key={item} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 16px", color: COLORS.textMuted, fontSize: 13, cursor: "pointer" }}>{item}</div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes scan{0%{transform:translateY(-100px)}100%{transform:translateY(100px)}}`}</style>
    </div>
  );
}

// ─── ManagerView ──────────────────────────────────────────────
function ManagerView({ onBack, queue, onAdmit, onAddDemo, onClear, mode, setMode, countdown }) {
  const next = queue[0];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 40 }}>
      <div style={{ width: "100%", maxWidth: 500, display: "flex", alignItems: "center", padding: "20px 24px 0", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 22, padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.accent, fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>Panel zarządzania</div>
          <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text, fontSize: 18 }}>Queue Joy · Live</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green, boxShadow: `0 0 8px ${COLORS.green}` }} />
      </div>

      <div style={{ width: "100%", maxWidth: 500, padding: "24px 24px 0" }}>
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <CountdownRing seconds={countdown} total={SLOT_SECONDS} mode={mode} />
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Następne wywołanie</div>
              <div style={{ color: COLORS.text, fontSize: 15, fontFamily: "'Playfair Display', serif", marginBottom: 4 }}>
                {next ? `#${next.position} — ${next.name}` : "Kolejka pusta"}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
            {["auto", "manual", "hybrid"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ background: mode === m ? COLORS.accent : "none", color: mode === m ? "#0f0f0f" : COLORS.textMuted, border: `1px solid ${mode === m ? COLORS.accent : COLORS.border}`, borderRadius: 8, padding: "8px 4px", fontSize: 11, fontWeight: mode === m ? 700 : 400, cursor: "pointer", letterSpacing: 0.5 }}>
                {m === "auto" ? "Automatyczny" : m === "manual" ? "Ręczny" : "Hybryda"}
              </button>
            ))}
          </div>
          {(mode === "manual" || mode === "hybrid") && next && (
            <button onClick={() => onAdmit(next.id)} style={{ marginTop: 14, width: "100%", background: COLORS.green, color: "#0f0f0f", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Playfair Display', serif" }}>
              ✓ Wpuść teraz — {next.name}
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[{ label: "W kolejce", value: queue.length, color: COLORS.text }, { label: "Slot (sek)", value: SLOT_SECONDS, color: COLORS.accent }].map(s => (
            <div key={s.label} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Lista kolejki</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onAddDemo} style={{ background: "none", border: `1px solid ${COLORS.accentDim}`, borderRadius: 8, color: COLORS.accent, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>+ Demo</button>
            <button onClick={onClear} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>Wyczyść</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {queue.length === 0 && <div style={{ color: COLORS.textMuted, textAlign: "center", padding: 40, fontSize: 14 }}>Kolejka pusta — wciśnij "+ Demo" aby dodać testowe osoby</div>}
          {queue.map((person) => (
            <div key={person.id} style={{ background: person.position === 1 ? `${COLORS.green}0d` : COLORS.surface, border: `1px solid ${person.position === 1 ? COLORS.green + "40" : COLORS.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: person.position === 1 ? `${COLORS.green}20` : COLORS.border, display: "flex", alignItems: "center", justifyContent: "center", color: person.position === 1 ? COLORS.green : COLORS.textMuted, fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{person.position}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 500 }}>{person.name}</div>
                <div style={{ color: person.position === 1 ? COLORS.green : COLORS.textMuted, fontSize: 12, marginTop: 1 }}>{person.position === 1 ? "✓ Gotowy do wejścia" : "Oczekuje…"}</div>
              </div>
              <button onClick={() => onAdmit(person.id)} style={{ background: person.position === 1 ? COLORS.green : "none", border: `1px solid ${person.position === 1 ? COLORS.green : COLORS.border}`, borderRadius: 8, padding: "6px 14px", color: person.position === 1 ? "#0f0f0f" : COLORS.textMuted, fontSize: 12, cursor: "pointer", fontWeight: person.position === 1 ? 700 : 400, whiteSpace: "nowrap" }}>
                {person.position === 1 ? "Wpuść" : "Wywołaj"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Landing ──────────────────────────────────────────────────
function LandingScreen({ onGuest, onManager }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "10%", right: "-80px", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${COLORS.accent}08 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center", zIndex: 1 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, margin: "0 auto 16px", border: `1px solid ${COLORS.accent}`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: `${COLORS.accent}10` }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4C16 4 8 8 8 16C8 20.4 10.4 24.2 14 26.4V20L16 18L18 20V26.4C21.6 24.2 24 20.4 24 16C24 8 16 4 16 4Z" fill={COLORS.accent} opacity="0.9"/>
              <circle cx="16" cy="16" r="3" fill={COLORS.bg}/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.accent, fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Queue Joy</div>
          <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.text, fontSize: 32, lineHeight: 1.2, marginBottom: 12 }}>Kolejka na<br/>Twoich zasadach</div>
          <div style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 1.7, maxWidth: 300, margin: "0 auto" }}>Daj swoim gościom wolność — niech czekają na swoich zasadach.</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          <button onClick={onGuest} style={{ background: COLORS.accent, color: "#0f0f0f", border: "none", borderRadius: 14, padding: "18px 24px", fontSize: 16, fontFamily: "'Playfair Display', serif", fontWeight: 700, cursor: "pointer" }}>👤 Widok gościa</button>
          <button onClick={onManager} style={{ background: "none", color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 24px", fontSize: 16, fontFamily: "'Playfair Display', serif", cursor: "pointer" }}>⚙️ Panel managera</button>
        </div>
        <div style={{ color: COLORS.textDim, fontSize: 12, lineHeight: 1.8 }}>
          <span style={{ color: COLORS.green }}>●</span> Połączono z bazą danych · Live
        </div>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.has("guest") ? "guest" : "landing";
    } catch { return "landing"; }
  });
  const [queue, setQueue]       = useState([]);
  const [myEntryId, setMyEntryId] = useState(() => { try { return sessionStorage.getItem("tq_entry_id") || null; } catch { return null; } });
  const [loading, setLoading]   = useState(true);
  const [notification, setNotif] = useState(null);
  const [mode, setMode]         = useState("manual");
  const [countdown, setCountdown] = useState(SLOT_SECONDS);
  const prevFirstId = useRef(null);

  const showNotif = useCallback((msg, color = COLORS.green) => {
    setNotif({ msg, color });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const q = await dbFetchQueue();
      setQueue(q);
      setLoading(false);
    } catch(e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  // Initial load + realtime
  useEffect(() => {
    loadQueue();
    const channel = supabase
      .channel("queue_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries" }, loadQueue)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadQueue]);

  // Notify guest when they reach position 1
  useEffect(() => {
    if (!myEntryId || queue.length === 0) return;
    const me = queue.find(e => e.id === myEntryId);
    if (me?.position === 1 && prevFirstId.current !== myEntryId) {
      showNotif("🔔 Twoja kolej — proszę do wejścia!");
    }
    prevFirstId.current = queue[0]?.id;
  }, [queue, myEntryId, showNotif]);

  // Auto/hybrid timer
  useEffect(() => {
    if (mode === "manual") return;
    const tick = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          setQueue(q => {
            const first = q[0];
            if (first) {
              dbAdmit(first.id).then(() => showNotif(`✓ Wpuszczono: ${first.name}`));
            }
            return q;
          });
          return SLOT_SECONDS;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [mode, showNotif]);

  useEffect(() => { setCountdown(SLOT_SECONDS); }, [mode]);

  const handleJoin = async () => {
    const entry = await dbJoin();
    if (entry) {
      setMyEntryId(entry.id);
      try { sessionStorage.setItem("tq_entry_id", entry.id); } catch {}
    }
  };

  const handleAdmit = async (id) => {
    await dbAdmit(id);
    showNotif("✓ Wpuszczono gościa");
    setCountdown(SLOT_SECONDS);
    if (myEntryId === id) {
      setMyEntryId(null);
      try { sessionStorage.removeItem("tq_entry_id"); } catch {}
    }
  };

  const handleAddDemo = async () => {
    showNotif("Dodawanie gości…", COLORS.accent);
    await dbAddDemo();
  };

  const handleClear = async () => {
    await dbClear();
    showNotif("Kolejka wyczyszczona", COLORS.orange);
    setMyEntryId(null);
    try { sessionStorage.removeItem("tq_entry_id"); } catch {}
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.accent, fontSize: 24 }}>Queue Joy</div>
      <div style={{ color: COLORS.textMuted, fontSize: 13 }}>Łączenie z bazą danych…</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet"/>
      {notification && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: notification.color, color: "#fff", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", zIndex: 1000, animation: "slideDown 0.3s ease", whiteSpace: "nowrap" }}>
          {notification.msg}
        </div>
      )}
      {screen === "landing"  && <LandingScreen onGuest={() => setScreen("guest")} onManager={() => setScreen("manager")} />}
      {screen === "guest"    && <GuestView onBack={() => setScreen("landing")} queue={queue} myEntryId={myEntryId} onJoin={handleJoin} isDirectGuest={new URLSearchParams(window.location.search).has("guest")} />}
      {screen === "manager"  && <ManagerView onBack={() => setScreen("landing")} queue={queue} onAdmit={handleAdmit} onAddDemo={handleAddDemo} onClear={handleClear} mode={mode} setMode={setMode} countdown={countdown} />}
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
