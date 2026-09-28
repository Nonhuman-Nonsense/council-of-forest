# Political context of the prompts — research notes and change log

Research, decisions and a dated change log for the political facts in
`shared/prompts/topics_{en,sv}.json` and `shared/prompts/beings_{en,sv}.json`, the
prompts the Council's beings speak from.

**State as of 28 September 2026.** The prompts were printed on the exhibition wall on
28 September; the exhibition (Boden) opens **10 October 2026**. Everything below is dated
on purpose: this file goes stale, and a fact without a date cannot be re-verified.

How to use this file:

- **Before changing a political fact in a prompt,** read §2 (rules) and the topic's entry
  in §3. §3 holds the *current* fact set; superseded facts are marked, not deleted, so you
  can see what the prompts used to say and why it changed.
- **After changing one,** add a dated entry to §6 and put the source in §7.
- **Swedish wording** lives in `shared/prompts/translation_guide_sv.md` — terms,
  per-character voice rules, and the EN-structural/SV-named rule.
- **Deeper background** is in the `Research/` folder (§5), mostly PDFs from the project's
  research phase. The Sámi papers are the most useful for the prompts.

---

## 1. Why this exists: the model knows nothing after 2024

`server/global-options.json` sets `"conversationModel": "mistral/mistral-large-3"`.
Mistral publishes no knowledge cutoffs, so on 9 September 2026 we probed the endpoint
(`api.inworld.ai/v1/chat/completions`, temperature 0):

| Model string | Self-reported cutoff | Knows Trump won Nov 2024? | Swedish uranium law |
|---|---|---|---|
| `mistral/mistral-large-3` (current) | October 2023 | No | **Wrong** — "legal, changed 2018" |
| `mistral/mistral-large-latest` | October 2023 | No | **Wrong** — "Yes, 2018" |
| `mistral/mistral-medium-latest` | 10 2023 | No | **Wrong** — "Yes, 2018" |
| `openai/gpt-4.1` | June 2024 | No | Correct for its era ("No, 2018") |
| `anthropic/claude-sonnet-4-5` | April 2024 | Yes | Correct for its era |

Returned `400 not supported` on our account: `mistral-medium-3-5`, `mistral-medium-3504`,
`mistral-small-4`, `mistral-large-2411`, `magistral-*`, `open-mistral-nemo`,
`openai/gpt-5`, `anthropic/claude-opus-4-5`, `google/gemini-3-pro`,
`deepseek/deepseek-v3.2`. There is no `GET /v1/models` endpoint.

Conclusions:

1. No model reachable through Inworld knows 2025–2026. Only prompt content can fix that.
2. Decision: keep `mistral/mistral-large-3` for the October exhibition. Swapping models
   risks the tightly tuned character voices (Mountain's 20-word stone-speech, Bumblebee's
   Z-rule, per-character length limits) for no gain.
3. Mistral **asserted the opposite of the truth** on uranium. Unstated facts come back as
   confident errors, not "I don't know" — anything we care about must be in the prompt.

To re-probe: ask a dated question with a known answer, with a system message saying
"answer `unknown` if after your training data". Good boundary probes: US election Nov 2024,
Northvolt bankruptcy (Mar 2025), Chancellor Merz (May 2025), Pope Leo XIV (May 2025),
Swedish uranium ban lifted (Jan 2026).

---

## 2. Editorial rules

- **English = structural, no party names.** "The government side proposed", "the
  opposition won". The English audience is international and cannot place KD or SD.
- **Swedish = parties and ministers named** (KD, M, SD, L, C, S, V, MP; Ebba Busch, Peter
  Kullgren; Wallenbergsfären). A local audience would find the anonymised version evasive.
  This divergence is deliberate — do not "correct" it in either direction.
- **Characters never campaign.** Party politics goes in the topics, which are swappable per
  meeting. A being may react to a policy; it may not endorse a party or tell anyone how to
  vote.
- **Dated facts live per topic, not in `system`.** Each topic prompt ends with a
  `RECENT DEVELOPMENTS (verified <month year>)` block (Swedish: `AKTUELL UTVECKLING
  (kontrollerad i <månad år>)`). A block in `system` would hit every conversation.
- **Absolute dates only.** Never "recently" or "last year". The current date is injected
  as `[CURRENT_DATE]` by `buildMeetingSystemPrompt` (`shared/topicPrompt.ts`); never write
  it into a prompt.
- **Agenda points state both sides at their strongest.** The pattern that works (Green
  Transition, and Sámi "Is a Culture a National Interest?"): title on its own line, one or
  two sentences of context, two named perspectives with labelled bullets
  (`- Label: explanation`), concrete dates and figures, optionally a `Core Question:`.
  River picks one agenda point and hands it to a being; two named sides give River a
  conflict to stage and give the Tree Harvester an argument to make. Agreed 28 Sept 2026:
  landowner and industry cases may be stated strongly — the Boden and Västerbotten
  audience includes landowners and hunters.
- **Balance for the venue.** Critical framings stay, but each gets its strongest counter
  (e.g. "the 2026 rescue of the Boden steel plant as proof that serious long-term capital
  still believes in the north").

---

## 3. Current fact set by topic

Verified dates are given per item. **Superseded** marks what the prompts used to say.

### 3.1 Sámi land, rights and culture — the riksintresse fight

- **20 April 2026, Luleå:** KD (Ebba Busch, with rural affairs minister Peter Kullgren)
  proposed that reindeer herding should **no longer be a riksintresse**, that reindeer
  numbers be reduced, and support redirected to Sámi language and culture. Argument: very
  large land use, about one ten-thousandth of GDP in the four northern counties. The
  government sent a memo on reviewing the whole riksintresse system to Sametinget on
  16 April.
- Party positions (SVT, 24 April, updated 2 Sept 2026): **remove** — KD, M, SD.
  **Review the whole system** — S (keep status, review system), C (review all
  riksintressen; parliamentary committee to rewrite the herding law). **Keep** — L, V, MP.
- **3 September 2026:** Busch dismissed UN criticism with "Då har FN fel".
- **13 September 2026 general election:** S, V, MP and C won **176 seats to 173** for the
  Tidö parties (M, KD, SD, L). Result certified 19 September; Magdalena Andersson (S) asked
  to form a government; Kristersson resigned. Government formation was not complete as of
  28 September. Implication: outright removal of the status is now unlikely; the fight
  moves into the wider review of the riksintresse system, which has support on both sides.
  *Superseded (prompts until 28 Sept): "a national election is held in September 2026 with
  these questions unresolved."*
- **Post-Girjas lawsuits: five samebyar** have sued the state for exclusive rights to
  grant small-game hunting and fishing above the cultivation boundary — **Talma (2022)**,
  then **Ran (28 May 2024**, Lycksele tingsrätt, T 353-24), Sirges, Unna Tjerusj and Baste
  (Gällivare tingsrätt). Ran was the first from Västerbotten, not the first overall.
  **April 2026:** the state (Justitiekanslern) changed tactics and now argues the Reindeer
  Husbandry Act overrides immemorial rights — an argument that did not prevail in Girjas —
  and asked for referral straight to the Supreme Court. The court refused the hunters'
  association (Svenska Jägareförbundet) permission to join Ran's case.
  *Superseded: "four herding communities… the first, filed in May 2024".*
- **Renmarkskommittén** was scrapped (announced Nov 2024, after criticism of its Aug 2023
  partial report) with a replacement inquiry promised. Whether one was appointed is not
  verified.
- **CERD, 5 December 2025:** stronger land-rights protection, full implementation of the
  Consultation Act, measures against the increasing killing of and attacks on reindeer,
  and action on violence against Sámi women. The Council of Europe raised parallel concerns.
- **Per Geijer (Kiruna):** Gabna sameby's remaining migration corridor is about **50 m**,
  down from about 13 km. The single most useful fact in this file.
- **Ran sameby is the local thread** for a Västerbotten council. It won the Nordmaling
  case (§5), is suing the state post-Girjas, and is in the Rally Sweden conflict. Ran has
  about 6,000 reindeer around Umeå; the 2025 rally was followed by reindeer killings and
  hate speech. In early 2026 the Transport Agency rejected Ran's appeal against the 2026
  rally, while noting that the impact on winter grazing is "not insignificant".

### 3.2 Green transition — bust, then rescue

- **12 March 2025:** Northvolt bankruptcy, the largest in Swedish history. **26 February
  2026:** Lyten (US) completed the purchase of Northvolt Ett, Ett Expansion and Northvolt
  Labs; restart of cell shipments planned for H2 2026 (not verified as happened).
- **Stegra (formerly H2 Green Steel, Boden):**
  - Winter 2025–26: construction slowed during fundraising; contractors reported several
    hundred million SEK of unpaid invoices (Feb 2026). Chair Harald Mix stepped down
    Oct 2025.
  - **April 2026:** agreed in principle on a **€1.4bn round led by a Wallenberg
    Investments consortium** (Wallenbergs ~€250m; with Temasek, IMAS, Bolero,
    SEB-Stiftelsen; Altor second-largest owner). **Closed 24 June 2026.** Wallenberg
    Investments is now the largest owner. Existing lenders approved, and the state's
    support via Riksgälden and SEK stays in place. Håkan Buskhe joins the board; Leif
    Johansson was reported as incoming chair (not confirmed at closing).
  - Plant about 60% built (June 2026), with a 100-day acceleration plan under way.
    Production was first promised for 2024, then the turn of 2026/27; **no confirmed start
    date**. A new timeline is due **end of 2026**, and full capacity 12–18 months after start.
  - *Superseded (prompts until 27 Sept): "ran out of money", "openly discussed as the next
    collapse", capital need "a further two billion euros".*
- **Boden municipality:** loan debt **~80 MSEK (2017) → 1,790 MSEK (end 2025)**, with a
  loss of 88 MSEK in 2025. S and M in Boden greeted the rescue with open relief.
  *Superseded: "90 MSEK → over one billion".*
- **HYBRIT (the state-backed route)** — SSAB, LKAB and Vattenfall. LKAB and Vattenfall
  are wholly state-owned; SSAB is listed, with LKAB as its largest voting owner. There is
  no ownership link to Stegra.
  - LKAB paused sponge-iron plans in Kiruna in **Oct 2024**.
  - The Gällivare/Malmberget demonstration plant got its environmental permit on
    **15 June 2026** (Umeå land and environment court), appealed by LKAB and the Swedish
    Agency for Marine and Water Management. The last report found (Oct 2025) said there
    was no investment decision.
  - SSAB's Oxelösund electric arc furnace slipped to early 2027 because of grid
    connection delays.
  - Stegra vs HYBRIT, in one line: private, fast and financially fragile vs state-backed,
    slow and prone to drift.
- **Svenska kraftnät** revised industrial electricity demand **down ~20%** in its 2026
  long-term market analysis; national consumption has fallen over the past two years.

### 3.3 Forestry — deregulation passed

- **16 June 2026:** *Ett tydligt regelverk för aktivt skogsbruk* (prop. 2025/26:242,
  MJU29) passed **308–21**; in force **1 January 2027**. It:
  - decouples felling notification from environmental-code consultation;
  - cuts the review window from six weeks to three;
  - moves Skogsstyrelsen appeals to the mark- och miljödomstolar;
  - caps landowner costs for species knowledge relative to property value.

  Consultation with a sameby remains mandatory when a particularly important area for
  herding is affected. MP warned of ~670,000 ha of old-growth at risk over 25 years.
- **June 2026:** prop. 2025/26:230 — landowners gain a **right to compensation** when
  species protection restricts land use.
- **Skogsstyrelsen:** at current rates, nearly all remaining natural forest outside
  protected areas is gone **within 26 years**.
- EUDR paused/reconsidered at Sweden's urging; the Commission's LULUCF-to-2040 proposal is
  due in 2026.

### 3.4 Mining

- **1 January 2026:** uranium ban lifted (Riksdag vote Nov 2025, by one vote). Uranium is
  now a concession mineral.
- **May 2024:** Minerals Act amended so a Natura 2000 permit is no longer required before a
  bearbetningskoncession.
- **March 2026:** Per Geijer (Kiruna) became an **EU CRMA Strategic Project**, with the
  Gällivare apatite expansion and a Luleå processing hub. It still lacks a concession and
  environmental permit.
- **4 September 2026:** inquiry into a **"gruvpeng"** (mineral compensation and exploration
  fees to host municipalities), reporting 30 September 2028. **Samebyar are not named as
  recipients.**
- Six of eight Riksdag parties support easing mining rules.

### 3.5 Energy

- Municipalities vetoed **93%** of planned wind projects in 2025 (**63%** in 2024).
- Wind host municipalities receive **340 MSEK for 2025, 370 MSEK for 2026**.
- **Hydropower omprövning** restarted 25 June 2025. Vattenfall filed its first applications
  on 20 February 2026 (Älvkarleby, Söderfors). All plants must hold modern conditions by
  ~2040, **Stornorrfors included**.

### 3.6 Biodiversity

- **3 September 2026:** the government adopted a draft national nature restoration plan
  (EU 2024/1991), with 39 measure packages; final plan due 1 September 2027.
- **April 2026:** licence-hunt decisions for lynx and wolverine delegated to the county
  boards. Norrbotten declined a lynx hunt for 2026.
- **Red list 2025, published 24 March 2026 (SLU Artdatabanken):**
  - 5,217 of ~23,100 assessed species are red-listed (23%, up from 21.9% in 2020);
    2,373 are threatened.
  - Modern forestry harms **1,744** red-listed species (>⅓); overgrowth of open land
    harms 1,300; climate change is named for 210.
  - The mountains show the largest increase in red-listed share. Birds: 45% red-listed.
  - Pärluggla (Tengmalm's owl) went LC → EN. Fjälluggla (snowy owl, no breeding since
    2015) and tornuggla (barn owl) are now regionally extinct (RE).
  - **The moose is NT**, after a decline that was a management goal.
  - The white-tailed eagle and the otter left the list.
- **Moose:**
  - Västerbotten fell ~34% over 2015–2024 (national −23%), and is now growing again.
    12,700 may be shot in 2026; the county's balance target is ~20,000 after the hunt.
  - ÄBIN browsing damage is ~11% of young pine, against a 5% target that Skogsstyrelsen
    largely adopted from the forestry industry's own target formulation (Svensk Jakt).
  - SLU (Widemo) finds no clear link between moose density and browsing damage in
    Norrland.
- **Garden lupine:** on Sweden's first national list of invasive alien species (34
  species) from **15 May 2026**. Selling, growing and spreading are banned. Private
  owners have no duty to eradicate; authorities, municipalities and regions have
  EU-list-level duties.
- **Arctic fox 2025:** 56 litters in Sweden (97 in Fennoscandia), with ~526 adults, down
  from 582, but the long-term trend is up.
- **White-backed woodpecker:** ~15–20 pairs in Sweden (about 15 pairs and 14 breedings
  in 2025).
- **Final felling age (SLU Riksskogstaxeringen, 5-year means, excluding stands without a
  legal minimum age):**
  - North Norrland 130 (2004) → 104 (2017–19) → 113 (2022).
  - Whole country 118 → 99.
  - These figures are averages over *all* final fellings, including the last old natural
    forests, which lift the average. They say little about the rotations companies now
    *plan* for managed stands. **Decided 28 Sept: the prompts do not cite the SLU
    figures.** They describe rotations as "getting shorter" and attribute "100–120 years
    once, 60–80 planned now" to people working in the forests (interviews 4 and 8). Do not
    reinsert the SLU numbers as if they were rotation lengths.
- **Harvest use (Naturvårdsverket via DN, March 2021):** ~22% sawn timber, ~50%
  bioenergy, ~25% pulp and paper, so >80% goes to short-lived products. The industry
  counters that pulp and energy come largely from residues and by-products.
- **Treeline:**
  - Up to ~200 m rise in parts of the Swedish mountains (Kullman); the highest in ~7,000
    years.
  - Reindeer grazing inhibits mountain birch recruitment at the treeline (Hagenberg,
    Horstkotte, Olofsson et al., *Ecosystems* 2025; EU Commission news 8 June 2026).
  - Warmer summers weaken that grazing pressure (*Ecography* 2025).
- **Predator compensation to samebyar** is paid per documented presence or reproduction
  (2023: wolverine or lynx litter 200,000 SEK; wolf 500,000 SEK). Bear and golden eagle
  are paid on presence, not per reindeer lost (Sametinget).

### 3.7 Salmon and tourism

- The 2026 Baltic salmon quota fell to **7,152** fish (from 9,743). Swedish salmon fishing
  in ICES subdivisions 30–31 was closed from **25 June to 24 July 2026**. Finland was
  criticised for continuing under "research fishing".

---

## 4. Decisions and open follow-ups

- **Truth Commission — deliberately not updated.** The final report is delivered
  **30 September 2026** in Östersund, with a narrative volume of 300+ testimonies. The
  prompts say only that it is "due at the end of September 2026". Decided 28 Sept 2026: no
  change before opening — the prompts are already printed on the wall, and the dated
  "verified September 2026" framing already tells the reader what the model knows.
  **SOU 2026:15 *Marken, vattnet, tankarna* is the March 2026 research anthology, not the
  final report** (an earlier version of this file conflated them).
- **Stegra timeline** due end of 2026. When it comes, update "no confirmed start date" /
  "inget bekräftat startdatum" in the Green Transition topic, both languages.
- **Sámi agenda-point rewrite — done 28 Sept in EN and SV.** The notes below are the plan
  it followed, kept as a map from each point to its material. Before the rewrite, in the
  Sámi topic, AP0
  and AP2–AP5 are single paragraphs, 640–950 chars, with the opposing side only hinted at.
  AP1 and all of Green Transition use the two-sided format (§2). Plan, with material
  gathered from §5 and §7:
  - **AP0 Parallel Ownership.** Landowner side: clear title; shared use mostly works;
    Sweden's 2007 statement that UNDRIP gives no redress for ordinary forestry. Herding
    side: Nordmaling (2011) and Girjas (2020); the Forestry Act treats herding as a public
    interest rather than a property right (Brännström); no reciprocal duty of
    consideration; the JK tactic change. A full sample draft was written in the
    28 Sept session.
  - **AP1** is already in format. Keep it, with the election update applied 28 Sept.
  - **AP2 Green colonization.** Take the rights angle rather than climate: the 2024
    Natura 2000 change, EU CRMA strategic projects, the Rönnbäcken CERD opinion, no cap on
    cumulative land take, the 50 m corridor. Industry side: climate urgency, ethical
    sourcing, jobs, benefit-sharing.
  - **AP3 Disappearing Library.** Ume Sámi facts (§5). Counter-side: most Sámi do not
    herd, so language policy tied to herding land leaves most speakers out.
  - **AP4 Consultation.** No decision power under 2022:66; Forestry Act §20 covers only
    year-round land; Renmarkskommittén closed without consultation; Rally Sweden.
    Counter-side: a veto for every affected group; companies' dialogue record.
  - **AP5 Lateral violence.** Brå 2024:5; post-Girjas hate in Kiruna; the Jokkmokk
    violence study; Sehlin MacNeil's cycle. Counter-side, without excusing hate: local
    non-Sámi hunters feel shut out after Girjas. Replace the vague "Härjedalen" reference
    with Nordmaling.
  - Cost: the Sámi agenda block went from ~6k to **~13k characters** (Green Transition
    7.3k, Energy 7.2k). Every being's context carries it on Sámi meetings. If responses
    drift or slow, trim the context paragraphs first; keep the labelled bullets.
- **Biodiversity rewrite — done 28 Sept in EN and SV.** Both languages have 6 agenda
  points (new: *The Moose Paradox* / *Älgparadoxen*), and agenda-point counts match
  across every topic. Agenda block: 4.5k → ~12k characters. `ValidateTopicsData` does
  **not** check agenda-point parity between languages; check it by hand after
  adding or removing a point.
- **Still to verify against primary sources:** exact salmon quota and wind-veto figures;
  whether Renmarkskommittén's replacement was appointed; Lyten's actual restart; Leif
  Johansson as Stegra chair.

---

## 5. Research library (`Research/`)

PDFs from the research phase, one folder per theme: `biosphere area`, `fishing`,
`forestry`, `lichen`, `minerals`, `pollination`, `reindeer`, `sami`, `tourism`,
`transcribed interviews`, `water systems`. They cannot be grepped directly; extract text with
`pypdf` (e.g. `pip install --target <scratch> pypdf`); `pdftotext` is not installed.

The Sámi material (`Research/sami/`), with the facts most useful for the prompts:

| File | Use it for |
|---|---|
| `Saami+Council+CERD+report+on+Sweden+.pdf` (20 Oct 2025) | The Saami Council's own case: Rally Sweden 2025; hate crimes not flagged; May 2024 Minerals Act/Natura 2000 change; CRMA; Rönnbäcken; Consultation Act gives no decision power; Forestry Act §20 excludes winter grazing; ~6% of productive forest formally protected; no reciprocal duty of consideration; Renmarkskommittén closed without consultation; ILO 169 unratified |
| `Samisk forskning/The implementation of Sámi land rights in the Swedish Forestry Act.pdf` (Brännström) | Core legal argument: herding rights are private property rights in case law but protected as a *public interest* in the Forestry Act, so they are balanced against timber rather than secured. Sweden's 2007 UNDRIP statement on Art. 28 |
| `Skogsbruk och renskötsel på samma mark.pdf` (Brännström, PhD 2017, 380 pp.) | The full legal analysis behind the above (pp. 278–279: no reciprocal duty) |
| `Samisk forskning/Lateral violence….pdf` (Sehlin MacNeil) | 20–40k Sámi in Sweden, most in the south (no ethnic registration); hate and death threats in the Kiruna area after Girjas; the extractive → structural → cultural → lateral violence cycle |
| `Samisk forskning/Interpersonal Violence….pdf` (Simmons et al. 2024) | Jokkmokk 2021 survey: Sámi more often report violence by acquaintances and strangers, explained entirely by historical losses and discrimination; family violence reported by women 16.4% (Sámi) vs 9.2% (Swedish) |
| `language/Lägesrapport De samiska språken i Sverige 2024.pdf` (Sametinget) | Ume Sámi: no Sámi school in the area; 4 titles published in 2024; UR produced nothing in Ume Sámi in 2024; demand "enormous", the work carried by "a few people"; first time on a theatre stage (*När vi var samer*, 2024) |
| `Of forest, snow and lichen….pdf` (Roturier & Roué 2009) | Herders' winter-pasture knowledge; *guohtun*; snow and lichen classification |
| `Lag (2022_66) om konsultation….pdf` | The Consultation Act text |
| Other `Samisk forskning/` papers | Hydropower cumulative effects in Sápmi, CSR in the green transition, colonial past and present, racism methods, EU–Sápmi relations |

Biodiversity, forestry and water material:

| File | Use it for |
|---|---|
| `pollination/Pollinatörer och pollinering i Sverige .pdf` (Naturvårdsverket 6841, 2018) | ⅓ of 299 wild bees red-listed; ~⅕ of butterflies and moths; >1/10 of 400+ hoverflies. Overgrowth (grazing ended) is the top threat for red-listed bees and butterflies; felling is the top threat for red-listed hoverflies |
| `fishing/Vindel River LIFE report.pdf` + `…afterwards.pdf` (2015) | Vindelälven runs free for 450 km; timber floating 1850–1976; 26 tributaries and 66 km restored; 20 dams removed; ~1,070 spawning grounds built. Brown trout host the freshwater pearl mussel's larvae |
| `wwf-rapport-framtida-trender-och-drivkrafter-vasterbotten.pdf` (~2012, dated) | Västerbotten land cover: 56% forest, 12% open mire; ~15% formally protected; *Vindelälvens Naturbeten* riverside grazing project; climate projections |
| `reindeer/The decreasing availability of reindeer forage….pdf` | Intensive forestry is practised on ~90% of Swedish forest cover |
| `reindeer/Reindeer husbandry in peril….pdf` | Laevas sameby: ~34% of grazing grounds functionally unavailable |
| `lichen/Do forests treated by partial cutting….pdf` | Caution: in a Québec study, epiphytic lichens grew *worse* in partial cuts. Partial cutting is not automatically lichen-friendly |
| `transcribed interviews/` (8 transcripts, April 2025, Swedish/English) | The project's own local voices (see below). Use them as perspectives, attributed by role, never by name in prompts. They include private details (e.g. a phone number), so never quote them wholesale |

Interview map (file → role → what it gives the prompts):

- **3/3a** — a forest manager for a commons (allmänning) in Arjeplog. The fair production
  voice: balancing hunters, timber and reserves; mixing species to spread climate risk;
  forest roads as barriers; fire suppression turning reserves to spruce; signal species
  (garnlav, three-toed woodpecker); a ditched mire as "a wound in its body".
- **4** — a reindeer herder from Gran sameby who sits on the biosphere board and was
  secretary to the Truth Commission. Ground lichen down 70–80%; low-impact soil
  scarification agreed with Sveaskog; moose culled yet browsing damage persists because of
  monocultures; fewer insects; the last patches around lakes cut now; no disturbance-free
  zones; place names and language; the creation story (vaja).
- **5** — Ran sameby members in Ammarnäs. Eagles as calf predators that are hard to
  count; consultation always comes too late; reindeer keep the mountains open; "a tree
  isn't worth enough to stand" without a signal species; the 15-year felling plans look
  like a chessboard; Rally Sweden.
- **6a/7** — a Naturskyddsföreningen Västerbotten board member (insects) and a Vindeln
  resident. Pollinators and the one-year life cycle; growth-economy critique; rights of
  nature; lupine; summer-farm meadows (Brattåker); "restore to what state?"; old
  clear-cuts as raspberry patches (a counterpoint).
- **8** — a biologist at Rewilding Sweden, Umeå. White-backed woodpecker as an umbrella
  species; converting spruce to deciduous forest; veteranisation; restoring
  timber-floated tributaries (Rödån, Juksån); mires ditched as relief work; a carbon-credit
  rewetting project dropped by Sveaskog over greenwashing fears.
- **9** — a tourism association (Gold of Lapland). Responsible and regenerative tourism;
  "fish, moose and lynx are worth more alive"; the hunters vs forest companies moose
  conflict; mow less, leave meadows.

**Nordmaling case (web, not in the folder):** in 1998 more than 120 landowners in
Nordmaling sued Ran, Vapsten and Ubmeje tjeälddie samebyar. On 27 April 2011 the Supreme
Court (T 4028-07) found the samebyar hold winter-grazing rights on that private land,
grounded in custom (sedvanerätt) rather than strictly immemorial prescription.

---

## 6. Change log

Most recent first. "EN" = `*_en.json`, "SV" = `*_sv.json`.

**2026-09-28 — Biodiversity rewritten, Swedish** (SV)
- `topics_sv.json`, Biodiversity: the brief, prompt and all six agenda points mirror the
  English below, including the softened rotation wording.
- Names restored per §2: SLU Artdatabanken, Naturvårdsverket, Skogsstyrelsen (ÄBIN),
  Länsstyrelsen Västerbotten, Norrbotten, SLU, **Sveaskog** (the carbon-credit rewetting
  project; also named in EN since 28 Sept — state-owned, no reason to anonymise), Trafikverket.
- `translation_guide_sv.md` §2.3 and §2.5 gained omloppstid, hänsynsträd/kantzon,
  betesskador (ÄBIN), återvätning, klimatkrediter/grönmålning, fäbod/slåtteräng,
  paraplyart, the red-list categories, and species names (älg, rödräv, fjällbjörk,
  havsörn, utter, pärluggla, fjälluggla, vitryggig hackspett).
- Verified: `ValidateTopicsData` passed; agenda-point counts match EN in every topic.

**2026-09-28 — Biodiversity rewritten** (EN)
- `topics_en.json`, Biodiversity topic:
  - **Brief:** now cites the March 2026 red list and the moose.
  - **Prompt:** the generic textbook context was replaced by a concrete one (the gradient,
    450 km free river, timber floating and Vindel River LIFE, ditched mires, 90% rotation
    forestry, falling felling age), and a three-logic Framing was added. The glued
    sentences ("life.Within") were fixed.
  - **Recent Developments:** added the red list, the owls/moose/eagle changes and the
    lupine ban; kept the restoration plan, compensation and devolution bullets.
- Agenda points, all two-sided with labelled bullets and a core question:
  - **AP0 Predators:** recovery vs herding; the eagle problem; compensation paid for
    presence, not loss.
  - **AP1 Wetlands:** restoration vs landowner; relief-work ditching; the carbon-credit
    project that collapsed; "restore to what?".
  - **AP2 Forest:** production (record stock, set-asides, risk-spreading, "nothing
    wasted") vs complexity (1,744 species, Tengmalm's owl, hoverflies, white-backed
    woodpecker, ~80% short-lived products, the last patches).
  - **AP3 Treeline:** adaptation vs alpine; snowy owl extinct; Arctic fox; reindeer
    grazing holds the treeline.
  - **AP4 Meadows, Verges and Invasive Lupines** (broadened): what rules can do (the
    lupine ban, late mowing, grazing) vs what they can't reach (gardens, tidiness,
    one-year life cycles).
  - **AP5 The Moose Paradox** (new): forest owner vs hunter and herder; ÄBIN 11% vs the
    5% target, who set the target, no link between density and damage, monocultures.
- Interview-derived numbers were checked (§3.6). Short-lived products use the
  Naturvårdsverket figures. Rotation length follows the interviews, attributed to "people
  who work in these forests" (100–120 years once, 60–80 planned now). The production side
  gets its own reason: younger stands grow faster and carry less rot and storm risk.
  (Revised the same day. A first draft cited SLU average felling ages instead.)
- Verified: `ValidateTopicsData` passed.

**2026-09-28 — Sámi agenda points rewritten, Swedish** (SV)
- `topics_sv.json`, Sámi topic: AP0 and AP2–AP5 mirror the English rewrite below, with
  names restored per §2:
  - Ran, Vapsten and Ubmeje tjeälddie (Nordmaling); Rans sameby and Lycksele tingsrätt
    (the JK case, Jägareförbundet, Rally Sweden);
  - Per Geijer and Gabna; Vapsten sameby for Rönnbäcken;
  - KD for the April proposal; Samerådet; Brå; Kristina Sehlin MacNeil; Mats Jonsson's
    *När vi var samer*.
  - Uses *gåhtuone* (the Ume Sámi spelling in the guide) for guohtun.
- `translation_guide_sv.md` §2.6: Samerådet, åretruntmarker/vinterbetesmarker, grundad på
  sedvana, gottgörelse, Rönnbäckenfallet, Kärnfråga.
- Verified: `ValidateTopicsData` passed.

**2026-09-28 — Sámi agenda points rewritten** (EN)
- `topics_en.json`, Sámi topic: AP0, AP2, AP3, AP4 and AP5 rewritten from single paragraphs
  into the two-sided format (§2), each with labelled bullets and a `Core Question:`. AP1
  (national interest) was already in format and is unchanged.
  - **AP0 Parallel Ownership:** landowner vs herding perspectives; Nordmaling 2011, Girjas
    2020, public interest vs property right, no reciprocal duty, JK tactic change.
  - **AP2 Green Colonization:** coexistence vs colonization; May 2024 Natura 2000 change,
    CRMA strategic project, no cap on cumulative land take, the 50 m corridor,
    Rönnbäcken/CERD, avoidance zones.
  - **AP3 Disappearing Library:** language-first vs landscape, framed by the April 2026
    proposal to move support from herding to language; Ume Sámi facts from Sametinget's
    2024 status report.
  - **AP4 Consultation:** progress vs paper shield; Consultation Act scope, Forestry Act
    winter gap, Renmarkskommittén (attributed to the Saami Council), CERD 2025, Rally
    Sweden.
  - **AP5 Lateral Violence:** evidence of harm vs local frustration; post-Girjas threats,
    Rally Sweden 2025, Brå 2024 on hate-crime recording, the Jokkmokk violence survey,
    Sehlin MacNeil's cycle. The vague "Härjedalen" reference was removed.
- English stays structural. Places and institutions that help the story are named
  (Nordmaling, Kiruna, Jokkmokk, Rönnbäcken, LKAB); parties are not.
- Verified: `ValidateTopicsData` passed.

**2026-09-28 — Election update and fact corrections** (EN + SV)
- Sámi topic: the brief notes the government that proposed removing the riksintresse lost
  the election. In Recent Developments, "election is held… unresolved" is replaced by the
  result (176–173) and the incoming parties' positions, and the lawsuit bullet is
  corrected (five samebyar, Talma 2022; Ran first from Västerbotten; JK tactic change).
  SV names Tidöpartierna, S/V/MP/C and Magdalena Andersson.
- Sámi AP1 "Is a Culture a National Interest?": the election outcome is added, and the
  minister is now "the outgoing government's minister" (SV: Ebba Busch (KD), named).
- Rights of Nature: the April 2026 proposal is marked as from the government voted out in
  September.
- Reindeer being: "Being counted as small" is in past tense, plus "In September those
  humans lost the big vote, but many of the ones who won also want to look again at all
  the protected places."
- This file restructured: current fact set, research library, decisions, change log.

**2026-09-27 — Stegra rescue and HYBRIT** (EN + SV)
- Green Transition:
  - Brief: the steel mill "nearly followed, until Sweden's most powerful industrial family
    bought in" (SV: Wallenbergsfären), adding "who owns it now".
  - Context: "Stegra, formerly H2 Green Steel".
  - Recent Developments: the collapse bullet is replaced by the rescue and construction
    status; Boden debt corrected; a HYBRIT bullet added; the last bullet reworded.
  - AP "Societal Boom… First Bust": pro-development rescue bullet, corrected debt, the
    rescue in "The Bust Has Already Happened Once", and a new "Who Carries the Risk" bullet.
- Energy: "gone bankrupt, stalled, or been delayed by years".
- Tourism: "been through bankruptcy and rescue, and neither is yet producing at scale".
- Custom topic: "one bankrupt, one rescued at the last minute by new owners".
- Wind Turbine being: "went bankrupt, stalled, or are years late".
- `translation_guide_sv.md` §2.8: vätgasstål, järnsvamp, stålverket, räddningsrunda,
  Wallenbergsfären, kommunal låneskuld.
- Verified: `ValidateTopicsData` / `ValidateFoodData` passed.

**2026-09-09 — First political-context pass** (EN v1.2.0 / beings v1.1.0, then SV)
- `system` instructs the model to trust dated facts over its priors; Swedish `system` gained
  `[CURRENT_DATE]`. Every topic gained a dated Recent Developments block.
- New agenda points: *Is a Culture a National Interest?* (Sámi, second) and *Deregulation
  as Forest Policy* (Forestry). Green Transition "Boom and Bust Anxiety" rewritten as the
  bust. Energy: municipal veto, omprövning, compensation package. Biodiversity, Mining,
  Tourism, Rights of Nature and the custom topic updated. `agentBrief`s refreshed on six
  topics.
- Beings:
  - Reindeer: two Politics entries and two Threats entries (the 50 m corridor; faster
    cutting).
  - Salmon: quota and fishing stop, and the omprövning as "the first real crack in the
    wall".
  - Wind Turbine: refusal rate and revised forecast.
  - Tree Harvester: *Regulatory Reality (2026)*, told not to gloat.
  - Pine: told it lost 308–21.
  - River, Lichen, Mountain and Bumblebee untouched.
- SV mirrors EN with parties named; terms locked in `translation_guide_sv.md`.
- Verified: server 505 and client 1138 tests passed; lints clean.

---

## 7. Sources

Verification date in brackets.

**Sámi rights and politics**
- SVT — Busch on riksintresset [9 Sep]: https://www.svt.se/nyheter/lokalt/norrbotten/busch-rennaringen-bor-inte-vara-ett-riksintresse
- SVT — all parties' positions [9 Sep, re-checked 28 Sep]: https://www.svt.se/nyheter/lokalt/norrbotten/efter-kd-utspelet-sa-ser-ovriga-partier-pa-rennaringsfragorna
- SVT — "Då har FN fel" [9 Sep]: https://www.svt.se/nyheter/inrikes/ebba-busch-om-kritiken-mot-rennaringspolitiken-da-har-fn-fel
- European Times — Kiruna / Gabna 50 metres [9 Sep]: https://europeantimes.news/2026/09/kiruna-mine-plan-narrows-sami-choices/
- SVT — JK insists on the Reindeer Husbandry Act (30 Apr 2026) [28 Sep]: https://www.svt.se/nyheter/sapmi/jk-star-fast-vid-krav-tillampa-rennaringslagen-i-malen
- SVT — Ran sameby sues the state [28 Sep]: https://www.svt.se/nyheter/lokalt/vasterbotten/rans-sameby-i-norra-vasterbotten-stammer-staten
- Svensk Jakt — Jägareförbundet refused in Ran's case [28 Sep]: https://svenskjakt.se/start/nyhet/jagareforbundet-stoppas-fran-att-delta-i-rattsprocess-om-fjalljakten/
- Högsta domstolen — Nordmaling, T 4028-07 [28 Sep]: https://www.domstol.se/hogsta-domstolen/avgoranden/2011/37976/
- Wikipedia — Nordmalingsmålet [28 Sep]: https://sv.wikipedia.org/wiki/Nordmalingsm%C3%A5let
- Regeringen — Renmarkskommittén to be wound up (Nov 2024) [28 Sep]: https://www.regeringen.se/pressmeddelanden/2024/11/regeringen-avser-avveckla-renmarkskommitten-och-tillsatta-en-ny-utredning/
- Transportstyrelsen — Rally Sweden appeal rejected (2026) [28 Sep]: https://www.transportstyrelsen.se/sv/om-oss/pressrum/nyhetsarkiv/2026/besked-i-rallyfragan-overklagandet-avslas/
- SVT — Ran sameby appeals the rally permit [28 Sep]: https://www.svt.se/nyheter/lokalt/vasterbotten/rans-sameby-overklagar-tillstandet-for-rally-sweden-har-renar-i-omradet
- Mittuniversitetet — Truth Commission final report, 30 Sep [9 Sep, 28 Sep]: https://www.miun.se/Forskning/forskargrupper/baskoes/nyhetsarkiv/2026-4/sanningskommissionen-for-det-samiska-folket-overlamnar-sitt-slutbetankande-till-regeringen-pa-mittuniversietet
- Regeringen — SOU 2026:15 (interim anthology, 4 Mar 2026) [28 Sep]: https://www.regeringen.se/rattsliga-dokument/statens-offentliga-utredningar/2026/03/sou-202615/

**Election**
- Valmyndigheten — result certified 19 Sep 2026 [28 Sep]: https://www.val.se/servicelankar/servicelankar/pressrum/nyheter--pressmeddelanden/pressmeddelande-nya/2026-09-19-valresultat-faststallt-i-2026-ars-riksdagsval
- Wikipedia — 2026 Swedish general election [28 Sep]: https://en.wikipedia.org/wiki/2026_Swedish_general_election

**Green transition, Stegra, HYBRIT**
- Stegra — closing of €1.4bn round (24 Jun 2026) [27 Sep]: https://stegra.com/en/news-and-stories/stegra-announces-closing-of-14-billion-financing-round
- Bloomberg — Wallenberg-led rescue (14 Apr 2026) [27 Sep]: https://www.bloomberg.com/news/articles/2026-04-14/stegra-gets-1-4-billion-from-wallenberg-led-group-to-save-plant
- The Next Web — rescue details, board changes [27 Sep]: https://thenextweb.com/news/stegra-14-billion-wallenberg-green-steel-boden
- High North News — closing (26 Jun 2026) [27 Sep]: https://en.highnorthnews.com/business/stegra-secures-eur-14-billion-to-complete-green-steel-plant-in-northern-sweden/1114775
- Bergsmannen — new timeline end of 2026, 60% built (15 Jun 2026) [27 Sep]: https://www.bergsmannen.se/nyheter/e/8785/ny-tidsplan-for-stegra-drojer-till-slutet-av-aret/
- Aktuell Hållbarhet — production start pushed back [27 Sep]: https://www.aktuellhallbarhet.se/ekonomi-och-strategi/affarsstrategi/stegra-tar-in-10-nya-miljarder-till-stalfabriken/
- Dagens PS — unpaid contractors (5 Feb 2026) [27 Sep]: https://www.dagensps.se/foretag/betalar-inte-stegra-efter-med-100-tals-miljoner/
- SVT — Boden debt 1,790 MSEK, loss 88 MSEK (13 Apr 2026) [27 Sep]: https://www.svt.se/nyheter/lokalt/norrbotten/kommunens-lanekostnader-skenar-lattnad-efter-uppgifter-om-stegra
- SVT — Boden debt from 80 MSEK [27 Sep]: https://www.svt.se/nyheter/lokalt/norrbotten/laneskulden-skenar-i-boden-fran-80-miljoner-till-15-miljard
- EFN — Stegra a year after Northvolt [9 Sep]: https://efn.se/anders-hagerstrand-extremt-svart-lage-for-stegra-ett-ar-efter-northvolts-konkurs
- Lyten — Northvolt acquisition completed (26 Feb 2026) [27 Sep]: https://lyten.com/2026/02/26/lyten-completes-acquisition-of-northvolt-sweden-and-establishes-its-first-lyten-industrial-hub-in-sweden/
- SVT — LKAB pauses Hybrit in Kiruna [27 Sep]: https://www.svt.se/nyheter/sapmi/lkab-pausar-satsning-pa-hybrit-i-kiruna
- SVT — LKAB after the Hybrit setback (17 Oct 2025) [27 Sep]: https://www.svt.se/nyheter/lokalt/norrbotten/sa-ser-lkab-pa-framtiden-efter-bakslaget-med-hybrit
- LKAB — environmental permit for Gällivare (15 Jun 2026) [27 Sep]: https://lkab.com/en/press/lkab-granted-environmental-permit-for-operations-in-gallivare/
- GMK Center — SSAB Oxelösund furnace delayed to 2027 [27 Sep]: https://gmk.center/en/news/ssab-postpones-startup-of-electric-arc-furnace-in-okselosund-until-2017/
- Börsvärlden — LKAB largest owner in SSAB [27 Sep]: https://borsvarlden.com/artiklar/lkab-flaggar-upp-som-storsta-agare-i-ssab

**Biodiversity** [all 28 Sep]
- SLU — Rödlistade arter i Sverige 2025: https://www.slu.se/artdatabanken/publikationer/rodlistor/rodlista-2025/
- Natursidan — Rödlistan 2025 (24 Mar 2026): https://www.natursidan.se/nyheter/rodlistan-2025-det-gar-allt-samre-for-sveriges-arter/
- BirdLife Sverige — birds in the 2025 red list: https://birdlife.se/blandad-utveckling-for-sveriges-faglar-i-nya-rodlistan/
- Natursidan — snowy owl and barn owl RE: https://www.natursidan.se/nyheter/tva-fagelarter-till-anses-nu-utdoda-i-sverige/
- SVT — the moose red-listed (NT): https://www.svt.se/nyheter/lokalt/jamtland/algen-rodlistad-men-inte-hotad-menar-slu-forskaren-medveten-minskning
- SVT — Västerbotten moose −34% (Sep 2024): https://www.svt.se/nyheter/lokalt/vasterbotten/algstammen-har-minskat-nastan-25-procent-nu-valjer-jagare-att-skona-kor
- Svensk Jakt — the 5% ÄBIN target never decided politically: https://svenskjakt.se/start/nyhet/del-1-fem-procents-abin-skador-aldrig-politiskt-beslutat-myndighet-tog-skogsbrukets-mal/
- Länsstyrelsen Västerbotten — 12,700 moose in 2026: https://www.lansstyrelsen.se/vasterbotten/om-oss/nyheter-och-press/nyheter---vasterbotten/2026-06-24-12-700-algar-far-fallas-under-arets-licensjakt-pa-alg.html
- Naturvårdsverket — first national invasive list, 34 species: https://www.naturvardsverket.se/om-oss/aktuellt/nyheter-och-pressmeddelanden/2026/maj/sveriges-forsta-nationella-forteckning-med-34-arter-ger-nya-verktyg-mot-invasiva-frammande-arter/
- Länsstyrelsen Halland — national list incl. lupines: https://www.lansstyrelsen.se/halland/om-oss/nyheter-och-press/nyheter----halland/2026-05-20-ny-nationell-forteckning-for-invasiva-frammande-arter.html
- Naturvårdsverket — Arctic fox 2025: https://www.naturvardsverket.se/om-oss/aktuellt/nyheter-och-pressmeddelanden/2025/december/farre-fjallravar-i-arets-inventering--men-langsiktig-trend-pekar-uppat/
- Natursidan — white-backed woodpecker: https://www.natursidan.se/nyheter/fortsatt-langsam-forbattring-for-vitryggig-hackspett/
- SLU skogsstatistik — Figur 4.9, average age at final felling (API): https://skogsstatistik.slu.se/pxweb/sv/OffStat/OffStat__Avverkning/AVV_alder_slutavverkning_fig.px/
- Natursidan — 75–80% short-lived products (Naturvårdsverket via DN, Mar 2021): https://www.natursidan.se/nyheter/svensk-skog-blir-till-75-procent-kortlivade-produkter/
- EU Commission — reindeer grazing and the treeline (8 Jun 2026): https://environment.ec.europa.eu/news/reindeer-grazing-can-help-maintain-tundra-ecosystems-counteracting-treeline-advance-due-climate-2026-06-08_en
- Hagenberg et al. 2025, *Ecosystems*: https://link.springer.com/article/10.1007/s10021-025-01025-z
- Sveriges Natur — the treeline is rising: https://www.sverigesnatur.org/arkiv/tradgransen-stiger/
- Sametinget — predator compensation: https://sametinget.se/rovdjur

**Forestry, mining, energy, biodiversity, salmon** [all 9 Sep]
- Riksdagen — MJU29: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/ett-tydligt-regelverk-for-aktivt-skogsbruk_hd01mju29/
- Regeringen — prop. 2025/26:242 [28 Sep]: https://www.regeringen.se/rattsliga-dokument/proposition/2026/04/prop.-202526242
- Riksdagen — prop. 2025/26:230: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/proposition/ersattning-vid-radighetsinskrankningar-till-foljd_hd03230/html/
- Ny Teknik — uranium mining possible from 2026: https://www.nyteknik.se/industri/efter-beslut-i-riksdagen-uranbrytning-mojlig-i-sverige-fran-2026/4408597
- Nordiska Projekt — gruvpeng inquiry: https://www.nordiskaprojekt.se/2026/09/04/regeringen-tar-steg-mot-lokal-gruvpeng-till-kommunerna/
- Vattenfall — omprövning starts: https://group.vattenfall.com/se/nyheter-och-press/pressmeddelanden/2026/nu-startar-omprovningen-av-vattenfalls-storskaliga-vattenkraft
- Green Power Sweden — wind incentive package: https://greenpowersweden.se/fakta/regeringens-incitamentspaket-for-vindkraft/
- Regeringen — draft restoration plan: https://www.regeringen.se/informationsmaterial/2026/09/sveriges-utkast-till-nationell-restaureringsplan
- Naturvårdsverket — licence hunts delegated: https://www.naturvardsverket.se/om-oss/aktuellt/nyheter-och-pressmeddelanden/2026/april/ratten-att-fatta-beslut-om-licensjakt-pa-lodjur-och-jarv-overlamnas-till-lansstyrelserna/
- HaV — salmon fishing stop: https://www.havochvatten.se/arkiv/nytt-om-fiskeregler/2026-06-24-forbud-mot-visst-svenskt-fiske-av-lax-i-ostersjon.html
- Mistral docs — models overview (no cutoff column): https://docs.mistral.ai/models/overview
