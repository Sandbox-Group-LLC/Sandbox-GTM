import { useState, useEffect, useRef } from "react";
import { MarketingHeader } from "@/components/marketing-header";

const STEPS = ["Program Profile", "Data & Attribution", "Revenue Inputs"];

const EVENT_TYPES = [
  { key: "field", label: "Field Events", avgCost: 15000 },
  { key: "virtual", label: "Virtual / Webinars", avgCost: 5000 },
  { key: "hybrid", label: "Hybrid Events", avgCost: 50000 },
  { key: "tradeshow", label: "Tradeshows", avgCost: 50000 },
];

const MATURITY_OPTIONS = {
  crm: [
    { value: "native", label: "Native API sync", score: 3 },
    { value: "zapier", label: "Zapier / middleware", score: 2 },
    { value: "csv", label: "CSV / manual export", score: 1 },
    { value: "none", label: "No integration", score: 0 },
  ],
  handoff: [
    { value: "hours", label: "Within hours", score: 3 },
    { value: "nextday", label: "Next business day", score: 2 },
    { value: "days", label: "2-5 days", score: 1 },
    { value: "none", label: "No defined SLA", score: 0 },
  ],
  attribution: [
    { value: "multi", label: "Multi-touch attribution", score: 3 },
    { value: "first", label: "First-touch only", score: 2 },
    { value: "influenced", label: '"Influenced" / last-touch', score: 1 },
    { value: "none", label: "No attribution model", score: 0 },
  ],
  toolCount: [
    { value: "1-2", label: "1-2 tools", score: 3 },
    { value: "3", label: "3 tools", score: 2 },
    { value: "4-5", label: "4-5 tools", score: 1 },
    { value: "6+", label: "6+ tools", score: 0 },
  ],
  abm: [
    { value: "full", label: "Fully integrated", score: 3 },
    { value: "partial", label: "Partially connected", score: 2 },
    { value: "manual", label: "Manual / ad hoc", score: 1 },
    { value: "none", label: "No ABM program", score: 0 },
  ],
  reporting: [
    { value: "crm_native", label: "CRM-native dashboards", score: 3 },
    { value: "bi_tool", label: "BI tool (Looker, Tableau)", score: 2 },
    { value: "spreadsheet", label: "Spreadsheets", score: 1 },
    { value: "none", label: "No pipeline reporting", score: 0 },
  ],
  runbooks: [
    { value: "all", label: "All event types documented", score: 3 },
    { value: "some", label: "Some types documented", score: 2 },
    { value: "tribal", label: "Tribal knowledge only", score: 1 },
    { value: "none", label: "No documentation", score: 0 },
  ],
  multiformat: [
    { value: "unified", label: "Unified attendee records", score: 3 },
    { value: "partial", label: "Partial unification", score: 2 },
    { value: "separate", label: "Separate per format", score: 1 },
    { value: "single", label: "Single format only", score: 0 },
  ],
};

const GAP_LABELS = {
  crm: { title: "Data Architecture", lesson: 1 },
  attribution: { title: "Attribution Model", lesson: 2 },
  handoff: { title: "Lead Handoff SLA", lesson: 3 },
  toolCount: { title: "Tool Consolidation", lesson: 4 },
  abm: { title: "ABM Integration", lesson: 5 },
  reporting: { title: "Revenue Reporting", lesson: 6 },
  runbooks: { title: "Process Automation", lesson: 7 },
  multiformat: { title: "Multi-Format Readiness", lesson: 8 },
};

const fmt = (n) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtPct = (n) => `${(n * 100).toFixed(0)}%`;

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 48 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            height: 3, borderRadius: 2,
            background: i <= step ? "var(--accent)" : "rgba(255,255,255,0.08)",
            transition: "background 0.4s ease",
          }} />
          <span style={{
            fontSize: 11, fontWeight: 500, letterSpacing: "0.08em",
            color: i <= step ? "var(--accent)" : "rgba(255,255,255,0.3)",
            textTransform: "uppercase", transition: "color 0.3s",
          }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function NumberInput({ label, sub, value, onChange, prefix, suffix, min = 0, max, step = 1, width = 120 }: { label: string; sub?: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; min?: number; max?: number; step?: number; width?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{label}</label>
      {sub && <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -4 }}>{sub}</span>}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8, padding: "8px 12px", width: "fit-content",
      }}>
        {prefix && <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{prefix}</span>}
        <input type="number" value={value} min={min} max={max} step={step}
          onChange={e => onChange(Number(e.target.value) || 0)}
          style={{
            background: "none", border: "none", outline: "none",
            color: "var(--text-primary)", fontSize: 16, fontWeight: 600,
            width, fontFamily: "inherit",
          }}
        />
        {suffix && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function RadioGroup({ label, sub, options, value, onChange }: { label: string; sub?: string; options: { value: string; label: string; score: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</label>
      {sub && <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -6 }}>{sub}</span>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 8, cursor: "pointer",
            background: value === o.value ? "rgba(45,120,250,0.12)" : "rgba(255,255,255,0.02)",
            border: value === o.value ? "1px solid rgba(45,120,250,0.4)" : "1px solid rgba(255,255,255,0.06)",
            transition: "all 0.2s ease",
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              border: value === o.value ? "5px solid var(--accent)" : "2px solid rgba(255,255,255,0.2)",
              transition: "all 0.2s", flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: value === o.value ? "#fff" : "var(--text-secondary)" }}>
              {o.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GapCard({ gapKey, score, index }: { gapKey: string; score: number; index: number }) {
  const info = GAP_LABELS[gapKey];
  const color = score >= 3 ? "#22c55e" : score >= 2 ? "#f5b942" : "#ef4444";
  const status = score >= 3 ? "Ready" : score >= 2 ? "At Risk" : "Will Break";
  const barWidth = (score / 3) * 100;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16, padding: "14px 0",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      animation: `fadeSlideIn 0.4s ease ${index * 60}ms both`,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.2)",
        width: 20, textAlign: "right", flexShrink: 0,
      }}>#{info.lesson}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{info.title}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
            color, padding: "2px 8px", borderRadius: 4,
            background: `${color}15`,
          }}>{status}</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
          <div style={{
            height: "100%", borderRadius: 2, background: color,
            width: `${barWidth}%`, transition: "width 0.8s ease",
          }} />
        </div>
      </div>
    </div>
  );
}

function PipelineChart({ current, potential, invisible }: { current: number; potential: number; invisible: number }) {
  const max = Math.max(current, potential) * 1.15;
  const currentH = (current / max) * 200;
  const potentialH = (potential / max) * 200;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 48, height: 260, padding: "20px 0" }}>
      {[
        { label: "Current Visible", value: current, height: currentH, color: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.2)" },
        { label: "Actual Impact", value: potential, height: potentialH, color: "rgba(45,120,250,0.2)", border: "var(--accent)" },
      ].map(bar => (
        <div key={bar.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{fmt(bar.value)}</span>
          <div style={{
            width: 80, height: bar.height, borderRadius: "8px 8px 4px 4px",
            background: bar.color, border: `1px solid ${bar.border}`,
            transition: "height 1s ease",
          }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", maxWidth: 100 }}>{bar.label}</span>
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#f5b942" }}>{fmt(invisible)}</span>
        <div style={{
          width: 80, height: (invisible / max) * 200, borderRadius: "8px 8px 4px 4px",
          background: "repeating-linear-gradient(45deg, rgba(245,185,66,0.1), rgba(245,185,66,0.1) 4px, rgba(245,185,66,0.05) 4px, rgba(245,185,66,0.05) 8px)",
          border: "1px dashed rgba(245,185,66,0.4)",
          transition: "height 1s ease",
        }} />
        <span style={{ fontSize: 11, color: "#f5b942", textAlign: "center", maxWidth: 100, fontWeight: 600 }}>Invisible Pipeline</span>
      </div>
    </div>
  );
}

function ScalingGrade({ grade, maxEvents, maturityScore }: { grade: string; maxEvents: string; maturityScore: number }) {
  const gradeColors = { A: "#22c55e", B: "#3b82f6", C: "#f5b942", D: "#f97316", F: "#ef4444" };
  const color = gradeColors[grade] || "#ef4444";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      padding: 32, borderRadius: 16,
      background: `radial-gradient(circle at 50% 0%, ${color}08 0%, transparent 70%)`,
      border: `1px solid ${color}20`,
    }}>
      <div style={{
        fontSize: 64, fontWeight: 800, color,
        lineHeight: 1, fontFamily: "'Instrument Serif', Georgia, serif",
      }}>{grade}</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.6 }}>
        Your program is operationally ready for<br />
        <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{maxEvents} events/year</span>
      </div>
      <div style={{
        fontSize: 11, color: "var(--text-muted)",
        padding: "6px 14px", borderRadius: 20,
        background: "rgba(255,255,255,0.04)",
      }}>
        Infrastructure Maturity: {maturityScore}/24
      </div>
    </div>
  );
}

export default function EventROICalculator() {
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [email, setEmail] = useState("");
  const [gated, setGated] = useState(true);
  const resultsRef = useRef(null);

  const [program, setProgram] = useState({
    field: 4, virtual: 8, hybrid: 2, tradeshow: 3,
    avgAttendance: 120, headcount: 3,
  });

  const [maturity, setMaturity] = useState({
    crm: "", handoff: "", attribution: "", toolCount: "",
    abm: "", reporting: "", runbooks: "", multiformat: "",
  });

  const [revenue, setRevenue] = useState({
    avgDeal: 45000, cycleMonths: 6,
    currentPipeline: 0, pipelineTarget: 2000000,
  });

  const totalEvents = EVENT_TYPES.reduce((s, t) => s + (program[t.key] || 0), 0);
  const totalSpend = EVENT_TYPES.reduce((s, t) => s + (program[t.key] || 0) * t.avgCost, 0);

  const maturityScore = Object.values(maturity).reduce((s, v) => {
    for (const opts of Object.values(MATURITY_OPTIONS)) {
      const match = opts.find(o => o.value === v);
      if (match) return s + match.score;
    }
    return s;
  }, 0);

  const maturityPct = maturityScore / 24;
  const currentAttribution = Math.max(0.02, maturityPct * 0.18);
  const matureAttribution = 0.27;
  const currentVisible = revenue.pipelineTarget * currentAttribution;
  const potentialPipeline = revenue.pipelineTarget * matureAttribution;
  const invisiblePipeline = potentialPipeline - currentVisible;

  const grade = maturityPct >= 0.85 ? "A" : maturityPct >= 0.7 ? "B" : maturityPct >= 0.5 ? "C" : maturityPct >= 0.3 ? "D" : "F";
  const maxEvents = maturityPct >= 0.85 ? "50+" : maturityPct >= 0.7 ? "30-50" : maturityPct >= 0.5 ? "15-30" : maturityPct >= 0.3 ? "10-15" : "< 10";

  const gapScores = {};
  Object.keys(GAP_LABELS).forEach(k => {
    const opts = MATURITY_OPTIONS[k];
    const match = opts?.find(o => o.value === maturity[k]);
    gapScores[k] = match ? match.score : 0;
  });

  const canProceed = () => {
    if (step === 0) return totalEvents > 0;
    if (step === 1) return Object.values(maturity).every(v => v !== "");
    if (step === 2) return revenue.avgDeal > 0 && revenue.pipelineTarget > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
    else {
      setShowResults(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const handleUngate = () => {
    if (email && email.includes("@")) setGated(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0e17",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      ["--accent"]: "#2d78fa",
      ["--text-primary"]: "#e2e8f0",
      ["--text-secondary"]: "#94a3b8",
      ["--text-muted"]: "#475569",
      ["--surface"]: "rgba(255,255,255,0.03)",
      ["--border"]: "rgba(255,255,255,0.06)",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { opacity: 1; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(45,120,250,0.1); }
          50% { box-shadow: 0 0 40px rgba(45,120,250,0.2); }
        }
      `}</style>

      <MarketingHeader />
      {/* Header */}
      <div style={{
        padding: "48px 24px 0", maxWidth: 720, margin: "0 auto",
        animation: "fadeSlideIn 0.6s ease both",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
          color: "var(--accent)", marginBottom: 16,
        }}>
          Sandbox-GTM
        </div>
        <h1 style={{
          fontSize: 32, fontWeight: 800, lineHeight: 1.15, marginBottom: 12,
          fontFamily: "'Inter', Georgia, serif", fontWeight: 400, fontSize: 40,
          background: "linear-gradient(135deg, #fff 0%, #94a3b8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Event ROI Calculator
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 560 }}>
          Model your event program's pipeline impact. Find the revenue your events are already generating but can't prove.
        </p>
      </div>

      {/* Form */}
      {!showResults && (
        <div style={{
          maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px",
          animation: "fadeSlideIn 0.5s ease both",
        }}>
          <ProgressBar step={step} />

          {/* Step 1: Program Profile */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32, animation: "fadeIn 0.3s ease" }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Annual Event Volume</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>How many events do you run per year, by type?</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {EVENT_TYPES.map(t => (
                  <div key={t.key} style={{
                    padding: 20, borderRadius: 12,
                    background: "var(--surface)", border: "1px solid var(--border)",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      {t.icon} {t.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                      ~{fmt(t.avgCost)} avg. cost each
                    </div>
                    <input type="number" min={0} max={100} value={program[t.key]}
                      onChange={e => setProgram({ ...program, [t.key]: Number(e.target.value) || 0 })}
                      style={{
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 18,
                        fontWeight: 700, width: 80, fontFamily: "inherit", outline: "none",
                      }}
                    />
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>/year</span>
                  </div>
                ))}
              </div>
              <div style={{
                display: "flex", gap: 24,
                padding: 20, borderRadius: 12,
                background: "rgba(45,120,250,0.04)", border: "1px solid rgba(45,120,250,0.1)",
              }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>{totalEvents}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Total events/yr</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{fmt(totalSpend)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Est. annual spend</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                <NumberInput label="Avg. attendance per event" value={program.avgAttendance}
                  onChange={v => setProgram({ ...program, avgAttendance: v })}
                  suffix="attendees" width={80} />
                <NumberInput label="Event team headcount" value={program.headcount}
                  onChange={v => setProgram({ ...program, headcount: v })}
                  suffix="people" width={60} />
              </div>
            </div>
          )}

          {/* Step 2: Data & Attribution Maturity */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 28, animation: "fadeIn 0.3s ease" }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Operational Maturity</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Answer honestly — this is the diagnostic.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <RadioGroup label="CRM Integration" sub="How does event data reach your CRM?"
                  options={MATURITY_OPTIONS.crm} value={maturity.crm}
                  onChange={v => setMaturity({ ...maturity, crm: v })} />
                <RadioGroup label="Lead Handoff SLA" sub="Time from capture to first sales touch"
                  options={MATURITY_OPTIONS.handoff} value={maturity.handoff}
                  onChange={v => setMaturity({ ...maturity, handoff: v })} />
                <RadioGroup label="Attribution Model" sub="How do you credit events for pipeline?"
                  options={MATURITY_OPTIONS.attribution} value={maturity.attribution}
                  onChange={v => setMaturity({ ...maturity, attribution: v })} />
                <RadioGroup label="Tool Count" sub="Tools between capture and attribution report"
                  options={MATURITY_OPTIONS.toolCount} value={maturity.toolCount}
                  onChange={v => setMaturity({ ...maturity, toolCount: v })} />
                <RadioGroup label="ABM Integration" sub="Event lists connected to target accounts?"
                  options={MATURITY_OPTIONS.abm} value={maturity.abm}
                  onChange={v => setMaturity({ ...maturity, abm: v })} />
                <RadioGroup label="Pipeline Reporting" sub="How do you report event-attributed pipeline?"
                  options={MATURITY_OPTIONS.reporting} value={maturity.reporting}
                  onChange={v => setMaturity({ ...maturity, reporting: v })} />
                <RadioGroup label="Process Documentation" sub="Runbooks for event execution?"
                  options={MATURITY_OPTIONS.runbooks} value={maturity.runbooks}
                  onChange={v => setMaturity({ ...maturity, runbooks: v })} />
                <RadioGroup label="Multi-Format Data" sub="Unified records across event formats?"
                  options={MATURITY_OPTIONS.multiformat} value={maturity.multiformat}
                  onChange={v => setMaturity({ ...maturity, multiformat: v })} />
              </div>
            </div>
          )}

          {/* Step 3: Revenue Inputs */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32, animation: "fadeIn 0.3s ease" }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Revenue Context</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>These numbers power your pipeline projection.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <NumberInput label="Average Deal Size" value={revenue.avgDeal}
                  onChange={v => setRevenue({ ...revenue, avgDeal: v })}
                  prefix="$" width={120} />
                <NumberInput label="Average Sales Cycle" value={revenue.cycleMonths}
                  onChange={v => setRevenue({ ...revenue, cycleMonths: v })}
                  suffix="months" width={60} />
                <NumberInput label="Current Event-Attributed Pipeline" sub="Annual — enter $0 if unknown"
                  value={revenue.currentPipeline}
                  onChange={v => setRevenue({ ...revenue, currentPipeline: v })}
                  prefix="$" width={140} />
                <NumberInput label="Total Annual Pipeline Target" value={revenue.pipelineTarget}
                  onChange={v => setRevenue({ ...revenue, pipelineTarget: v })}
                  prefix="$" width={140} />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48 }}>
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} style={{
                padding: "12px 24px", borderRadius: 8, cursor: "pointer",
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              }}>Back</button>
            ) : <div />}
            <button onClick={handleNext} disabled={!canProceed()} style={{
              padding: "12px 32px", borderRadius: 8, cursor: canProceed() ? "pointer" : "not-allowed",
              background: canProceed() ? "var(--accent)" : "rgba(255,255,255,0.06)",
              border: "none", color: canProceed() ? "#fff" : "rgba(255,255,255,0.2)",
              fontSize: 14, fontWeight: 700, fontFamily: "inherit",
              transition: "all 0.2s",
            }}>
              {step === 2 ? "Calculate Pipeline Impact →" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div ref={resultsRef} style={{
          maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px",
          animation: "fadeSlideIn 0.6s ease both",
        }}>
          {/* Scaling Grade */}
          <ScalingGrade grade={grade} maxEvents={maxEvents} maturityScore={maturityScore} />

          {/* Pipeline Projection */}
          <div style={{ marginTop: 48 }}>
            <h2 style={{
              fontSize: 18, fontWeight: 700, marginBottom: 4,
              fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, fontSize: 24,
            }}>Pipeline Projection</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>
              Based on your maturity score and the 18-27% event attribution benchmark for mature B2B programs.
            </p>
            <PipelineChart current={currentVisible} potential={potentialPipeline} invisible={invisiblePipeline} />
            <div style={{
              marginTop: 16, padding: 16, borderRadius: 10,
              background: "rgba(245,185,66,0.06)", border: "1px solid rgba(245,185,66,0.15)",
              fontSize: 13, color: "#f5b942", lineHeight: 1.6, textAlign: "center",
            }}>
              Your events are likely generating <strong>{fmt(invisiblePipeline)}</strong> in pipeline
              that your current infrastructure can't prove.
            </div>
          </div>

          {/* Gap Scorecard - gated */}
          <div style={{ marginTop: 48 }}>
            <h2 style={{
              fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, fontSize: 24,
              marginBottom: 4,
            }}>Gap Scorecard</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
              Each of the 9 operational areas scored against your inputs.
            </p>

            {gated ? (
              <>
                {Object.entries(gapScores).slice(0, 3).map(([k, s], i) => (
                  <GapCard key={k} gapKey={k} score={s} index={i} />
                ))}
                <div style={{
                  position: "relative", marginTop: 8,
                }}>
                  <div style={{
                    filter: "blur(6px)", opacity: 0.3, pointerEvents: "none",
                  }}>
                    {Object.entries(gapScores).slice(3).map(([k, s], i) => (
                      <GapCard key={k} gapKey={k} score={s} index={i} />
                    ))}
                  </div>
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 16,
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>
                      Enter your email to unlock the full scorecard + PDF report
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="email" placeholder="you@company.com" value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleUngate()}
                        style={{
                          padding: "10px 14px", borderRadius: 8, fontSize: 14,
                          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                          color: "#fff", width: 240, fontFamily: "inherit", outline: "none",
                        }}
                      />
                      <button onClick={handleUngate} style={{
                        padding: "10px 20px", borderRadius: 8, cursor: "pointer",
                        background: "var(--accent)", border: "none",
                        color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                        animation: "pulseGlow 2s ease infinite",
                      }}>Unlock</button>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>No spam. Just the report.</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {Object.entries(gapScores).map(([k, s], i) => (
                  <GapCard key={k} gapKey={k} score={s} index={i} />
                ))}
                <div style={{
                  marginTop: 32, padding: 24, borderRadius: 12,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Your full report is ready</div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
                    We'll send your pipeline projection, gap scorecard, and scaling roadmap to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
                  </p>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "10px 20px", borderRadius: 8,
                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                    color: "#22c55e", fontSize: 13, fontWeight: 600,
                  }}>
                    ✓ Report unlocked
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Summary Stats */}
          {!gated && (
            <div style={{
              marginTop: 48, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16,
              animation: "fadeSlideIn 0.5s ease both",
            }}>
              {[
                { label: "Events/Year", value: totalEvents, sub: `${program.headcount} person team` },
                { label: "Est. Annual Spend", value: fmt(totalSpend), sub: `${fmt(totalSpend / Math.max(totalEvents, 1))} per event avg` },
                { label: "Events per Person", value: Math.round(totalEvents / Math.max(program.headcount, 1)), sub: grade === "A" || grade === "B" ? "Sustainable" : "Scaling risk" },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: 20, borderRadius: 12,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginTop: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* Restart */}
          <div style={{ marginTop: 48, textAlign: "center" }}>
            <button onClick={() => { setShowResults(false); setStep(0); setGated(true); setEmail(""); }}
              style={{
                padding: "10px 24px", borderRadius: 8, cursor: "pointer",
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text-muted)", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              }}>
              ← Recalculate with different inputs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
