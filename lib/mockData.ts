// ─────────────────────────────────────────────────────────────────────────────
// Mock data for QuotaClimat dashboard prototype
// Real data + BERT analysis will be wired in from the Python backend later.
// ─────────────────────────────────────────────────────────────────────────────

export const SECTORS = [
  "Energy",
  "Transport",
  "Agriculture",
  "Industry",
  "Buildings",
  "Waste",
  "Biodiversity",
  "Natural Resources",
  "Land Use",
] as const;

export type Sector = (typeof SECTORS)[number];

export const CRISIS_DOMAINS = ["Climate", "Biodiversity", "Natural Resources"] as const;
export type CrisisDomain = (typeof CRISIS_DOMAINS)[number];

export const STAGES = ["General Concepts", "Causes", "Consequences", "Solutions"] as const;
export type Stage = (typeof STAGES)[number];

export const FRAMES = [
  "Attribution of Responsibility",
  "Human Interest",
  "Conflict",
  "Morality",
  "Economic Consequences",
] as const;
export type Frame = (typeof FRAMES)[number];

export const OUTLETS = [
  { id: "lemonde", name: "Le Monde", country: "France", type: "Print" },
  { id: "lefigaro", name: "Le Figaro", country: "France", type: "Print" },
  { id: "liberation", name: "Libération", country: "France", type: "Print" },
  { id: "lexpress", name: "L'Express", country: "France", type: "Print" },
  { id: "lepoint", name: "Le Point", country: "France", type: "Print" },
  { id: "latribune", name: "La Tribune", country: "France", type: "Print" },
  { id: "humanite", name: "L'Humanité", country: "France", type: "Print" },
  { id: "20minutes", name: "20 Minutes", country: "France", type: "Print" },
  { id: "leparisien", name: "Le Parisien", country: "France", type: "Print" },
  { id: "lesoir", name: "Le Soir", country: "Belgium", type: "Print" },
  { id: "rtbf", name: "RTBF Info", country: "Belgium", type: "Online" },
  { id: "sudpresse", name: "Sud Presse", country: "Belgium", type: "Print" },
  { id: "vertlemedia", name: "Vert Le Média", country: "France", type: "Online" },
  { id: "reporterre", name: "Reporterre", country: "France", type: "Online" },
  { id: "lobs", name: "L'Obs", country: "France", type: "Print" },
] as const;

export type OutletId = (typeof OUTLETS)[number]["id"];

// ─── Article ─────────────────────────────────────────────────────────────────

export interface Article {
  id: string;
  title: string;
  outlet: OutletId;
  publishedAt: string; // ISO date
  sector: Sector;
  crisisDomain: CrisisDomain;
  stage: Stage;
  primaryFrame: Frame;
  frameScores: Record<Frame, number>;   // 0–1 probabilities
  misinformationScore: number;           // 0–1
  wordCount: number;
  excerpt: string;
  url?: string;
  keywords: string[];
}

// Seeded PRNG (mulberry32) so server and client produce identical output
let _seed = 0x9e3779b9;
function _mulberry32() {
  _seed |= 0;
  _seed = (_seed + 0x6d2b79f5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const rand = (min: number, max: number) => _mulberry32() * (max - min) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(_mulberry32() * arr.length)];

function makeFrameScores(primary: Frame): Record<Frame, number> {
  const scores = {} as Record<Frame, number>;
  let remaining = 1;
  const frames = [...FRAMES];
  frames.splice(frames.indexOf(primary), 1);
  scores[primary] = parseFloat(rand(0.4, 0.75).toFixed(2));
  remaining = 1 - scores[primary];
  frames.forEach((f, i) => {
    if (i === frames.length - 1) {
      scores[f] = parseFloat(remaining.toFixed(2));
    } else {
      const v = parseFloat((remaining * rand(0.1, 0.5)).toFixed(2));
      scores[f] = v;
      remaining -= v;
    }
  });
  return scores;
}

const SAMPLE_TITLES: Record<Sector, string[]> = {
  Energy: [
    "France accelerates offshore wind deployment amid energy transition debate",
    "Nuclear power's role in decarbonisation questioned by new IPCC report",
    "Solar panel subsidies slashed as grid capacity reaches limits",
    "Renewables hit 40% of French electricity mix for first time",
    "Gas infrastructure locked-in investments threaten EU climate goals",
  ],
  Transport: [
    "Electric vehicle sales plateau as charging infrastructure gaps persist",
    "High-speed rail expansion plan faces funding shortfall",
    "Aviation sector lobbies against carbon pricing extension",
    "Urban cycling infrastructure investment yields emission reductions",
    "Truck fleet electrification: industry warns of cost burden",
  ],
  Agriculture: [
    "Pesticide use in French farming rises despite biodiversity pledges",
    "Regenerative agriculture pilots show promise but face scaling hurdles",
    "Livestock emissions ignored in national climate reporting, study finds",
    "Water scarcity threatens summer crop yields across southern France",
    "Agri-food industry resists methane disclosure requirements",
  ],
  Industry: [
    "Steel sector hydrogen transition requires €2bn public investment",
    "Cement industry carbon capture pilots begin in Normandy",
    "Industrial emissions trading scheme reform stalls in Parliament",
    "Chemical sector lobbying delays fluorinated gas phase-out",
    "Manufacturing decarbonisation roadmap unveiled by industry coalition",
  ],
  Buildings: [
    "Renovation wave policy falls short of climate targets, auditors warn",
    "Heat pump adoption surges in Belgium amid gas price volatility",
    "Social housing insulation programme reaches 500,000 homes",
    "Building codes update delayed by construction lobby pressure",
    "Thermal renovation subsidies reach lowest-income households",
  ],
  Waste: [
    "Plastic packaging reduction targets missed for second consecutive year",
    "Landfill methane capture expanded as climate co-benefit recognised",
    "Circular economy law faces implementation gaps in France",
    "Food waste halving target unlikely to be met by 2030",
    "Extended producer responsibility scheme overhaul proposed",
  ],
  Biodiversity: [
    "30x30 biodiversity target progress lagging, new assessment shows",
    "Wetland restoration accelerates under EU Nature Restoration Law",
    "Pollinator decline continues despite pesticide restrictions",
    "Marine protected areas face enforcement gaps in French waters",
    "Urban green corridors pilot launched in Lyon and Bordeaux",
  ],
  "Natural Resources": [
    "Groundwater depletion accelerates in drought-prone regions",
    "Mineral extraction boom raises environmental governance concerns",
    "Forest management practices under scrutiny after wildfire season",
    "Water allocation conflicts escalate between farmers and ecosystems",
    "Critical mineral supply chains: environmental cost poorly reported",
  ],
  "Land Use": [
    "Artificial land sealing continues despite zero net land take policy",
    "Rewilding initiative covers 100,000 hectares in Massif Central",
    "Peatland restoration gains momentum as carbon sink potential recognised",
    "Urban sprawl drives biodiversity loss in peri-urban zones",
    "Agricultural land conversion rules tightened in planning reform",
  ],
};

const KEYWORDS_BY_SECTOR: Record<Sector, string[]> = {
  Energy: ["renewable", "solar", "wind", "nuclear", "fossil fuel", "grid", "transition", "electricity"],
  Transport: ["electric vehicle", "aviation", "rail", "mobility", "carbon", "fleet", "cycling", "emissions"],
  Agriculture: ["pesticide", "livestock", "methane", "crop", "farming", "food", "biodiversity", "soil"],
  Industry: ["steel", "cement", "manufacturing", "emissions", "hydrogen", "carbon capture", "industry"],
  Buildings: ["renovation", "insulation", "heat pump", "housing", "energy efficiency", "heating"],
  Waste: ["plastic", "landfill", "recycling", "circular economy", "food waste", "packaging"],
  Biodiversity: ["species", "ecosystem", "wetland", "pollinator", "marine", "conservation", "habitat"],
  "Natural Resources": ["water", "mineral", "forest", "groundwater", "extraction", "depletion"],
  "Land Use": ["land", "peatland", "rewilding", "urban", "soil", "deforestation", "sealing"],
};

function generateArticle(id: number): Article {
  const sector = pick(SECTORS);
  const crisisDomain = pick(CRISIS_DOMAINS);
  const stage = pick(STAGES);
  const primaryFrame = pick(FRAMES);
  const outletObj = pick(OUTLETS);
  const titles = SAMPLE_TITLES[sector];
  const title = titles[id % titles.length];

  const date = new Date(2024, Math.floor(rand(0, 12)), Math.floor(rand(1, 28)));

  return {
    id: `art-${id.toString().padStart(4, "0")}`,
    title,
    outlet: outletObj.id,
    publishedAt: date.toISOString().split("T")[0],
    sector,
    crisisDomain,
    stage,
    primaryFrame,
    frameScores: makeFrameScores(primaryFrame),
    misinformationScore: parseFloat(
      (sector === "Industry" || sector === "Energy" ? rand(0.1, 0.65) : rand(0.02, 0.35)).toFixed(2)
    ),
    wordCount: Math.round(rand(400, 2200)),
    excerpt: `This article examines ${sector.toLowerCase()} sector dynamics through the lens of ${crisisDomain.toLowerCase()} policy in France and Belgium. Coverage focuses on ${stage.toLowerCase()} with ${primaryFrame.toLowerCase()} framing dominant throughout.`,
    keywords: KEYWORDS_BY_SECTOR[sector].slice(0, Math.round(rand(3, 6))),
  };
}

// Seed-based deterministic generation for consistency
export const ARTICLES: Article[] = Array.from({ length: 120 }, (_, i) => generateArticle(i + 1));

// ─── Aggregations ─────────────────────────────────────────────────────────────

export function getSectorCounts(): { sector: Sector; count: number; ghgShare: number }[] {
  const ghgShares: Record<Sector, number> = {
    Energy: 34,
    Transport: 16,
    Agriculture: 11,
    Industry: 13,
    Buildings: 6,
    Waste: 3,
    Biodiversity: 4,
    "Natural Resources": 7,
    "Land Use": 6,
  };
  const counts = {} as Record<Sector, number>;
  SECTORS.forEach((s) => (counts[s] = 0));
  ARTICLES.forEach((a) => counts[a.sector]++);
  return SECTORS.map((s) => ({ sector: s, count: counts[s], ghgShare: ghgShares[s] }));
}

export function getDomainCounts(): { domain: CrisisDomain; count: number }[] {
  const counts = {} as Record<CrisisDomain, number>;
  CRISIS_DOMAINS.forEach((d) => (counts[d] = 0));
  ARTICLES.forEach((a) => counts[a.crisisDomain]++);
  return CRISIS_DOMAINS.map((d) => ({ domain: d, count: counts[d] }));
}

export function getStageCounts(): { stage: Stage; count: number }[] {
  const counts = {} as Record<Stage, number>;
  STAGES.forEach((s) => (counts[s] = 0));
  ARTICLES.forEach((a) => counts[a.stage]++);
  return STAGES.map((s) => ({ stage: s, count: counts[s] }));
}

export function getFrameCounts(): { frame: Frame; count: number }[] {
  const counts = {} as Record<Frame, number>;
  FRAMES.forEach((f) => (counts[f] = 0));
  ARTICLES.forEach((a) => counts[a.primaryFrame]++);
  return FRAMES.map((f) => ({ frame: f, count: counts[f] }));
}

export function getTimeSeriesData() {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return months.map((month, i) => {
    const base = 8 + Math.sin(i * 0.5) * 3;
    return {
      month,
      Climate: Math.round(base * 1.4 + _mulberry32() * 2),
      Biodiversity: Math.round(base * 0.6 + _mulberry32() * 2),
      "Natural Resources": Math.round(base * 0.5 + _mulberry32() * 2),
    };
  });
}

export function getOutletStats() {
  return OUTLETS.map((outlet) => {
    const outletArticles = ARTICLES.filter((a) => a.outlet === outlet.id);
    const avgMisinfo =
      outletArticles.length > 0
        ? outletArticles.reduce((s, a) => s + a.misinformationScore, 0) / outletArticles.length
        : 0;
    const stageDist = {} as Record<Stage, number>;
    STAGES.forEach((s) => (stageDist[s] = 0));
    outletArticles.forEach((a) => stageDist[a.stage]++);
    const frameDist = {} as Record<Frame, number>;
    FRAMES.forEach((f) => (frameDist[f] = 0));
    outletArticles.forEach((a) => frameDist[a.primaryFrame]++);

    return {
      ...outlet,
      articleCount: outletArticles.length,
      avgMisinfoScore: parseFloat(avgMisinfo.toFixed(2)),
      stageDist,
      frameDist,
      solutionRate: outletArticles.length
        ? parseFloat(((stageDist["Solutions"] / outletArticles.length) * 100).toFixed(1))
        : 0,
    };
  });
}

export function getFrameBySector() {
  return SECTORS.map((sector) => {
    const sectorArticles = ARTICLES.filter((a) => a.sector === sector);
    const entry: Record<string, string | number> = { sector };
    FRAMES.forEach((f) => {
      entry[f] = sectorArticles.filter((a) => a.primaryFrame === f).length;
    });
    return entry;
  });
}

export type OutletStat = ReturnType<typeof getOutletStats>[number];
