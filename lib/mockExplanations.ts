// -----------------------------------------------------------------------------
// Mock explanation generator for word-level attribution highlights.
//
// Misinformation: keyword-based weights (production → keyword lexicon + BERT)
// Framing:        SHAP/attention-style weights (production → BERT + SHAP/LIME)
// -----------------------------------------------------------------------------

import type { Article, Frame } from "./mockData";

export interface Token {
  text: string;         // raw token including surrounding punctuation
  misinfoWeight: number; // 0–1 contribution to misinfo score
  framingWeight: number; // 0–1 contribution to primary frame score
  isWhitespace: boolean;
}

// -- Signal dictionaries -------------------------------------------------------

const MISINFO_SIGNALS: Record<string, number> = {
  myth: 0.91, hoax: 0.93, fabricated: 0.88, conspiracy: 0.9,
  false: 0.77, fake: 0.84, disputed: 0.61, contested: 0.57,
  misleading: 0.75, alarmist: 0.72, exaggerated: 0.64,
  manipulated: 0.7, unproven: 0.66, discredited: 0.81,
  natural: 0.43, cycle: 0.4, pause: 0.51, overestimated: 0.6,
  uncertain: 0.31, unclear: 0.27, unlikely: 0.37, alleged: 0.54,
  supposedly: 0.57, propaganda: 0.78, alarmism: 0.73,
  claim: 0.41, claims: 0.41, so: 0.18,
  characterises: 0.38, inertia: 0.29, structural: 0.22,
};

const FRAME_SIGNALS: Record<Frame, Record<string, number>> = {
  "Attribution of Responsibility": {
    government: 0.86, policy: 0.81, officials: 0.77, responsible: 0.9,
    failure: 0.73, blame: 0.87, accountability: 0.82, authorities: 0.76,
    minister: 0.72, regulation: 0.67, parliament: 0.7, state: 0.61,
    should: 0.47, must: 0.51, inadequate: 0.7, negligence: 0.83,
    regulatory: 0.74, frameworks: 0.62, policymakers: 0.79, governance: 0.75,
  },
  "Human Interest": {
    family: 0.91, community: 0.87, personal: 0.76, lives: 0.72,
    people: 0.6, story: 0.66, affected: 0.81, struggle: 0.77,
    daily: 0.62, residents: 0.83, children: 0.87, suffering: 0.9,
    local: 0.68, households: 0.8, farmers: 0.71, neighbors: 0.75,
    anxiety: 0.77, inherit: 0.72, communities: 0.83, spokesperson: 0.65,
  },
  "Conflict": {
    debate: 0.82, opposition: 0.87, dispute: 0.83, fight: 0.78,
    against: 0.61, clash: 0.9, battle: 0.86, confrontation: 0.91,
    lobby: 0.77, protest: 0.82, resistance: 0.76, blocking: 0.81,
    disagreement: 0.85, standoff: 0.88, divided: 0.7, polarised: 0.84,
    lobbies: 0.8, locked: 0.52, intensified: 0.67, protests: 0.82,
  },
  "Morality": {
    moral: 0.92, ethical: 0.87, values: 0.82, duty: 0.78,
    obligation: 0.83, justice: 0.87, fairness: 0.82, right: 0.53,
    wrong: 0.61, must: 0.56, responsibility: 0.71, generation: 0.66,
    conscience: 0.88, principles: 0.78, integrity: 0.81, unjust: 0.86,
    intergenerational: 0.89, inaction: 0.74, self: 0.31,
  },
  "Economic Consequences": {
    cost: 0.82, economic: 0.87, market: 0.78, investment: 0.83,
    price: 0.73, billion: 0.78, million: 0.68, gdp: 0.86,
    growth: 0.62, industry: 0.72, financial: 0.82, budget: 0.77,
    jobs: 0.78, employment: 0.73, profit: 0.67, competitive: 0.74,
    subsidy: 0.76, revenue: 0.7, losses: 0.8, expensive: 0.71,
    stranded: 0.77, capital: 0.69, assets: 0.73, modelling: 0.64,
  },
};

// -- Body text templates -------------------------------------------------------

const FRAME_PARAGRAPHS: Partial<Record<Frame, (a: Article) => string>> = {
  "Attribution of Responsibility": (a) =>
    `Government officials and regulatory bodies have come under increasing scrutiny over their handling of ${(a.sector ?? "environmental").toLowerCase()} sector emissions. Critics argue that policy failures at both national and European levels are directly responsible for the gap between stated climate commitments and actual outcomes. The minister responsible for the energy transition acknowledged "inadequate progress" but attributed delays to parliamentary resistance and insufficient budget allocations. Accountability mechanisms remain weak, and governance frameworks are widely seen as unfit for the pace of change required.`,

  "Human Interest": (a) =>
    `For families living near ${(a.sector ?? "environmental").toLowerCase()} infrastructure, the consequences are neither abstract nor distant. Local residents describe daily struggles with air quality, rising utility costs, and the anxiety of watching ecosystems they depend upon degrade year after year. "Our children will inherit whatever we leave behind," said one community spokesperson. Stories like these are increasingly difficult to ignore as affected households seek accountability from those shaping policy with little understanding of what people experience on the ground.`,

  "Conflict": (a) =>
    `The debate over ${(a.sector ?? "environmental").toLowerCase()} policy has intensified, with industry lobbies and environmental organisations locked in a prolonged standoff. Opposition MPs have accused the government of capitulating to corporate interests, while business representatives argue that proposed regulations are economically reckless. Protests outside parliament have grown in frequency, reflecting a broader societal clash over the pace and distribution of the energy transition. The polarised atmosphere and persistent disagreement have made meaningful cross-party consensus difficult to achieve.`,

  "Morality": () =>
    `At the heart of this controversy lies a moral question that neither economic models nor technical reports can fully resolve: what obligation does the present generation owe to those who will inherit a changed climate? Environmental ethicists argue that current frameworks fail to reflect the principles of intergenerational justice. "We have a duty to act with integrity," argued one academic, "not merely to calculate costs and benefits but to recognise the ethical weight of inaction." This framing has resonated with civil society groups who emphasise values and conscience over economic self-interest.`,

  "Economic Consequences": (a) =>
    `The financial stakes of inaction are becoming increasingly difficult to dismiss. New economic modelling suggests that delays in ${(a.sector ?? "environmental").toLowerCase()} decarbonisation could cost the French economy upwards of €14 billion annually by 2035, as stranded assets, healthcare burdens, and infrastructure damage accumulate. Market analysts warn that investment in fossil-fuel-dependent industry is increasingly risky, while green finance instruments continue to attract record capital. Jobs in legacy sectors may be threatened, but the transition is projected to generate significant new employment if managed effectively.`,
};

function generateBodyText(article: Article): string {
  const sector = article.sector ?? "environmental";
  const crisisDomain = article.crisisDomain ?? "climate";
  const stage = article.stage ?? "general";
  const { keywords, title } = article;
  const kw0 = keywords[0] ?? "emissions";
  const kw1 = keywords[1] ?? "policy";

  const intro =
    `${title}. A review of ${sector.toLowerCase()} sector developments across France and Belgium reveals a complex picture of stalled commitments, disputed data, and contested policy choices. Coverage of ${crisisDomain.toLowerCase()} issues in this domain has grown substantially over the past twelve months, reflecting both the urgency of the challenge and the difficulty of translating scientific consensus into government action.`;

  const mainClaims =
    `Current levels of ${kw0} in the ${sector.toLowerCase()} sector remain a subject of considerable debate. Some researchers contend that official statistics overestimated the progress made, pointing to a methodological gap that has allowed policymakers to claim credit for reductions that have not yet materialised. Advocates for faster action describe this pattern as misleading and argue that so-called progress on ${kw1} masks underlying structural inertia. The government characterises these assessments as alarmist claims, insisting that its regulatory framework is sound and that disputed projections reflect activist agendas rather than rigorous science.`;

  const frameFn = article.primaryFrame != null ? FRAME_PARAGRAPHS[article.primaryFrame] : undefined;
  const frameParagraph = frameFn ? frameFn(article) : "";

  const stakeholders =
    `Industry stakeholders have presented their own analysis, arguing that the cost of accelerated transition would be disproportionate and could threaten employment in regions already facing economic hardship. Trade associations representing the ${sector.toLowerCase()} sector have lobbied parliament to extend compliance timelines, citing uncertain investment conditions and the need for a level playing field with international competitors. Environmental organisations contest this framing, noting that economic losses from delay far exceed the costs of timely action and that claims of job losses are routinely exaggerated to resist change.`;

  const conclusion =
    `As ${stage.toLowerCase()} continues to define the terms of the ${crisisDomain.toLowerCase()} discussion, the question of who bears responsibility—and who bears the costs—remains unresolved. What is increasingly clear is that the gap between political commitments and verifiable action is widening, and that the communities most exposed to the consequences have the least influence over the decisions that shape their futures. Future reporting will need to address not only technical dimensions of ${kw0} management but the deeper governance failures that allow these patterns to persist.`;

  return [intro, mainClaims, frameParagraph, stakeholders, conclusion].filter(Boolean).join("\n\n");
}

// -- Deterministic noise -------------------------------------------------------

function stableRand(seed: number): number {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d);
  s = Math.imul(s ^ (s >>> 12), 0x297a2d39);
  s = (s ^ (s >>> 15)) >>> 0;
  return s / 4294967296;
}

function articleSeed(id: string): number {
  return id.split("").reduce((acc, c, i) => (acc + c.charCodeAt(0) * (i + 1)) | 0, 0);
}

// -- Public API ----------------------------------------------------------------

export function getArticleExplanation(article: Article): {
  bodyText: string;
  tokens: Token[];
} {
  const bodyText = generateBodyText(article);
  const seed = articleSeed(article.id);
  const frameSignals = article.primaryFrame != null ? (FRAME_SIGNALS[article.primaryFrame] ?? {}) : {};

  // Preserve whitespace by splitting on it (keeping delimiters)
  const rawParts = bodyText.split(/(\s+)/);

  let wordIdx = 0;
  const tokens: Token[] = rawParts
    .filter((p) => p.length > 0)
    .map((part) => {
      if (/^\s+$/.test(part)) {
        return { text: part, misinfoWeight: 0, framingWeight: 0, isWhitespace: true };
      }

      const clean = part.toLowerCase().replace(/[^a-z0-9'-]/g, "");
      const wi = wordIdx++;

      // --- Misinformation weight ---
      const mBase = MISINFO_SIGNALS[clean] ?? 0;
      const mNoise = stableRand(seed * 3 + wi * 7) * 0.18 * (article.misinformationScore ?? 0);
      let mw = mBase > 0
        ? Math.min(1, mBase * (0.6 + (article.misinformationScore ?? 0) * 0.7) + stableRand(seed + wi) * 0.07)
        : mNoise;

      // --- Framing weight ---
      const primaryFrameScore = article.primaryFrame != null ? (article.frameScores[article.primaryFrame] ?? 0) : 0;
      const fBase = frameSignals[clean] ?? 0;
      const fNoise = stableRand(seed * 5 + wi * 11 + 9999) * 0.15 * primaryFrameScore;
      let fw = fBase > 0
        ? Math.min(1, fBase * (0.55 + primaryFrameScore * 0.75) + stableRand(seed * 2 + wi) * 0.06)
        : fNoise;

      return {
        text: part,
        misinfoWeight: parseFloat(mw.toFixed(3)),
        framingWeight: parseFloat(fw.toFixed(3)),
        isWhitespace: false,
      };
    });

  return { bodyText, tokens };
}
