# Listening to humans

Work in progress, started 9 Oct 2026. Interactivity is one of the council's main features, but
beings often answer a human with whatever they meant to say anyway. This doc records why, the
plan to fix it in phases, and how each phase is measured. Changing how beings treat a human
easily changes the dynamics of the whole meeting, so no prompt change ships without an
evaluation run before and after it.

## Why the beings skip what a human said

- **Their prompts point them at River and the topic.** Six beings (reindeer, bumblebee, tree
  harvester, salmon, mountain, wind turbine) share an "IMPORTANT INSTRUCTION" that says the most
  important thing is to "STICK TO THE ORIGINAL TOPIC… the one that river introduces" and to
  "ANSWER THEIR QUESTIONS", meaning River's. Pine: "Always answer River's questions directly." A
  visitor's question is neither, so the prompts tell the beings to put it second.
- **Every-turn mandates crowd out replying.** Reindeer must pick a different archive fact
  every time ("CRITICAL"), Bumblebee "MUST" find 2–3 archive facts first, Lichen "must hijack"
  questions and "Ignore human moralizing", and Mountain may not use "you" at all. None of them
  says to answer. Mistral Large 3, with reasoning off, follows the loud rules.
- **Nothing marks a human's turn as special.** `DialogGenerator.buildMessageStack` sends every
  turn as a `user` message in the same `Name: text` form, so a human reads as `Anna: Anna said:
  …`. The shared topic prompt only says not to guess facts about humans. Any instruction to
  answer them sits 10–15k characters before their words.
- **Routing is fine.** After a human, the being they asked answers (`askParticular`), otherwise
  the least-spoken being, and River waits for two beings to reply. The code knows the next turn
  is a reply to a human. It just never tells the model.

## Phases

Each phase is its own commit on `forest-leo`. Phases 0 and 1 change nothing in a meeting; 2
and 3 do, and each waits on an evaluation report that has been read.

0. **Measure.** `npm run listening:eval`, below. Baseline on today's prompts.
1. **Plumbing.** One function decides how a turn appears to the model. It uses the turn's
   `type`, so human turns lose the doubled `Anna: Anna said:`. The letter transcript uses the
   same function. Expect no change in the numbers.
2. **Remove the conflicts** (English). Rewrite the shared instruction and Pine's rule: "When a
   human has just spoken, answer them first, and connect their question to the topic
   afterwards." Let the archive and set moves serve the answer. Add a rule to the topic prompt:
   off-topic questions get a real, kind answer, others may build on it, and River brings the
   meeting back to the agenda.
3. **A reminder next to the reply**, behind an option (`off` / `first` / `both`), added to the
   prompt only while a being is replying to a human. Compare phase 2 alone with each setting,
   and keep the weakest one that works.
4. **Swedish and wrap-up.** Translate whatever won, run a Swedish evaluation, and move the
   durable parts of this doc to the root docs.

## The evaluation

`npm run listening:eval` (in `server/`) runs on the letters corpus (`npm run letters:corpus`,
tag `letters`). It cuts each meeting at three kinds of moment:

- **corpus** — right after the human question already in the meeting;
- **inserted** — after a being's turn, with a line from `scripts/listening/listeningLines.ts`
  added: the letters corpus's questions (ordinary, personal, industry, childlike, strange,
  rude, off-topic, campaigning, an injection) plus follow-ups that name the being who just
  spoke ("Lichen, what do you mean by that?"), which can only be answered by listening;
- **control** — after a being's turn, far from any human, where a being speaks next. Nothing
  here should change. This is where over-correction shows.

After a human it generates two replies, since River waits for two. After a control it
generates one. Who replies comes from the server's own speaker selection the first time and is
then kept, so samples and replays always ask the same beings.

By default the stored meetings get today's topic and being prompts (`--prompts current`), so an
edited prompt is what gets tested. A judge model (the letter model, Sonnet) scores each reply:

- **takes it up / partly / ignores**: does it answer what was said?
- **starts there**: does it answer first?
- **back to topic**: does it connect to the meeting's subject?
- **in character**
- **repeats**: is the second reply a rerun of the first?

Mechanical checks flag markdown, speaker labels and copies of the `Name said:` form.

```
npm run listening:eval -- --label baseline
# edit prompts, then the same cuts, lines and speakers again:
npm run listening:eval -- --replay scripts/listening/reports/<baseline>.json --label phase-2
```

The report has three summary tables: all replies by group, first replies by what the human
said, and first replies by being. Below them is a card for each cut. With `--replay`, every
number has the earlier run's figure under it, and every card has the earlier replies folded
underneath.

Options:
- `--samples 2` (default) generates each cut twice. At temperature 1, one sample is noisy.
- `--inserted` and `--controls` set how many of each per meeting (default 1).
- `--seed` picks other cut points and lines.
- `--no-judge` skips scoring, for a quick read.

What to read beyond the numbers:
- Does River return to the agenda after an off-topic question?
- Do the two replies differ?
- Do the beings still sound like themselves and still argue with each other?
- Are the controls unchanged?

## Evaluation log

_No runs yet: baseline pending._
