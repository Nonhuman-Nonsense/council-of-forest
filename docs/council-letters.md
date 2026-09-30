# Council letters — vision and roadmap

**Status:** Vision agreed; recipient principles decided. Nothing implemented. Next: a first
real recipient list.

**Goal:** At the end of a Council of Forest meeting, one of the beings writes a real email to a
real person or organisation who can act on what was discussed — in their own voice, with the
visitor's words added — and it is sent, printed and replayable. Council of Foods keeps its
protocol for now.

---

## Vision

The council has always ended in a document nobody receives. A letter changes that: the forest
speaks *to* someone. The being chooses who, says out loud what it wants to say, asks the
visitor to add to it, and then the letter itself is read — the gap between what the being
meant and how it formulates it is part of the piece.

It is art, and some risk is accepted: sending is automatic, not staff-approved. The safety
comes from the structure, not from a human in the loop:

- The council can only write to recipients on a curated list, chosen **by id**. No model ever
  writes an address.
- Every recipient receives at most one letter per day, with optional weekly caps.
- A letter is only sent when a visitor actually added something to it.
- Only installations send. Web meetings write the letter but never send it.

Replies are part of the work: the show prints every letter, and should print what comes back.

---

## The meeting ending

1. **Closing line** (as today): the chair thanks everyone — "This concludes Council of Forest
   meeting #1400."
2. **Bridge**: the chair hands over — "Before we close, Reindeer has something to send."
3. **Author** (hidden call): pick the being with the most to say to someone, based on the
   conversation. Never the chair, never a human panelist.
4. **Announcement** (one in-character call, structured output): the author chooses a
   recipient from the available list and plans the letter — `{ recipientId, points[],
   spokenText }`. Spoken aloud in their voice: "I would like to write to X and ask them to
   1. … 2. … Is there something you would like to add?"
5. **Visitor addition**: human input mode. They speak or type, or skip / walk away.
6. **Letter** (call): written in the author's voice from the plan and the visitor's addition,
   in the meeting's language (en/sv). Links to the meeting and carries the disclaimer.
7. **Read and show**: the letter is read aloud by the author and shown on the summary page as a
   letter (from / to / subject), printed automatically where printing is on.
8. **Send**: the letter goes into the outbox; a worker sends it from the being's address
   (`reindeer@council-of-forest.com`).

### When nothing is sent

| Situation | Letter written | Shown / replayable | Printed | Sent |
|---|---|---|---|---|
| Installation, visitor added something | yes | yes | yes | yes |
| Visitor skipped or walked away | yes | yes, marked unsent | no | no |
| Web mode | yes | yes, marked unsent | — | no |
| Recipient already had a letter today | author chooses from the remaining list | | | |

---

## Design

### Switch

- **Server:** `global-options.json` → `"meetingEnding": "protocol" | "letter"`, next to the
  letter prompts. That file already diverges between `foods-leo` and `forest-leo`, so all code
  lives on `foods-leo` and forest only flips the option. Read in exactly one place: the step
  after the closing line.
- **Client:** no product switch. The final `summary` message carries a `letter` field or it
  doesn't; the client renders what it gets.
- **Sending** is a capability (`sendsLetters`) in `client/src/settings/capabilities.ts`, passed
  with the meeting at creation — installations yes, web no. Never branch on the mode.

### State machine

Each step is a durable marker at the conversation tail, so reconnect resumes exactly where it
stopped (see RESILIENCE.md):

```
closing line, bridge line, letter_pending
  → author announcement, awaiting_letter_addition
  → human message | skipped, summary_pending
  → summary { letter: { authorId, recipientId, subject, send: boolean } }
```

- The final message stays `type: "summary"`, so replay, autoplay, `meetingComplete` and
  printing keep working unchanged.
- One shared `isConcluding(conversation)` helper replaces the marker lists copied across
  `HandRaisingHandler`, `ConnectionHandler`, `replayManifest`, `SpeakerSelector`,
  `useCouncilMachine` and `buttonStore`.
- `submit_human_message` / `skip_human_turn` accept the new marker; `HumanInput` gets letter
  copy instead of question copy.

### Outbox

The meeting session never sends. It writes an outbox record; a server worker sends.

- Status `queued → sending → sent | failed`, set to `sending` before the Brevo call:
  at-most-once, a crash never sends twice.
- Unique per meeting, so a regenerated summary cannot queue a second letter.
- Per-recipient daily limit enforced here too, not only in the prompt.
- Same record is where replies attach later.

### Mail

- `MailService` takes a per-call sender; `COUNCIL_MAIL_FROM` stays for printer alerts.
- All being senders on the authenticated domain in Brevo (SPF/DKIM).
- Reply-to encodes the meeting, e.g. `reindeer+1400@…`, so replies can be matched from day one
  even before they are handled.
- Footer: link to the meeting replay, a short disclaimer (AI-written in an art installation,
  with a visitor's words), and an opt-out line (possibly covered by the heads-up letter).

### Letter safety

- Visitor text is passed to the letter call as quoted content, not instructions.
- The recipient is validated against the list server-side; an unknown id fails the letter
  rather than guessing.
- Moderation check: not planned. Revisit after testing.

---

## Recipients

### Principles

The council exists because nobody is responsible for the sum: every mine, felling and turbine
passes its own permit. A letter puts that sum on the desk of someone responsible for one part.

1. **Can act.** The recipient decides, permits, owns or sets policy on something the council
   discusses.
2. **One concrete ask within their remit.** That is what makes a reply possible, and replies
   are half the wall.
3. **Every side.** Agencies, companies, parliament, civil society. Allies alone give a
   comfortable wall; ministers alone give a silent one. Who answers, who doesn't, and who sends
   a form letter is the work.

### Decisions

- **Public role addresses only**: registrator, press or sustainability desks, committee
  mailboxes — not named people. They survive the change of government after the
  13 September 2026 election. Swedish authorities have a duty to answer (Förvaltningslagen 6 §)
  and letters to them become allmän handling. No party or single politician, in line with
  "characters never campaign" (`docs/political-context-2026.md` §2).
- **The list is committed to the public repo.** The addresses are already public, and a
  visible list of who the forest may write to fits showing the prompts in the exhibition. If
  personal addresses are ever added, they go in a private file loaded on top.
- **No samebyar.** Asking the side carrying the burden to act inverts the letter.
- **Heads-up letter (to discuss):** before the first letter, Nonhuman Nonsense writes once to
  every recipient explaining the installation, the period and how to opt out. Doubles as the
  opt-out mechanism, so the per-letter footer can stay short.
- **Partners informed first:** the biosphere reserve and Havremagasinet, before letters start.

### Categories (draft, to check with the biosphere reserve)

| Category | Examples | Typical ask |
|---|---|---|
| Agencies | Skogsstyrelsen, Naturvårdsverket, Havs- och vattenmyndigheten, Bergsstaten, SGU, Energimyndigheten, Svenska kraftnät, Sametinget | cumulative assessment, consultation, restoration |
| Regional and local | Länsstyrelsen Västerbotten and Norrbotten, reserve municipalities, Boden kommun | local permits, planning, restoration |
| Parliament and government | Miljö- och jordbruksutskottet, Näringsutskottet, ministry registrators | forestry act, minerals act, reindeer husbandry |
| Companies | Sveaskog, SCA, Holmen, Vattenfall, LKAB, Boliden, Stegra, wind developers | their own fellings, dams, mines, projects |
| Certification and industry | FSC Sverige, PEFC, Skogsindustrierna | what counts as sustainable |
| Civil society and research | Naturskyddsföreningen, Skydda Skogen, WWF, SLU | carrying the question further |
| EU | DG ENV, DG GROW | critical raw materials, restoration, LULUCF (English) |

### Entry shape

`id, name, organisation, category, email, language, remit (what they decide on), topics
(forest topic ids), limits, active, notes`. The author only sees recipients tagged with the
meeting's topic that are still available; a custom topic sees the whole list.

### Volume

The show runs **10 October 2026 – 17 January 2027**, about 14 weeks. 0–40 meetings a day, and
only those with a visitor addition send, so realistically 0–20 letters on a busy day.

- For a real choice the list needs roughly three times the daily letters: **60–80 entries**,
  at least ~8 per topic.
- One letter per day per recipient is the default. Over 14 weeks that could still mean ~90
  letters to one agency, so entries get an optional weekly cap (e.g. small municipalities).
  Tune after the first week.

## Open questions

- Can Tree Harvester and Wind Turbine write letters, or only beings that are losing?
- Is the heads-up letter needed, and does it replace the per-letter opt-out line?
- Confirm Brevo inbound parsing accepts plus-addressed replies (`reindeer+1400@…`).
- Later: inbound replies stored with the letter and printed; sent state and replies on the
  replay page; Council of Foods letters.

---

## Roadmap

0. **Recipients** — first ~20 real entries for the spike, then the full 60–80; heads-up letter;
   inform partners.
1. **Prompt spike** — run author pick, announcement and letter prompts over real past forest
   meetings, before building the state machine. Checks that choices and letters are good.
2. **Server flow** — markers, loop steps, prompts, recipient loading and validation, letter on
   `summary`. Tests for reconnect at every marker.
3. **Client** — letter rendering on summary and print, letter copy in human input,
   `sendsLetters` capability.
4. **Outbox and sending** — worker, daily limits, per-being senders, footer.
5. **Replies** — inbound, storage, printing.
