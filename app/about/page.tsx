"use client";

import ScrollReveal from "@/components/ScrollReveal";

const F = {
  playfair: "var(--font-playfair)",
  serif:    "var(--font-source-serif)",
  plex:     "var(--font-plex-sans)",
  pfsc:     "var(--font-playfair-sc)",
};

const TEAM = [
  { name: "Gabriella Beckley", role: "Stakeholder engagement and data analysis"           },
  { name: "Emma-Rose Blacher", role: "Project manager, literature review lead, and UX design" },
  { name: "Elnara Ibrahimli",  role: "Internal comms and design lead"                     },
  { name: "Maximilian Koch",   role: "NLP and ML pipeline"                                },
  { name: "David Liebmann",    role: "Ethics and academic writing"                        },
  { name: "Mark Temchenko",    role: "Data pipeline and engineering"                      },
];

const FRAMES = [
  "Attribution of Responsibility",
  "Human Interest",
  "Conflict",
  "Morality",
  "Economic Consequences",
];

const ANGLES = [
  "Health",
  "Economics",
  "Jobs",
  "Politics",
  "Geopolitics",
  "Purchasing Power",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Rule({ color = "var(--border)", thick = false }: { color?: string; thick?: boolean }) {
  return <div style={{ borderTop: `${thick ? "2px" : "1px"} solid ${color}` }} />;
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: F.playfair, fontWeight: 400,
      fontSize: 24, lineHeight: "1.15",
      color: "var(--t1)", marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function EditorialNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 12 }}>
      <p style={{
        fontFamily: F.serif, fontStyle: "italic",
        fontSize: 13, lineHeight: "19px", color: "var(--t2)",
      }}>
        {children}
      </p>
    </div>
  );
}

// ─── SVG: Accountability chain (Why this exists) ──────────────────────────────

function AccountabilityChainSVG() {
  const boxStyle  = { stroke: "var(--border)", fill: "var(--bg)", strokeWidth: "1" };
  const lineStyle = { stroke: "var(--border)", strokeWidth: "1" };
  const t1 = { fill: "var(--t1)", fontFamily: "var(--font-plex-sans)", fontSize: "10" };
  const t2 = { fill: "var(--t2)", fontFamily: "var(--font-plex-sans)", fontSize: "9" };

  return (
    <svg viewBox="0 0 200 310" width="100%" style={{ maxWidth: 220, display: "block" }}>
      {/* Node 1 — growing coverage */}
      <rect x="10" y="10" width="180" height="44" style={boxStyle} />
      <text x="100" y="28" textAnchor="middle" style={{ ...t1, fontWeight: "600", fontSize: "11" }}>Environmental media</text>
      <text x="100" y="44" textAnchor="middle" style={{ ...t2, fontStyle: "italic" }}>coverage growing faster than oversight</text>

      {/* Arrow 1 */}
      <line x1="100" y1="54" x2="100" y2="73" style={lineStyle} />
      <polygon points="95,71 100,81 105,71" style={{ fill: "var(--border)" }} />

      {/* Node 2 — mandate */}
      <rect x="10" y="81" width="180" height="44" style={boxStyle} />
      <text x="100" y="99" textAnchor="middle" style={{ ...t1, fontWeight: "600" }}>France &amp; Belgium</text>
      <text x="100" y="115" textAnchor="middle" style={t2}>mandate balanced reporting</text>

      {/* Arrow 2 */}
      <line x1="100" y1="125" x2="100" y2="144" style={lineStyle} />
      <polygon points="95,142 100,152 105,142" style={{ fill: "var(--border)" }} />

      {/* Node 3 — data collected but stuck */}
      <rect x="10" y="152" width="180" height="52" style={boxStyle} />
      <text x="100" y="170" textAnchor="middle" style={{ ...t1, fontWeight: "600" }}>ARCOM + QuotaClimat</text>
      <text x="100" y="186" textAnchor="middle" style={t2}>data collected</text>
      <text x="100" y="198" textAnchor="middle" style={{ ...t2, fontStyle: "italic" }}>but lives in spreadsheets</text>

      {/* Dashed gap arrow */}
      <line x1="100" y1="204" x2="100" y2="226" style={{ ...lineStyle, strokeDasharray: "4 3" }} />
      <polygon points="95,224 100,234 105,224" style={{ fill: "var(--border)" }} />

      {/* Node 4 — this tool (red accent) */}
      <rect x="10" y="234" width="4" height="62" style={{ fill: "var(--red)", stroke: "none" }} />
      <rect x="10" y="234" width="180" height="62" style={{ ...boxStyle, fill: "none" }} />
      <text x="105" y="254" textAnchor="middle" style={{ ...t1, fontWeight: "700", fontSize: "11" }}>This tool</text>
      <text x="105" y="270" textAnchor="middle" style={t2}>NGOs · researchers · regulators</text>
      <text x="105" y="285" textAnchor="middle" style={{ ...t2, fontStyle: "italic" }}>structured, explorable insight</text>
    </svg>
  );
}

// ─── SVG: Training pipeline (How we classify) ────────────────────────────────

function ClassificationPipelineSVG() {
  const boxStyle  = { stroke: "var(--border)", fill: "var(--bg)", strokeWidth: "1" };
  const lineStyle = { stroke: "var(--border)", strokeWidth: "1" };
  const t1 = { fill: "var(--t1)", fontFamily: "var(--font-plex-sans)", fontSize: "9", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
  const t2 = { fill: "var(--t2)", fontFamily: "var(--font-plex-sans)", fontSize: "8" };

  // 4 training nodes + 2 output nodes, viewBox 590×90
  // cy=45 for all main nodes
  const cy = 45;
  const nw = 100, gap = 18;
  const x1 = 10, x2 = x1+nw+gap, x3 = x2+nw+gap, x4 = x3+nw+gap;
  const forkX = x4 + nw + gap;
  const outW = 90;
  const frameCY = 22, angleCY = 66;

  return (
    <svg viewBox="0 0 590 90" width="100%" style={{ display: "block", marginTop: 20 }}>
      {/* Node 1 — data sources */}
      <rect x={x1} y={cy - 18} width={nw} height="36" style={boxStyle} />
      <text x={x1 + nw/2} y={cy - 4} textAnchor="middle" style={t1}>Partner data</text>
      <text x={x1 + nw/2} y={cy + 10} textAnchor="middle" style={t2}>+ other sources</text>

      {/* → Node 2 */}
      <line x1={x1+nw} y1={cy} x2={x2-4} y2={cy} style={lineStyle} />
      <polygon points={`${x2-8},${cy-4} ${x2},${cy} ${x2-8},${cy+4}`} style={{ fill: "var(--border)" }} />

      {/* Node 2 — LLM labels */}
      <rect x={x2} y={cy - 18} width={nw} height="36" style={boxStyle} />
      <text x={x2 + nw/2} y={cy - 4} textAnchor="middle" style={t1}>LLM labels</text>
      <text x={x2 + nw/2} y={cy + 10} textAnchor="middle" style={t2}>auto-generated</text>

      {/* → Node 3 */}
      <line x1={x2+nw} y1={cy} x2={x3-4} y2={cy} style={lineStyle} />
      <polygon points={`${x3-8},${cy-4} ${x3},${cy} ${x3-8},${cy+4}`} style={{ fill: "var(--border)" }} />

      {/* Node 3 — human validation */}
      <rect x={x3} y={cy - 18} width={nw} height="36" style={boxStyle} />
      <text x={x3 + nw/2} y={cy - 4} textAnchor="middle" style={t1}>Human review</text>
      <text x={x3 + nw/2} y={cy + 10} textAnchor="middle" style={t2}>QuotaClimat annotators</text>

      {/* → Node 4 */}
      <line x1={x3+nw} y1={cy} x2={x4-4} y2={cy} style={lineStyle} />
      <polygon points={`${x4-8},${cy-4} ${x4},${cy} ${x4-8},${cy+4}`} style={{ fill: "var(--border)" }} />

      {/* Node 4 — RoBERTa */}
      <rect x={x4} y={cy - 18} width={nw} height="36" style={boxStyle} />
      <text x={x4 + nw/2} y={cy - 4} textAnchor="middle" style={t1}>RoBERTa</text>
      <text x={x4 + nw/2} y={cy + 10} textAnchor="middle" style={t2}>multilingual fine-tune</text>

      {/* Fork lines */}
      <line x1={x4+nw} y1={cy} x2={forkX-4} y2={frameCY} style={{ ...lineStyle, stroke: "var(--red)" }} />
      <polygon points={`${forkX-8},${frameCY-4} ${forkX},${frameCY} ${forkX-8},${frameCY+4}`} style={{ fill: "var(--red)" }} />
      <line x1={x4+nw} y1={cy} x2={forkX-4} y2={angleCY} style={{ ...lineStyle, stroke: "var(--green)" }} />
      <polygon points={`${forkX-8},${angleCY-4} ${forkX},${angleCY} ${forkX-8},${angleCY+4}`} style={{ fill: "var(--green)" }} />

      {/* Frame output */}
      <rect x={forkX} y={frameCY - 14} width={outW} height="28" style={{ ...boxStyle, stroke: "var(--red)" }} />
      <text x={forkX + outW/2} y={frameCY - 1} textAnchor="middle" style={{ ...t1, fill: "var(--red)" }}>Frame</text>
      <text x={forkX + outW/2} y={frameCY + 11} textAnchor="middle" style={t2}>how it is told</text>

      {/* Angle output */}
      <rect x={forkX} y={angleCY - 14} width={outW} height="28" style={{ ...boxStyle, stroke: "var(--green)" }} />
      <text x={forkX + outW/2} y={angleCY - 1} textAnchor="middle" style={{ ...t1, fill: "var(--green)" }}>Angle</text>
      <text x={forkX + outW/2} y={angleCY + 11} textAnchor="middle" style={t2}>who it speaks to</text>
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-12">

      {/* ── Hero ── */}
      <div style={{ paddingTop: 40, paddingBottom: 28 }}>
        <h1 style={{
          fontFamily: F.playfair, fontWeight: 400,
          fontSize: 36, lineHeight: "40px",
          color: "var(--t1)", maxWidth: 780,
        }}>
          About the Climate Narrative Lab
        </h1>
        <p style={{
          fontFamily: F.serif, fontWeight: 400,
          fontSize: 18, lineHeight: "27px",
          color: "var(--t1)", marginTop: 16, maxWidth: 780,
        }}>
          A tool for making media accountability data usable — built for the NGOs,
          regulators, and researchers who already have the mandate but not the interface.
        </p>
      </div>

      <Rule color="var(--t1)" thick />

      {/* ── Section 1: Why this exists ── */}
      <ScrollReveal>
        <div className="mt-12">
          <SectionHead>Why this exists</SectionHead>

          <div className="flex flex-col lg:flex-row" style={{ gap: 40 }}>
            {/* Text */}
            <div className="w-full lg:w-[60%]">
              <p style={{
                fontFamily: F.serif, fontWeight: 400,
                fontSize: 16, lineHeight: "24px", color: "var(--t1)",
              }}>
                Environmental news coverage is growing faster than the infrastructure to evaluate it.
                France and Belgium are among the first countries to formally require broadcasters to
                demonstrate balanced climate reporting — ARCOM, the French media regulator, monitors
                this in partnership with{" "}
                <a
                  href="https://quotaclimat.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--t1)", textDecoration: "underline", textUnderlineOffset: "3px" }}
                >
                  QuotaClimat
                </a>
                . The mandate exists. The data is collected. But it lives in spreadsheets.
              </p>
              <p style={{
                fontFamily: F.serif, fontWeight: 400,
                fontSize: 16, lineHeight: "24px", color: "var(--t1)",
                marginTop: 16,
              }}>
                The organisations doing accountability work — NGOs, advocacy groups, researchers —
                want to ask structured questions: is agriculture covered in proportion to its methane
                output? Which outlets lead on solution-focused framing? Did coverage of the energy
                sector shift after the 2022 price crisis? None of these questions have easy answers
                in a spreadsheet. We built this tool to bridge that gap: an open interface that turns
                classification data into structured, explorable insight.
              </p>
            </div>

            {/* Accountability chain diagram */}
            <div className="w-full lg:w-[40%] flex justify-center items-start" style={{ paddingTop: 4 }}>
              <AccountabilityChainSVG />
            </div>
          </div>
        </div>
      </ScrollReveal>

      <div className="mt-12"><Rule /></div>

      {/* ── Section 2: How we classify ── */}
      <ScrollReveal>
        <div className="mt-12">
          <SectionHead>How we classify</SectionHead>
          <p style={{
            fontFamily: F.serif, fontStyle: "italic", fontWeight: 400,
            fontSize: 16, lineHeight: "24px", color: "var(--t2)",
            marginBottom: 28,
          }}>
            Each article is analysed along two independent dimensions, drawing on established
            media studies research and QuotaClimat&rsquo;s domain expertise.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 1, background: "var(--border)" }}>
            {/* Frames column */}
            <div style={{ background: "var(--bg)", padding: "28px 28px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, background: "var(--red)", flexShrink: 0 }} />
                <span style={{
                  fontFamily: F.pfsc, fontSize: 12, letterSpacing: "0.04em", color: "var(--t1)",
                }}>
                  Frames
                </span>
                <span style={{
                  fontFamily: F.plex, fontSize: 10, color: "var(--t2)", marginLeft: 4,
                }}>
                  Semetko &amp; Valkenburg (2000)
                </span>
              </div>
              <div style={{ marginBottom: 20 }}>
                {FRAMES.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 6, height: 6, background: "var(--red)", flexShrink: 0 }} />
                    <span style={{ fontFamily: F.plex, fontSize: 13, color: "var(--t1)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <p style={{
                fontFamily: F.serif, fontStyle: "italic",
                fontSize: 13, lineHeight: "18px", color: "var(--t2)",
                borderTop: "1px solid var(--border)", paddingTop: 12,
              }}>
                Describes <em>how</em> a story is told — which problem is foregrounded and who bears responsibility.
              </p>
            </div>

            {/* Angles column */}
            <div style={{ background: "var(--bg)", padding: "28px 28px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, background: "var(--green)", flexShrink: 0 }} />
                <span style={{
                  fontFamily: F.pfsc, fontSize: 12, letterSpacing: "0.04em", color: "var(--t1)",
                }}>
                  Angles
                </span>
                <span style={{
                  fontFamily: F.plex, fontSize: 10, color: "var(--t2)", marginLeft: 4,
                }}>
                  QuotaClimat taxonomy
                </span>
              </div>
              <div style={{ marginBottom: 20 }}>
                {ANGLES.map(a => (
                  <div key={a} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 6, height: 6, background: "var(--green)", flexShrink: 0 }} />
                    <span style={{ fontFamily: F.plex, fontSize: 13, color: "var(--t1)" }}>{a}</span>
                  </div>
                ))}
              </div>
              <p style={{
                fontFamily: F.serif, fontStyle: "italic",
                fontSize: 13, lineHeight: "18px", color: "var(--t2)",
                borderTop: "1px solid var(--border)", paddingTop: 12,
              }}>
                Describes <em>who</em> the story speaks to — which societal concern the framing addresses.
              </p>
            </div>
          </div>

          {/* Training pipeline */}
          <ClassificationPipelineSVG />

          <EditorialNote>
            Classification is currently seeded with representative labels. The production pipeline
            will use a RoBERTa model fine-tuned on labels generated by a large language model and
            validated by QuotaClimat annotators.
          </EditorialNote>
        </div>
      </ScrollReveal>

      <div className="mt-12"><Rule /></div>

      {/* ── Section 3: Open foundation ── */}
      <ScrollReveal>
        <div className="mt-12">
          <SectionHead>Open foundation</SectionHead>

          <div style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            padding: "28px 32px",
            marginBottom: 24,
          }}>
            <p style={{
              fontFamily: F.playfair, fontStyle: "italic", fontWeight: 400,
              fontSize: 22, lineHeight: "30px", color: "var(--t1)",
              marginBottom: 20,
            }}>
              &ldquo;The data exists. The accountability framework exists.
              What was missing was a tool to make both usable.&rdquo;
            </p>
            <Rule />
            <p style={{
              fontFamily: F.serif, fontWeight: 400,
              fontSize: 16, lineHeight: "24px", color: "var(--t1)",
              marginTop: 20,
            }}>
              This dashboard is designed as an open foundation. NGOs, regulators, and researchers
              can explore coverage patterns as-is, or adapt the pipeline for other topics, other
              languages, or other national contexts. The classification schema, data pipeline, and
              dashboard interface are all open.
            </p>
            <p style={{
              fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
              marginTop: 16, fontStyle: "italic",
            }}>
              In collaboration with{" "}
              <a
                href="https://quotaclimat.org"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--t2)", textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                QuotaClimat
              </a>
              {" "}— monitoring French and Belgian environmental coverage since 2021.
            </p>
          </div>
        </div>
      </ScrollReveal>

      <div className="mt-12"><Rule /></div>

      {/* ── Section 4: The team ── */}
      <ScrollReveal>
        <div className="mt-12">
          <SectionHead>The Team</SectionHead>

          <div className="grid grid-cols-1 lg:grid-cols-3">
            {TEAM.map((member, i) => {
              const isLastInRow = i % 3 === 2;
              const isFirstRow  = i < 3;
              const isLastCard  = i === TEAM.length - 1;
              return (
                <div
                  key={member.name}
                  className={[
                    "flex flex-col justify-center text-center",
                    !isLastCard ? "border-b" : "",
                    isFirstRow ? "lg:border-b" : "lg:border-b-0",
                    !isLastInRow ? "lg:border-r" : "lg:border-r-0",
                  ].filter(Boolean).join(" ")}
                  style={{ borderColor: "var(--border)", padding: "28px 24px" }}
                >
                  <div style={{ fontFamily: F.plex, fontSize: 17, fontWeight: 500, color: "var(--t1)" }}>
                    {member.name}
                  </div>
                  <div style={{
                    fontFamily: F.serif, fontStyle: "italic",
                    fontSize: 14, lineHeight: "20px",
                    color: "var(--t2)", marginTop: 6,
                  }}>
                    {member.role}
                  </div>
                </div>
              );
            })}
          </div>

          <EditorialNote>
            Supervised by Reshmi Pillai &middot; Faculty of Social and Behavioural Science,
            University of Amsterdam &middot; 2025–2026
          </EditorialNote>
        </div>
      </ScrollReveal>

      <div className="pb-12" />
    </div>
  );
}
