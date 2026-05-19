"use client";

import Logo from "@/components/Logo";

const F = {
  playfair: "var(--font-playfair)",
  serif:    "var(--font-source-serif)",
  plex:     "var(--font-plex-sans)",
};

const TEAM = [
  { name: "Gabriella Beckley", role: "Stakeholder engagement and data analysis"          },
  { name: "Emma-Rose Blacher", role: "Project manager, literature review lead, and UX design" },
  { name: "Elnara Ibrahimli",  role: "Internal comms and design lead"                    },
  { name: "Maximilian Koch",   role: "NLP and ML pipeline"                               },
  { name: "David Liebmann",    role: "Ethics and academic writing"                       },
  { name: "Mark Temchenko",    role: "Data pipeline and engineering"                     },
];

// ─── Sub-components (Mossy Broadsheet patterns) ───────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-12">

      {/* ─── Page H1 + lede — two-column with Logo on the right.
              Logo is vertically centered within its column so its midpoint
              aligns with the lede block's midpoint. Heavy rule spans the full
              page width directly beneath this block. ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center" style={{ paddingTop: 40, paddingBottom: 28 }}>
        <div className="w-full lg:w-[70%]" style={{ paddingRight: 26 }}>
          <h1 style={{
            fontFamily: F.playfair, fontWeight: 400,
            fontSize: 36, lineHeight: "40px",
            color: "var(--t1)",
            maxWidth: 780,
          }}>
            About the Climate Narrative Lab
          </h1>
          <p style={{
            fontFamily: F.serif, fontWeight: 400,
            fontSize: 18, lineHeight: "27px",
            color: "var(--t1)",
            marginTop: 16,
            maxWidth: 780,
          }}>
            The Climate Narrative Review is the digital intervention designed by The Climate Narrative Lab. The Lab is a team of six students in Computational Social Science at the University of Amsterdam working with QuotaClimat, applying BERT-based framing analysis to French and Belgian climate journalism.
          </p>
        </div>
        <div className="w-full lg:w-[30%] flex justify-center lg:justify-start" style={{ paddingTop: 16 }}>
          <Logo size={96} />
        </div>
      </div>

      <Rule color="var(--t1)" thick />

      {/* ─── Section 1: Mission — single column (Logo moved to lede zone above).
              No enclosing border: section head + whitespace demarcates.
              Body paragraphs span the full page-frame width (no maxWidth) —
              matches the section-head width and reads as broadsheet body
              rather than narrow lede-style prose. ─── */}
      <div className="mt-12">
        <SectionHead>Mission</SectionHead>
        <p style={{
          fontFamily: F.serif, fontWeight: 400,
          fontSize: 18, lineHeight: "27px", color: "var(--t1)",
        }}>
          How do patterns of environmental media reporting in France conflict with accurate and balanced coverage of environmental crises?
        </p>
        <p style={{
          fontFamily: F.serif, fontWeight: 300,
          fontSize: 16, lineHeight: "24px", color: "var(--t2)",
          marginTop: 16,
        }}>
          We focus on framing &mdash; which problems get defined, who gets blamed, whether solutions are mentioned at all.
        </p>
      </div>

      {/* ─── Section 2: What we are building — single column ─── */}
      <div className="mt-12">
        <SectionHead>What we are building</SectionHead>
        <p style={{
          fontFamily: F.serif, fontWeight: 400,
          fontSize: 16, lineHeight: "24px", color: "var(--t1)",
        }}>
          The pipeline collects articles from monitored outlets, filters them through QuotaClimat&rsquo;s keyword dictionary, then applies BERT-based classifiers to detect framing patterns &mdash; which problem is defined, who gets blamed, and whether solutions are even mentioned. These outputs feed a dashboard designed around what NGOs told us they actually need: not raw data, but structured answers to questions like &ldquo;is agriculture being covered in proportion to its methane output?&rdquo; or &ldquo;which outlets lead on solution-focused framing?&rdquo;
        </p>
        <EditorialNote>
          This prototype uses mock data. The full version will analyse 74 French outlets in real time, with Dutch-language support being tested in parallel.
        </EditorialNote>
      </div>

      {/* ─── Partner attribution: an editorial credit line, not a section.
              Italic Source Serif at 20/28, broadsheet "with reporting from…"
              register. The QuotaClimat link uses in-system styling: --t1
              text color with a single subtle underline (no SaaS-blue). ─── */}
      <div className="mt-12">
        <p style={{
          fontFamily: F.serif, fontStyle: "italic", fontWeight: 400,
          fontSize: 20, lineHeight: "28px",
          color: "var(--t1)",
        }}>
          In collaboration with{" "}
          <a
            href="https://quotaclimat.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--t1)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            QuotaClimat
          </a>
          .
        </p>
        <p style={{
          fontFamily: F.serif, fontWeight: 400,
          fontSize: 16, lineHeight: "24px", color: "var(--t1)",
          marginTop: 16,
        }}>
          QuotaClimat monitors climate and environmental coverage across French and Belgian media in collaboration with ARCOM, the French media regulator. Our pipeline extends their keyword-based method by adding framing classification, sector benchmarking against GHG data, and a dashboard interface built around NGO needs.
        </p>
      </div>

      {/* ─── Section 4: The team — editorial card grid (2×3 at desktop, stacks
              at mobile). Same separation logic as the Dashboard's KPI quadrant:
              no enclosing border on the grid, no border on individual cards;
              cells separated by soft rules running between columns and rows.
              Per card: name (Plex 17/500) above focus (Source Serif italic 14),
              centered both horizontally and vertically within the cell. ─── */}
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
                style={{
                  borderColor: "var(--border)",
                  padding: "28px 24px",
                }}
              >
                <div style={{
                  fontFamily: F.plex, fontSize: 17, fontWeight: 500, color: "var(--t1)",
                }}>
                  {member.name}
                </div>
                <div style={{
                  fontFamily: F.serif, fontStyle: "italic",
                  fontSize: 14, lineHeight: "20px",
                  color: "var(--t2)",
                  marginTop: 6,
                }}>
                  {member.role}
                </div>
              </div>
            );
          })}
        </div>

        <EditorialNote>
          Supervised by Reshmi Pillai &middot; Faculty of Social and Behavioural Science, University of Amsterdam &middot; 2026
        </EditorialNote>
      </div>

      <div className="pb-12" />
    </div>
  );
}
