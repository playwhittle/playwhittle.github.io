/* Whittle: daily puzzle engine for Animals. Pure functions, no page code. */
(function (root) {
  const D = typeof module !== "undefined" ? require("./data.js") : root;
  const ANIMALS = D.WHITTLE_ANIMALS;
  const QUESTIONS = D.WHITTLE_QUESTIONS;
  const QBYID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  const GROUPS = D.WHITTLE_GROUPS || {};
  const groupOf = (name) => GROUPS[String(name).toLowerCase()] || null;

  const LAUNCH = { y: 2026, m: 9, d: 9 }; // October 9, 2026 is Whittle #1 (month is 0-based)
  const MAX_QUESTIONS = 20;
  const ANSWER_SEED = 0xa11a5; // changing this reshuffles the whole answer schedule

  // Every animal's answer to every question, worked out once.
  ANIMALS.forEach((a) => { a.ans = {}; QUESTIONS.forEach((q) => { a.ans[q.id] = q.answer(a); }); });

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Day number in the player's own time zone: the puzzle flips at their local midnight. */
  function dayNumberFor(date) {
    const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const launch = Date.UTC(LAUNCH.y, LAUNCH.m, LAUNCH.d);
    return Math.max(1, Math.floor((today - launch) / 86400000) + 1);
  }
  function dateForDay(day) { return new Date(LAUNCH.y, LAUNCH.m, LAUNCH.d + day - 1); }

  /* Answers never repeat until every animal has been used once. */
  const ANSWER_ORDER = shuffle(ANIMALS, rng(ANSWER_SEED));

  function puzzleFor(day) {
    const answer = ANSWER_ORDER[(day - 1) % ANSWER_ORDER.length];
    const puzzle = { day, answer, category: "Animals", pool: ANIMALS.length };
    puzzle.par = computePar(puzzle);
    return puzzle;
  }

  /* Rebuild the round from the player's actions: [{t:"q", id}, {t:"g", name}]. */
  function replay(puzzle, actions) {
    const log = [];
    const asked = {};
    const wrong = new Set();
    const inGroups = [];
    let count = 0, solved = false;
    for (const act of actions) {
      if (solved || count >= MAX_QUESTIONS) break;
      if (act.t === "q") {
        const q = QBYID[act.id];
        if (!q || asked[q.id]) continue; // repeats are free
        const ans = puzzle.answer.ans[q.id];
        asked[q.id] = ans;
        count += 1;
        log.push({ t: "q", id: q.id, q: q.q, ans });
      } else if (act.t === "g") {
        const name = String(act.name || "").trim();
        if (!name) continue;
        const correct = name.toLowerCase() === puzzle.answer.name.toLowerCase();
        const group = !correct && groupOf(name);
        const close = !!(group && group.includes(puzzle.answer.name));
        count += 1;
        log.push({ t: "g", name, correct, close, group: !!group });
        if (correct) solved = true;
        else if (close) { inGroups.push(group); wrong.add(name.toLowerCase()); }
        else if (group) group.forEach((n) => wrong.add(n.toLowerCase()));
        else wrong.add(name.toLowerCase());
      }
    }
    const remaining = ANIMALS.filter((a) => !wrong.has(a.name.toLowerCase()) &&
      inGroups.every((g) => g.includes(a.name)) &&
      Object.keys(asked).every((id) => a.ans[id] === asked[id]));
    const failed = !solved && count >= MAX_QUESTIONS;
    return { log, asked, count, solved, failed, remaining, left: MAX_QUESTIONS - count };
  }

  /* How close the player is, 0 (no idea) to 5 (only one animal fits). Drives the carver. */
  function warmth(remainingCount) {
    if (remainingCount <= 1) return 5;
    const p = 1 - Math.log(remainingCount) / Math.log(ANIMALS.length);
    return Math.max(0, Math.min(4, Math.floor(p * 5)));
  }

  /* Par: a sharp questioner who always asks the most informative question, plus 4 for being human. */
  function computePar(puzzle) {
    const asked = {};
    let count = 0;
    for (let guard = 0; guard < 40; guard++) {
      const rem = ANIMALS.filter((a) => Object.keys(asked).every((id) => a.ans[id] === asked[id]));
      if (rem.length <= 1) { count += 1; break; } // name it
      let best = null, bestScore = Infinity;
      for (const q of QUESTIONS) {
        if (asked[q.id] !== undefined) continue;
        const b = { Y: 0, N: 0, S: 0 };
        rem.forEach((a) => b[a.ans[q.id]]++);
        const score = (b.Y * b.Y + b.N * b.N + b.S * b.S) / rem.length; // expected animals left
        if (score < bestScore - 1e-9) { best = q; bestScore = score; }
      }
      if (!best || bestScore >= rem.length) { count += rem.length; break; }
      asked[best.id] = puzzle.answer.ans[best.id];
      count += 1;
    }
    return Math.max(8, Math.min(14, count + 4));
  }

  /* ---------- understanding what the player typed ---------- */
  const STOP = new Set(("is it a an the does do did can could would will its this that animal animals creature " +
    "of be are was were they them their you your have has had with in on at to any some usually mostly often ever " +
    "really very or and like ok okay so just i think maybe please type kind sort thing one there by from as for well").split(" "));
  const NUM = { 2: "two", 4: "four", 6: "six", 8: "eight" };
  function stem(w) {
    if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
    if (w.length > 4 && /(sh|ch|x|ss)es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) return w.slice(0, -1);
    return w;
  }
  function tokens(text) {
    return String(text).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ")
      .filter(Boolean).map((w) => NUM[w] || w).filter((w) => !STOP.has(w)).map(stem);
  }
  function lev(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i].concat(Array(n).fill(0)));
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[m][n];
  }
  /* 1 = same word, 0.8 = still typing it, 0.9 = small typo, 0 = different. */
  function wordMatch(user, word, typing) {
    if (user === word) return 1;
    if (typing && user.length >= 3 && word.startsWith(user)) return 0.8;
    if (user[0] !== word[0] || Math.min(user.length, word.length) < 5) return 0;
    const limit = Math.min(user.length, word.length) >= 8 ? 2 : 1;
    return lev(user, word) <= limit ? 0.9 : 0;
  }
  function phraseScore(userToks, phraseToks, typingLast) {
    if (!phraseToks.length || !userToks.length) return 0;
    const used = new Set();
    let total = 0;
    phraseToks.forEach((p) => {
      let best = 0, bestI = -1;
      userToks.forEach((u, i) => {
        if (used.has(i)) return;
        const m = wordMatch(u, p, typingLast && i === userToks.length - 1);
        if (m > best) { best = m; bestI = i; }
      });
      if (bestI >= 0) used.add(bestI);
      total += best;
    });
    const coverage = total / phraseToks.length;
    if (coverage < 0.5) return 0;
    const extra = userToks.length - used.size;
    return coverage - 0.15 * extra;
  }
  QUESTIONS.forEach((q) => { q.aliasToks = q.aliases.concat([q.q]).map(tokens).filter((x) => x.length); });
  ANIMALS.forEach((a) => { a.aliasToks = [a.name.toLowerCase()].concat(a.aliases).map(tokens).filter((x) => x.length); });

  /* Suggestions for what the player typed: questions from the bank, and guesses. Best first. */
  function suggest(text, asked, opts) {
    const typing = !!(opts && opts.typing);
    const raw = String(text).toLowerCase();
    const toks = tokens(text);
    if (!toks.length) return [];
    const familyWords = /\b(type|kind|sort|family|related)\b/.test(raw);
    const out = [];
    QUESTIONS.forEach((q) => {
      let s = 0;
      q.aliasToks.forEach((pt) => { s = Math.max(s, phraseScore(toks, pt, typing)); });
      if (s >= 0.6) out.push({ kind: "q", id: q.id, text: q.q, score: s, asked: asked && asked[q.id] });
    });
    ANIMALS.forEach((a) => {
      let s = 0;
      a.aliasToks.forEach((pt) => {
        const ps = phraseScore(toks, pt, typing);
        if (ps >= 0.85 && toks.length <= pt.length + 1) s = Math.max(s, ps);
      });
      if (s >= 0.75) out.push({ kind: "g", name: a.name, text: "Guess: " + a.name, score: s + (familyWords ? -0.3 : 0.15) });
    });
    Object.keys(GROUPS).forEach((g) => {
      const gt = tokens(g);
      const ps = phraseScore(toks, gt, typing);
      if (ps >= 0.85 && toks.length <= gt.length + 1 && !out.some((o) => o.kind === "g" && o.name.toLowerCase() === g)) {
        out.push({ kind: "g", name: g.replace(/\b\w/g, (c) => c.toUpperCase()), text: "Guess: " + g, score: ps + (familyWords ? -0.3 : 0.12), group: true });
      }
    });
    out.sort((x, y) => y.score - x.score);
    // A short answer that isn't a known question or animal is offered as a guess, typed as is.
    const best = out[0];
    if (!typing && toks.length <= 3 && (!best || best.score < 0.75)) {
      const name = String(text).replace(/^\s*(is it|could it be|maybe|i think it'?s)\s+(an?\s+|the\s+)?/i, "").replace(/[?.!]+\s*$/, "").trim();
      if (name && name.length <= 30) out.push({ kind: "g", name: name.replace(/\b\w/g, (c) => c.toUpperCase()), text: "Guess: " + name, score: 0.5, unknown: true });
    }
    return out.slice(0, 4);
  }

  /* The first of the player's own answers that rules this animal out, if any. */
  function contradiction(name, asked) {
    if (groupOf(name)) return null;
    const a = ANIMALS.find((x) => x.name.toLowerCase() === String(name).toLowerCase());
    if (!a) return null;
    for (const id of Object.keys(asked)) {
      const mine = asked[id], theirs = a.ans[id];
      if ((mine === "Y" && theirs === "N") || (mine === "N" && theirs === "Y")) return { id, q: QBYID[id].q, ans: mine };
    }
    return null;
  }

  function grade(count, par) { return count <= par ? "carved" : "rough"; }

  const api = { LAUNCH, MAX_QUESTIONS, ANIMALS, QUESTIONS, QBYID, rng, dayNumberFor, dateForDay, puzzleFor, replay, warmth,
    computePar, suggest, contradiction, grade, tokens, groupOf, poolSize: ANSWER_ORDER.length };
  if (typeof module !== "undefined") module.exports = api;
  else root.Whittle = api;
})(typeof window !== "undefined" ? window : globalThis);
