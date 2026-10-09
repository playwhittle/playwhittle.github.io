/* Whittle: daily puzzle engine. Pure functions, no DOM. */
(function (root) {
  const D = typeof module !== "undefined" ? require("./data.js") : root;
  const COUNTRIES = D.WHITTLE_COUNTRIES;
  const QUESTIONS = D.WHITTLE_QUESTIONS;

  const LAUNCH = { y: 2026, m: 9, d: 9 }; // October 9, 2026 is Whittle #1 (month is 0-based)
  const BOARD_SIZE = 64;
  const HAND_SIZE = 4;
  const WRONG_GUESS_COST = 2;
  const ANSWER_SEED = 0x5eed1e; // changing this reshuffles the whole answer schedule

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

  function dateForDay(day) {
    return new Date(LAUNCH.y, LAUNCH.m, LAUNCH.d + day - 1);
  }

  /* Answers never repeat. Each release is shuffled on its own and queued after the previous one,
     so adding countries later never changes an earlier day's answer or board. */
  const RELEASES = D.WHITTLE_RELEASES || [COUNTRIES.length];
  const ANSWER_ORDER = [];
  const POOL_END = []; // for each answer slot, how many countries were released by then
  let start = 0;
  RELEASES.forEach((size, i) => {
    const block = COUNTRIES.slice(start, start + size);
    shuffle(block, rng(ANSWER_SEED + i)).forEach((c) => { ANSWER_ORDER.push(c); POOL_END.push(start + size); });
    start += size;
  });

  function puzzleFor(day) {
    const slot = (day - 1) % ANSWER_ORDER.length; // repeats only if content runs out
    const answer = ANSWER_ORDER[slot];
    const pool = COUNTRIES.slice(0, POOL_END[slot]);
    const others = shuffle(pool.filter((c) => c !== answer), rng(day * 7919 + 1)).slice(0, BOARD_SIZE - 1);
    const board = others.concat([answer]).sort((a, b) => a.name.localeCompare(b.name));
    const deck = shuffle(QUESTIONS, rng(day * 104729 + 3));
    const puzzle = { day, answer, board, deck, category: "Countries" };
    puzzle.par = computePar(puzzle);
    return puzzle;
  }

  /* Rebuild the round from the player's actions: [{t:"q", id}, {t:"g", name}]. */
  /* A card is only dealt while it can still split the board; dead cards are discarded for free. */
  const splits = (q, list) => {
    const yes = list.filter((c) => q.test(c)).length;
    return yes > 0 && yes < list.length;
  };

  function replay(puzzle, actions) {
    let remaining = puzzle.board.slice();
    let hand = [];
    let next = 0;
    let count = 0;
    let solved = false;
    const log = [];
    const wrong = [];
    const refill = () => {
      hand = hand.filter((q) => splits(q, remaining));
      while (hand.length < HAND_SIZE && next < puzzle.deck.length) {
        const q = puzzle.deck[next++];
        if (splits(q, remaining)) hand.push(q);
      }
    };
    refill();

    for (const act of actions) {
      if (solved) break;
      if (act.t === "q") {
        const q = hand.find((h) => h.id === act.id);
        if (!q) continue;
        const truth = q.test(puzzle.answer);
        const before = remaining.length;
        remaining = remaining.filter((c) => q.test(c) === truth);
        count += 1;
        hand = hand.filter((h) => h !== q);
        log.push({ t: "q", q, truth, before, after: remaining.length });
        if (remaining.length === 1) solved = true;
        else refill();
      } else if (act.t === "g") {
        if (!remaining.some((c) => c.name === act.name)) continue;
        if (act.name === puzzle.answer.name) {
          count += 1; // a correct guess is still a question
          log.push({ t: "g", name: act.name, correct: true, before: remaining.length, after: 1 });
          remaining = [puzzle.answer];
          solved = true;
        } else {
          const before = remaining.length;
          remaining = remaining.filter((c) => c.name !== act.name);
          count += WRONG_GUESS_COST;
          wrong.push(act.name);
          log.push({ t: "g", name: act.name, correct: false, before, after: remaining.length });
          if (remaining.length === 1) solved = true;
          else refill();
        }
      }
    }
    return { remaining, hand, count, solved, log, wrong };
  }

  /* Par: what a careful player gets by always playing the card in hand with the most even split.
     Random play reaches par a little over a third of the time; thoughtful play does much better. */
  function computePar(puzzle) {
    const actions = [];
    for (let guard = 0; guard < 60; guard++) {
      const s = replay(puzzle, actions);
      if (s.solved) return s.count;
      if (s.hand.length === 0) return s.count + s.remaining.length - 1; // left to guessing
      let best = s.hand[0], bestScore = -1;
      for (const q of s.hand) {
        const yes = s.remaining.filter((c) => q.test(c)).length;
        const score = Math.min(yes, s.remaining.length - yes);
        if (score > bestScore) { best = q; bestScore = score; }
      }
      actions.push({ t: "q", id: best.id });
    }
    return 12;
  }

  function grade(count, par) {
    return count <= par ? "carved" : "rough";
  }

  const api = { LAUNCH, BOARD_SIZE, HAND_SIZE, WRONG_GUESS_COST, rng, dayNumberFor, dateForDay, puzzleFor, replay, computePar, grade, poolSize: ANSWER_ORDER.length };
  if (typeof module !== "undefined") module.exports = api;
  else root.Whittle = api;
})(typeof window !== "undefined" ? window : globalThis);
