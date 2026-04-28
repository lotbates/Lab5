// ================================================================
//  PITCH SET THEORY ENGINE
//  All pitch operations work in Z/12Z (integers mod 12)
//  Grounded in the Dihedral group D₁₂:
//    transposition = rotation, inversion = reflection
// ================================================================

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

/**
 * Transpose: Tₙ(p) = (p + n) mod 12
 * Rotation in D₁₂ — shifts all pitches up by n semitones.
 */
function transpose(set, n) {
  return set.map(p => ((p + n) % 12 + 12) % 12);
}

/**
 * Inversion (I₀): I(p) = (−p) mod 12 = (12 − p) mod 12
 * Reflection in D₁₂ — mirrors intervals around pitch class 0.
 */
function inverse(set) {
  return set.map(p => (12 - p) % 12);
}

/**
 * Transposed Inversion: TₙI(p) = (n − p) mod 12
 * Compose inversion with transposition — still a valid D₁₂ element.
 */
function transposeInverse(set, n) {
  return set.map(p => ((n - p) % 12 + 12) % 12);
}

/**
 * Retrograde: reverses the temporal order of the pitch sequence.
 * Not strictly a pitch-class operation (order-preserving), but standard
 * in serial music. Preserves the set of pitches, changes their sequence.
 */
function retrograde(set) {
  return [...set].reverse();
}

/**
 * Retrograde-Inversion: apply inversion then reverse.
 * Standard RI form in 12-tone technique.
 */
function retrogradeInverse(set) {
  return retrograde(inverse(set));
}

// ================================================================
//  COMPOSITION GENERATOR
//  Builds a sequence of phrases by randomly applying
//  D₁₂ operations (+ retrograde) to the initial pitch set.
// ================================================================

let phrases = [];

function buildOpPool(opts) {
  const pool = [];
  if (opts.R)  pool.push({ name: 'R',  color: '#4a8fff', fn: s => retrograde(s) });
  if (opts.I)  pool.push({ name: 'I',  color: '#2dcc70', fn: s => inverse(s) });
  if (opts.RI) pool.push({ name: 'RI', color: '#9b6dff', fn: s => retrogradeInverse(s) });
  const tmax = opts.tmax || 6;
  if (opts.T) {
    for (let n = 1; n <= tmax; n++)
      pool.push({ name: `T${n}`, color: '#f0c040', fn: s => transpose(s, n) });
  }
  if (opts.TI) {
    for (let n = 1; n <= tmax; n++)
      pool.push({ name: `T${n}I`, color: '#e84545', fn: s => transposeInverse(s, n) });
  }
  return pool;
}

function generateComposition(initialSet, numPhrases, opts) {
  const pool = buildOpPool(opts);
  const result = [{ set: [...initialSet], label: 'P₀', color: '#d95f2a' }];
  if (pool.length === 0 || numPhrases <= 1) return result;

  let current = [...initialSet];
  for (let i = 1; i < numPhrases; i++) {
    const op = pool[Math.floor(Math.random() * pool.length)];
    current = op.fn(current);
    result.push({ set: [...current], label: op.name, color: op.color });
  }
  return result;
}

// ================================================================
//  PITCH CLOCK (SVG)
//  Visualizes the active pitch classes in Z₁₂ as a circle,
//  with connecting lines showing the intervallic shape of the set.
// ================================================================

function renderClock(activeSet, color) {
  const svg = document.getElementById('pitch-clock');
  svg.innerHTML = '';
  const cx = 85, cy = 85, NS = 'http://www.w3.org/2000/svg';
  const rRing = 60, rDot = 72;

  // Background ring
  const mkCirc = (r, fill, stroke, sw) => {
    const c = document.createElementNS(NS,'circle');
    Object.assign(c,{}); // noop
    c.setAttribute('cx',cx); c.setAttribute('cy',cy); c.setAttribute('r',r);
    c.setAttribute('fill',fill); c.setAttribute('stroke',stroke); c.setAttribute('stroke-width',sw);
    svg.appendChild(c);
  };
  mkCirc(rDot+14, 'none', '#16171f', '1');
  mkCirc(rDot,    'none', '#1c1d26', '1');

  // Connection polygon
  if (activeSet.length > 1) {
    const pts = activeSet.map(pc => {
      const a = (pc * 30 - 90) * Math.PI / 180;
      return [cx + rRing * Math.cos(a), cy + rRing * Math.sin(a)];
    });
    const poly = document.createElementNS(NS,'polygon');
    poly.setAttribute('points', pts.map(p => p.join(',')).join(' '));
    poly.setAttribute('fill', color.replace(')', ',0.12)').replace('rgb','rgba').replace('#','').length > 6 ? color+'26' : color+'26');
    poly.setAttribute('fill-opacity','0.18');
    poly.setAttribute('stroke', color);
    poly.setAttribute('stroke-width','1.5');
    poly.setAttribute('stroke-opacity','0.5');
    svg.appendChild(poly);
  }

  // Pitch nodes
  for (let pc = 0; pc < 12; pc++) {
    const a = (pc * 30 - 90) * Math.PI / 180;
    const x = cx + rDot * Math.cos(a);
    const y = cy + rDot * Math.sin(a);
    const active = activeSet.includes(pc);

    if (active) {
      const glow = document.createElementNS(NS,'circle');
      glow.setAttribute('cx',x); glow.setAttribute('cy',y); glow.setAttribute('r','10');
      glow.setAttribute('fill',color); glow.setAttribute('opacity','0.18');
      svg.appendChild(glow);
    }

    const dot = document.createElementNS(NS,'circle');
    dot.setAttribute('cx',x); dot.setAttribute('cy',y);
    dot.setAttribute('r', active ? '5.5' : '3');
    dot.setAttribute('fill', active ? color : '#1c1d26');
    dot.setAttribute('stroke', active ? color : '#272836');
    dot.setAttribute('stroke-width','1');
    svg.appendChild(dot);

    const lx = cx + (rDot+13) * Math.cos(a);
    const ly = cy + (rDot+13) * Math.sin(a);
    const txt = document.createElementNS(NS,'text');
    txt.setAttribute('x',lx); txt.setAttribute('y',ly+3.5);
    txt.setAttribute('text-anchor','middle');
    txt.setAttribute('fill', active ? color : '#2a2b38');
    txt.setAttribute('font-family',"'Space Mono',monospace");
    txt.setAttribute('font-size','8.5');
    txt.setAttribute('font-weight', active ? '700' : '400');
    txt.textContent = NOTE_NAMES[pc];
    svg.appendChild(txt);
  }
}

// ================================================================
//  PIANO ROLL (Canvas)
//  Horizontal note blocks per phrase, colored by operation type.
// ================================================================

function renderRoll(phraseList) {
  const canvas = document.getElementById('piano-roll');
  const W = canvas.parentElement.clientWidth - 28;
  const H = canvas.parentElement.clientHeight - 40;
  canvas.width  = Math.max(W, 100);
  canvas.height = Math.max(H, 80);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0e0f13';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!phraseList || phraseList.length === 0) return;

  const allPCs = phraseList.flatMap(p => p.set);
  const minPC  = Math.min(...allPCs);
  const maxPC  = Math.max(...allPCs);
  const span   = Math.max(maxPC - minPC + 1, 7);

  const totalSlots = phraseList.reduce((s,p) => s + p.set.length, 0) + phraseList.length * 0.5;
  const slotW  = (canvas.width - 12) / totalSlots;
  const noteH  = (canvas.height - 16) / span;
  const padT   = 8;

  let x = 6;
  phraseList.forEach(phrase => {
    phrase.set.forEach(pc => {
      const row  = maxPC - pc;
      const y    = padT + row * noteH;
      const w    = Math.max(slotW - 1, 2);
      const h    = Math.max(noteH - 1, 3);
      ctx.fillStyle = phrase.color || '#d95f2a';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.fill();
      x += slotW;
    });
    x += slotW * 0.5;
  });
  ctx.globalAlpha = 1;
}

// ================================================================
//  SEQUENCE TABLE
// ================================================================

function renderTable(phraseList) {
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('phrase-table').style.display = 'block';

  const container = document.getElementById('phrase-rows');
  container.innerHTML = '';

  phraseList.forEach((phrase, i) => {
    const row = document.createElement('div');
    row.className = 'phrase-row';
    row.id = `row-${i}`;
    row.onclick = () => focusPhrase(i);
    row.innerHTML = `
      <div class="p-label" style="color:${phrase.color}">${phrase.label}</div>
      <div class="p-classes">[${phrase.set.join(',')}]</div>
      <div class="chips" id="chips-${i}">${
        phrase.set.map((pc,ni) =>
          `<span class="chip" id="chip-${i}-${ni}">${NOTE_NAMES[pc]}</span>`
        ).join('')
      }</div>
      <div class="p-classes">${phrase.set.length}</div>`;
    container.appendChild(row);
  });

  focusPhrase(0);
}

function focusPhrase(i) {
  document.querySelectorAll('.phrase-row').forEach(r => r.classList.remove('active'));
  document.getElementById(`row-${i}`)?.classList.add('active');
  if (phrases[i]) renderClock(phrases[i].set, phrases[i].color);
}

// ================================================================
//  COMPOSE (main entry point)
// ================================================================

function parsePitchInput(str) {
  const parts = str.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 2) return null;
  const nums = parts.map(Number);
  if (nums.some(n => isNaN(n) || !Number.isInteger(n) || n < 0 || n > 11)) return null;
  return nums;
}

function compose() {
  const raw   = document.getElementById('pitch-input').value;
  const errEl = document.getElementById('input-err');
  const set   = parsePitchInput(raw);
  if (!set) { errEl.classList.add('show'); return; }
  errEl.classList.remove('show');
  stopPlayback();

  const opts = {
    R:    document.getElementById('tog-R').classList.contains('on'),
    I:    document.getElementById('tog-I').classList.contains('on'),
    RI:   document.getElementById('tog-RI').classList.contains('on'),
    T:    document.getElementById('tog-T').classList.contains('on'),
    TI:   document.getElementById('tog-TI').classList.contains('on'),
    tmax: +document.getElementById('tmax-rng').value,
  };

  const n = +document.getElementById('phrases-rng').value;
  phrases = generateComposition(set, n, opts);

  renderClock(phrases[0].set, phrases[0].color);
  renderTable(phrases);
  renderRoll(phrases);

  document.getElementById('btn-play').disabled = false;
  const total = phrases.reduce((s,p) => s + p.set.length, 0);
  document.getElementById('status').textContent = `${phrases.length} phrases · ${total} notes total`;
  document.getElementById('status').className = '';
}

// ================================================================
//  UI INTERACTIONS
// ================================================================

['R','I','RI','T','TI'].forEach(op => {
  document.getElementById(`tog-${op}`).addEventListener('click', function(e) {
    e.preventDefault();
    this.classList.toggle('on');
  });
});

function setPreset(arr) {
  document.getElementById('pitch-input').value = arr.join(', ');
  document.getElementById('input-err').classList.remove('show');
}

window.addEventListener('resize', () => {
  if (phrases.length) renderRoll(phrases);
});

// ================================================================
//  WEBAUDIO PLAYBACK ENGINE
//  Schedules all notes up-front with precise timing using the
//  AudioContext clock, then uses setTimeout for UI highlights.
// ================================================================

let audioCtx     = null;
let activeNodes  = [];
let uiTimers     = [];
let isPlaying    = false;

function getCtx() {
  if (!audioCtx || audioCtx.state === 'closed')
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/**
 * Synthesize a single note.
 * Triangle fundamental + quiet sine octave partial for warmth.
 * Envelope: fast attack → exponential decay → short release.
 */
function scheduleNote(freq, t0, dur, ctx, master) {
  const gain = ctx.createGain();
  gain.connect(master);

  const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
  const o2 = ctx.createOscillator(); o2.type = 'sine';     o2.frequency.value = freq * 2;
  const blend = ctx.createGain(); blend.gain.value = 0.18;

  o1.connect(gain); o2.connect(blend); blend.connect(gain);

  const atk = 0.012;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.44, t0 + atk);
  gain.gain.exponentialRampToValueAtTime(0.10, t0 + atk + dur * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  [o1, o2].forEach(o => { o.start(t0); o.stop(t0 + dur + 0.04); });
  return [o1, o2];
}

function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

// Octave contour per phrase (creates musical phrase-level arc)
const OCTAVE_CONTOUR = [0, 1, 1, 0, -1, 0, 1, 2, 1, 0, -1, 0, 1, 0];

function startPlayback() {
  if (!phrases.length) return;
  stopPlayback();
  isPlaying = true;

  const ctx  = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);

  const bpm      = +document.getElementById('bpm-rng').value;
  const baseOct  = +document.getElementById('oct-rng').value;
  const noteDur  = 60 / bpm;
  const gapDur   = noteDur * 0.55;
  let   t        = ctx.currentTime + 0.12;
  const sched    = [];

  phrases.forEach((phrase, pi) => {
    const oct = Math.max(2, Math.min(7, baseOct + (OCTAVE_CONTOUR[pi] || 0)));
    phrase.set.forEach((pc, ni) => {
      const freq  = midiToFreq(oct * 12 + pc);
      const nodes = scheduleNote(freq, t, noteDur * 0.86, ctx, master);
      activeNodes.push(...nodes);
      sched.push({ t, pi, ni, wallDelay: (t - ctx.currentTime) * 1000 });
      t += noteDur;
    });
    t += gapDur;
  });

  // UI highlight callbacks
  sched.forEach(({ pi, ni, wallDelay }) => {
    uiTimers.push(setTimeout(() => {
      if (!isPlaying) return;
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('playing'));
      document.getElementById(`chip-${pi}-${ni}`)?.classList.add('playing');
      if (ni === 0) focusPhrase(pi);
    }, wallDelay));
  });

  // End callback
  const last = sched[sched.length - 1];
  uiTimers.push(setTimeout(() => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('playing'));
    document.getElementById('status').textContent = 'Playback complete';
    document.getElementById('status').className   = '';
    document.getElementById('btn-play').disabled  = false;
    isPlaying = false;
  }, last.wallDelay + noteDur * 1400));

  document.getElementById('status').textContent = '▶ Playing…';
  document.getElementById('status').className   = 'playing';
  document.getElementById('btn-play').disabled  = true;
}

function stopPlayback() {
  isPlaying = false;
  activeNodes.forEach(n => { try { n.stop(0); } catch(e){} });
  activeNodes = [];
  uiTimers.forEach(clearTimeout);
  uiTimers = [];
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('playing'));
  if (phrases.length) {
    document.getElementById('btn-play').disabled = false;
    const s = document.getElementById('status');
    if (!s.className) return;
    s.textContent = 'Stopped';
    s.className   = '';
  }
}

// Init
renderClock([], '#d95f2a');