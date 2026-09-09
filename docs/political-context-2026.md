# Political context update — September 2026

Working document for the update of `shared/prompts/topics_en.json` and
`shared/prompts/beings_en.json` ahead of the **10 October 2026** exhibition opening.

Written 9 September 2026. Everything below is dated on purpose: this file will go stale,
and a fact without a date cannot be re-verified.

---

## 1. Why this update exists: the model knows nothing after 2024

`server/global-options.json` sets `"conversationModel": "mistral/mistral-large-3"`.
Mistral **does not publish knowledge cutoffs** — neither `docs.mistral.ai/models/overview`
nor `legal.mistral.ai/ai-governance/models/*` has a cutoff column; they list release and
retirement dates only. Third-party aggregator tables claiming "Oct 2024" are guesses.

So we probed the actual endpoint. Results (9 Sept 2026, temperature 0, via
`https://api.inworld.ai/v1/chat/completions`):

| Model string | Self-reported cutoff | Knows Trump won Nov 2024? | Swedish uranium law |
|---|---|---|---|
| `mistral/mistral-large-3` (current) | October 2023 | No | **Wrong** — "legal, changed 2018" |
| `mistral/mistral-large-latest` | October 2023 | No | **Wrong** — "Yes, 2018" |
| `mistral/mistral-medium-latest` | 10 2023 | No | **Wrong** — "Yes, 2018" |
| `openai/gpt-4.1` | June 2024 | No | Correct for its era ("No, 2018") |
| `anthropic/claude-sonnet-4-5` | April 2024 | Yes | Correct for its era |

Model strings that returned `400 not supported` on our account: `mistral-medium-3-5`,
`mistral-medium-3504`, `mistral-small-4`, `mistral-large-2411`, `magistral-*`,
`open-mistral-nemo`, `openai/gpt-5`, `anthropic/claude-opus-4-5`, `google/gemini-3-pro`,
`deepseek/deepseek-v3.2`. There is no `GET /v1/models` endpoint (returns 404).

### Conclusions

1. **No Mistral model reachable through Inworld has a later cutoff than the one we run.**
   `mistral-large-latest` and `mistral-medium-latest` share the same ~Oct 2023 horizon.
   Mistral Medium 3.5 (v26.04) is not routable on this account.
2. **No available model of any provider knows 2025–2026.** The best is ~mid-2024.
   Switching models cannot solve this problem; only prompt content can.
3. **Decision: keep `mistral/mistral-large-3` for the October exhibition.** Swapping the
   model four weeks before opening risks the tightly tuned character voices (Mountain's
   20-word stone-speech, Bumblebee's Z-rule, the per-character length limits) for a
   benefit that does not exist.
4. One thing worth remembering: on the uranium question Mistral **asserted the opposite of
   the truth** while the others correctly said "no, banned in 2018". That is a
   hallucination-confidence difference, not a cutoff difference — but it means unstated
   facts do not come back as "I don't know", they come back as confident errors. Anything
   we care about must be in the prompt.

To re-run the probe later, recreate the script from this table's method: POST to
`api.inworld.ai/v1/chat/completions` with a dated question whose answer we know, a system
message instructing "answer `unknown` if after your training data", and `temperature: 0`.
Good boundary probes: US Nov 2024 election, Northvolt (Mar 2025), German Chancellor
(Merz, May 2025), Pope Leo XIV (May 2025), Swedish uranium ban lifted (Jan 2026).

---

## 2. Editorial rules agreed for this update

- **English = structural, no party names.** `topics_en.json` says "the government proposed",
  "a majority of parliamentary parties". The English version is for an international
  audience that cannot place KD, M or SD, and naming them adds noise rather than meaning.
- **Swedish = parties named.** `topics_sv.json` is for a local audience who will find
  the anonymised version evasive. Name KD, M, SD, L, C, S, V, MP as factual record.
- **Characters never campaign.** Facts go in the topic prompts, which are swappable per
  meeting. Characters may react to a policy; they may not endorse a party or tell anyone
  how to vote. A talking reindeer campaigning during election week is a different artwork
  than the one we built.
- **Dated facts live per topic, not in `system`.** A "recent developments" block in the
  system prompt would hit every conversation regardless of subject and burn context.
  Each topic carries its own dated block.
- **Absolute dates only.** Never "recently" or "last year" — the model has no idea when now is.
- **The present date is injected, never written.** `[CURRENT_DATE]` is substituted at meeting
  setup by `buildMeetingSystemPrompt` (`shared/topicPrompt.ts`), formatted for `en` or `sv`.
  The system prompt states only when its facts were *verified* — a fact about the document,
  which does not go stale as time passes. An earlier draft said "The Council meets in the autumn
  of 2026"; that would have needed updating every season and been silently wrong in between.

---

## 3. Findings by topic

All dates verified 9 Sept 2026 via the sources in §6.

### 3.1 The riksintresse fight — the single biggest development

- **20 April 2026, Luleå:** Kristdemokraterna (Ebba Busch, with rural affairs minister
  Peter Kullgren) proposed that reindeer herding should **no longer be a riksintresse**,
  that reindeer numbers be reduced, and that subsidies be reconsidered and redirected to
  Sámi language and culture instead. Argument: the industry "affects very large areas but
  has limited economic significance" — one tenth of a promille of GDP in the four
  northernmost counties.
- Party positions (SVT, 24 April, updated 2 Sept 2026): **remove** — KD, M
  ("riksintressesystemet behöver reformeras i grunden"), SD. **Review the whole system** —
  C (wants a parliamentary committee to rewrite the reindeer herding law), S.
  **Keep** — L (breaking with its coalition partners), V, MP.
- **Six of eight riksdag parties now support easing mining rules.**
- **3 September 2026:** Busch dismissed UN criticism of Swedish mining policy with
  **"Då har FN fel"** — "Then the UN is wrong."
- **General election: 13 September 2026.**

This deserves its own agenda point under Sámi Land, Rights & Culture. It is the live
Swedish land-use question, it is abstract enough for nonhumans to argue about (the forest
has never been a riksintresse; the mine is), and it connects straight to Rights of Nature.

### 3.2 Green transition — the boom has already busted

- **12 March 2025:** Northvolt bankruptcy, the largest in Swedish history. Assets bought
  by US company **Lyten in February 2026**.
- **Stegra** (ex-H2 Green Steel, Boden): capital need up to **€2bn**; Harald Mix stepped
  down as chair October 2025; widely discussed in 2026 as "the next Northvolt".
- **Boden municipality's loan debt: 90 MSEK → over 1 billion SEK**, built out ahead of
  an industry that may not arrive.
- **Svenska kraftnät** revised industrial electricity demand **down ~20%** in its 2026
  long-term market analysis; consumption has *fallen* over the past two years. The
  140→300 TWh framing in our prompt is now contested rather than assumed.

The topic currently reads as 2023 boosterism and frames collapse as "Boom and Bust
*Anxiety*". It is no longer anxiety. The land was fragmented for a factory that may never
open — that is a genuinely new argument for the Council, distinct from extraction vs.
protection.

### 3.3 Forestry — deregulation passed

- **16 June 2026:** *Ett tydligt regelverk för aktivt skogsbruk* passed **308–21**,
  in force **1 January 2027**. Narrows when samråd notification is required; shortens the
  review window **from six weeks to three**; moves Skogsstyrelsen appeals to the mark- och
  miljödomstolar; caps landowner costs for species knowledge relative to property value.
  MP warned it puts ~670,000 ha of old-growth at risk over 25 years.
- **June 2026:** prop. 2025/26:230 — landowners gain a **right to compensation** when
  species protection restricts land use.
- **EUDR** (deforestation regulation) paused/reconsidered at Sweden's urging.
  **LULUCF to 2040** proposal due from the Commission during 2026; Sweden expected to
  deliver the EU's largest sink (+4 Mt CO₂e by 2030).
- **Skogsstyrelsen:** at current rates, nearly all remaining natural forest outside
  protected areas disappears **within 26 years**.

Note for the Pine character: Pine's blueprint demands banning clear-cutting. The Riksdag
just voted 308–21 the other way. Pine should know it lost.

### 3.4 Mining

- **1 January 2026:** the **uranium mining ban was lifted**, after the Riksdag voted it
  through in November 2025 **by a single vote**. Uranium is now a concession mineral.
- **March 2026:** **Per Geijer** (Kiruna) received EU **Critical Raw Materials Act
  Strategic Project** status, together with the Gällivare apatite expansion and a Luleå
  processing hub. Still lacks both mining concession and environmental permit.
  Demo plant end-2026, full production 2030s. ~2.2 Mt rare earth oxides in situ.
- **Gabna sameby's remaining migration corridor is roughly 50 metres wide, down from
  about 13 kilometres.** The single most useful fact in this whole document — it does the
  work of a paragraph of "cumulative encroachment" framing.
- **4 September 2026:** government inquiry launched into a **"gruvpeng"** — redistributing
  mineral compensation and exploration fees to host municipalities (rates unchanged since
  2005). Reports **30 September 2028**. Recipients: municipalities, possibly landowners.
  **Samebyar are not named as recipients.**
- Minerallagen was amended so a Natura 2000 permit is no longer a prerequisite for
  granting a bearbetningskoncession.

### 3.5 Energy

- **Municipalities vetoed 93% of planned wind projects in 2025**, up from 63% in 2024.
  Our prompt assumes an unstoppable buildout; the opposite is happening.
- Wind municipalities now receive **340 MSEK for 2025 and 370 MSEK for 2026** (matching
  total national wind property tax). Our "municipal tax deficit" bullet is outdated as
  written — the critique now has to argue against the compensation, not pretend it's absent.
- **Hydropower omprövning restarted 25 June 2025.** Vattenfall filed its first
  applications **20 February 2026** (Älvkarleby and Söderfors, lower Dalälven, 40-year
  conditions, ~16 GWh/yr production loss). Miljöfonden reopened **1 March 2026**. All
  plants to hold modern environmental conditions by ~2040. **Stornorrfors is in this
  queue** — this is the local hook for the protected-river-above-a-turbine paradox, and
  a rare piece of good news for Salmon to be grudging about.

### 3.6 Biodiversity

- **3 September 2026:** the government adopted Sweden's **draft national nature
  restoration plan** under the EU Restoration Regulation (EU) 2024/1991 — **39 measure
  packages**. Commission has six months to respond; final plan due **1 September 2027**.
  Our wetland-rewetting agenda point is now a live process with a deadline.
- **April 2026:** Naturvårdsverket **delegated licence-hunt decisions** for lynx (all
  counties but Gotland) and wolverine (northern management area) to the länsstyrelser.
  Norrbotten declined a lynx hunt for 2026 — population not recovered. Devolution cuts
  both ways; worth keeping the nuance.

### 3.7 Salmon and tourism

- Sweden's **2026 Baltic salmon quota fell to 7,152 fish** (from 9,743).
- **25 June – 24 July 2026:** HaV banned Swedish salmon fishing in ICES subdivisions
  30–31 once the allocation was exhausted.
- Finland criticised for circumventing the stop via "research fishing".

### 3.8 Sámi rights beyond the riksintresse

- **Renmarkskommittén was scrapped** (announced Nov 2024, after criticism of its Aug 2023
  partial report). A replacement inquiry was promised. MP campaigns on completing it.
- **Four samebyar are suing the state** post-Girjas for exclusive hunting and fishing
  rights above the cultivation boundary: **Ran (Västerbotten) filed first, 28 May 2024**,
  then Sirges, Unna Tjerusj, Baste. *Ran is in our biosphere region* — a local case.
- **CERD recommendations to Sweden, 5 December 2025:** stronger land-rights protection and
  genuine influence in decisions; full nationwide implementation of the Consultation Act;
  measures against the **increasing killing of and attacks on reindeer**; action on
  violence against Sámi women. Council of Europe separately urged Sweden to ensure
  land-use decisions do not harm Sámi culture, language and identity.

---

## 4. Scheduled follow-up: the Truth Commission

**30 September 2026** — the Truth Commission for the Sámi People delivers its final report,
**"Marken, vattnet, tankarna. Konsekvenser för samer av svensk politik" (SOU 2026:15)**,
at Mittuniversitetet in Östersund. A research anthology was already handed over 4 March 2026.

Agreed plan: **do not write the report's content into the prompts yet** — we do not know
what it says. In the week of **30 Sept – 9 Oct**, before the 10 October opening, add its
findings to the Sámi Land, Rights & Culture topic. Until then the prompts may note only
that the commission is due to report, as a dated fact.

---

## 5. Change log for this pass

English only. Swedish (`topics_sv.json`, `beings_sv.json`) follows in a later pass, with
party names restored per §2.

- [x] `topics_en.json` (v1.2.0) — `system` now states the Council meets in autumn 2026 and
      instructs the model to trust the dated facts over its own priors. Every topic gained a
      "RECENT DEVELOPMENTS (verified September 2026)" block. New agenda points: *Is a Culture
      a National Interest?* (Sámi, inserted second) and *Deregulation as Forest Policy*
      (Forestry). Green Transition agenda point 4 rewritten from "Boom and Bust Anxiety" to
      the bust as fact. Energy: municipal-refusal bullet added to wind, omprövning added to
      hydropower, the tax-deficit bullet rewritten against the compensation package.
      Biodiversity: restoration plan and predator devolution folded into existing points.
      Mining: uranium and gruvpeng bullets. Tourism: salmon quota. Rights of Nature and the
      custom-topic fault-line list updated. `agentBrief`s refreshed on six topics.
- [x] `beings_en.json` (v1.1.0) — Reindeer: two Politics entries (being counted as small;
      the UN told them and the minister shrugged) and two Threats entries (the fifty metres;
      faster cutting). Salmon: quota cut, fishing stop, and the omprövning as the first real
      crack in the wall, with instructions to give credit and still push. Wind Turbine:
      refusal rate, revised forecast, "most of your siblings were never allowed to exist".
      Tree Harvester: *Regulatory Reality (2026)*, explicitly told not to gloat. Pine: *What
      has actually happened*, told it lost 308–21 and that this changes its register from
      warning to indictment. River, Lichen, Mountain and Bumblebee untouched as agreed.
- [x] Verified: `cd server && npm test` (481 passed) and `cd client && npm test`
      (1088 passed), type-checks included, after the edits.
- [ ] After 30 Sept: Truth Commission findings.
- [ ] Swedish translation pass.

## 6. Sources

Verified 9 September 2026.

- SVT — Busch on riksintresset: https://www.svt.se/nyheter/lokalt/norrbotten/busch-rennaringen-bor-inte-vara-ett-riksintresse
- SVT — all parties' positions: https://www.svt.se/nyheter/lokalt/norrbotten/efter-kd-utspelet-sa-ser-ovriga-partier-pa-rennaringsfragorna
- SVT — "Då har FN fel" (3 Sept 2026): https://www.svt.se/nyheter/inrikes/ebba-busch-om-kritiken-mot-rennaringspolitiken-da-har-fn-fel
- European Times — Kiruna / Gabna 50 metres: https://europeantimes.news/2026/09/kiruna-mine-plan-narrows-sami-choices/
- Riksdagen — Ett tydligt regelverk för aktivt skogsbruk (MJU29): https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/ett-tydligt-regelverk-for-aktivt-skogsbruk_hd01mju29/
- Riksdagen — artskyddsersättning (prop. 2025/26:230): https://www.riksdagen.se/sv/dokument-och-lagar/dokument/proposition/ersattning-vid-radighetsinskrankningar-till-foljd_hd03230/html/
- Regeringen — utkast till nationell restaureringsplan (3 Sept 2026): https://www.regeringen.se/informationsmaterial/2026/09/sveriges-utkast-till-nationell-restaureringsplan
- Ny Teknik — uranbrytning möjlig från 2026: https://www.nyteknik.se/industri/efter-beslut-i-riksdagen-uranbrytning-mojlig-i-sverige-fran-2026/4408597
- Nordiska Projekt — lokal gruvpeng (4 Sept 2026): https://www.nordiskaprojekt.se/2026/09/04/regeringen-tar-steg-mot-lokal-gruvpeng-till-kommunerna/
- Vattenfall — omprövningen startar (Feb 2026): https://group.vattenfall.com/se/nyheter-och-press/pressmeddelanden/2026/nu-startar-omprovningen-av-vattenfalls-storskaliga-vattenkraft
- Green Power Sweden — incitamentspaket för vindkraft: https://greenpowersweden.se/fakta/regeringens-incitamentspaket-for-vindkraft/
- HaV — laxfiskeförbud 2026: https://www.havochvatten.se/arkiv/nytt-om-fiskeregler/2026-06-24-forbud-mot-visst-svenskt-fiske-av-lax-i-ostersjon.html
- EFN — Stegra ett år efter Northvolt: https://efn.se/anders-hagerstrand-extremt-svart-lage-for-stegra-ett-ar-efter-northvolts-konkurs
- Mittuniversitetet — sanningskommissionens slutbetänkande: https://www.miun.se/Forskning/forskargrupper/baskoes/nyhetsarkiv/2026-4/sanningskommissionen-for-det-samiska-folket-overlamnar-sitt-slutbetankande-till-regeringen-pa-mittuniversietet
- Naturvårdsverket — licensjakt delegeras (April 2026): https://www.naturvardsverket.se/om-oss/aktuellt/nyheter-och-pressmeddelanden/2026/april/ratten-att-fatta-beslut-om-licensjakt-pa-lodjur-och-jarv-overlamnas-till-lansstyrelserna/
- Mistral docs — models overview (no cutoff column): https://docs.mistral.ai/models/overview

### Still to verify against primary sources before opening

- The exact Baltic salmon quota figures and the 93% / 63% wind veto percentages.
- The Truth Commission's title, SOU number and 30 Sept date (currently one source).
- Whether the replacement for Renmarkskommittén has actually been appointed.
