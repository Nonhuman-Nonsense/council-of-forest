// Print export: turns topics_<lang>.json into files for layout in InDesign.
//
// Two formats per topic, per language:
//   tagged/ — InDesign Tagged Text. File > Place applies the paragraph styles below.
//   plain/  — UTF-8 text laid out as the prompts read, for any other tool.
//
// Plain JS so the prototype page can load it with a <script> tag and Node can require it.
(function (root) {
  const LABELS = {
    en: { agenda: 'AGENDA POINT', updates: 'RECENT DEVELOPMENTS', context: /^The Context:?$/i },
    sv: { agenda: 'AGENDAPUNKT', updates: 'AKTUELL UTVECKLING', context: /^Kontexten:?$/i },
  };

  const STYLES = {
    title: 'Topic Title',
    body: 'Body',
    heading: 'Heading',
    bullet: 'Bullet',
    updatesHeading: 'Updates Heading',
    agendaNumber: 'Agenda Number',
    agendaTitle: 'Agenda Title',
    core: 'Core Question',
    lead: 'Lead', // character style: "Label:" at the start of a bullet or core question
  };

  const CORE_LEAD = /^(Core Question|Kärnfråga):\s*/;
  const BULLET_LEAD = /^([^.:!?]{2,70}?:)\s+(.*)$/;

  function labelsFor(lang) {
    return LABELS[lang] || LABELS.en;
  }

  // The prompt opens with an uppercase line that repeats the topic title; the print uses the title.
  function isShoutedHeading(line) {
    const head = line.split(/\s[-–—]\s/)[0];
    return /\p{L}/u.test(head) && head === head.toUpperCase();
  }

  function isShortLine(line) {
    return line.length <= 80 && !/[.!?]["”)]?$/.test(line) && !line.startsWith('-');
  }

  // Older agenda points put the title and the text on one line: "Title: text…".
  function splitAgendaPoint(text) {
    const lines = text.trim().split('\n');
    let title = lines[0].trim();
    let rest = lines.slice(1).join('\n');
    if (title.length > 110) {
      const idx = title.indexOf(': ');
      if (idx > 0 && idx < 90) {
        rest = title.slice(idx + 2) + (rest ? '\n' + rest : '');
        title = title.slice(0, idx);
      }
    }
    return { title, body: rest.replace(/^\n+/, '') };
  }

  // Prompt text as it should read on paper: no repeated title line, no "Context:" label.
  function cleanPromptText(prompt, lang) {
    const lines = prompt.trim().split('\n');
    if (lines.length && isShoutedHeading(lines[0].trim())) lines.shift();
    const labels = labelsFor(lang);
    return lines
      .filter((l) => !labels.context.test(l.trim()))
      .join('\n')
      .replace(/^\n+/, '')
      .replace(/\n{3,}/g, '\n\n');
  }

  // Classify each line of a text block into paragraphs with a style.
  function parseBlock(text, lang) {
    const labels = labelsFor(lang);
    const lines = text.split('\n').map((l) => l.trim());
    const out = [];
    // Dated news bullets are sentences, so they never get a bold "Label:".
    let inUpdates = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (line.startsWith('- ') || line === '-') {
        const content = line.slice(2).trim();
        const m = !inUpdates && content.match(BULLET_LEAD);
        out.push(m && !(m[1].includes(',') && m[1].length > 55) ? { style: 'bullet', lead: m[1], text: m[2] } : { style: 'bullet', text: content });
        continue;
      }
      const core = line.match(CORE_LEAD);
      if (core) {
        out.push({ style: 'core', lead: core[1] + ':', text: line.slice(core[0].length) });
        continue;
      }
      if (line.startsWith(labels.updates) || line.startsWith(LABELS.en.updates)) {
        // "RECENT DEVELOPMENTS (verified …). These facts are current…" → heading + body
        inUpdates = true;
        const m = line.match(/^(.*?\))\.?\s+(.*)$/);
        if (m) {
          out.push({ style: 'updatesHeading', text: m[1] });
          out.push({ style: 'body', text: m[2] });
        } else {
          out.push({ style: 'updatesHeading', text: line });
        }
        continue;
      }
      if (isShortLine(line)) {
        // A run of short lines with no blank between them is an undashed list, not headings.
        const prevShort = i > 0 && lines[i - 1] && isShortLine(lines[i - 1]) && !lines[i - 1].endsWith(':');
        const nextShort = i + 1 < lines.length && lines[i + 1] && isShortLine(lines[i + 1]);
        if (!line.endsWith(':') && (prevShort || nextShort)) {
          out.push({ style: 'bullet', text: line });
        } else {
          out.push({ style: 'heading', text: line });
          inUpdates = false;
        }
        continue;
      }
      out.push({ style: 'body', text: line });
    }
    return out;
  }

  function topicParagraphs(topic, lang) {
    const labels = labelsFor(lang);
    const paras = [{ style: 'title', text: topic.title }];
    paras.push(...parseBlock(cleanPromptText(topic.prompt || '', lang), lang));
    (topic.agendaPoints || []).forEach((point, index) => {
      if (!point || !point.trim()) return;
      const { title, body } = splitAgendaPoint(point);
      paras.push({ style: 'agendaNumber', text: `${labels.agenda} ${index + 1}` });
      paras.push({ style: 'agendaTitle', text: title });
      paras.push(...parseBlock(body, lang));
    });
    return paras;
  }

  // ---- Plain text -------------------------------------------------------------------------

  function topicPlainText(topic, lang) {
    const labels = labelsFor(lang);
    const parts = [topic.title.toUpperCase(), cleanPromptText(topic.prompt || '', lang)];
    (topic.agendaPoints || []).forEach((point, index) => {
      if (!point || !point.trim()) return;
      const { title, body } = splitAgendaPoint(point);
      parts.push(`${labels.agenda} ${index + 1}\n${title}` + (body ? `\n\n${body.trim()}` : ''));
    });
    return parts.join('\n\n') + '\n';
  }

  // ---- InDesign Tagged Text ---------------------------------------------------------------

  function escapeTagged(text) {
    let out = '';
    for (const ch of text) {
      if (ch === '<' || ch === '>' || ch === '\\') out += '\\' + ch;
      else if (ch.charCodeAt(0) < 128) out += ch;
      else {
        const cp = ch.codePointAt(0);
        out += cp > 0xffff ? '' : `<0x${cp.toString(16).toUpperCase().padStart(4, '0')}>`;
      }
    }
    return out;
  }

  function taggedParagraph(p) {
    let text = escapeTagged(p.text || '');
    if (p.style === 'bullet') text = '- ' + (p.lead ? leadRun(p.lead) + ' ' : '') + text;
    else if (p.lead) text = leadRun(p.lead) + ' ' + text;
    return `<ParaStyle:${STYLES[p.style]}>${text}`;
  }

  function leadRun(lead) {
    return `<CharStyle:${STYLES.lead}>${escapeTagged(lead)}<CharStyle:>`;
  }

  // ASCII-MAC with every non-ASCII character as <0xXXXX> avoids encoding surprises on Place.
  function toTaggedText(paragraphs) {
    return ['<ASCII-MAC>', ...paragraphs.map(taggedParagraph)].join('\r') + '\r';
  }

  // ---- Files and zip ----------------------------------------------------------------------

  function slugify(text) {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function buildFiles(topicsByLang) {
    const files = [];
    for (const [lang, data] of Object.entries(topicsByLang)) {
      const topics = (data && data.topics) || [];
      const allTagged = [];
      const allPlain = [];
      topics.forEach((topic, i) => {
        const name = `${String(i + 1).padStart(2, '0')}_${slugify(topic.title)}.txt`;
        const paras = topicParagraphs(topic, lang);
        const plain = topicPlainText(topic, lang);
        files.push({ path: `${lang}/tagged/${name}`, content: toTaggedText(paras) });
        files.push({ path: `${lang}/plain/${name}`, content: plain });
        allTagged.push(...paras);
        allPlain.push(plain);
      });
      files.push({ path: `${lang}/tagged/00_all-topics.txt`, content: toTaggedText(allTagged) });
      files.push({ path: `${lang}/plain/00_all-topics.txt`, content: allPlain.join('\n\n') });
    }
    files.unshift({ path: 'README.txt', content: README });
    return files;
  }

  const README = `Council of Forest — prompts for print
=====================================

One folder per language (en, sv). Each has:

  tagged/  InDesign Tagged Text. Use File > Place and tick "Show Import Options";
           the paragraph styles below are applied automatically. Create styles with
           these exact names in your InDesign document first and they are used as-is;
           otherwise InDesign creates them and you style them once.
  plain/   UTF-8 text, laid out as the prompts read (for other tools, or copy-paste).

  00_all-topics.txt holds every topic in order — thread it through the columns and set
  "Topic Title" to start in the next column or frame.
  01_… to 08_… hold one topic each.

Paragraph styles
  Topic Title      the topic name (set All Caps in the style if wanted)
  Body             running text
  Heading          section and perspective headings ("Framing", "The landowner perspective:")
  Updates Heading  "RECENT DEVELOPMENTS (verified …)" / "AKTUELL UTVECKLING (kontrollerad i …)"
  Bullet           list items, starting with "- " (use a hanging indent)
  Agenda Number    "AGENDA POINT 1" / "AGENDAPUNKT 1"
  Agenda Title     the agenda point's title
  Core Question    the closing question of each agenda point

Character style
  Lead             the "Label:" at the start of a bullet, and "Core Question:" / "Kärnfråga:"

The text comes from shared/prompts/topics_<lang>.json as committed, not from unsaved
edits in the prototype.
`;

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  // Minimal zip (stored, no compression) with UTF-8 names.
  function buildZip(files) {
    const enc = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    for (const file of files) {
      const name = enc.encode(file.path);
      const data = enc.encode(file.content);
      const crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // UTF-8 names
      local.setUint16(8, 0, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true);
      chunks.push(new Uint8Array(local.buffer), name, data);

      const entry = new DataView(new ArrayBuffer(46));
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, 20, true);
      entry.setUint16(6, 20, true);
      entry.setUint16(8, 0x0800, true);
      entry.setUint32(16, crc, true);
      entry.setUint32(20, data.length, true);
      entry.setUint32(24, data.length, true);
      entry.setUint16(28, name.length, true);
      entry.setUint32(42, offset, true);
      central.push(new Uint8Array(entry.buffer), name);

      offset += 30 + name.length + data.length;
    }
    const centralSize = central.reduce((n, c) => n + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    const parts = [...chunks, ...central, new Uint8Array(end.buffer)];
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of parts) {
      out.set(p, pos);
      pos += p.length;
    }
    return out;
  }

  const api = { buildFiles, buildZip, topicParagraphs, topicPlainText, toTaggedText, STYLES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PrintExport = api;
})(typeof window !== 'undefined' ? window : this);
