import React, { useState, useEffect, useMemo } from "react";

/* ============ STORAGE SHIM (synced pipeline via /api/pipeline) ============ */
/* Mirrors the old storage get/set shape so component logic is unchanged. */
const storage = {
  async get() {
    const r = await fetch("/api/pipeline", { credentials: "same-origin" });
    if (!r.ok) throw new Error("pipeline unavailable");
    return await r.json(); // { value: "<json string>" | null }
  },
  async set(_key, value) {
    const r = await fetch("/api/pipeline", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!r.ok) throw new Error("pipeline write failed");
  },
};

/* ============ DESIGN TOKENS ============ */
const T = {
  paper: "#EDF0F3",
  card: "#FFFFFF",
  ink: "#15202D",
  steel: "#5B6B7C",
  line: "#D6DDE4",
  orange: "#F4570F",
  orangeSoft: "#FFE8DC",
};

const CATS = {
  "Economic Buyer": { c: "#1D4ED8", bg: "#E4ECFF", desc: "Owns the budget. Signs off on spend." },
  "Decision Maker": { c: "#C2410C", bg: "#FFE8DC", desc: "Picks the vendor. Owns the outcome." },
  "Influencer": { c: "#0E7490", bg: "#DFF4F8", desc: "Shapes the shortlist. Daily user of the result." },
  "Technical Approver": { c: "#475569", bg: "#E7EBEF", desc: "Validates integration, data, systems fit." },
  "Gatekeeper": { c: "#6D28D9", bg: "#EEE7FC", desc: "Controls access and process (procurement, EA)." },
  "Blocker Risk": { c: "#B91C1C", bg: "#FCE5E5", desc: "Compliance / risk. Can kill a deal late." },
  "Champion": { c: "#15803D", bg: "#E2F5E8", desc: "Sells for you internally when you're not in the room." },
};

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap";

/* ============ SECTOR DATA ============ */
const SECTORS = [
  {
    id: "fleet",
    name: "Corporate & Rental Fleets",
    code: "FLT",
    tagline: "Recurring lane volume. Rebalancing, employee relocation, de-fleeting cycles.",
    cycle: "6–12 month cycle. Annual carrier/vendor reviews, often Q4 budget season. Pilots in 1–2 regions before national rollout. Scorecard-driven renewals.",
    wedge: "Offer a 90-day regional pilot against their current transport spend with SLA and damage-rate reporting they can put in front of their VP.",
    dynamics: [
      "Buying is metric-driven: cost-per-move, days-out-of-service, damage frequency. Bring data or don't show up.",
      "FMCs (Element, Wheels, Mike Albert) sit between you and many corporate fleets — they can be the customer or the channel.",
      "Rental majors rebalance constantly between markets; seasonal surges (snowbird, summer) are predictable wedges.",
      "EV transitions are forcing fleets to move vehicles to charging-ready locations — a new lane type incumbents handle poorly.",
    ],
    keywords: ["fleet", "rebalancing", "de-fleet", "FMC", "uptime", "cost-per-move", "EV transition", "relocation"],
  },
  {
    id: "lender",
    name: "Banks, Lenders & Repo",
    code: "LND",
    tagline: "Repossession recovery-to-auction transport. Days-to-disposition is the religion.",
    cycle: "3–9 months. Vendor onboarding is compliance-heavy (insurance, CFPB exposure, data handling). Often routed through repo forwarders. Quarterly business reviews once live.",
    wedge: "Attack the recovery-to-auction gap: every day a repo sits in a tow yard is depreciation plus storage fees. Quote impact in basis points of loss severity.",
    dynamics: [
      "Lenders measure everything in days-to-disposition and net recovery rate. Faster transport = direct P&L impact.",
      "Forwarders (PAR North America, ALS Resolvion type players) control much of the workflow — decide whether to sell to them, through them, or around them.",
      "Compliance kills deals late: wrongful-repo exposure means they vet carrier insurance, chain of custody, and condition reporting hard.",
      "Subprime lenders (Westlake, Credit Acceptance, Exeter) have the highest repo volume and feel loss severity most — they move faster than money-center banks.",
    ],
    keywords: ["repo", "remarketing", "days-to-disposition", "loss severity", "forwarder", "chain of custody", "compliance", "net recovery"],
  },
  {
    id: "auction",
    name: "Auctions & Remarketing",
    code: "AUC",
    tagline: "The volume center of gravity. Inbound/outbound lanes, buyer-side delivery.",
    cycle: "1–6 months for marketplace/dealer-services deals; faster than any other sector. Digital auction platforms ship features quarterly and onboard vendors fast.",
    wedge: "Buyer-side delivery is the open flank: dealers buying online need cars moved now. Plug into platform buyer workflows or capture dealers directly post-sale.",
    dynamics: [
      "Cox owns Central Dispatch and Ready Logistics — at Manheim you're competing with the house. Differentiate on service tiers they won't touch.",
      "Digital-first platforms (ACV, OPENLANE, EBlock) are structurally early adopters, but several run transport in-house. ACV Transportation fields a 3,000+ carrier network, so sell capacity into their board or go direct to dealers, don't pitch a platform.",
      "Salvage (Copart, IAA) is its own world: inop vehicles, specialized equipment, CAT events create massive surge demand.",
      "Catastrophe response (hail, flood, hurricane) is a recurring surge market — being on the pre-approved surge list prints money.",
    ],
    keywords: ["auction", "buyer-side delivery", "inop", "salvage", "digital marketplace", "surge", "CAT event", "dealer services"],
  },
  {
    id: "gov",
    name: "Government & Municipal",
    code: "GOV",
    tagline: "Slow to win, nearly impossible to lose. GSA, state surplus, municipal fleets, police vehicles.",
    cycle: "9–24 months. SAM.gov registration, GSA Schedule or state vendor lists, sealed bids/RFPs. Incumbent advantage is enormous once you're in.",
    wedge: "Start small: state surplus auctions and municipal fleet moves go through simplified procurement under bid thresholds. Build past-performance record, then climb to GSA.",
    dynamics: [
      "Compliance IS the sale: SAM registration, insurance minimums, prevailing wage, sometimes small-business set-asides decide who can even bid.",
      "Past performance references are the currency — one county contract unlocks the next five.",
      "GSA Fleet moves thousands of vehicles annually between agencies and to auction; getting on schedule is a multi-year asset.",
      "Police/emergency vehicle upfitting creates point-to-point moves (chassis → upfitter → agency) that locals handle badly.",
    ],
    keywords: ["GSA", "SAM.gov", "RFP", "surplus", "set-aside", "past performance", "municipal", "upfitter"],
  },
];

/* ============ STAKEHOLDER ARCHETYPES ============ */
const STAKEHOLDERS = [
  // FLEET
  { sector: "fleet", role: "VP / Director of Fleet Operations", cat: "Decision Maker", inf: 9, sup: 6,
    background: "Came up through ops or logistics. Often NAFA-certified (CAFM). 10–20 yrs in fleet.",
    signal: "Career built on uptime and cost control → buys on reliability proof, not pitch decks. Burned by carriers before; references and SLA history outweigh price.",
    approach: "Lead with damage rate, on-time %, and a named reference in their vertical. Offer a measured pilot, not a contract.",
    keywords: ["NAFA", "uptime", "SLA", "pilot"] },
  { sector: "fleet", role: "Fleet / Logistics Coordinator", cat: "Influencer", alt: "Champion", inf: 4, sup: 8,
    background: "Hands-on dispatcher of vehicle moves. Lives in spreadsheets and carrier phone calls.",
    signal: "Their daily pain is your product → fastest path to a champion. They feel every late truck and every claim form personally.",
    approach: "Make their day easier: single point of contact, real-time tracking, no chasing carriers. They'll escalate you upward.",
    keywords: ["dispatch", "tracking", "champion"] },
  { sector: "fleet", role: "CFO / VP Finance", cat: "Economic Buyer", inf: 8, sup: 4,
    background: "Finance career, views fleet as a cost center to compress.",
    signal: "Thinks in total cost of ownership and quarter-over-quarter trend → wins on consolidated invoicing, predictable rates, and a cost-per-move chart going down and to the right.",
    approach: "One-page business case: current spend vs. your model, with the soft costs (admin hours, claims) quantified.",
    keywords: ["TCO", "cost center", "consolidation"] },
  { sector: "fleet", role: "Procurement / Strategic Sourcing", cat: "Gatekeeper", inf: 6, sup: 5,
    background: "Professional buyer. Runs RFPs, scorecards, vendor risk reviews.",
    signal: "Rewarded for process and savings, not outcomes → will commoditize you if you let them define the category. Engage before the RFP is written.",
    approach: "Help them write the requirements (SLA tiers, damage thresholds) so the RFP describes you. Have COI, W-9, references packaged and instant.",
    keywords: ["RFP", "scorecard", "vendor onboarding"] },
  { sector: "fleet", role: "FMC Account / Supply Chain Manager", cat: "Influencer", alt: "Gatekeeper", inf: 7, sup: 5,
    background: "Works at Element/Wheels/Mike Albert type FMC managing client fleets.",
    signal: "An aggregator, not an end user → buys capacity and coverage. One FMC relationship = dozens of fleets, but margins compress.",
    approach: "Pitch network coverage and exception handling. Decide consciously: channel partner or competitor for the same client.",
    keywords: ["FMC", "channel", "coverage"] },
  { sector: "fleet", role: "Fleet Systems / FMIS & Telematics Manager", cat: "Technical Approver", inf: 6, sup: 5,
    background: "Owns the fleet management information system and telematics stack (AssetWorks, Fleetio, Geotab/Samsara). IT-adjacent fleet role.",
    signal: "Hates manual status updates and duplicate data entry → buys on whether your move status and condition data feed into their FMIS automatically. Integration turns you from vendor into plumbing.",
    approach: "Bring an integration story: API or file feed of pickup/delivery status and damage photos into their system. Make manual carrier-chasing the thing you remove.",
    keywords: ["FMIS", "telematics", "integration", "API"] },
  { sector: "fleet", role: "Risk & Safety Manager", cat: "Blocker Risk", inf: 6, sup: 3,
    background: "Owns insurance, liability, and damage-claim exposure for the fleet. Audit or safety background.",
    signal: "One uninsured loss or damaged-vehicle claim becomes their problem → vets carrier cargo coverage, MC/DOT authority, and the claims process before sign-off. Engages late and can freeze a deal.",
    approach: "Pre-empt with cargo COI limits, carrier-vetting standards, and a written damage-claim SLA before they ask. Remove the reason to say no.",
    keywords: ["insurance", "liability", "cargo COI", "damage claims"] },
  // LENDER
  { sector: "lender", role: "VP Remarketing / Asset Recovery", cat: "Decision Maker", inf: 9, sup: 6,
    background: "Often ex-auction (Manheim/ADESA alumni network is tight). Owns net recovery rate.",
    signal: "Auction background → relationship-driven buyer who moves on trust and industry reputation. Comp'd on recovery metrics, so speed-to-sale arguments land hard.",
    approach: "Speak in their metric: days-to-disposition. Show transport compression of 3–5 days = X bps of loss severity. Work IARA / NAF conferences where this network lives.",
    keywords: ["remarketing", "IARA", "days-to-disposition", "recovery"] },
  { sector: "lender", role: "Repo / Recovery Operations Manager", cat: "Influencer", alt: "Champion", inf: 5, sup: 7,
    background: "Manages forwarder and agent network day to day. Constant fire-fighting.",
    signal: "Measured on aging inventory in tow yards → anything that clears the yard faster makes them look good. Natural internal advocate.",
    approach: "Offer yard-sweep programs and aging-unit reports. Be the easy button for their stuck inventory.",
    keywords: ["tow yard", "aging", "forwarder"] },
  { sector: "lender", role: "Chief Risk / Compliance Officer", cat: "Blocker Risk", inf: 8, sup: 3,
    background: "Legal or audit background. CFPB scar tissue.",
    signal: "One wrongful-repo headline ends careers → will kill a deal over insurance gaps, chain-of-custody holes, or data handling. Engages late and asymmetrically.",
    approach: "Pre-empt: bring carrier vetting standards, $1M+ cargo COI, condition-report photo trail, and data-security one-pager before they ask.",
    keywords: ["CFPB", "chain of custody", "insurance", "audit"] },
  { sector: "lender", role: "Forwarder Vendor Manager", cat: "Gatekeeper", inf: 7, sup: 5,
    background: "Works at a repo forwarder managing the transport/agent panel.",
    signal: "Controls panel access for multiple lender clients → one approval multiplies you across lenders, but they squeeze rates and demand coverage.",
    approach: "Win the panel with coverage in their weak lanes and clean scorecard performance. Treat them as a distribution channel.",
    keywords: ["panel", "forwarder", "coverage"] },
  { sector: "lender", role: "VP Ops / Systems (LOS-Remarketing)", cat: "Technical Approver", inf: 6, sup: 5,
    background: "Owns the loan-servicing and remarketing systems stack.",
    signal: "Hates swivel-chair workflows → API or file-feed integration into their servicing platform is the difference between 'vendor' and 'infrastructure.'",
    approach: "Show integration with their stack (status webhooks, condition photos flowing into their system). Make rip-out painful.",
    keywords: ["API", "integration", "LOS"] },
  // AUCTION
  { sector: "auction", role: "GM, Auction Site / Regional VP", cat: "Decision Maker", inf: 8, sup: 6,
    background: "Ran lanes, arbitration, dealer relations. P&L owner for the site.",
    signal: "Lives and dies by dealer satisfaction and units sold → buys anything that makes buying dealers happier and sale days smoother. Fast, autonomous decisions at site level.",
    approach: "Pitch buyer-side delivery as a dealer-retention tool for their site. Site-level wins stack into corporate conversations.",
    keywords: ["sale day", "dealer satisfaction", "site P&L"] },
  { sector: "auction", role: "VP Dealer Services / Marketplace Product", cat: "Decision Maker", alt: "Technical Approver", inf: 9, sup: 7,
    background: "At digital platforms (ACV, OPENLANE type): product or marketplace background, often tech-industry hires.",
    signal: "Transport is part of their product promise → evaluates you like a feature: API quality, ETA accuracy, NPS impact. Fast cycles, data-driven, will A/B test you against incumbents.",
    approach: "Come with API docs, milestone webhooks, and an SLA you'll be measured on weekly. Speak product language: activation, fill rate, delivery NPS.",
    keywords: ["marketplace", "API", "NPS", "fill rate"] },
  { sector: "auction", role: "Transportation / Logistics Manager (Auction)", cat: "Influencer", alt: "Gatekeeper", inf: 6, sup: 5,
    background: "Manages the carrier board and yard moves. Knows every carrier's sins.",
    signal: "Protective of existing carrier relationships → can quietly block you or quietly feed you loads. Won over by reliability on the ugly loads (inops, distressed lanes) others refuse.",
    approach: "Take the loads nobody wants first. Earn the good lanes through the bad ones.",
    keywords: ["carrier board", "inop", "yard"] },
  { sector: "auction", role: "Salvage Ops Director (Copart/IAA type)", cat: "Decision Maker", inf: 7, sup: 6,
    background: "Insurance-claims or towing-industry background. Surge-event veteran.",
    signal: "CAT events are their Super Bowl → vendors who show up with capacity during hail/hurricane season get year-round loyalty. Equipment capability (winch, forklift, rollback) is the qualifier.",
    approach: "Get on the surge/CAT pre-approved list before the season. Prove inop-handling capability with equipment specs and photos.",
    keywords: ["CAT", "salvage", "surge", "inop"] },
  { sector: "auction", role: "Dealer Relations / Field Sales Rep (Auction/Marketplace)", cat: "Influencer", alt: "Champion", inf: 5, sup: 8,
    background: "Sells auction and marketplace services to franchise and independent dealers. Comp'd on dealer activity and retention, not transport.",
    signal: "Every 'where's my car' call from a dealer lands on them → buyer-side delivery that keeps their dealers buying is a personal quota win. Fastest internal advocate in the building.",
    approach: "Arm them with a delivery-NPS story and a pilot they can hand their top dealers. They carry you up to the GM and the marketplace product team.",
    keywords: ["dealer relations", "retention", "buyer-side", "champion"] },
  // GOV
  { sector: "gov", role: "Fleet Manager (State / County / City)", cat: "Decision Maker", alt: "Champion", inf: 7, sup: 6,
    background: "Public-sector career, often APWA/NAFA member. Long tenure, deep institutional memory.",
    signal: "Risk-averse but loyal → once you're a known vendor with clean performance, they reuse you for decades. Values responsiveness over price within bid rules.",
    approach: "Start with under-threshold purchases (single moves, small batches). Be flawless. Ask them for past-performance letters.",
    keywords: ["municipal", "APWA", "past performance"] },
  { sector: "gov", role: "Procurement / Contracting Officer", cat: "Gatekeeper", inf: 8, sup: 4,
    background: "Civil-service procurement professional. Process is the job.",
    signal: "Cannot legally favor you → but can tell you exactly how to be eligible: registration, bid calendars, set-aside categories. The rules are the relationship.",
    approach: "Ask process questions, not sales questions: 'What vehicle (no pun) does this purchase usually move through?' Get registered everywhere before you need it.",
    keywords: ["RFP", "bid threshold", "SAM.gov", "set-aside"] },
  { sector: "gov", role: "GSA Fleet / Agency Program Analyst", cat: "Influencer", alt: "Technical Approver", inf: 6, sup: 5,
    background: "Federal program management. Thinks in contract vehicles and compliance matrices.",
    signal: "Career safety in compliant vendors → your GSA Schedule status, FAR familiarity, and clean CPARS ratings matter more than any pitch.",
    approach: "Long game: get on schedule (or partner/sub with a holder), then make their reporting easy with clean data and documentation.",
    keywords: ["GSA Schedule", "FAR", "CPARS"] },
  { sector: "gov", role: "Police / Public Safety Fleet Coordinator", cat: "Influencer", alt: "Champion", inf: 5, sup: 7,
    background: "Often sworn-officer or civilian fleet hybrid. Manages upfit pipeline.",
    signal: "Upfit logistics (chassis → upfitter → agency) is a chronic headache → solving the three-leg move makes you indispensable and referenceable across neighboring agencies.",
    approach: "Map their upfitter relationships and offer managed three-leg moves with status reporting their chief can see.",
    keywords: ["upfitter", "public safety", "three-leg"] },
];

/* ============ TARGET BOARD ============ */
const TARGETS = [
  { name: "ACV Auctions", sector: "auction", type: "Digital wholesale marketplace", adopter: 5, impact: 4,
    why: "Tech-DNA marketplace, but transport is already theirs: ACV Transportation runs a 3,000+ carrier network with real-time firm quotes and in-app ETA, now serving off-platform vehicles too. Selling them a delivery platform competes with the house.",
    wedge: "Don't sell the platform. Join their carrier load board (acvauctions.com/haul) and win the lanes their network runs thin: inop/salvage, enclosed, rural, surge. Or capture buying dealers direct post-sale." },
  { name: "OPENLANE", sector: "auction", type: "Digital marketplace (ex-ADESA/KAR digital)", adopter: 5, impact: 4,
    why: "All-digital pivot means every sold unit needs transport with no physical lanes. Actively building logistics network.",
    wedge: "Coverage in underserved lanes; dealer-delivery NPS angle." },
  { name: "Manheim (Cox Automotive)", sector: "auction", type: "Largest physical auction network", adopter: 3, impact: 5,
    why: "Volume king, but Cox owns Ready Logistics & Central Dispatch — you're competing with the house.",
    wedge: "Site-level GMs and buying dealers directly; premium/exception service the house won't do." },
  { name: "Copart", sector: "auction", type: "Salvage auction giant", adopter: 3, impact: 5,
    why: "Massive inop volume and CAT surge events; has in-house towing but always needs overflow.",
    wedge: "CAT-season surge capacity list; inop equipment capability." },
  { name: "EBlock", sector: "auction", type: "Digital auction (dealer-to-dealer)", adopter: 4, impact: 3,
    why: "Growing digital player without entrenched in-house logistics at scale.",
    wedge: "Become the embedded transport option early, before they build or buy one." },
  { name: "Westlake Financial", sector: "lender", type: "Subprime auto lender", adopter: 4, impact: 4,
    why: "High repo volume, entrepreneurial culture, feels loss severity directly. Moves faster than banks.",
    wedge: "Days-to-disposition compression pilot on aging tow-yard inventory." },
  { name: "Credit Acceptance", sector: "lender", type: "Subprime auto lender", adopter: 3, impact: 4,
    why: "Huge repo flow; metric-obsessed culture responds to recovery-rate math.",
    wedge: "Loss-severity basis-points business case to remarketing VP." },
  { name: "Ally Financial", sector: "lender", type: "Major auto lender", adopter: 3, impact: 5,
    why: "One of the largest remarketing operations in the country; lands you instant credibility.",
    wedge: "Likely via forwarder panel first; direct via IARA network relationships." },
  { name: "PAR North America", sector: "lender", type: "Repo forwarder", adopter: 3, impact: 5,
    why: "A panel position here multiplies you across dozens of lender clients at once.",
    wedge: "Coverage in their weak lanes + spotless scorecard; treat as channel." },
  { name: "Santander Consumer USA", sector: "lender", type: "Subprime/near-prime lender", adopter: 3, impact: 4,
    why: "Large repo volume; compliance-heavy post-consent-order culture means strong vetting wins.",
    wedge: "Lead with compliance package: chain of custody, COI, condition reporting." },
  { name: "Merchants Fleet", sector: "fleet", type: "Fleet management company", adopter: 5, impact: 3,
    why: "Publicly positions itself as the innovative FMC; aggressive EV adoption creates new transport lanes.",
    wedge: "EV repositioning + ClientFirst-style service pitch; channel to their client base." },
  { name: "Element Fleet Management", sector: "fleet", type: "Largest FMC in North America", adopter: 3, impact: 5,
    why: "Gateway to hundreds of corporate fleets through one vendor relationship.",
    wedge: "Network coverage + exception handling; long enterprise cycle, start with one service line." },
  { name: "Enterprise Mobility", sector: "fleet", type: "Rental & fleet management giant", adopter: 3, impact: 5,
    why: "Constant rebalancing between markets plus Enterprise Fleet Management client moves.",
    wedge: "Regional rebalancing surge support; seasonal lanes (snowbird, summer)." },
  { name: "Carvana / ADESA", sector: "fleet", type: "Online retail + auction infrastructure", adopter: 4, impact: 4,
    why: "Logistics IS the brand; owns ADESA sites as hubs. Uses in-house haulers but needs carrier overflow.",
    wedge: "Overflow capacity in peak markets; last-mile delivery exceptions." },
  { name: "Hertz / Avis Budget", sector: "fleet", type: "Rental majors", adopter: 2, impact: 4,
    why: "Heavy de-fleeting cycles into auction channels; conservative procurement but huge volume.",
    wedge: "De-fleet lane bids during sell-down cycles; risk-mitigation framing." },
  { name: "GSA Fleet", sector: "gov", type: "Federal fleet (≈200k+ vehicles)", adopter: 2, impact: 5,
    why: "Continuous interagency transfers and auction disposals nationwide. Slow entry, durable revenue.",
    wedge: "GSA Schedule (or subcontract under a holder); start with surplus-auction buyer deliveries." },
  { name: "State Surplus Agencies", sector: "gov", type: "State property disposal programs", adopter: 3, impact: 3,
    why: "Regular vehicle auctions with buyer-delivery gaps; simplified procurement under thresholds.",
    wedge: "Vendor registration + buyer-side delivery partnerships; collect past-performance letters." },
  { name: "Municipal Fleets (top-100 cities)", sector: "gov", type: "City/county fleets", adopter: 2, impact: 3,
    why: "Police upfit pipelines and surplus disposal; under-threshold purchases avoid full RFPs.",
    wedge: "Three-leg upfitter moves; APWA/NAFA chapter presence." },
  { name: "California DGS (Office of Fleet & Asset Management)", sector: "gov", type: "State central fleet & surplus disposal (~50k vehicles)", adopter: 3, impact: 4,
    why: "One of the largest state fleets in the country and a reference that unlocks other states. Statewide ZEV mandate forces vehicles to charging-ready sites, a new lane incumbents handle poorly. Disposes vehicles through state surplus, creating buyer-delivery gaps.",
    wedge: "ZEV repositioning to charging-equipped facilities plus surplus-auction buyer delivery; register on Cal eProcure and start under bid thresholds." },
  { name: "Los Angeles County (Internal Services Dept.)", sector: "gov", type: "Largest U.S. county fleet operation", adopter: 2, impact: 3,
    why: "Internal Services Department runs fleet for ~40 county departments; the Sheriff and public-safety upfit pipeline is constant. One clean county contract becomes the past-performance reference for neighboring counties.",
    wedge: "Under-threshold pilots plus managed three-leg public-safety upfit moves (chassis → upfitter → station)." },
];

/* ============ HELPERS ============ */
const sectorById = (id) => SECTORS.find((s) => s.id === id);

function Dots({ n, max = 5, color = T.orange }) {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: 99, background: i < n ? color : T.line, display: "inline-block" }} />
      ))}
    </span>
  );
}

function Badge({ cat }) {
  const m = CATS[cat] || { c: T.steel, bg: "#EEE" };
  return (
    <span style={{ background: m.bg, color: m.c, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 500, padding: "3px 8px", borderRadius: 4, letterSpacing: 0.4, whiteSpace: "nowrap" }}>
      {cat.toUpperCase()}
    </span>
  );
}

const labelStyle = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: 1.2, color: T.steel, textTransform: "uppercase" };
const h2Style = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, letterSpacing: 0.5, color: T.ink, textTransform: "uppercase", margin: 0 };
const cardStyle = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: 16 };

/* ============ POWER GRID (signature) ============ */
function PowerGrid({ people }) {
  const W = 560, H = 320, P = 42;
  return (
    <div style={{ ...cardStyle, overflowX: "auto" }}>
      <div style={labelStyle}>POWER GRID — INFLUENCE × RECEPTIVITY</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 420, marginTop: 8 }}>
        <rect x={P} y={14} width={W - P - 10} height={H - P - 14} fill="#F7F9FA" rx="6" />
        <line x1={P + (W - P - 10) / 2} y1={14} x2={P + (W - P - 10) / 2} y2={H - P} stroke={T.line} strokeDasharray="4 4" />
        <line x1={P} y1={14 + (H - P - 14) / 2} x2={W - 10} y2={14 + (H - P - 14) / 2} stroke={T.line} strokeDasharray="4 4" />
        <text x={W - 14} y={28} textAnchor="end" fontSize="9.5" fontFamily="'IBM Plex Mono', monospace" fill={T.orange}>WIN THESE FIRST →</text>
        <text x={W - 14} y={H - P - 8} textAnchor="end" fontSize="9.5" fontFamily="'IBM Plex Mono', monospace" fill="#B91C1C">NEUTRALIZE →</text>
        <text x={P / 2} y={H / 2} transform={`rotate(-90 ${P / 2 - 8} ${H / 2})`} fontSize="9.5" fontFamily="'IBM Plex Mono', monospace" fill={T.steel} textAnchor="middle">RECEPTIVITY</text>
        <text x={(W + P) / 2} y={H - 10} fontSize="9.5" fontFamily="'IBM Plex Mono', monospace" fill={T.steel} textAnchor="middle">INFLUENCE / POWER</text>
        {people.map((p, i) => {
          const x = P + ((p.inf - 1) / 9) * (W - P - 30) + 10;
          const y = H - P - ((p.sup - 1) / 9) * (H - P - 34) - 8;
          const m = CATS[p.cat];
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={7} fill={m.c} opacity="0.9" />
              <text x={x} y={y - 11} textAnchor="middle" fontSize="9" fontFamily="Inter, sans-serif" fontWeight="600" fill={T.ink}>
                {p.role.length > 30 ? p.role.slice(0, 28) + "…" : p.role}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: 11.5, color: T.steel, marginTop: 4 }}>
        Top-right = powerful and receptive (build champions). Bottom-right = powerful and skeptical (neutralize early — usually risk, procurement, finance).
      </div>
    </div>
  );
}

/* ============ TABS ============ */
function SectorsTab({ active, setActive }) {
  const s = sectorById(active);
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {SECTORS.map((x) => (
          <button key={x.id} onClick={() => setActive(x.id)}
            style={{ cursor: "pointer", border: `1.5px solid ${active === x.id ? T.orange : T.line}`, background: active === x.id ? T.orangeSoft : T.card, color: active === x.id ? "#C2410C" : T.ink, borderRadius: 8, padding: "8px 12px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: 0.5, textTransform: "uppercase" }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, marginRight: 6, opacity: 0.7 }}>{x.code}</span>
            {x.name}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={cardStyle}>
          <h2 style={h2Style}>{s.name}</h2>
          <div style={{ fontSize: 14, color: T.steel, marginTop: 4 }}>{s.tagline}</div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div>
              <div style={labelStyle}>Buying cycle</div>
              <div style={{ fontSize: 13.5, marginTop: 3 }}>{s.cycle}</div>
            </div>
            <div style={{ background: T.orangeSoft, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ ...labelStyle, color: "#C2410C" }}>Entry wedge</div>
              <div style={{ fontSize: 13.5, marginTop: 3, color: "#7C2D12" }}>{s.wedge}</div>
            </div>
          </div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Sector dynamics</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {s.dynamics.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 13.5 }}>
                <span style={{ color: T.orange, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, paddingTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Keyword filters — use in LinkedIn Sales Nav, news alerts, job postings</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {s.keywords.map((k) => (
              <span key={k} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, background: "#F1F4F7", border: `1px solid ${T.line}`, borderRadius: 5, padding: "4px 8px" }}>{k}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StakeholdersTab() {
  const [sector, setSector] = useState("all");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => STAKEHOLDERS.filter((p) => {
    if (sector !== "all" && p.sector !== sector) return false;
    if (cat !== "all" && p.cat !== cat && p.alt !== cat) return false;
    if (q) {
      const hay = (p.role + " " + p.background + " " + p.signal + " " + p.keywords.join(" ")).toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [sector, cat, q]);

  const sel = { border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: T.card, color: T.ink };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...cardStyle, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={sector} onChange={(e) => setSector(e.target.value)} style={sel}>
          <option value="all">All sectors</option>
          {SECTORS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} style={sel}>
          <option value="all">All categories</option>
          {Object.keys(CATS).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keyword filter (e.g. API, repo, RFP)…" style={{ ...sel, flex: 1, minWidth: 160 }} />
      </div>
      <div style={cardStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {Object.entries(CATS).map(([k, v]) => (
            <div key={k} style={{ fontSize: 11.5, color: T.steel, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: v.c }} />
              <b style={{ color: T.ink }}>{k}:</b> {v.desc}
            </div>
          ))}
        </div>
      </div>
      <PowerGrid people={list.length ? list : STAKEHOLDERS} />
      <div style={{ fontSize: 12, color: T.steel, marginTop: -4 }}>
        These are role archetypes — map the real names you find on LinkedIn / org charts onto them. Backgrounds describe the typical profile, not specific individuals.
      </div>
      {list.map((p, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>{p.role}</div>
              <div style={{ ...labelStyle, marginTop: 2 }}>{sectorById(p.sector).name}</div>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <Badge cat={p.cat} />{p.alt && <Badge cat={p.alt} />}
            </div>
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 12, fontSize: 13.5 }}>
            <div><span style={labelStyle}>Background → </span>{p.background}</div>
            <div style={{ background: "#F7F9FA", borderLeft: `3px solid ${CATS[p.cat].c}`, borderRadius: "0 6px 6px 0", padding: "8px 10px" }}>
              <span style={labelStyle}>What it signals → </span>{p.signal}
            </div>
            <div><span style={labelStyle}>Your play → </span>{p.approach}</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: T.steel }}>Influence <Dots n={Math.round(p.inf / 2)} color={T.ink} /></span>
              <span style={{ fontSize: 11.5, color: T.steel }}>Receptivity <Dots n={Math.round(p.sup / 2)} color="#15803D" /></span>
              <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {p.keywords.map((k) => <span key={k} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, background: "#F1F4F7", borderRadius: 4, padding: "2px 6px" }}>{k}</span>)}
              </span>
            </div>
          </div>
        </div>
      ))}
      {!list.length && <div style={{ ...cardStyle, color: T.steel, fontSize: 13.5 }}>No archetypes match those filters. Clear a filter to widen the net.</div>}
    </div>
  );
}

function TargetsTab({ onPick }) {
  const [sector, setSector] = useState("all");
  const [sort, setSort] = useState("adopter");
  const list = useMemo(() => {
    let l = TARGETS.filter((t) => sector === "all" || t.sector === sector);
    return [...l].sort((a, b) => (b[sort] - a[sort]) || (b.adopter + b.impact - a.adopter - a.impact));
  }, [sector, sort]);
  const sel = { border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: T.card, color: T.ink };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...cardStyle, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={sector} onChange={(e) => setSector(e.target.value)} style={sel}>
          <option value="all">All sectors</option>
          {SECTORS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={sel}>
          <option value="adopter">Sort: Early-adopter score</option>
          <option value="impact">Sort: Market impact</option>
        </select>
      </div>
      <div style={{ fontSize: 12, color: T.steel }}>
        Early adopters validate fast and reference loudly — win them first, then use their logo to take the high-impact conservative accounts. Verify current org details before outreach; this board is a starting map, not a live database.
      </div>
      {list.map((t) => (
        <div key={t.name} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: T.steel }}>{t.type} · {sectorById(t.sector).name}</div>
            </div>
            <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
              <span style={{ fontSize: 10.5, ...labelStyle }}>ADOPTER <Dots n={t.adopter} /></span>
              <span style={{ fontSize: 10.5, ...labelStyle }}>IMPACT <Dots n={t.impact} color={T.ink} /></span>
            </div>
          </div>
          <div style={{ fontSize: 13.5, marginTop: 10 }}><span style={labelStyle}>Why → </span>{t.why}</div>
          <div style={{ fontSize: 13.5, marginTop: 6 }}><span style={{ ...labelStyle, color: "#C2410C" }}>Wedge → </span>{t.wedge}</div>
          <button onClick={() => onPick(t)} style={{ marginTop: 12, cursor: "pointer", background: T.ink, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 15, letterSpacing: 0.8, textTransform: "uppercase" }}>
            Build strategy →
          </button>
        </div>
      ))}
    </div>
  );
}

function StrategyTab({ prefill, onSaved }) {
  const [company, setCompany] = useState(prefill?.name || "");
  const [sector, setSector] = useState(prefill?.sector || "fleet");
  const [solution, setSolution] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [out, setOut] = useState(null);

  useEffect(() => {
    if (prefill) { setCompany(prefill.name); setSector(prefill.sector); }
  }, [prefill]);

  const run = async () => {
    if (!company.trim() || !solution.trim()) { setErr("Enter a company and describe what you're selling."); return; }
    setErr(""); setLoading(true); setOut(null);
    const s = sectorById(sector);
    const roles = STAKEHOLDERS.filter((p) => p.sector === sector);
    const prompt = `You are an enterprise sales strategist for an auto transport brokerage.
Target company: ${company}
Sector: ${s.name}. Sector dynamics: ${s.dynamics.join(" | ")}
Typical buying cycle: ${s.cycle}
Stakeholder archetypes at companies like this: ${roles.map((r) => `${r.role} [${r.cat}]: ${r.signal}`).join(" || ")}
Solution being sold: ${solution}

Build an account strategy. Respond with ONLY valid JSON, no markdown fences, no preamble, exactly this shape:
{"positioning":"one-sentence positioning statement","entrySequence":["step 1","step 2","step 3","step 4"],"stakeholderPlays":[{"who":"role + category","play":"specific tactic"}],"discovery":["q1","q2","q3"],"objections":[{"objection":"...","response":"..."}],"proofPoints":["...","..."],"timeline":"expected cycle and milestones in one or two sentences"}
Keep every string under 45 words. 3-5 items per array. Be concrete and specific to this company type and sector.`;
    try {
      const r = await fetch("/api/strategy", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!r.ok) throw new Error("strategy request failed");
      const data = await r.json();
      const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setOut(parsed);
    } catch (e) {
      setErr("Strategy engine couldn't generate this one — try again, or simplify the solution description.");
    } finally { setLoading(false); }
  };

  const save = async () => {
    if (!out) return;
    try {
      let arr = [];
      try {
        const ex = await storage.get("atb-pipeline");
        if (ex?.value) arr = JSON.parse(ex.value);
      } catch (e) { /* key may not exist yet */ }
      arr.unshift({ id: Date.now(), company, sector, solution, strategy: out, savedAt: new Date().toISOString() });
      await storage.set("atb-pipeline", JSON.stringify(arr.slice(0, 50)));
      onSaved && onSaved();
    } catch (e) { setErr("Couldn't save to pipeline — storage unavailable right now."); }
  };

  const sel = { border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 10px", fontSize: 13.5, background: T.card, width: "100%", color: T.ink, boxSizing: "border-box" };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle}>
        <h2 style={h2Style}>Strategy Engine</h2>
        <div style={{ fontSize: 13, color: T.steel, marginTop: 4 }}>Name the account, describe what you're selling — get a stakeholder-by-stakeholder attack plan built from the sector playbook.</div>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (e.g. ACV Auctions)" style={sel} />
            <select value={sector} onChange={(e) => setSector(e.target.value)} style={sel}>
              {SECTORS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <textarea value={solution} onChange={(e) => setSolution(e.target.value)} rows={3} placeholder="What are you selling? (e.g. Dedicated buyer-side delivery program: 5-day SLA, real-time tracking, single invoice, claims under 0.5%)" style={{ ...sel, resize: "vertical", fontFamily: "Inter, sans-serif" }} />
          <button onClick={run} disabled={loading} style={{ cursor: "pointer", background: loading ? T.steel : T.orange, color: "#fff", border: "none", borderRadius: 8, padding: "11px 16px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: 1, textTransform: "uppercase" }}>
            {loading ? "Mapping the account…" : "Generate strategy"}
          </button>
          {err && <div style={{ color: "#B91C1C", fontSize: 13 }}>{err}</div>}
        </div>
      </div>
      {out && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ ...cardStyle, borderLeft: `4px solid ${T.orange}` }}>
            <div style={labelStyle}>Positioning</div>
            <div style={{ fontSize: 15.5, fontWeight: 600, marginTop: 4 }}>{out.positioning}</div>
            {out.timeline && <div style={{ fontSize: 12.5, color: T.steel, marginTop: 8 }}><b>Timeline:</b> {out.timeline}</div>}
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Entry sequence</div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {(out.entrySequence || []).map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, fontSize: 13.5 }}>
                  <span style={{ color: T.orange, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 11, paddingTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Stakeholder plays</div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {(out.stakeholderPlays || []).map((p, i) => (
                <div key={i} style={{ fontSize: 13.5, background: "#F7F9FA", borderRadius: 7, padding: "9px 11px" }}>
                  <b>{p.who}</b> — {p.play}
                </div>
              ))}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Discovery questions</div>
            <div style={{ display: "grid", gap: 6, marginTop: 8, fontSize: 13.5 }}>
              {(out.discovery || []).map((q, i) => <div key={i}>· {q}</div>)}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Objections & responses</div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {(out.objections || []).map((o, i) => (
                <div key={i} style={{ fontSize: 13.5 }}>
                  <div style={{ color: "#B91C1C", fontWeight: 600 }}>"{o.objection}"</div>
                  <div style={{ marginTop: 2 }}>{o.response}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Proof points to build / bring</div>
            <div style={{ display: "grid", gap: 6, marginTop: 8, fontSize: 13.5 }}>
              {(out.proofPoints || []).map((p, i) => <div key={i}>· {p}</div>)}
            </div>
          </div>
          <button onClick={save} style={{ cursor: "pointer", background: T.ink, color: "#fff", border: "none", borderRadius: 8, padding: "11px 16px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: "uppercase" }}>
            Save to pipeline
          </button>
        </div>
      )}
    </div>
  );
}

function PipelineTab() {
  const [items, setItems] = useState(null);
  const load = async () => {
    try {
      const r = await storage.get("atb-pipeline");
      setItems(r?.value ? JSON.parse(r.value) : []);
    } catch (e) { setItems([]); }
  };
  useEffect(() => { load(); }, []);
  const remove = async (id) => {
    const next = items.filter((x) => x.id !== id);
    setItems(next);
    try { await storage.set("atb-pipeline", JSON.stringify(next)); } catch (e) {}
  };
  if (items === null) return <div style={{ ...cardStyle, color: T.steel }}>Loading pipeline…</div>;
  if (!items.length) return (
    <div style={cardStyle}>
      <h2 style={h2Style}>Pipeline</h2>
      <div style={{ fontSize: 13.5, color: T.steel, marginTop: 6 }}>Nothing saved yet. Generate a strategy in the Strategy Engine and save it — it'll persist here across sessions.</div>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((it) => (
        <div key={it.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>{it.company}</div>
              <div style={{ fontSize: 12, color: T.steel }}>{sectorById(it.sector)?.name} · saved {new Date(it.savedAt).toLocaleDateString()}</div>
            </div>
            <button onClick={() => remove(it.id)} style={{ cursor: "pointer", background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: T.steel }}>Remove</button>
          </div>
          <div style={{ fontSize: 12.5, color: T.steel, marginTop: 6 }}><b>Selling:</b> {it.solution}</div>
          <div style={{ fontSize: 13.5, marginTop: 8, borderLeft: `3px solid ${T.orange}`, paddingLeft: 10 }}>{it.strategy?.positioning}</div>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 12.5, color: T.orange, fontWeight: 600 }}>Full plan</summary>
            <div style={{ display: "grid", gap: 8, marginTop: 8, fontSize: 13 }}>
              <div><b>Entry:</b> {(it.strategy?.entrySequence || []).map((s, i) => `${i + 1}. ${s}`).join("  ")}</div>
              {(it.strategy?.stakeholderPlays || []).map((p, i) => <div key={i}><b>{p.who}:</b> {p.play}</div>)}
              {(it.strategy?.objections || []).map((o, i) => <div key={i}><b>"{o.objection}"</b> → {o.response}</div>)}
            </div>
          </details>
        </div>
      ))}
    </div>
  );
}

/* ============ APP ============ */
export default function AccountCommandCenter() {
  const [tab, setTab] = useState("sectors");
  const [activeSector, setActiveSector] = useState("auction");
  const [prefill, setPrefill] = useState(null);

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = FONT_LINK;
    document.head.appendChild(l);
    return () => document.head.removeChild(l);
  }, []);

  const tabs = [
    ["sectors", "Sector Playbooks"],
    ["stakeholders", "Stakeholder Map"],
    ["targets", "Target Board"],
    ["strategy", "Strategy Engine"],
    ["pipeline", "Pipeline"],
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: T.ink, padding: "18px 16px 0" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: 2, color: T.orange }}>LANE ONE /// ENTERPRISE DESK</span>
          </div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 38, letterSpacing: 1, color: "#fff", textTransform: "uppercase", margin: "4px 0 2px" }}>
            Account Command Center
          </h1>
          <div style={{ color: "#9FB0C0", fontSize: 13, paddingBottom: 14 }}>
            Auto transport brokerage — fleets · lenders & repo · auctions · government
          </div>
          <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
            {tabs.map(([id, name]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ cursor: "pointer", whiteSpace: "nowrap", border: "none", background: tab === id ? T.paper : "transparent", color: tab === id ? T.ink : "#9FB0C0", borderRadius: "8px 8px 0 0", padding: "10px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: 0.8, textTransform: "uppercase" }}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 16px 48px" }}>
        {tab === "sectors" && <SectorsTab active={activeSector} setActive={setActiveSector} />}
        {tab === "stakeholders" && <StakeholdersTab />}
        {tab === "targets" && <TargetsTab onPick={(t) => { setPrefill({ name: t.name, sector: t.sector, ts: Date.now() }); setTab("strategy"); }} />}
        {tab === "strategy" && <StrategyTab prefill={prefill} onSaved={() => setTab("pipeline")} />}
        {tab === "pipeline" && <PipelineTab />}
      </div>
    </div>
  );
}
