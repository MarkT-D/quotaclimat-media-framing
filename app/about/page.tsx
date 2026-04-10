"use client";

const Logo = () => (
  <svg width="44" height="44" viewBox="0 0 42 42" fill="none">
    <rect width="42" height="42" rx="11" fill="#2D6A4F" />
    <rect x="8" y="12" width="18" height="2.5" rx="1.25" fill="white" />
    <rect x="8" y="17.5" width="14" height="2.5" rx="1.25" fill="white" opacity="0.7" />
    <rect x="8" y="23" width="16" height="2.5" rx="1.25" fill="white" opacity="0.5" />
    <circle cx="31" cy="16" r="6.5" fill="#C8392B" />
    <path d="M31 13 L31 16 L33 18" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8" y="28.5" width="26" height="1.5" rx="0.75" fill="white" opacity="0.2" />
  </svg>
);

const team = [
  { name: "Gabriella Beckley", role: "Literature & Framing Theory", icon: "📚", track: "RE" },
  { name: "Emma-Rose Blacher", role: "Project Scoping & Stakeholders", icon: "🧭", track: "RE" },
  { name: "Elnara Ibrahimli", role: "Dashboard UX & Design", icon: "🎨", track: "DE" },
  { name: "Maximilian Koch", role: "NLP & Translation Pipeline", icon: "🤖", track: "CME" },
  { name: "David Liebmann", role: "Ethics & Academic Writing", icon: "⚖️", track: "SSHE" },
  { name: "Mark Temchenko", role: "Data Pipeline & Engineering", icon: "⚙️", track: "CME" },
];


export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Mission hero */}
      <div
        className="rounded-xl p-6 flex gap-5 items-start"
        style={{ background: "var(--green-l)", border: "0.5px solid rgba(45,106,79,0.2)" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "#fff", border: "0.5px solid rgba(45,106,79,0.25)" }}
        >
          <Logo />
        </div>
        <div>
          <h1 className="text-lg font-medium leading-snug mb-2" style={{ color: "var(--green-d)" }}>
            The Climate Narrative Lab
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--green)", lineHeight: 1.75 }}>
            We are a team of six students in Computational Social Science at the University of Amsterdam,
            working with QuotaClimat to build a media analysis pipeline for environmental journalism.
            The core question driving our work: How do patterns of environmental media reporting in France conflict with accurate and balanced coverage of environmental crises?
          </p>
        </div>
      </div>

      {/* What we are building */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
        <p className="text-sm font-medium mb-3" style={{ color: "var(--t1)" }}>What we are building</p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--t2)", lineHeight: 1.75 }}>
          The pipeline collects articles from monitored outlets, filters them through QuotaClimat's keyword
          dictionary, then applies BERT-based classifiers to detect framing patterns — which problem is defined,
          who gets blamed, and whether solutions are even mentioned. These outputs feed a dashboard designed
          around what NGOs told us they actually need: not raw data, but structured answers to questions like
          "is agriculture being covered in proportion to its methane output?" or "which outlets lead on solution-focused framing?"
        </p>
        <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--t2)", lineHeight: 1.75 }}>
          This prototype uses mock data to simulate what the final system will produce. The full version will
          analyse 74 French outlets in real time, with Dutch-language support being tested in parallel.
        </p>
      </div>

      {/* Partner */}
      <div className="rounded-xl p-5 flex gap-4 items-start" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--red)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium mb-0.5" style={{ color: "var(--t1)" }}>QuotaClimat</p>
          <p className="text-[11px] font-medium mb-2" style={{ color: "var(--red)" }}>Partner organisation · France</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--t2)", lineHeight: 1.7 }}>
            QuotaClimat monitors climate and environmental coverage across French and Belgian media in
            collaboration with ARCOM, the French media regulator. They produce reports used by NGOs and
            policymakers to assess coverage quality. Our pipeline extends their keyword-based method by
            adding framing classification, sector benchmarking against GHG data, and a dashboard interface
            built around NGO needs.
          </p>
        </div>
      </div>

      {/* Team */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: "var(--t1)" }}>The team</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {team.map((member) => (
            <div
              key={member.name}
              className="rounded-xl py-5 px-4 text-center transition-all"
              style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div
                className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                style={{ background: "var(--green-l)" }}
              >
                {member.icon}
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--t1)" }}>{member.name}</p>
              <p className="text-[10px] mt-0.5 mb-2 leading-snug" style={{ color: "var(--t2)" }}>{member.role}</p>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--bg2)", color: "var(--t2)" }}
              >
                {member.track}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--t2)" }}>
          Supervised by Reshmi Pillai · Faculty of Social and Behavioural Science, University of Amsterdam · 2026
        </p>
      </div>
    </div>
  );
}
