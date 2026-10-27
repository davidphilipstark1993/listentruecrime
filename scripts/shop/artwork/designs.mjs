// The Listen True Crime merchandise designs. Each design is a typographic
// composition in a 1000-unit-wide space; generate.mjs crops and renders them.
// Palette and fonts come from lib.mjs (cream type, one dark-red accent, on black).
import { C, FONT, fit, line, rule, rect, stack } from './lib.mjs'

const item = (h, build) => ({ h, build })
const mono = (text, w, fill = C.muted, ls = 0.18) => line(text, { w, font: FONT.typeLight, ls, fill })
const monoBold = (text, w, fill = C.cream, ls = 0.12) => line(text, { w, font: FONT.type, ls, fill })
const bar = (x1, x2, sw = 6, stroke = C.red) => item(sw, y => rule(x1, x2, y + sw / 2, { stroke, sw }))
const hair = (x1 = 150, x2 = 850, sw = 2, stroke = C.cream) => item(sw, y => rule(x1, x2, y + sw / 2, { stroke, sw }))

function headphones() {
  const h = 230
  return item(h, y => `
    <path d="M 350 ${y + 130} a 150 130 0 0 1 300 0" fill="none" stroke="${C.cream}" stroke-width="20" stroke-linecap="round"/>
    <rect x="322" y="${y + 120}" width="50" height="110" rx="20" fill="${C.cream}"/>
    <rect x="628" y="${y + 120}" width="50" height="110" rx="20" fill="${C.cream}"/>
    <circle cx="350" cy="${y + 175}" r="9" fill="${C.red}"/>`)
}

function progressBar(pct, left, right) {
  const x1 = 60, x2 = 940, w = x2 - x1
  const h = 52
  return item(h, y => `
    <rect x="${x1}" y="${y}" width="${w}" height="14" rx="7" fill="${C.cream}" fill-opacity="0.25"/>
    <rect x="${x1}" y="${y}" width="${(w * pct).toFixed(1)}" height="14" rx="7" fill="${C.cream}"/>
    <circle cx="${(x1 + w * pct).toFixed(1)}" cy="${y + 7}" r="24" fill="${C.red}"/>
    <text x="${x1}" y="${y + 52}" font-family="Courier Prime" font-weight="400" font-size="30" fill="${C.muted}">${left}</text>
    <text x="${x2}" y="${y + 52}" text-anchor="end" font-family="Courier Prime" font-weight="400" font-size="30" fill="${C.muted}">${right}</text>`)
}

function timeline() {
  const h = 210
  const pts = [[90, '21:47'], [300, '22:15'], [500, '22:30'], [700, '23:42'], [910, '00:10']]
  return item(h, y => {
    const ly = y + 80
    const dots = pts.map(([x, t]) => `<circle cx="${x}" cy="${ly}" r="15" fill="${C.cream}"/>
      <text x="${x}" y="${ly + 70}" text-anchor="middle" font-family="Courier Prime" font-weight="400" font-size="32" fill="${C.muted}">${t}</text>`).join('')
    return `${rule(90, 500, ly, { sw: 5 })}${rule(500, 700, ly, { stroke: C.red, sw: 5, dash: '14 12' })}${rule(700, 910, ly, { sw: 5 })}${dots}
      <text x="600" y="${ly - 34}" text-anchor="middle" font-family="Courier Prime" font-weight="700" font-size="30" letter-spacing="3" fill="${C.red}">UNACCOUNTED FOR</text>`
  })
}

function queueBadge() {
  const h = 150
  return item(h, y => `
    <circle cx="500" cy="${y + 75}" r="70" fill="${C.red}"/>
    <text x="500" y="${y + 108}" text-anchor="middle" font-family="Playfair Display" font-weight="900" font-size="100" fill="${C.cream}">5</text>`)
}

function redacted() {
  const rows = [[560, 'a'], [470, 'b'], [610, 'c']]
  const rh = 78
  const h = rows.length * rh + rh
  return item(h, y => {
    const bars = rows.map(([w], i) => `
      <text x="80" y="${y + i * rh + 44}" font-family="Courier Prime" font-weight="700" font-size="46" fill="${C.muted}">0${i + 1}</text>
      <rect x="200" y="${y + i * rh + 4}" width="${w}" height="52" fill="${C.cream}"/>`).join('')
    return `${bars}
      <text x="80" y="${y + rows.length * rh + 44}" font-family="Courier Prime" font-weight="700" font-size="46" fill="${C.muted}">04</text>
      <text x="200" y="${y + rows.length * rh + 44}" font-family="Courier Prime" font-weight="700" font-size="46" letter-spacing="4" fill="${C.red}">THE BUTLER</text>`
  })
}

function folder(inner) {
  const h = 700
  return item(h, y => `
    <path d="M 60 ${y + 90} L 60 ${y + 28} Q 60 ${y + 12} 76 ${y + 12} L 330 ${y + 12} Q 346 ${y + 12} 356 ${y + 28} L 386 ${y + 90} L 924 ${y + 90} Q 940 ${y + 90} 940 ${y + 106} L 940 ${y + h - 14} Q 940 ${y + h} 924 ${y + h} L 76 ${y + h} Q 60 ${y + h} 60 ${y + h - 14} Z" fill="none" stroke="${C.cream}" stroke-width="6" stroke-linejoin="round"/>
    ${inner(y)}`)
}

function stamp(text, w, rot = -6) {
  const pad = 46
  const t = fit(text, { cx: 500, y: 0, w, font: FONT.serifBlack, ls: 0.04, fill: C.red })
  const bw = w + pad * 2, bh = t.h + pad * 2
  const x = 500 - bw / 2
  return item(bh, y => {
    const cy = y + bh / 2
    return `<g transform="rotate(${rot} 500 ${cy})">
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="10" fill="none" stroke="${C.red}" stroke-width="14"/>
      <rect x="${x + 18}" y="${y + 18}" width="${bw - 36}" height="${bh - 36}" rx="4" fill="none" stroke="${C.red}" stroke-width="3"/>
      ${fit(text, { cx: 500, y: y + pad, w, font: FONT.serifBlack, ls: 0.04, fill: C.red }).svg}
    </g>`
  })
}

export const designs = [
  // ───────────────────────── The Armchair Detective ─────────────────────────
  {
    slug: 'professional-armchair-detective', name: 'Professional Armchair Detective', collection: 'armchair-detective',
    compose: () => stack([
      mono('ESTABLISHED ON THE SOFA', 560), 34, hair(220, 780, 3), 44,
      line('PROFESSIONAL', { w: 900 }), 28, line('ARMCHAIR', { w: 900 }), 28, line('DETECTIVE', { w: 900 }), 44,
      bar(440, 560, 8), 36, mono('FULLY LICENSED TO OVERTHINK', 640, C.cream, 0.2),
    ]),
  },
  {
    slug: 'amateur-sleuth-professional-overthinker', name: 'Amateur Sleuth. Professional Overthinker.', collection: 'armchair-detective',
    compose: () => stack([
      line('AMATEUR SLEUTH.', { w: 700, font: FONT.serifItalic, ls: 0.02, fill: C.muted }), 30,
      line('PROFESSIONAL', { w: 900 }), 30, line('OVERTHINKER.', { w: 900 }), 40, bar(120, 880, 6),
    ]),
  },
  {
    slug: 'everyone-is-a-suspect', name: 'Everyone Is a Suspect.', collection: 'armchair-detective',
    compose: () => stack([
      line('EVERYONE', { w: 900 }), 24,
      item(40, y => `${rule(80, 380, y + 20, { sw: 3 })}${rule(620, 920, y + 20, { sw: 3 })}${fit('IS A', { cx: 500, y: y + 4, w: 140, font: FONT.type, ls: 0.15, fill: C.muted }).svg}`), 24,
      line('SUSPECT.', { w: 900, fill: C.cream }), 20, bar(80, 920, 10), 34, mono('(INCLUDING ME)', 420, C.muted, 0.25),
    ]),
  },
  {
    slug: 'respectfully-i-have-questions', name: 'Respectfully, I Have Questions.', collection: 'armchair-detective',
    compose: () => stack([
      line('RESPECTFULLY,', { w: 700, font: FONT.serifItalic, ls: 0.02, fill: C.muted }), 30,
      line('I HAVE', { w: 520 }), 28, line('QUESTIONS.', { w: 800 }), 30, bar(450, 550, 6),
    ]),
  },
  {
    slug: 'the-timeline-doesnt-lie', name: "The Timeline Doesn't Lie.", collection: 'armchair-detective',
    compose: () => stack([
      line('THE TIMELINE', { w: 900 }), 30, line("DOESN'T LIE.", { w: 760, fill: C.cream }), 60, timeline(),
    ]),
  },
  // ───────────────────────────── The Podcast Addict ─────────────────────────────
  {
    slug: 'just-one-more-episode', name: 'Just One More Episode.', collection: 'podcast-addict',
    compose: () => stack([
      line('JUST ONE MORE', { w: 900 }), 30, line('EPISODE.', { w: 900 }), 60, progressBar(0.38, '1:12:47', '-1:58:03'), 36, mono('(IT IS 2AM)', 300, C.muted, 0.25),
    ]),
  },
  {
    slug: 'if-i-go-missing-check-my-podcast-queue', name: 'If I Go Missing, Check My Podcast Queue.', collection: 'podcast-addict',
    compose: () => stack([
      line('IF I GO MISSING,', { w: 780, font: FONT.serifItalic, ls: 0.02, fill: C.muted }), 26,
      line('CHECK MY', { w: 900 }), 28, line('PODCAST QUEUE.', { w: 900 }), 36, bar(440, 560, 6),
    ]),
  },
  {
    slug: 'shhh-im-listening-to-a-case', name: "Shhh… I'm Listening to a Case.", collection: 'podcast-addict',
    compose: () => stack([
      headphones(), 40, line('SHHH…', { w: 520, fill: C.red }), 20,
      line("I'M LISTENING", { w: 900 }), 28, line('TO A CASE.', { w: 900 }),
    ]),
  },
  {
    slug: 'five-podcasts-behind-send-help', name: 'Five Podcasts Behind. Send Help.', collection: 'podcast-addict',
    compose: () => stack([
      queueBadge(), 36, line('FIVE PODCASTS', { w: 900 }), 28, line('BEHIND.', { w: 900 }), 30, mono('SEND HELP.', 380, C.red, 0.3),
    ]),
  },
  // ─────────────────────────────── The Case Files ───────────────────────────────
  {
    slug: 'case-file-001', name: 'Case File: 001', collection: 'case-files',
    compose: () => stack([
      folder(y => `
        ${fit('CASE FILE', { cx: 500, y: y + 150, w: 560, font: FONT.type, ls: 0.2, fill: C.muted }).svg}
        ${fit('001', { cx: 500, y: y + 250, w: 560, font: FONT.serifBlack, ls: 0.04 }).svg}
        ${rule(160, 840, y + 560, { sw: 3 })}
        ${fit('STATUS: OPEN', { cx: 500, y: y + 590, w: 380, font: FONT.type, ls: 0.2, fill: C.red }).svg}`),
    ]),
  },
  {
    slug: 'cold-case-unit', name: 'Cold Case Unit', collection: 'case-files',
    compose: () => stack([
      item(620, y => `
        ${rect(60, y, 880, 620, { stroke: C.cream, sw: 6, rx: 12 })}
        ${rect(84, y + 24, 832, 572, { stroke: C.cream, sw: 2, rx: 6 })}
        ${fit('COLD CASE', { cx: 500, y: y + 120, w: 700 }).svg}
        ${fit('UNIT', { cx: 500, y: y + 300, w: 380, fill: C.red }).svg}
        ${rule(160, 840, y + 470, { sw: 2 })}
        ${fit('NO STATUTE OF LIMITATIONS ON CURIOSITY', { cx: 500, y: y + 505, w: 660, font: FONT.typeLight, ls: 0.1, fill: C.muted }).svg}`),
    ]),
  },
  {
    slug: 'persons-of-interest', name: 'Persons of Interest', collection: 'case-files',
    compose: () => stack([
      line('PERSONS OF', { w: 900 }), 28, line('INTEREST', { w: 900 }), 40, hair(80, 920, 3), 40, redacted(),
    ]),
  },
  {
    slug: 'file-under-obsession', name: 'File Under: Obsession', collection: 'case-files',
    compose: () => stack([
      folder(y => `
        ${fit('FILE UNDER:', { cx: 500, y: y + 190, w: 520, font: FONT.type, ls: 0.2, fill: C.muted }).svg}
        ${fit('OBSESSION', { cx: 500, y: y + 290, w: 740 }).svg}
        ${rule(160, 840, y + 520, { sw: 3 })}
        ${fit('SEE ALSO: ANOTHER EPISODE', { cx: 500, y: y + 550, w: 560, font: FONT.typeLight, ls: 0.14, fill: C.muted }).svg}`),
    ]),
  },
  {
    slug: 'listen-investigate-repeat', name: 'Listen. Investigate. Repeat.', collection: 'case-files',
    compose: () => {
      const wide = fit('INVESTIGATE.', { w: 900 })
      const s = wide.size
      return stack([
        line('LISTEN.', { size: s }), 46, hair(80, 920, 3), 46,
        line('INVESTIGATE.', { size: s }), 46, hair(80, 920, 3), 46,
        line('REPEAT.', { size: s, fill: C.red }),
      ])
    },
  },
  {
    slug: 'unresolved', name: 'Unresolved', collection: 'case-files',
    compose: () => stack([stamp('UNRESOLVED', 760, -6), 70, mono('CASE REMAINS OPEN', 520, C.cream, 0.3)]),
  },
]
