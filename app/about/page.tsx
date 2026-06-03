"use client";

const F = {
  playfair: "var(--font-playfair)",
  serif:    "var(--font-source-serif)",
  plex:     "var(--font-plex-sans)",
  qtc:      "var(--font-quantico)",
};

const TEAM = [
  { name: "Gabriella Beckley",  role: "Stakeholder engagement and data analysis", image: "/team/gabriella.png", zoom: 1.2 },
  { name: "Emma-Rose Blacher",  role: "Project manager, literature review lead, and UX design", image: "/team/emma-rose.png", zoom: 1.02 },
  { name: "Elnara Ibrahimli",   role: "Internal comms and design lead", image: "/team/elnara.png", zoom: 1.2 },
  { name: "Maximilian Koch",    role: "NLP and ML pipeline", image: "/team/max.png", zoom: 1.2 },
  { name: "David Liebmann",     role: "Ethics and academic writing", image: "/team/david.png", zoom: 1.2 },
  { name: "Mark Temchenko",     role: "Data pipeline and engineering", image: "/team/mark.png", zoom: 1.2 },
];

const FRAMES_LIST = [
  "Attribution of Responsibility",
  "Human Interest",
  "Conflict",
  "Morality",
  "Economic Consequences",
];

const ANGLES_LIST = [
  "Health",
  "Economics",
  "Jobs",
  "Politics",
  "Geopolitics",
  "Purchasing Power",
];

const FRAMES_TABLE = [
  {
    name:       "Economic Consequences",
    color:      "#EF9F27",
    definition: "Reports an event, problem, or issue in terms of the consequences it will have economically on an individual, group, institution, region, or country.",
    signals:    "Is there a mention of financial losses or gains now or in the future? Is there a mention of the costs/degree of expense involved?",
    example:    "“Residential bills rise between €38 and €112 a year for the next decade.”",
  },
  {
    name:       "Attribution of Responsibility",
    color:      "var(--red)",
    definition: "Presents an issue or problem in such a way as to attribute responsibility for its cause or solution to either the government or to an individual or group.",
    signals:    "Does the story suggest that some level of government is responsible for the issue or problem? Does the story suggest solutions to the problem or issue?",
    example:    "“Marie-Laure Petit looked past the substation toward the field.”",
  },
  {
    name:       "Human Interest",
    color:      "var(--green)",
    definition: "Brings a human face or an emotional angle to the presentation of an event, issue, or problem.",
    signals:    "Does the story provide a human example or “human face” on the issue? Does the story emphasize how individuals and groups are affected by the issue or problem?",
    example:    "“Interviews with eleven mayors suggest the burden falls to the communes.”",
  },
  {
    name:       "Conflict",
    color:      "var(--red-m)",
    definition: "Emphasizes conflict between individuals, groups, or institutions as a means of capturing audience interest.",
    signals:    "Does the story reflect disagreement between parties, individuals, groups, or countries? Does the story refer to winners and losers?",
    example:    "“RTE disputes the figure. The ministry characterised the clause as ‘administrative.’”",
  },
  {
    name:       "Morality",
    color:      "#7C3AED",
    definition: "Puts the event, problem, or issue in the context of religious tenets or moral prescriptions.",
    signals:    "Does the story contain any moral message? Does the story offer specific social prescriptions about how to behave?",
    example:    "“The climate is an emergency. The bill is also an emergency.”",
  },
];

// ─── SVG: Accountability chain ────────────────────────────────────────────────

function AccountabilityChainSVG() {
  const box  = { stroke: "var(--border)", fill: "var(--bg)", strokeWidth: "1" } as const;
  const line = { stroke: "var(--border)", strokeWidth: "1" } as const;
  const t1   = { fill: "var(--t1)", fontFamily: "var(--font-plex-sans)", fontSize: "10" } as const;
  const t2   = { fill: "var(--t2)", fontFamily: "var(--font-plex-sans)", fontSize: "9"  } as const;

  return (
    <svg viewBox="0 0 200 310" width="100%" style={{ maxWidth: 200, display: "block" }}>
      <rect x="10" y="10" width="180" height="44" style={box} />
      <text x="100" y="28" textAnchor="middle" style={{ ...t1, fontWeight: "600", fontSize: "11" }}>Environmental media</text>
      <text x="100" y="44" textAnchor="middle" style={{ ...t2, fontStyle: "italic" }}>coverage growing faster than oversight</text>

      <line x1="100" y1="54" x2="100" y2="73" style={line} />
      <polygon points="95,71 100,81 105,71" style={{ fill: "var(--border)" }} />

      <rect x="10" y="81" width="180" height="44" style={box} />
      <text x="100" y="99" textAnchor="middle" style={{ ...t1, fontWeight: "600" }}>France &amp; Belgium</text>
      <text x="100" y="115" textAnchor="middle" style={t2}>mandate balanced reporting</text>

      <line x1="100" y1="125" x2="100" y2="144" style={line} />
      <polygon points="95,142 100,152 105,142" style={{ fill: "var(--border)" }} />

      <rect x="10" y="152" width="180" height="52" style={box} />
      <text x="100" y="170" textAnchor="middle" style={{ ...t1, fontWeight: "600" }}>ARCOM + QuotaClimat</text>
      <text x="100" y="186" textAnchor="middle" style={t2}>data collected</text>
      <text x="100" y="198" textAnchor="middle" style={{ ...t2, fontStyle: "italic" }}>but lives in spreadsheets</text>

      <line x1="100" y1="204" x2="100" y2="226" style={{ ...line, strokeDasharray: "4 3" }} />
      <polygon points="95,224 100,234 105,224" style={{ fill: "var(--border)" }} />

      <rect x="10" y="234" width="4"   height="62" style={{ fill: "var(--red)", stroke: "none" }} />
      <rect x="10" y="234" width="180" height="62" style={{ ...box, fill: "none" }} />
      <text x="105" y="254" textAnchor="middle" style={{ ...t1, fontWeight: "700", fontSize: "11" }}>This tool</text>
      <text x="105" y="270" textAnchor="middle" style={t2}>NGOs · researchers · regulators</text>
      <text x="105" y="285" textAnchor="middle" style={{ ...t2, fontStyle: "italic" }}>structured, explorable insight</text>
    </svg>
  );
}

// ─── SVG: Classification pipeline ────────────────────────────────────────────

function ClassificationPipelineSVG() {
  const box  = { stroke: "var(--border)", fill: "var(--bg)", strokeWidth: "1" } as const;
  const line = { stroke: "var(--border)", strokeWidth: "1" } as const;
  const t1   = { fill: "var(--t1)", fontFamily: "var(--font-plex-sans)", fontSize: "9", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
  const t2   = { fill: "var(--t2)", fontFamily: "var(--font-plex-sans)", fontSize: "8" } as const;

  const cy = 45, nw = 100, gap = 18;
  const x1 = 10, x2 = x1+nw+gap, x3 = x2+nw+gap, x4 = x3+nw+gap;
  const forkX = x4 + nw + gap;
  const outW = 90;
  const frameCY = 22, angleCY = 66;

  return (
    <svg viewBox="0 0 590 90" width="100%" style={{ display: "block", marginTop: 4 }}>
      <rect x={x1} y={cy-18} width={nw} height="36" style={box} />
      <text x={x1+nw/2} y={cy-4}  textAnchor="middle" style={t1}>Partner data</text>
      <text x={x1+nw/2} y={cy+10} textAnchor="middle" style={t2}>+ other sources</text>

      <line x1={x1+nw} y1={cy} x2={x2-8} y2={cy} style={line} />
      <polygon points={`${x2-8},${cy-4} ${x2},${cy} ${x2-8},${cy+4}`} style={{ fill: "var(--border)" }} />

      <rect x={x2} y={cy-18} width={nw} height="36" style={box} />
      <text x={x2+nw/2} y={cy-4}  textAnchor="middle" style={t1}>LLM labels</text>
      <text x={x2+nw/2} y={cy+10} textAnchor="middle" style={t2}>auto-generated</text>

      <line x1={x2+nw} y1={cy} x2={x3-8} y2={cy} style={line} />
      <polygon points={`${x3-8},${cy-4} ${x3},${cy} ${x3-8},${cy+4}`} style={{ fill: "var(--border)" }} />

      <rect x={x3} y={cy-18} width={nw} height="36" style={box} />
      <text x={x3+nw/2} y={cy-4}  textAnchor="middle" style={t1}>Human review</text>
      <text x={x3+nw/2} y={cy+10} textAnchor="middle" style={t2}>Two annotators</text>

      <line x1={x3+nw} y1={cy} x2={x4-8} y2={cy} style={line} />
      <polygon points={`${x4-8},${cy-4} ${x4},${cy} ${x4-8},${cy+4}`} style={{ fill: "var(--border)" }} />

      <rect x={x4} y={cy-18} width={nw} height="36" style={box} />
      <text x={x4+nw/2} y={cy-4}  textAnchor="middle" style={t1}>RoBERTa</text>
      <text x={x4+nw/2} y={cy+10} textAnchor="middle" style={t2}>multilingual fine-tune</text>

      <line x1={x4+nw} y1={cy} x2={forkX-8} y2={frameCY} style={{ ...line, stroke: "var(--red)" }} />
      <polygon points={`${forkX-8},${frameCY-4} ${forkX},${frameCY} ${forkX-8},${frameCY+4}`} style={{ fill: "var(--red)" }} />
      <line x1={x4+nw} y1={cy} x2={forkX-8} y2={angleCY} style={{ ...line, stroke: "var(--green)" }} />
      <polygon points={`${forkX-8},${angleCY-4} ${forkX},${angleCY} ${forkX-8},${angleCY+4}`} style={{ fill: "var(--green)" }} />

      <rect x={forkX} y={frameCY-14} width={outW} height="28" style={{ ...box, stroke: "var(--red)" }} />
      <text x={forkX+outW/2} y={frameCY-1}  textAnchor="middle" style={{ ...t1, fill: "var(--red)" }}>Frame</text>
      <text x={forkX+outW/2} y={frameCY+11} textAnchor="middle" style={t2}>how it is told</text>

      <rect x={forkX} y={angleCY-14} width={outW} height="28" style={{ ...box, stroke: "var(--green)" }} />
      <text x={forkX+outW/2} y={angleCY-1}  textAnchor="middle" style={{ ...t1, fill: "var(--green)" }}>Angle</text>
      <text x={forkX+outW/2} y={angleCY+11} textAnchor="middle" style={t2}>who it speaks to</text>
    </svg>
  );
}

// ─── Frames + Angles classification grid ─────────────────────────────────────

function ClassificationGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, marginTop: 24, width: "100%" }}>
      {/* Frames */}
      <div style={{ background: "var(--bg)", padding: "26px 12px 22px", minHeight: 330 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <span style={{ fontFamily: F.plex, fontSize: 14, fontWeight: 700, letterSpacing: "0.04em", color: "var(--t1)" }}>Frames</span>
          <span style={{ fontFamily: F.plex, fontSize: 12, color: "var(--t2)", marginLeft: 2 }}>
            Semetko &amp; Valkenburg (2000)
          </span>
        </div>
        {FRAMES_LIST.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 10, height: 10, background: "var(--red)", flexShrink: 0 }} />
            <span style={{ fontFamily: F.plex, fontSize: 36 / 3, color: "var(--t1)" }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Angles */}
      <div style={{ background: "var(--bg)", padding: "26px 12px 22px", minHeight: 330 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <span style={{ fontFamily: F.plex, fontSize: 14, fontWeight: 700, letterSpacing: "0.04em", color: "var(--t1)" }}>Angles</span>
          <span style={{ fontFamily: F.plex, fontSize: 12, color: "var(--t2)", marginLeft: 2 }}>
            QuotaClimat taxonomy
          </span>
        </div>
        {ANGLES_LIST.map(a => (
          <div key={a} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 10, height: 10, background: "var(--green)", flexShrink: 0 }} />
            <span style={{ fontFamily: F.plex, fontSize: 36 / 3, color: "var(--t1)" }}>{a}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function HRule({ color = "var(--border)", thick }: { color?: string; thick?: boolean }) {
  return <div style={{ width: "100%", borderTop: `${thick ? 2 : 1}px solid ${color}` }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 44px 64px" }}>

      {/* ── Two-column hero ── */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        {/* Edition bar */}
        <div style={{
          background: "var(--t1)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          height: 34, padding: "0 8px",
        }}>
          <span style={{ fontFamily: F.qtc, fontSize: 13, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--bg)" }}>
            From the Editors
          </span>
          <span style={{ fontFamily: F.qtc, fontSize: 13, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--bg)" }}>
            Amsterdam, the Netherlands
          </span>
        </div>

        <div style={{ display: "flex" }}>

        {/* Left: About + accountability chain */}
        <div style={{ flex: "0 0 59%", paddingRight: 44, paddingBottom: 44 }}>

          <h1 style={{
            fontFamily: F.playfair, fontWeight: 800,
            fontSize: 36, lineHeight: "40px",
            color: "var(--t1)", marginTop: 28, marginBottom: 12,
          }}>
            About the Climate Narrative Lab
          </h1>

          <p style={{ fontFamily: F.playfair, fontStyle: "italic", fontSize: 20, lineHeight: "24px", color: "var(--t2)", marginBottom: 24 }}>
            How do recurring media narratives shape collective understanding of climate change?
          </p>

          <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: F.serif, fontSize: 15, lineHeight: "20px", color: "var(--t1)", marginBottom: 16 }}>
                Environmental journalism shapes how the public understands climate issues they cannot directly observe, yet the quality of that coverage is difficult to assess at scale. France and Belgium are among the first countries to formally require broadcasters to demonstrate balanced climate reporting, and ARCOM, the French media regulator, monitors this in partnership with QuotaClimat. Their current approach captures volume but not context, narrative, or framing, leaving a gap between large-scale media monitoring and the sector-aware insight that environmental journalists and NGOs need for advocacy and accountability work.
              </p>
              <p style={{ fontFamily: F.serif, fontSize: 15, lineHeight: "20px", color: "var(--t1)" }}>
                The organisations doing accountability work (NGOs, advocacy groups, researchers) want to ask structured questions about whether agriculture is covered in proportion to its methane output, which outlets lead on solution-focused staging, or how coverage of the energy sector shifted after the 2022 price crisis. These questions are not answerable from keyword counts alone. We built this tool to bridge that gap: a tool that visualises classifications of newspaper articles into actionable insights.
              </p>
            </div>
            <div style={{ flexShrink: 0, width: 230 }}>
              <AccountabilityChainSVG />
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, flexShrink: 0, background: "var(--border)" }} />

        {/* Right: How we classify + classification grid */}
        <div style={{ flex: 1, paddingLeft: 44, paddingBottom: 44 }}>
          <h2 style={{
            fontFamily: F.playfair, fontWeight: 500,
            fontSize: 36, lineHeight: "40px",
            color: "var(--t1)", marginTop: 34, marginBottom: 12,
          }}>
            How We Classify
          </h2>

          <p style={{ fontFamily: F.serif, fontSize: 15, lineHeight: "20px", color: "var(--t1)" }}>
            Each article is classified using two locally-run, multillingual transformer models into frames and angles
          </p>

          <ClassificationGrid />
        </div>
        </div>
      </div>

      {/* ── Methodology ── */}
      <div style={{ paddingTop: 52 }}>

        <h2 style={{
          fontFamily: F.playfair, fontWeight: 500,
          fontSize: 36, lineHeight: "40px",
          color: "var(--t1)", marginBottom: 16,
        }}>
          A Frame Typology for Detecting Narrative Patterns in News Coverage
        </h2>

        <p style={{ fontFamily: F.playfair, fontStyle: "italic", fontSize: 20, lineHeight: "24px", color: "var(--t2)", marginBottom: 20 }}>
          In 2000, Holli A. Semetko and Patti M. Valkenburg analysed European news coverage and
          deduced five recurring frames
        </p>

        <p style={{ fontFamily: F.serif, fontSize: 15, lineHeight: "20px", color: "var(--t1)", marginBottom: 36 }}>
          Semetko and Valkenburg (2000) derived their five frames deductively from a review of existing framing literature, then validated them empirically through a pri…Semetko and Valkenburg (2000) derived their five frames deductively from a review of existing framing literature, then validated them empirically through a principal component analysis of 20 indicator questions across 4,123 Dutch news stories, confirming that attribution of responsibility, conflict, human interest, economic consequences, and morality cluster into statistically distinct dimensions. Because the frames were constructed to be generic rather than issue-specific, they are designed to travel across topics, outlets, and national contexts without modification. This project applies them as a pre-defined classification target
        </p>

        {/* Classification pipeline SVG in place of dashboard screenshot */}
        <div style={{
          border: "1px solid var(--border)",
          padding: "24px 28px",
          marginBottom: 36,
          background: "var(--bg)",
        }}>
          <div style={{ fontFamily: F.plex, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)", marginBottom: 12 }}>
            Training pipeline
          </div>
          <ClassificationPipelineSVG />
          <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 12, lineHeight: "17px", color: "var(--t2)", marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            The production pipeline uses a RoBERTa model fine-tuned on labels generated by a large language model and validated by
            two annotators.
          </p>
        </div>

        {/* Frames reference table */}
        <HRule />

        <div style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr 1fr 220px",
          background: "var(--bg2)",
          height: 30,
          alignItems: "center",
        }}>
          {(["FRAME", "DEFINITION", "SIGNAL QUESTIONS", "EXAMPLE PASSAGE"] as const).map(col => (
            <div key={col} style={{ fontFamily: F.plex, fontSize: 11, lineHeight: "19px", color: "var(--t1)", padding: "0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {col}
            </div>
          ))}
        </div>

        <HRule />

        {FRAMES_TABLE.map((frame) => (
          <div key={frame.name}>
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 1fr 220px", minHeight: 74, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 10px" }}>
                <div style={{ width: 20, height: 16, marginTop: 3, flexShrink: 0, background: frame.color, border: "1px solid #000" }} />
                <span style={{ fontFamily: F.playfair, fontStyle: "italic", fontWeight: 700, fontSize: 15, lineHeight: "25px", letterSpacing: "0.01em", color: "var(--t1)" }}>
                  {frame.name}
                </span>
              </div>
              <div style={{ fontFamily: F.serif, fontSize: 14, lineHeight: "20px", color: "var(--t1)", padding: "14px 10px" }}>
                {frame.definition}
              </div>
              <div style={{ fontFamily: F.playfair, fontStyle: "italic", fontSize: 15, lineHeight: "18px", color: "var(--t1)", padding: "14px 10px" }}>
                {frame.signals}
              </div>
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 14, lineHeight: "20px", color: "var(--t1)", padding: "14px 10px" }}>
                {frame.example}
              </div>
            </div>
            <HRule />
          </div>
        ))}

        {/* Multilabel note */}
        <div style={{ background: "var(--bg2)", border: "1px solid #000", padding: "20px 40px", marginTop: 29 }}>
          <p style={{ fontFamily: F.playfair, fontWeight: 800, fontSize: 16, lineHeight: "25px", color: "var(--t1)", margin: 0 }}>
            Note on multilabel scoring:{" "}
            <span style={{ fontWeight: 400 }}>
              The framing classifier scores each of the five frames independently, so a single
              article can carry strong Human Interest and Economic Consequences signals at once.
              Any &ldquo;primary frame&rdquo; label in The Reader is the highest-scoring frame,
              not the only one detected, and percentages therefore sum to more than 100%.
            </span>
          </p>
        </div>
      </div>

      {/* ── Meet the team ── */}
      <div style={{ paddingTop: 52 }}>
        <HRule thick color="var(--t1)" />

        <h2 style={{ fontFamily: F.playfair, fontWeight: 700, fontSize: 36, lineHeight: "40px", color: "var(--t1)", marginTop: 28, marginBottom: 10 }}>
          The Climate Narrative Lab Team
        </h2>

        <p style={{ fontFamily: F.playfair, fontSize: 20, lineHeight: "24px", color: "var(--t2)", marginBottom: 20 }}>
          How do recurring media narratives shape collective understanding of climate change?
        </p>

        <p style={{ fontFamily: F.serif, fontSize: 15, lineHeight: "20px", color: "var(--t1)", marginBottom: 40 }}>
          The Climate Narrative Lab is a student-led initiative exploring how climate change is
          framed across digital news media. Developed as part of the Computational Social Science
          programme at the University of Amsterdam in collaboration with QuotaClimat, the project
          combines computational methods, media theory, and interactive design.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
          {TEAM.map((member) => {
            return (
              <div key={member.name} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "0 24px 32px",
              }}>
                {member.image ? (
                  <div
                    style={{
                      width: 190,
                      height: 190,
                      borderRadius: "50%",
                      overflow: "hidden",
                      marginBottom: 16,
                    }}
                  >
                    <img
                      src={member.image}
                      alt={member.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center",
                        transform: `scale(${member.zoom ?? 1})`,
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: 190,
                    height: 190,
                    borderRadius: "50%",
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: F.playfair,
                    fontSize: 34,
                    color: "var(--t2)",
                  }}>
                    {member.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                )}
                <div style={{ fontFamily: F.plex, fontSize: 17, fontWeight: 500, color: "var(--t1)", textAlign: "center" }}>
                  {member.name}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* ── Page footer ── */}
      <div style={{ marginTop: 40 }}>
        <HRule />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12 }}>
          <span style={{ fontFamily: F.plex, fontSize: 16, lineHeight: "25px", color: "var(--t2)" }}>
            The Climate Narrative Review · About us
          </span>
          <span style={{ fontFamily: F.plex, fontSize: 16, lineHeight: "25px", color: "var(--t2)" }}>
            Special edition
          </span>
        </div>
      </div>

    </div>
  );
}
