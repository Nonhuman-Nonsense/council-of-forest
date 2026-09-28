# Facts and sources for the prompts — editorial rules, verified facts, change log

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
- **The printed topic is exactly what the AI sees.** The wall prints `prompt` plus every
  agenda point, verbatim (`prototype/public/print_export.js`). Never keep a longer "app"
  version beside a printed one.
- **Length: about Green Transition's.** A topic's printed text (prompt + agenda points) is
  about 11–12k characters in English. Each fact appears **once per topic**: a
  Recent Developments item that an agenda point already covers belongs only in that
  point. Detail that does not fit stays here in §3, not in the prompt.
- **Beings carry stance, topics carry facts.** Every being in a meeting receives that
  meeting's topic and all its agenda points. A being's own prompt holds its voice, its
  position, and at most a one-line headline of the dated events that define that
  position (it also sits in meetings on the other seven topics, where the model would
  otherwise fall back on 2023 knowledge). No figures that a topic already carries in
  detail. The shared `system` prompt tells every being to take figures and dates from the
  notes and never invent a number.
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
- **Ownership (Skogsstyrelsen 2025):** individuals own 49% of productive forest, private
  companies 24%, public owners 22%. There are ~309,000 private owners (2024); median
  holding 11 ha. Norra Skog has ~27,000 members. The old prompt's "Sveaskog and Norra Skog
  manage most productive forest land" was wrong.
- **Sveaskog, Annual Report 2024** (`Research/forestry/`):
  - 14% of Sweden's forest land; 3.02M ha productive; ~800 employees; net sales 8.3 bn SEK.
  - Book value 119.7 bn SEK; proposed dividend 1,203 MSEK.
  - 26% of holdings excluded from forestry (+2% target by 2034).
  - Regeneration felling fell from 27,100 ha (2020) to 14,489 ha (2024). Deliveries from
    its own forest fell from 6.25 to 4.79 M m³sub.
  - "Area managed with alternative methods" (clear-cut-free): 55 / 29 / **37 ha**
    (2022/23/24).
  - Mission: commercial, with a market-based return.
- **Sveaskog, Norrbotten, 9 Jan 2023:** regeneration felling −45%, citing failed
  co-planning (samplanering) with samebyar. Critics (ETC, Naturskyddsföreningen
  Norrbotten) said the real cause was felling that had outrun growth; this was not
  independently verified.
- **SCA–Ohredahke:**
  - 24 Jan 2025: Ohredahke withdrew consent to all felling in its core areas.
  - SCA announced leaving FSC-FM from 1 June 2025, then paused after talks with Sámi
    organisations and FSC.
  - Natursidan: 1,000+ ha felled at 206 sites since the withdrawal, ~51% never clear-cut
    before.
  - SCA: consent must be exercised "in good faith".
- **Contorta:**
  - ~600,000 ha; 3,300 ha planted in 2024.
  - SLU Artdatabanken (Jan 2025): "very high risk" of becoming invasive; self-seeding on 22
    of 30 plots (SLU).
  - SCA keeps planting for climate reasons; the Church of Sweden is stopping as part of
    reconciliation.
- **Clear-cut-free forestry:** 733,000 ha in 2024 (CI 618–847k), ~3% of productive forest.
- **Scarification** (research folder):
  - 1985: 57,000 ha in Västerbotten and Norrbotten. Harrowing disturbs 45–55% of plant
    cover, ploughing 65–90%; ~20% still bare after 10 years.
  - Mild scarification on a lichen site: reindeer-lichen cover 10–20% lower after 6
    seasons, but better seedling survival.
- **Lichen-adapted management (model study):** +22% ground-lichen habitat within 15
  years, −11–22% net timber revenue.
- **Carbon sink:** net LULUCF uptake 54 Mt CO₂e in 2024, +8 Mt on 2023, after a decade of
  decline (1990–2024 average 56 Mt).

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
- **15 June 2026:** the Riksdag **abolished the municipal veto on uranium mining, 174–172**.
  The opposition (now the incoming majority) reserved. A committee inquiry
  (bokstavsutredare) is looking at municipal influence over alum-shale mining. *Note:*
  Sveriges Natur (June 2025) reported the veto as kept in the government's 2025 draft;
  that was superseded by the June 2026 vote.
- **Arjeplog, 19 Aug 2026 (SVT):** four uranium exploration permits granted in Arjeplog;
  no mine application yet. Arjeplog is the site of the 1981 Pleutajokk uranium protest.
- **Per Geijer:**
  - Gabna ended its 2013 cooperation agreement with LKAB on 2 Dec 2025 and rejects the
    mine.
  - LKAB's concession application went to Bergsstaten in 2024, with a herding analysis
    due by 1 May 2026.
  - **25 Sept 2026:** Länsstyrelsen Norrbotten recommended granting it (mining outweighs
    herding) while writing that losing the migration route ends the functional connection
    and "cannot be fully compensated".
  - Bergsstaten's decision is expected ~end of Nov 2026. **Update the prompts when it
    comes.**
- **LKAB: 86% of EU iron ore in 2025** (LKAB Annual Report 2025). The old "over 90%" came
  from the 2013 figure in the regional mineral strategy (90% iron ore, 24% gold, 10%
  copper for Norrbotten + Västerbotten).
- **Blaiken (near Sorsele):** Scanmining began mining in 2006 and went bankrupt in 2007;
  a later operator also went bankrupt. The state pays ≥427 MSEK for the clean-up through
  2035, against guarantees of 2.3 MSEK (for Blaiken and Svärtträsk together). It is the
  most expensive state-funded clean-up of a bankrupt mine (SVT, TV4).
- **Laisvall (Arjeplog, on the Laisälven):** Boliden lead mine 1943–2001, Europe's
  largest. Remediation completed in 2009. Lead-rich sediment remains in Saivastjärnen, the
  former settling basin.
- **EU CRMA:** permitting for strategic projects is capped at 27 months for extraction and
  15 months for others.
- **Mineral compensation:** two thousandths of the ore value, unchanged since 2005.
  Corporate tax goes to the state. The interview claim "LKAB pays tax in Stockholm" is
  inaccurate (LKAB's HQ is in Luleå; corporate tax is national), so it was not used.

### 3.5 Energy

- Municipalities vetoed **93%** of planned wind projects in 2025 (**63%** in 2024).
- Wind host municipalities receive **340 MSEK for 2025, 370 MSEK for 2026**.
- **Hydropower omprövning** restarted 25 June 2025. Vattenfall filed its first applications
  on 20 February 2026 (Älvkarleby, Söderfors). All plants must hold modern conditions by
  ~2040, **Stornorrfors included**.
- **Offshore wind, 4 Nov 2024:** the government rejected 13 of 14 Baltic offshore parks
  (~30 GW, ~140 TWh/yr) on defence grounds; Poseidon (west coast) was approved.
- **Region Västerbotten, May 2025 (SVT):** regional council chair: "no great need here
  and now … the network is full". Turbines are throttled in summer.
- **Skellefteå's wind plan:** 23 → 2 areas. Robertsfors, Malå, Norsjö and Skellefteå
  redid their plans in Nov 2023 ("sålt ut oss alldeles för billigt", Robertsfors).
- **Nuclear:** Vattenfall shortlisted GE Vernova and Rolls-Royce SMR on 18 Jul 2025. In
  June 2026 Videberg Kraft chose **Rolls-Royce SMR**: 3 reactors, ~1,500 MWe at Ringhals,
  the first in the mid-2030s and all ~2040. The state reserves ~220 bn SEK in loans and
  risk-sharing.
- **Juktan pumped storage (Storuman):** the Land and Environment Court dismissed the
  application on 10 Feb 2025 as too unclear, partly over tailings from the Blaiken mine
  on the bottom of Blaiksjön. Leave to appeal was refused in May 2025. A new application
  was planned for Q3 2026, with a start of ~2034. **Decided 28 Sept: no agenda point on
  Juktan.** The existing one-line mention in the Energy context stays.
- **Research folder:**
  - Widén et al. 2024 (*Science of the Total Environment*): all 19 Ume River stations
    modelled. The 2040 climate gives ~+2.2% production under current rules, and e-flows
    are met in all modelled years with smaller losses than today.
  - "Like a fish takes to water": >70% of Swedish bypassed reaches lack any minimum-flow
    mandate.
- **Corrections applied:** Svenska kraftnät is the grid operator, not "the state energy
  utility". Corporate and property tax on energy go to the state, not to HQ
  municipalities.

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
- **Norrfors fish ladder, 2026:** 11,375 salmon by 6 Aug. A single-day record of 2,200 on
  31 July (counting began in 1925). On track against the season record of 14,995 (2013).
  The final 2026 count was not checked.
- **Guest nights:**
  - Summer 2025: Sweden's record, 30.8M (+3.4%; international +8.8%). Västerbotten
    +7.0%; Norrbotten −1.4%, the only region to decline after three record years.
  - Visit Sweden: "no general overtourism", with 51.5% bed occupancy.
  - Winter 2024/25: international +7%. Norrbotten's international share was 42%.
- **Heliskiing:** effectively unregulated. The county boards lack legal power;
  Transportstyrelsen can only issue temporary flight bans. Norrbotten's county governor
  has asked the government for rules since 2023. No regulation was found as of Sept 2026.
- **Rally Sweden (Umeå 2025–2027):** ~150,000 visits over 4 days (2025); ~4,000 volunteers;
  ~5 MSEK back to local clubs; 120M TV viewers (organiser's figure).
- **Sápmi Experience:** VisitSápmi's voluntary quality label. No law restricts who may sell
  "Sámi"/"Lapland" experiences.
- **Transport:**
  - ~60% of foreign guest nights are attributable to flights (Tillväxtverket / Copenhagen
    Economics, 2019).
  - Night-train procurement to upper Norrland stopped in March 2026 on cost. SJ runs a
    stopgap from Dec 2026 to Dec 2028, and new vehicles come from ~2030.
  - Norrbotniabanan: Umeå–Dåva ~2026; Dåva–Skellefteå ~2035–36.

### 3.8 Rights of nature

- **Sweden:**
  - **11 March 2026:** the Riksdag rejected MP's motion 2025/26:3779 (an inquiry into
    rights of nature in the constitution, regeringsformen) by **278–17** (KU28). Only MP
    reserved.
  - Vindelälven is one of four *nationalälvar*, protected from hydropower (the damming
    was stopped after protests around 1970). It is protected as an object, not a subject.
- **Nature's proxies in Swedish law:**
  - **Skydda Skogen, CJEU C-473/19 & C-474/19 (4 March 2021)**, from a felling notice in
    Härryda: the species-protection bans cover *every individual* of a protected species,
    not only declining species.
  - The June 2026 forestry law (prop. 2025/26:242): environmental organisations' appeal
    time runs from the day a decision is announced, and Skogsstyrelsen becomes a party when
    they appeal. Plus the landowner compensation right (prop. 2025/26:230).
- **Aurora youth climate case:** the Supreme Court (Feb 2025) refused it, because courts
  can't order parliament to act, but opened a route for an association, citing
  KlimaSeniorinnen. It was refiled **6 Feb 2026** at Stockholm tingsrätt, asking only for a
  declaration that rights were violated. A preparatory hearing was scheduled for
  **21 Sept 2026**; the outcome was not checked.
- **Abroad:**
  - Ecuador's constitution (2008); the Atrato River, Colombia (2016); the Whanganui River,
    NZ (2017).
  - **Taranaki Maunga, NZ (30 Jan 2025):** "Te Kāhui Tupua", voiced by 4 iwi and 4
    minister-appointed members.
  - **Mar Menor, Spain:** Law 19/2022. The Constitutional Court upheld it on 20 Nov 2024
    (Vox challenge). Guardian bodies started in May 2025. A local court refused civil
    organisations standing to represent the lagoon. A first trial with the lagoon as
    plaintiff was scheduled for May 2026 (outcome not checked). Polluted farm runoff
    continues, and critics call it a "paper park".
  - Ireland: the Citizens' Assembly (2023) and a parliamentary committee recommended a
    referendum; none is scheduled.
- **Laponia:** managed since 2013 by Laponiatjuottjudus. The samebyar hold 5 of 9 board
  seats (via Mijá ednam), and decisions are taken by consensus.
- **Language check pending:** the old Rights of Nature context called lichen "guoppar",
  which I believe means *mushroom* in North Sámi; ground lichen is *jeagil*. Both
  rewrites (EN and SV, 28 Sept) dropped the word. Confirm with a Sámi speaker before
  using any Sámi term.

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
- **Topic pass — done 28 Sept in EN and SV.** All 8 topics rewritten to the two-sided
  format with a core question per agenda point (details in §6), then shortened the same
  day to print length (next item).
- **Shortening pass — done 28 Sept in EN and SV.** Printed length (prompt + agenda points,
  English characters), with agenda points per topic; EN/SV parity holds:

  | Topic | Chars | Points | Merged |
  |---|---|---|---|
  | Green Transition | 11,976 | 5 | — (the yardstick) |
  | Forestry | 12,124 | 6 | deregulation → consultation point; Sveaskog → rural economy |
  | Energy | 10,961 | 5 | — (context halved) |
  | Sámi | 11,912 | 5 | national interest + language/landscape |
  | Biodiversity | 11,631 | 6 | — (forest-debate point shrunk; it overlaps Forestry) |
  | Tourism | 11,162 | 6 | climate paradox → volume tourism |
  | Rights of Nature | 11,109 | 5 | — |
  | Mining | 11,584 | 5 | fast-tracking → Minerals Act |

  Agenda points are unnumbered in the print ("AGENDA POINT 1" is generated), so merged
  points renumber the later ones. Facts cut for length are still in §3 (Norra Skog's
  membership, Sveaskog's book value and Norrbotten cut, the Arctic fox count, the moose
  quota).
- **Beings pass — done 28 Sept in EN and SV.** Being prompts checked against the
  shortened topics (§6). They now carry dated facts too, so **a fact update may touch a
  being**: Reindeer (Per Geijer, Rally Sweden, the forestry law, the riksintresse
  proposal, CERD), Salmon (quota, Norrfors run, hydropower review), Pine (forestry law,
  good-news list), Tree Harvester (forestry law, carbon sink, ownership), Wind Turbine
  (refusal rate, forecast, offshore, nuclear), Bumblebee (lupine).
- **Per Geijer decision** (Bergsstaten, expected end of Nov 2026): update the Mining topic
  **and** Reindeer's "fifty metres" line, both languages.
- `ValidateTopicsData` does **not** check agenda-point parity between languages; check it
  by hand after adding or removing a point.
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

**2026-09-28 — This file moved and renamed** (docs)
- `docs/political-context-2026.md` → `shared/prompts/facts_and_sources.md`, next to the
  prompts and the translation guide; `docs/` is for temporary design notes only.
- §2 gained three rules (print = what the AI sees; length and one-fact-once; beings
  carry stance). §4's per-topic rewrite notes were replaced by the current state.

**2026-09-28 — Swedish consultation-act term; translation guide** (SV)
- `topics_sv.json` (Sámi, 2×) and `beings_sv.json` (Reindeer): "konsultationsordningen
  (2022:66)" throughout, as `translation_guide_sv.md` already locked it. One word changed
  in the printed Sámi text.
- Guide: Pine's response structure is 6 steps, not 5; links to this file.

**2026-09-28 — No invented figures** (EN + SV)
- `topics_*.json` `system`: "Take figures and dates from these notes or your own
  briefing; never invent a number." Not printed.

**2026-09-28 — Beings: 2026 news they need, repeats trimmed** (EN + SV)
- **Salmon:** the record Norrfors run (11,000+ by early Aug 2026, day record 2,200); 2026
  block tightened.
- **Pine:** a dated good-news list for its "celebrate first" step (restoration plan,
  hydropower review, salmon run, eagle and otter off the red list, Church of Sweden and
  contorta, Sveaskog's set-asides); forestry-law recap cut to one line.
- **Tree Harvester:** carbon sink 54 Mt (2024); ~309,000 private owners, median 11 ha;
  instruction to argue the industry/landowner side of the agenda point with that point's
  facts; regulatory recap cut to one line.
- **Reindeer:** Länsstyrelsen's 25 Sept recommendation on Per Geijer ("cannot be fully
  compensated"); Rally Sweden on Ran sameby's winter grazing; political entries dated
  (April/September 2026) and shortened.
- **Bumblebee:** the 15 May 2026 lupine ban and roadside meadows.
- **Wind Turbine:** offshore rejection (Nov 2024) and the Rolls-Royce SMR choice (June
  2026).

**2026-09-28 — Beings: contradictions with the topics fixed** (EN + SV)
- **Salmon:** the hydropower review trades ~1% at one plant and ~10% at another (was "one
  or two percent").
- **Tree Harvester:** "a small fraction" of felling notifications reviewed (was "one or two
  percent", unsourced).
- **Reindeer:** its example answer said the 1886 Act declared the Sámi could not own land,
  and dated the tax change 1923. The 1886 Reindeer Grazing Act divided the tax lands into
  collective lappbyar (herding right grounded in immemorial use) and began dismantling
  the household tax lands; the Sámi tax and tax lands ended in **1928**. The example now
  says so. Relative dates ("twelve months ago", "next winter") made absolute.
- **Lichen:** "Sveaskog has recently decided" → present tense (no verifiable date found).
- **Wind Turbine:** the 2,000-turbines-by-2030 vision marked "not reached"; example
  outputs no longer promise growth.

**2026-09-28 — Topics shortened to print length** (EN + SV)
- All topics except Green Transition, one commit each. Recent Developments keep only facts
  no agenda point covers; points merged as in §4; bullets trimmed to about three a side.
- Verified: topic data rules (script mirroring `ValidateTopicsData`); the print export
  parses every topic in both languages.

**2026-09-28 — Green Transition core questions** (EN + SV)
- `topics_en.json` / `topics_sv.json`, Green Transition: a `Core Question:` / `Kärnfråga:`
  appended to each of the 5 agenda points. No other text changed.
- **This completes the topic pass:** all 8 topics, 48 agenda points per language, are
  two-sided with a core question. Checked with the print export's parser: 48/48 core
  questions in each language.
- Verified: `ValidateTopicsData` passed.

**2026-09-28 — Energy rewritten, Swedish** (SV)
- `topics_sv.json`, Energiproduktion: the brief, context and all five agenda points
  mirror the English below. All titles unchanged.
- Names per §2:
  - Region Västerbotten's chair **Rickard Carstedt (S)** ("inget stort behov här och
    nu … nätet är fullt").
  - Skellefteå (23 → 2); Robertsfors ("sålt ut oss för billigt", SVT's headline wording).
  - Svenska kraftnät, described as the affärsverk running the national grid.
  - Vattenfall, Videberg Kraft, Rolls-Royce SMR, Försvarsmakten.
- The existing Swedish Recent Developments bullets are kept; two were added (offshore
  rejection, Rolls-Royce SMR).
- `translation_guide_sv.md` §2.8: Svenska kraftnät's role, förbiledd sträcka/torrfåra,
  miljöanpassade flöden, strypta, SMR.
- Verified: `ValidateTopicsData` passed; EN/SV parity holds in every topic.

**2026-09-28 — Energy rewritten** (EN)
- `topics_en.json`, Energy Production:
  - **Brief:** adds "the grid is full".
  - **Context:** Svenska kraftnät's role corrected; the 300 TWh forecast now "was
    projected … now contested"; the buildout slowing (Skellefteå 23 → 2, Region
    Västerbotten); the Lule vs Vindel "river voice" line (interview 4).
  - **Recent Developments:** added the offshore rejection (Nov 2024) and the Rolls-Royce
    SMR choice (June 2026).
- All 5 agenda points kept their titles and gained a core question:
  - **AP0 Wind:** offshore blocked; the herder's 19 turbines and 3–5 km avoidance
    (interview 4); "power nobody can send"; Skellefteå and "sold ourselves far too
    cheaply".
  - **AP1 Hydro:** Ume River's 19 stations and the 2040 e-flow model; >70% of bypassed
    reaches with no minimum flow; the char and the empty riverbed (interview 7);
    Stornorrfors (interview 3a); the Norrfors 2026 run.
  - **AP2 Grid:** the export bottleneck on both sides.
  - **AP3 Regional burden:** the tax error fixed (tax goes to the state); cheapest power in
    the north on the national side; Norway/Finland comparison attributed; municipalities
    demanding profit share.
  - **AP4 Nuclear:** Rolls-Royce at Ringhals, 220 bn, offshore blocked; waste, and uranium
    demand linking to the Mining topic.
- The Juktan point was proposed and declined.
- Verified: `ValidateTopicsData` passed.

**2026-09-28 — Mining rewritten, Swedish** (SV)
- `topics_sv.json`, Gruvdrift: the brief, prompt and all six agenda points mirror the
  English below. Titles AP0–AP4 unchanged; AP5 is new: *Vem får säga nej? Uranet och det
  kommunala vetot*.
- Names per §2:
  - **Tidöpartierna for, S/V/MP/C against** on the 174–172 veto vote.
  - Ebba Busch (KD) as the minister rejecting UN criticism.
  - Gabna sameby, LKAB, Länsstyrelsen i Norrbotten, Bergsstaten.
  - Vapsten sameby (Rönnbäcken), Laevas sameby.
  - Boliden (Laisvall, Saivastjärnen), Gold of Lapland and Guldriket, Arjeplog and
    Pleutajokk.
- Gabna's position is paraphrased, not quoted. The source quote was only available in
  English translation, so no Swedish quotation marks were used.
- `translation_guide_sv.md` §2.9: Bergsstaten, kommunalt veto, ekonomisk säkerhet,
  sedimenteringsbassäng, alunskiffer.
- Verified: `ValidateTopicsData` passed; EN/SV parity holds in every topic.

**2026-09-28 — Mining rewritten** (EN)
- `topics_en.json`, Mining:
  - **Brief:** "Over 90%" → "Most"; adds the 174–172 veto vote.
  - **Context:** LKAB 86% (2025); the Skellefte field; Kiruna and Malmberget moving;
    Laisvall on the Laisälven.
  - **Recent Developments:** added the veto abolition and Arjeplog permits, plus the Per
    Geijer timeline (Gabna's exit, the county board's recommendation on 25 Sept,
    decision due in November).
- Agenda points 5 → 6, all with a core question; titles AP0–AP4 unchanged:
  - **AP0 Urgency vs sacrifice zone:** industry side adds "mining built the north",
    tourism born from mining heritage (interview 9), and recycling limits (SOU 2022:56).
    Critics add towns moving, and tax and compensation (corrected: corporate tax is
    national). The uranium bullet moved to AP5.
  - **AP1 Minerals Act:** Per Geijer as the live case; Rönnbäcken; compensation without a
    seat.
  - **AP2 Cumulative impact:** Laevas one third functionally unavailable; the fifty metres.
  - **AP3 Tailings:** Laisvall as the industry's good example (remediated by 2009, but
    lead sediment remains); Blaiken's 427 MSEK against 2.3 MSEK of guarantees.
  - **AP4 Fast-tracking:** CRMA 27-month cap; Natura 2000 now parallel.
  - **AP5 Who Can Say No? (new):** uranium ban lifted by one vote, veto removed by two,
    Arjeplog permits, the 1981 Pleutajokk protest; the national-resource vs local-consent
    sides.
- Verified: `ValidateTopicsData` passed.

**2026-09-28 — Forestry rewritten, Swedish** (SV)
- `topics_sv.json`, Skogsbruk: the brief, prompt and all eight agenda points mirror the
  English below. Existing Swedish titles kept (trailing colon dropped from point 1); new
  point 6 is *Folkets skog: Sveaskogs dubbla uppdrag*.
- Kept from the earlier Swedish text: MP named on the 670,000 ha warning, the law's name
  *Ett tydligt regelverk för aktivt skogsbruk*, and prop. 2025/26:230.
- Names per §2: Ohredahke sameby, SCA, Sveaskog, Norra Skog, SLU Artdatabanken,
  Naturvårdsverket, Svenska kyrkan, Arjeplogs allmänning.
- Point 8 (Deregulation) gained only "hälften av Sveriges skog ägs av familjer".
- `translation_guide_sv.md` §2.3: föryngringsavverkning, schackrutehuggning, samplanering,
  allmänning, enskild skogsägare/skogsägarförening, marknadsmässig avkastning.
- Verified: `ValidateTopicsData` passed; EN/SV parity holds in every topic. The print
  export gives all 8 Forestry titles correctly in both languages.

**2026-09-28 — Forestry rewritten** (EN)
- `topics_en.json`, Forestry:
  - **Brief:** adds SCA and Ohredahke.
  - **Context:** the ownership error fixed (families 49%, 309,000 owners, Norra Skog
    27,000, SCA ~¼, Sveaskog 14%); clear-cut dominance and 3% clear-cut-free. It
    explicitly hands species, rotation and short-lived products to the Biodiversity topic.
  - **Recent Developments:** added SCA/Ohredahke, the contorta invasive-risk rating and
    the 2024 carbon-sink rebound.
- Agenda points 7 → 8, all two-sided with a core question. The three old run-on points
  (Introduced Species, Soil Scarification, Climate Benefit) now have separate titles and
  full sides.
  - **AP0 Clear-cut vs continuous cover:** 733k ha / 3%; Sveaskog's 37 ha against 14,500;
    chequered felling still at trial stage; "a steady income" (interviews 3, 8).
  - **AP1 Contorta:** 600k ha; invasive-risk rating; 22 of 30 plots; SCA for, the Church
    of Sweden against.
  - **AP2 Scarification:** the research numbers; Sveaskog's low-impact method as the good
    example (interview 4).
  - **AP3 Climate:** the 2024 sink rebound; stock vs flow; refers to Biodiversity for
    short-lived products.
  - **AP4 Governance:** the SCA/Ohredahke case with both sides; "chessboard" maps
    (interview 5); "the wind companies can be talked to" (interview 4).
  - **AP5 The People's Forest (new):** Sveaskog's return mission vs example role; the 1.2 bn
    dividend; felling halved; Norrbotten −45% (contested); 37 ha; +22% lichen for −11–22%
    revenue.
  - **AP6 Rural economy:** family owners; the commons (interview 3's "protect everything
    / use everything"); new incomes.
  - **AP7 Deregulation:** unchanged apart from "half of Sweden's forest belongs to
    families".
- Verified: `ValidateTopicsData` passed.

**2026-09-28 — Tourism rewritten, Swedish** (SV)
- `topics_sv.json`, Turism: the brief, prompt and all seven agenda points mirror the
  English below. Titles AP0–AP5 are unchanged (for the printed graphics); AP6 is new: *Att
  flyga in för att se Arktis: turismens klimatparadox*.
- Names restored per §2: Visit Sweden, Tillväxtverket, VisitSápmi (Sápmi Experience),
  Transportstyrelsen, Länsstyrelsen i Norrbotten, Trafikverket, SJ, Norrbotniabanan,
  **Rans sameby** (Rally Sweden), Finland (research fishing, kept from before).
- `translation_guide_sv.md` §2.10: gästnätter, överturism, regenerativ turism, fånga och
  släpp, fisktrappa, heliskiing, fäbodvall, nattåg/upphandling.
- Verified: `ValidateTopicsData` passed; EN/SV parity holds in every topic.

**2026-09-28 — Tourism rewritten** (EN)
- `topics_en.json`, Tourism:
  - **Brief:** adds rally stages and long-haul flights.
  - **Context:** local places (Ammarnäs, Hemavan-Tärnaby, Vindeln, Umeå), Västerbotten
    +7% in 2025, small firms, and the Responsible Tourism Program.
  - **Recent Developments:** added the 2025 record summer, the Norrfors salmon run next to
    the Baltic quota cut, and the night-train collapse.
- Agenda points, 6 → 7; titles AP0–AP5 unchanged:
  - **AP0 Volume vs Eco:** "not yet crowded" (half the beds empty); Ammarnäs housing;
    "sustainable tourism is a slower way to die" (interview 9).
  - **AP1 Motorised:** "nowhere left undisturbed" (interview 4); unregulated heliskiing.
  - **AP2 Cultural:** the Sápmi Experience label; "a label, not a law"; unpaid
    explaining (interview 5).
  - **AP3 Fishing:** fixed the unsourced "unique Ammarnäs trout"; "worth more alive";
    Laisälven and Vindelälven both undammed; the Norrfors run as a contested counterpoint.
  - **AP4 Governance:** an open-access side added; "we sold the right to roam"; the
    state-land line softened (Statens fastighetsverk removed); Rally Sweden on both sides.
  - **AP5 Standing forest:** a **forestry side added** (roads, scale, berry clear-cuts,
    plan together); the vague carbon-credit bullet cut; the riding-trail and meadow
    stories added.
  - **AP6 Flying In to See the Arctic (new):** export vs climate; the 60% flight share;
    the night-train collapse; Norrbotniabanan mid-2030s; rain in January.
- Verified: `ValidateTopicsData` passed.

**2026-09-28 — Rights of Nature rewritten, Swedish** (SV)
- `topics_sv.json`, Naturens rättigheter: the brief, prompt and all five agenda points
  mirror the English below.
- Names restored per §2: Miljöpartiet (the motion; the only party voting for it) and
  "Bara MP reserverade sig"; the Skydda Skogen association and Härryda; Aurora;
  Laponiatjuottjudus (samebyar majority, consensus); Sveaskog; lappskatteland.
- The old Sámi word for lichen (guoppar) is gone.
- Swedish agenda-point titles:
  1. Att äga det oägbara: egendom mot tillhörighet
  2. Juridisk ställning: resurs eller juridisk person?
  3. Vem talar för naturen i dag?
  4. Rättigheter för vem? Urfolksförvaltning eller grön vildmark
  5. Myten om herravälde: släktskap mot förvaltarskap
- `translation_guide_sv.md` §2.7: talerätt, förmyndare, ombud, nationalälv,
  förvaltarskap/släktskap, pappersnationalpark, regeringsformen.
- Verified: `ValidateTopicsData` passed; EN/SV agenda-point parity holds in every topic.

**2026-09-28 — Rights of Nature rewritten** (EN)
- `topics_en.json`, Rights of Nature:
  - **Brief:** adds the personhood cases and the 278–17 vote.
  - **Context:** now opens on Vindelälven as a *nationalälv*, protected as an object. It
    adds a three-logic Framing (property, proxy, standing) and drops the Sámi word for
    lichen (see §3.8).
  - **Recent Developments:** added the 278–17 vote, Taranaki and Mar Menor, and the
    Aurora case; kept the three existing bullets.
- Agenda points, 3 → 5, all two-sided with a core question:
  - **AP0 Owning the Unownable: Property vs. Belonging** (reframed; the old AP0
    duplicated the Sámi topic's *Parallel Ownership*). State land taken from Sámi tax
    lands; "who are humans to decide who owns a mountain" (interview 9); Taranaki owns
    itself.
  - **AP1 Legal Standing:** for (Ecuador, Atrato, Whanganui, Taranaki, Mar Menor) vs
    against ("who speaks?", paper park, uncertainty, the "war" warning from interview 7,
    278–17).
  - **AP2 Who Speaks for Nature Today? (new):** the proxy perspective (Skydda Skogen at
    the CJEU, the restoration regulation, Aurora) vs the owner and democracy perspective
    (the June 2026 appeal changes and compensation).
  - **AP3 Rights for Whom? (new):** the alliance perspective (the same enemy; Laponia's
    Sámi-majority management) vs the competition perspective (rights for the river,
    consultation for the people; wilderness without people).
  - **AP4 The Myth of Mastery: Kinship vs. Stewardship** (the old AP2, completed): "trees
    grow for themselves" (interview 4); a tree only worth what someone finds on it
    (interview 5); humans are nature too; the Indigenous-scholar critique of personhood.
- Verified: `ValidateTopicsData` passed.

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

**Energy** [all 28 Sep]
- Regeringen — 13 offshore parks rejected (Nov 2024): https://www.regeringen.se/pressmeddelanden/2024/11/avslag-pa-13-havsbaserade-vindkraftparker-i-ostersjon/
- SVT — "no more wind needed, the grid is full" (May 2025): https://www.svt.se/nyheter/lokalt/vasterbotten/regionradet-i-vasterbotten-behovs-inte-mer-vindkraft-natet-fullt
- SVT — Skellefteå wind plan 23 → 2: https://www.svt.se/nyheter/lokalt/vasterbotten/vindkraftsplanen-bantas-kraftigt-i-skelleftea-fran-23-till-2
- SVT — "sold ourselves too cheaply" (Nov 2023): https://www.svt.se/nyheter/lokalt/vasterbotten/kommuner-i-vasterbotten-gor-nya-vindkraftsplaner-kraver-mer-betalt-salt-ut-oss-for-billigt--wlu8l9
- Energinyheter — Videberg Kraft chooses Rolls-Royce SMR (Jun 2026): https://www.energinyheter.se/20260616/34945/videberg-kraft-valjer-rolls-royce-smr-som-leverantor-av-ny-karnkraft-i-sverige
- DN — state frame for new nuclear: https://www.dagensnaringsliv.se/20251010/283466/regeringen-oppnar-miljardlan-till-nya-karnreaktorer
- Vattenfall — Juktan rebuild: https://projekt.vattenfall.se/vattenkraftsprojekt/juktan/
- Sveriges Domstolar — Juktan dismissed (Feb 2025): https://www.domstol.se/nyheter/2025/02/mark--och-miljodomstolen-avvisar-vattenfalls-ansokan-om-att-bygga-om-juktans-kraftstation/

**Mining** [all 28 Sep]
- SVT — Riksdag abolishes municipal uranium veto (15 Jun 2026): https://www.svt.se/nyheter/lokalt/jamtland/riksdagen-kommunalt-veto-mot-uranbrytning-avskaffas
- SVT — uranium question back in Arjeplog (19 Aug 2026): https://www.svt.se/nyheter/sapmi/uranfragan-ater-aktuell-i-arjeplog-samtalsamne-bland-ortsbor
- NSD — county board wants to grant Per Geijer (25 Sep 2026): https://www.nsd.se/nyheter/kiruna/artikel/lansstyrelsen-vill-bevilja-lkab-koncession-per-geijer/r0ezx59j
- Ny Teknik — Gabna breaks with LKAB (2 Dec 2025): https://www.nyteknik.se/industri/sameby-bryter-med-lkab-sager-nej-till-per-geijer-gruvan/4416715
- LKAB — Annual and Sustainability Report 2025: https://lkab.com/en/financial-information/annual-reports/annual-and-sustainability-report-2025/
- SVT — Blaiken remediation: https://www.svt.se/nyheter/lokalt/vasterbotten/nu-saneras-blaikengruvan-ett-sar-i-naturen
- TV4 — the state paid for the Blaiken clean-up: https://www.tv4.se/artikel/61yKRK6K4nXGvWqnWg9jPL/gruvbolag-gick-i-konkurs-staten-fick-sta-foer-saneringen
- SOU 2018:59 Statens gruvliga risker: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/statens-offentliga-utredningar/statens-gruvliga-risker_h6b359/html/
- Mining Technology — Laisvall: https://www.mining-technology.com/projects/laisvall/
- IEA — EU Critical Raw Materials Act (permit caps): https://www.iea.org/policies/17662-european-critical-raw-materials-act

**Forestry** [all 28 Sep]
- Sveaskog — reduced felling in Norrbotten (9 Jan 2023): https://www.sveaskog.se/press/2023/minskade-avverkningsnivaer-i-norrbotten-2023/
- Svensk Jakt — Sveaskog in conflict with herding: https://svenskjakt.se/start/nyhet/sveaskog-i-konflikt-med-renskotseln-kraftigt-minskade-avverkningar/
- Skogsaktuellt — SCA pauses its FSC exit: https://www.skogsaktuellt.se/artikel/2237790/sca-pausar-uttrde-ur-fsc.html
- Syre / DN — SCA leaves FSC (Apr 2025): https://tidningensyre.se/2025/10-april-2025/dn-sca-lamnar-miljocertifieringen-fsc/
- Natursidan — 200+ SCA fellings despite the sameby's no: https://www.natursidan.se/nyheter/over-200-avverkningar-av-sca-trots-nej-fran-sameby/
- SVT — SLU: contorta may become invasive (19 Jan 2025): https://www.svt.se/nyheter/sapmi/slu-varnar-contortatallen-kan-bli-invasiv
- Skogsstyrelsen — measures in forestry (clear-cut-free, contorta): https://www.skogsstyrelsen.se/statistik/skogsskotsel/atgarder-i-skogsbruket/
- Naturvårdsverket — carbon uptake improving (Dec 2025): https://www.naturvardsverket.se/om-oss/aktuellt/nyheter-och-pressmeddelanden/2025/december/svart-att-na-klimatmalen-men-en-ljusning-for-upptaget-av-vaxthusgaser-i-skog-och-mark/
- Skogsstyrelsen — ownership trend: https://www.skogsstyrelsen.se/nyhetslista/trenden-med-farre-skogsagare-och-storre-innehav-fortsatter/
- Föreningen Skogen — who owns Sweden's forests: https://www.skogen.se/skogssverige/fakta-om-skog/vem-ager-sveriges-skogar/

**Tourism** [all 28 Sep]
- Visit Sweden — record summer 2025: https://corporate.visitsweden.com/press/2025-den-starkaste-turistsommaren-nagonsin-i-sverige-ingen-overturism/
- Tillväxtverket — winter tourism keeps growing: https://www.mynewsdesk.com/se/tillvaextverket/pressreleases/vinterturismen-till-sverige-fortsaetter-att-oeka-visar-ny-statistik-fraan-tillvaextverket-3450614
- SVT — Norrfors salmon record near (7 Aug 2026): https://www.svt.se/nyheter/lokalt/vasterbotten/gladjebeskedet-laxrekord-nara-for-fisktrappan-i-norrfors
- SVT — calls to regulate heliskiing (2023): https://www.svt.se/nyheter/lokalt/norrbotten/okat-intresse-for-heliskiing-nu-efterlyses-reglering-i-fjallen
- Rally Sweden — Umeå 2025–2027: https://rallysweden.com/en/three-new-years-in-umea-2025-2027/
- Besöksliv — Rally Sweden and Umeå: https://www.besoksliv.se/nyheter/rally-sweden-driver-pa-umea-som-evenemangsstad/
- Visit Sweden — VisitSápmi agreement: https://corporate.visitsweden.com/press/visitsweden-och-visitsapmi-i-varldens-forsta-overenskommelse-om-turismsamarbete-for-urfolk/
- Naturvårdsverket — allemansrätten and organised activity: https://www.naturvardsverket.se/vagledning-och-stod/allemansratten/organiserad-verksamhet/
- Tillväxtverket — Flygets roll för besöksnäring och miljö (2019): https://tillvaxtverket.se/tillvaxtverket/publikationer/arkiveradepublikationer/publikationer2019/flygetsrollforbesoksnaringochmiljoisverige.1342.html
- Järnvägsnyheter — night-train procurement stopped (30 Mar 2026): https://www.jarnvagsnyheter.se/20260330/18493/nattag-till-norrland-stoppas-ny-losning-vantar
- Trafikverket — Norrbotniabanan: https://www.trafikverket.se/vara-projekt/projekt-som-stracker-sig-over-flera-lan/norrbotniabanan/

**Rights of nature** [all 28 Sep]
- Riksdagen — KU28 (motion rejected 11 Mar 2026, 278–17): https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/fri-och-rattigheter-m-m_hd01ku28/
- Motion 2025/26:3779 Naturens rättigheter (MP): https://www.riksdagen.se/sv/dokument-och-lagar/dokument/motion/naturens-rattigheter_hd023779/
- 1News — Taranaki Maunga law (30 Jan 2025): https://www.1news.co.nz/2025/01/30/te-kahui-tupua-taranaki-maunga-bill-passes-into-law/
- Earth Law Center — Mar Menor constitutional ruling: https://www.earthlawcenter.org/blog-entries/2025/1/in-a-european-first-landmark-verdict-upholds-constitutionality-of-mar-menors-legal-rights
- bioGraphic — Mar Menor three years on (Jun 2025): https://biographic.com/a-spanish-lagoon-was-granted-legal-personhood-then-what-happened/
- EUR-Lex — C-473/19 Skydda Skogen: https://eur-lex.europa.eu/legal-content/SV/ALL/?uri=CELEX:62019CJ0473
- Sveriges Domstolar — HD on Auroramålet (Feb 2025): https://www.domstol.se/nyheter/2025/02/hogsta-domstolen-meddelar-beslut-i-ett-uppmarksammat-mal-dar-fragan-om-en-klimattalan-kan-tas-upp-till-provning-har-hanskjutits-fran-nacka-tingsratt-det-sa-kallade-auroramalet/
- Auroramålet — news (refiled Feb 2026): https://xn--auroramlet-75a.se/nyheter/
- Wikipedia — Laponiatjuottjudus: https://sv.wikipedia.org/wiki/Laponiatjuottjudus
- Ecojurisprudence — Ireland referendum recommendation: https://ecojurisprudence.org/initiatives/ireland-parliament-recommends-national-referendum-on-rights-of-nature-constitutional-amendment/

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
