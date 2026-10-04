#!/usr/bin/env node
// Builds the `person` half of the letter recipient list from two public registers:
//
//   - Riksdagen's member register (data.riksdagen.se/personlista) — currently serving MPs,
//     with their official riksdagen.se address, party, constituency and committees.
//   - The European Parliament's open data API (data.europarl.europa.eu) — Swedish MEPs,
//     with their europarl.europa.eu address, political group and committees.
//
// Both give addresses that belong to a public role, which is the only kind of personal
// address the council writes to (see docs/council-letters.md). A person receives exactly one
// letter ever, so entries carry `limits: { once: true }`.
//
// Topics come from committee remit, never from party: a being picks a recipient by what they
// decide on and where they are elected. Entries with no matching remit are written out
// inactive, so curation can see them and decide.
//
//   node scripts/letters/fetch-people.mjs [--out shared/prompts/letters/people-parliament.json]
//
// Re-run when a parliament changes (an election, a new committee round). The register is the
// source of truth; hand edits to the output file are lost on the next run.

import { writeFile } from "node:fs/promises";

const RIKSDAG_URL = "https://data.riksdagen.se/personlista/?utformat=json";
const VOTES_URL = "https://data.riksdagen.se/voteringlista/";

/**
 * Votes that become facts a letter may cite: the official record of what this member did, which
 * is both specific and verifiable. In each, "Ja" is a vote for the committee's line. Members who
 * were absent, or not in the Riksdag then, get no fact — nothing is claimed about them.
 */
const KEY_VOTES = [
  {
    bet: "MJU29", punkt: "2", date: "16 June 2026",
    ja: "On 16 June 2026 you voted for the forestry law Ett tydligt regelverk för aktivt skogsbruk (MJU29), which cuts the notice before felling from six weeks to three; it passed 308 to 21",
    nej: "On 16 June 2026 you voted against the forestry law Ett tydligt regelverk för aktivt skogsbruk (MJU29), which cuts the notice before felling from six weeks to three; it passed 308 to 21",
    avstar: "On 16 June 2026 you abstained on the forestry law Ett tydligt regelverk för aktivt skogsbruk (MJU29), which cuts the notice before felling from six weeks to three; it passed 308 to 21",
  },
  {
    bet: "NU7", punkt: "1", date: "5 November 2025",
    ja: "On 5 November 2025 you voted to lift Sweden's ban on uranium mining (NU7), which passed by one vote, 149 to 148",
    nej: "On 5 November 2025 you voted against lifting Sweden's ban on uranium mining (NU7), which passed by one vote, 149 to 148",
    avstar: "On 5 November 2025 you abstained on lifting Sweden's ban on uranium mining (NU7), which passed by one vote, 149 to 148",
  },
  {
    bet: "NU27", punkt: "2", date: "15 June 2026",
    ja: "On 15 June 2026 you voted against a motion to give municipalities a say over uranium extraction (NU27), which was rejected 174 to 172",
    nej: "On 15 June 2026 you voted for a motion to give municipalities a say over uranium extraction (NU27), which was rejected 174 to 172",
    avstar: "On 15 June 2026 you abstained on a motion to give municipalities a say over uranium extraction (NU27), which was rejected 174 to 172",
  },
  {
    bet: "KU28", punkt: "22", date: "11 March 2026",
    ja: "On 11 March 2026 you voted against an inquiry into giving nature rights in the constitution (KU28), rejected 278 to 17",
    nej: "On 11 March 2026 you voted for an inquiry into giving nature rights in the constitution (KU28), which was rejected 278 to 17",
    avstar: "On 11 March 2026 you abstained on an inquiry into giving nature rights in the constitution (KU28), rejected 278 to 17",
  },
];

/** intressent_id → facts, from the official vote lists. */
async function fetchVoteFacts() {
  const facts = new Map();
  for (const vote of KEY_VOTES) {
    const url = `${VOTES_URL}?rm=2025%2F26&bet=${vote.bet}&punkt=${vote.punkt}&utformat=json&sz=5000&gruppering=`;
    const rows = [].concat((await getJson(url)).voteringlista?.votering ?? []);
    for (const row of rows) {
      if (row.avser !== "sakfrågan") continue;
      const text = { Ja: vote.ja, Nej: vote.nej, "Avstår": vote.avstar }[row.rost];
      if (!text) continue; // absent
      const list = facts.get(row.intressent_id) ?? [];
      list.push({ text, source: row.votering_url_xml || url, checked: TODAY });
      facts.set(row.intressent_id, list);
    }
  }
  return facts;
}
const EP_API = "https://data.europarl.europa.eu/api/v2";
const TODAY = new Date().toISOString().slice(0, 10);

/** Riksdag committee (utskott) code → the forest topics it has a say over. */
const RIKSDAG_COMMITTEES = {
  MJU: ["forestry", "biodiversity", "rightsofnature", "samilandrights&culture"],
  NU: ["mining", "energyproduction", "greentransition"],
  TU: ["tourism", "biodiversity"],
  KU: ["rightsofnature", "samilandrights&culture"],
  CU: ["rightsofnature", "energyproduction"],
  SkU: ["mining", "greentransition"],
  FiU: ["greentransition"],
};

/** European Parliament committee → forest topics. */
const EP_COMMITTEES = {
  ENVI: ["biodiversity", "forestry", "rightsofnature"],
  AGRI: ["forestry", "biodiversity"],
  ITRE: ["energyproduction", "mining", "greentransition"],
  PECH: ["biodiversity", "energyproduction"],
  TRAN: ["tourism"],
  REGI: ["greentransition", "tourism"],
  JURI: ["rightsofnature"],
};

/**
 * What each committee is, in a clause the letter can open with. The letter says "we write to you
 * because …", so these have to finish that sentence and say something a recipient would
 * recognise as their own job — not the committee's acronym back at them.
 */
const RIKSDAG_COMMITTEE_CLAUSE = {
  MJU: "the committee that handles forestry, species protection and the restoration plan",
  NU: "the committee that handles the Minerals Act and energy policy",
  TU: "the committee that handles roads, railways and the rules for air traffic",
  KU: "the committee that handles the constitution, where rights of nature was voted down in March 2026",
  CU: "the committee that handles planning and property law",
  SkU: "the committee that handles taxes, including the mineral compensation unchanged since 2005",
  FiU: "the committee that handles the budget this transition is financed from",
};

const EP_COMMITTEE_CLAUSE = {
  ENVI: "environment, climate and nature restoration",
  AGRI: "agriculture and forestry",
  ITRE: "industry, research and energy",
  PECH: "fisheries",
  TRAN: "transport and tourism",
  REGI: "regional development",
  JURI: "legal affairs",
};

const ALL_TOPICS = [
  "greentransition", "forestry", "energyproduction", "samilandrights&culture",
  "biodiversity", "tourism", "rightsofnature", "mining",
];

/**
 * Constituencies with a local remit on every topic, and how to say so truthfully: the biosphere
 * reserve lies in Västerbotten and Norrbotten; Jämtland and Västernorrland are the same north,
 * but not the landscape the council speaks for.
 */
const NORTHERN = {
  "Västerbottens län": "inside the landscape this council speaks for",
  "Norrbottens län": "inside the landscape this council speaks for",
  "Jämtlands län": "in the north, where the same forests, rivers and grazing lands are at stake",
  "Västernorrlands län": "in the north, where the same forests, rivers and grazing lands are at stake",
};

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const uniq = (xs) => [...new Set(xs)];

async function getJson(url, accept) {
  const response = await fetch(url, accept ? { headers: { accept } } : undefined);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

/** A register date range ("2026-09-28 11:00:00" / "") that covers today. */
const covers = (from, tom) =>
  (!from || from.slice(0, 10) <= TODAY) && (!tom || tom.slice(0, 10) >= TODAY);

function riksdagEmail(person) {
  const fields = person.personuppgift?.uppgift ?? [];
  for (const field of fields) {
    if (field?.kod !== "Officiell e-postadress") continue;
    const value = Array.isArray(field.uppgift) ? field.uppgift[0] : field.uppgift;
    // The register obfuscates the address as "firstname.lastname[på]riksdagen.se".
    if (typeof value === "string") return value.replace("[på]", "@").trim();
  }
  return null;
}

function riksdagAssignments(person) {
  const assignments = person.personuppdrag?.uppdrag ?? [];
  const list = Array.isArray(assignments) ? assignments : [assignments];
  return list.filter((a) => a && typeof a === "object");
}

/**
 * Committees with a forest remit that this member sits on, as full members.
 *
 * Right after an election the chamber is seated before the committees are appointed, so the
 * register has no current committee assignments at all. Rather than drop every member outside
 * a northern constituency, fall back to the committees they held in the term that just ended —
 * most members return to the same one — and say which term the codes come from.
 */
function riksdagCommittees(assignments, seatFrom) {
  const relevant = (a) => RIKSDAG_COMMITTEES[a.organ_kod] && a.roll_kod !== "Suppleant";
  const codes = (list) => uniq(list.filter(relevant).map((a) => a.organ_kod));

  const current = codes(assignments.filter((a) => covers(a.from, a.tom)));
  if (current.length > 0) return { committees: current, committeesFrom: "current" };

  // Only seats held until the election count as a hint: one left a year ago, or in 2014, says
  // nothing about what this member works on now.
  const cutoff = new Date(new Date(seatFrom.slice(0, 10)).getTime() - 31 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const latestEnd = assignments
    .filter(relevant)
    .map((a) => (a.tom ?? "").slice(0, 10))
    .filter((end) => end >= cutoff)
    .sort()
    .at(-1);
  if (!latestEnd) return { committees: [], committeesFrom: null };

  const previous = codes(assignments.filter((a) => (a.tom ?? "").slice(0, 10) === latestEnd));
  return { committees: previous, committeesFrom: `until ${latestEnd}` };
}

async function fetchMps() {
  const [register, voteFacts] = await Promise.all([getJson(RIKSDAG_URL), fetchVoteFacts()]);
  const people = register.personlista?.person ?? [];
  const out = [];

  for (const person of people) {
    const assignments = riksdagAssignments(person);
    const seat = assignments.find(
      (a) =>
        a.organ_kod === "kam" && a.roll_kod === "Riksdagsledamot"
        && a.status === "Tjänstgörande" && covers(a.from, a.tom),
    );
    if (!seat) continue;

    const email = riksdagEmail(person);
    const name = `${person.tilltalsnamn} ${person.efternamn}`.trim();
    const { committees, committeesFrom } = riksdagCommittees(assignments, seat.from);
    const northern = NORTHERN[person.valkrets];
    const topics = northern
      ? ALL_TOPICS
      : uniq(committees.flatMap((code) => RIKSDAG_COMMITTEES[code]));

    const remit = [
      "Member of the Riksdag",
      person.valkrets && `for ${person.valkrets}`,
      committees.length && `on ${committees.join(", ")}`,
    ].filter(Boolean).join(", ");

    const seats = committees
      .filter((code) => RIKSDAG_COMMITTEE_CLAUSE[code])
      .map((code) => `${code}, ${RIKSDAG_COMMITTEE_CLAUSE[code]}`);
    const why = [
      northern && `you are elected in ${person.valkrets}, ${northern}`,
      seats.length && `you sit on ${seats.join("; and on ")}`,
    ].filter(Boolean).join(", and ");

    out.push({
      id: `mp-${slug(name)}`,
      name,
      kind: "person",
      category: "parliament",
      email,
      language: "sv",
      remit,
      party: person.parti || null,
      constituency: person.valkrets || null,
      committees,
      committeesFrom,
      why: why || null,
      topics,
      facts: voteFacts.get(person.intressent_id) ?? [],
      limits: { once: true },
      addressCheck: "register",
      source: "https://data.riksdagen.se/personlista/",
      active: Boolean(email) && topics.length > 0,
      ...(topics.length === 0
        ? { notes: "No committee with a forest remit and not a northern constituency — left inactive for curation." }
        : committeesFrom && committeesFrom !== "current"
          ? { notes: `Committee remit taken from the term that ended ${committeesFrom.replace("until ", "")}; re-run once the new committees are appointed.` }
          : {}),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

const committeeCache = new Map();

async function committeeCode(orgId) {
  if (committeeCache.has(orgId)) return committeeCache.get(orgId);
  const id = orgId.replace(/^org\//, "");
  let code = null;
  try {
    const body = await getJson(`${EP_API}/corporate-bodies/${id}`, "application/ld+json");
    code = body.data?.[0]?.label ?? null;
  } catch {
    code = null; // a body that no longer resolves is simply unknown
  }
  committeeCache.set(orgId, code);
  return code;
}

async function fetchMeps() {
  const current = await getJson(
    `${EP_API}/meps/show-current?limit=1000`, "application/ld+json",
  );
  const swedish = (current.data ?? []).filter(
    (mep) => mep["api:country-of-representation"] === "SE",
  );
  const out = [];

  for (const summary of swedish) {
    const detail = (await getJson(`${EP_API}/meps/${summary.identifier}`, "application/ld+json")).data?.[0];
    if (!detail) continue;

    const email = (detail.hasEmail ?? "").replace(/^mailto:/, "") || null;
    const memberships = (detail.hasMembership ?? []).filter(
      (m) =>
        String(m.membershipClassification ?? "").includes("COMMITTEE_PARLIAMENTARY_STANDING") &&
        m.role === "def/ep-roles/MEMBER" &&
        covers(m.memberDuring?.startDate, m.memberDuring?.endDate),
    );
    const codes = uniq((await Promise.all(memberships.map((m) => committeeCode(m.organization)))).filter(Boolean));
    const topics = uniq(codes.flatMap((code) => EP_COMMITTEES[code] ?? []));
    const name = [detail.givenName, detail.familyName].filter(Boolean).join(" ") || detail.label;
    const seats = codes
      .filter((code) => EP_COMMITTEE_CLAUSE[code])
      .map((code) => `${code}, which handles ${EP_COMMITTEE_CLAUSE[code]}`);
    const why = seats.length
      ? `you represent Sweden in the European Parliament and sit on ${seats.join("; and on ")}`
      : null;

    out.push({
      id: `mep-${slug(name)}`,
      name,
      kind: "person",
      category: "parliament-eu",
      email,
      language: "sv",
      remit: ["Member of the European Parliament for Sweden", codes.length && `on ${codes.join(", ")}`]
        .filter(Boolean).join(", "),
      party: summary["api:political-group"] ?? null,
      constituency: "Sweden",
      committees: codes,
      why,
      topics,
      limits: { once: true },
      addressCheck: "register",
      source: "https://data.europarl.europa.eu/api/v2/meps",
      active: Boolean(email) && topics.length > 0,
      ...(topics.length === 0
        ? { notes: "No standing committee with a forest remit — left inactive for curation." }
        : {}),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

const outArg = process.argv.indexOf("--out");
const outPath = outArg !== -1 ? process.argv[outArg + 1] : "shared/prompts/letters/people-parliament.json";

const [mps, meps] = await Promise.all([fetchMps(), fetchMeps()]);
const recipients = [...mps, ...meps];

await writeFile(outPath, `${JSON.stringify({
  metadata: {
    status: "generated",
    generated: TODAY,
    generator: "scripts/letters/fetch-people.mjs",
    notes:
      "The person half of the letter recipient list, from the Riksdag and European Parliament "
      + "registers. Public role addresses; one letter per person, ever. Topics come from "
      + "committee remit and northern constituency, never from party. Regenerate rather than "
      + "hand-edit.",
    kinds: { person: "a named person at a public role address; exactly one letter, ever" },
  },
  recipients,
}, null, 2)}\n`);

const inactive = recipients.filter((r) => !r.active).length;
const perTopic = {};
for (const r of recipients.filter((r) => r.active)) {
  for (const t of r.topics) perTopic[t] = (perTopic[t] ?? 0) + 1;
}
console.log(`${mps.length} MPs, ${meps.length} Swedish MEPs → ${outPath}`);
console.log(`${recipients.length - inactive} active, ${inactive} inactive (no matching remit or no address)`);
console.log("active per topic:", perTopic);
