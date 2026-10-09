/* Whittle: screens, input, saving, sharing. */
(function () {
  const W = window.Whittle;
  const NOTES = window.WHITTLE_NOTES;
  const REGION = { E: "Europe", A: "Asia", F: "Africa", N: "North America", S: "South America", O: "Oceania" };
  const STORE_KEY = "whittle.v1";
  const $ = (id) => document.getElementById(id);
  const pad3 = (n) => String(n).padStart(3, "0");

  /* ---------- saving (this browser only) ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { days: {} }; }
    catch (e) { return { days: {} }; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable: play still works */ }
  }
  let store = load();
  if (!store.days) store.days = {};

  /* ---------- today ---------- */
  let today = W.dayNumberFor(new Date());
  let puzzle = W.puzzleFor(today);
  const puzzleCache = { [today]: puzzle };
  const getPuzzle = (d) => puzzleCache[d] || (puzzleCache[d] = W.puzzleFor(d));
  const actionsFor = (d) => (store.days[d] && store.days[d].actions) || [];
  let guessMode = false;
  let pendingGuess = null;
  let lastBanner = null;

  function stateFor(d) { return W.replay(getPuzzle(d), actionsFor(d)); }

  /* A finished day is saved as a summary, so later content updates never rewrite a player's shelf. */
  function resultFor(d) {
    const saved = store.days[d] && store.days[d].result;
    if (saved) { if (saved.grade === "golden") saved.grade = "carved"; return saved; }
    if (!store.days[d]) return null;
    const s = stateFor(d);
    if (!s.solved) return null;
    const p = getPuzzle(d);
    const result = { answer: p.answer.name, count: s.count, par: p.par, grade: W.grade(s.count, p.par), share: shareLine(s) };
    store.days[d].result = result;
    save();
    return result;
  }
  function shareLine(s) {
    const icons = s.log.map((e) => {
      if (e.t === "g") return e.correct ? "🎯" : "❌";
      const f = (e.before - e.after) / e.before;
      return f >= 0.4 ? "🪓" : f >= 0.15 ? "🪵" : "🌿";
    }).join("");
    return icons + (s.log.length && s.log[s.log.length - 1].t === "g" ? "" : "🎯");
  }

  function streak() {
    let d = resultFor(today) ? today : today - 1;
    let n = 0;
    while (d >= 1 && resultFor(d)) { n++; d--; }
    return n;
  }

  /* ---------- screens ---------- */
  const screens = ["title", "game", "result", "shelf"];
  function show(name) {
    screens.forEach((s) => { $("screen-" + s).hidden = s !== name; });
    window.scrollTo(0, 0);
    if (name === "title") renderTitle();
    if (name === "game") renderGame();
    if (name === "result") renderResult();
    if (name === "shelf") renderShelf();
  }

  function rollDayIfNeeded() {
    const d = W.dayNumberFor(new Date());
    if (d !== today) { today = d; puzzle = getPuzzle(d); guessMode = false; pendingGuess = null; lastBanner = null; return true; }
    return false;
  }

  /* ---------- title ---------- */
  function renderTitle() {
    rollDayIfNeeded();
    const s = stateFor(today);
    $("t-num").textContent = "DAILY #" + pad3(today);
    $("t-streak").textContent = "STREAK " + streak();
    $("t-cat").textContent = puzzle.category.toUpperCase();
    $("t-par").textContent = puzzle.par;
    $("t-start").textContent = s.solved ? "SEE TODAY'S CARVING" : actionsFor(today).length ? "KEEP CARVING" : "START CARVING";
    $("t-reset").hidden = !(location.hash === "#dev");
  }

  /* ---------- game ---------- */
  function renderGame(chipped) {
    const s = stateFor(today);
    if (s.solved) { show("result"); return; }
    $("g-num").textContent = "#" + pad3(today) + " · COUNTRIES";
    $("g-count").textContent = s.count;
    $("g-par").textContent = puzzle.par;
    $("g-left").textContent = s.remaining.length + "/" + puzzle.board.length;

    const board = $("g-board");
    board.classList.toggle("guessing", guessMode);
    board.querySelectorAll(".tile").forEach((t) => t.remove());
    const left = new Set(s.remaining.map((c) => c.name));
    puzzle.board.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tile";
      b.textContent = c.name;
      const out = !left.has(c.name);
      if (out) b.classList.add("out");
      if (s.wrong.includes(c.name)) b.classList.add("wrong");
      if (chipped && chipped.has(c.name)) b.classList.add("chip");
      b.disabled = out || !guessMode;
      b.setAttribute("aria-label", c.name + (out ? ", carved away" : ""));
      b.addEventListener("click", () => askGuess(c.name));
      board.appendChild(b);
    });

    $("g-guess").setAttribute("aria-pressed", String(guessMode));
    $("g-guess").textContent = guessMode ? "Cancel guess" : "Guess";

    const hand = $("g-hand");
    hand.innerHTML = "";
    if (s.hand.length === 0) {
      const p = document.createElement("div");
      p.className = "empty-hand";
      p.textContent = "No cards left can split the board. Time to guess.";
      hand.appendChild(p);
    }
    s.hand.forEach((q, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "card";
      b.innerHTML = '<span class="k">CARD ' + "ABCD"[i] + '</span><span class="q"></span>';
      b.querySelector(".q").textContent = q.q;
      b.addEventListener("click", () => playCard(q.id));
      hand.appendChild(b);
    });
    renderBanner(s);
  }

  function renderBanner(s) {
    const el = $("g-banner");
    el.innerHTML = "";
    if (pendingGuess) {
      const t = document.createElement("span");
      t.innerHTML = "Guess <strong></strong>? A wrong guess costs " + W.WRONG_GUESS_COST + ".";
      t.querySelector("strong").textContent = pendingGuess;
      const a = document.createElement("span");
      a.className = "actions";
      a.innerHTML = '<button class="btn-ghost" id="b-yes" style="border-color:var(--gold);color:var(--gold)">Guess it</button><button class="btn-ghost" id="b-no">Cancel</button>';
      el.append(t, a);
      $("b-yes").addEventListener("click", confirmGuess);
      $("b-no").addEventListener("click", () => { pendingGuess = null; renderBanner(stateFor(today)); });
      return;
    }
    if (guessMode) { el.textContent = "Tap the country you want to guess."; return; }
    if (lastBanner) { el.innerHTML = lastBanner; return; }
    el.textContent = s.log.length ? "Pick your next card." : "Pick a card to start carving.";
  }

  function act(action) {
    const before = stateFor(today);
    store.days[today] = { actions: actionsFor(today).concat([action]) };
    save();
    const after = stateFor(today);
    const gone = new Set(before.remaining.filter((c) => !after.remaining.includes(c)).map((c) => c.name));
    const entry = after.log[after.log.length - 1];
    if (entry && entry.t === "q") {
      const cut = entry.before - entry.after;
      lastBanner = '<span><strong class="' + (entry.truth ? "yes" : "no") + '">' + (entry.truth ? "Yes." : "No.") + "</strong> " +
        escapeHtml(entry.q.q) + " " + cut + (cut === 1 ? " tile" : " tiles") + " carved away.</span>";
    } else if (entry && entry.t === "g" && !entry.correct) {
      lastBanner = '<span><strong class="no">Not ' + escapeHtml(entry.name) + ".</strong> That cost " + W.WRONG_GUESS_COST + " questions.</span>";
    }
    if (after.solved) {
      lastBanner = null;
      $("g-board").querySelectorAll(".tile").forEach((t) => {
        if (gone.has(t.textContent)) t.classList.add("out", "chip");
        t.disabled = true;
      });
      $("g-hand").querySelectorAll("button").forEach((b) => { b.disabled = true; });
      $("g-banner").textContent = "Down to one. Polishing…";
      spawnShavings(gone);
      setTimeout(() => show("result"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700);
      return;
    }
    renderGame(gone);
    spawnShavings(gone);
  }

  function playCard(id) {
    if (rollDayIfNeeded()) { show("title"); return; }
    guessMode = false; pendingGuess = null;
    act({ t: "q", id });
  }
  function askGuess(name) {
    if (!guessMode) return;
    pendingGuess = name;
    renderBanner(stateFor(today));
  }
  function confirmGuess() {
    const name = pendingGuess;
    pendingGuess = null; guessMode = false;
    if (rollDayIfNeeded()) { show("title"); return; }
    act({ t: "g", name });
  }

  function spawnShavings(names) {
    if (!names || !names.size || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const board = $("g-board");
    const box = board.getBoundingClientRect();
    let n = 0;
    board.querySelectorAll(".tile").forEach((t) => {
      if (!names.has(t.textContent) || n > 24) return;
      const r = t.getBoundingClientRect();
      for (let i = 0; i < 2; i++) {
        const sh = document.createElement("span");
        sh.className = "shaving";
        sh.style.left = (r.left - box.left + r.width / 2 + (Math.random() * 20 - 10)) + "px";
        sh.style.top = (r.top - box.top + r.height / 2) + "px";
        sh.style.setProperty("--dx", (Math.random() * 40 - 20) + "px");
        sh.style.setProperty("--rot", (Math.random() * 360) + "deg");
        board.appendChild(sh);
        setTimeout(() => sh.remove(), 750);
        n++;
      }
    });
  }

  /* ---------- carvings: one unique figure per answer ---------- */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const PALETTES = {
    carved: { base: "#E0B27A", light: "#F2D2A2", dark: "#B9844C", stand: "#7A4E2A", standDark: "#5C3A1E" }
  };
  function figureFor(name) {
    const W2 = 10, H = 11; // figure area; mirrored left/right
    const r = W.rng(hash(name));
    const g = Array.from({ length: H }, () => Array(W2).fill(0));
    const colP = [0.08, 0.3, 0.6, 0.88, 1];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < 5; x++) {
        let p = colP[x];
        if (y < 3) p = x >= 3 ? 0.75 : x === 2 ? 0.18 : 0;
        if (y === 3) p = x >= 2 ? 0.8 : 0.1;
        const on = (x === 4 && y >= 2) || r() < p;
        g[y][x] = g[y][W2 - 1 - x] = on ? 1 : 0;
      }
    }
    // keep only pixels connected to the base so nothing floats
    const keep = Array.from({ length: H }, () => Array(W2).fill(0));
    const stack = [];
    for (let x = 0; x < W2; x++) if (g[H - 1][x]) { keep[H - 1][x] = 1; stack.push([x, H - 1]); }
    while (stack.length) {
      const [x, y] = stack.pop();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W2 && ny < H && g[ny][nx] && !keep[ny][nx]) { keep[ny][nx] = 1; stack.push([nx, ny]); }
      });
    }
    // an eye or two, picked per answer
    const eyeRow = 1 + Math.floor(r() * 2);
    return { grid: keep, eyeRow, eyes: r() < 0.7 };
  }
  function drawCarving(canvas, name, grade) {
    const ctx = canvas.getContext("2d");
    const cw = 20, ch = 22;
    canvas.width = cw; canvas.height = ch;
    ctx.clearRect(0, 0, cw, ch);
    const ox = 5, oy = 5;
    if (grade === "rough") {
      ctx.fillStyle = "#6E4A2B"; ctx.fillRect(5, 6, 10, 12);
      ctx.fillStyle = "#4A3020"; ctx.fillRect(5, 17, 10, 1); ctx.fillRect(14, 6, 1, 12);
      ctx.fillStyle = "#7F5532"; ctx.fillRect(6, 9, 6, 1); ctx.fillRect(7, 13, 5, 1);
      ctx.fillStyle = "#3A2414"; ctx.fillRect(3, 18, 14, 3);
      return;
    }
    const pal = PALETTES[grade] || PALETTES.carved;
    const f = figureFor(name);
    const H = f.grid.length, Wd = f.grid[0].length;
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      if (!f.grid[y][x]) continue;
      const above = y > 0 && f.grid[y - 1][x];
      const right = x < Wd - 1 && f.grid[y][x + 1];
      ctx.fillStyle = !above ? pal.light : !right ? pal.dark : pal.base;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
    if (f.eyes) {
      ctx.fillStyle = "#22170F";
      [3, 6].forEach((x) => { if (f.grid[f.eyeRow][x] && f.grid[f.eyeRow][x + 0]) ctx.fillRect(ox + x, oy + f.eyeRow, 1, 1); });
    }
    ctx.fillStyle = pal.stand; ctx.fillRect(3, oy + H, 14, 2);
    ctx.fillStyle = pal.standDark; ctx.fillRect(3, oy + H + 2, 14, 1);
  }

  /* ---------- result ---------- */
  let countdownTimer = null;
  function renderResult() {
    const res = resultFor(today);
    if (!res) { show("game"); return; }
    const s = stateFor(today);
    const p = getPuzzle(today);
    const grade = res.grade;
    $("r-num").textContent = "WHITTLE #" + pad3(today) + " · COUNTRIES";
    drawCarving($("r-carving"), res.answer, grade);
    $("r-answer").textContent = res.answer.toUpperCase();
    const diff = res.count - res.par;
    const verdicts = {
      carved: (diff < 0 ? "Under par." : "Clean cut at par.") + " Today's carving joins your shelf.",
      rough: "Found it, but this one stays a rough block. Hit par tomorrow to earn your next carving."
    };
    $("r-verdict").textContent = verdicts[grade];
    $("r-count").textContent = res.count;
    $("r-vs").textContent = diff === 0 ? "E" : (diff > 0 ? "+" : "−") + Math.abs(diff);
    $("r-streak").textContent = streak();

    const cuts = $("r-cuts");
    cuts.innerHTML = '<span class="label">Your cuts</span>';
    s.log.forEach((e, i) => {
      const row = document.createElement("div");
      row.className = "cut";
      const pct = Math.round(((e.before - e.after) / puzzle.board.length) * 100);
      const label = e.t === "q" ? "Q" + (i + 1) : e.correct ? "Hit" : "Miss";
      row.innerHTML = '<span class="label">' + label + '</span><div class="bar-track"><div class="bar' + (e.t === "g" && !e.correct ? " miss" : "") + '"></div></div><span></span><span class="q"></span>';
      row.querySelector(".bar").style.width = Math.max(3, pct) + "%";
      row.children[2].textContent = e.before + " → " + e.after;
      row.querySelector(".q").textContent = e.t === "q" ? e.q.q + " " + (e.truth ? "Yes" : "No") : "Guessed " + e.name;
      cuts.appendChild(row);
    });

    const notes = $("r-notes");
    notes.innerHTML = "";
    [REGION[p.answer.region]].concat([...p.answer.tags].filter((t) => NOTES[t]).map((t) => NOTES[t])).forEach((n) => {
      const c = document.createElement("span"); c.className = "chip-note"; c.textContent = n; notes.appendChild(c);
    });
    $("r-copy").hidden = true;
    clearInterval(countdownTimer);
    tick(); countdownTimer = setInterval(tick, 1000);
  }
  function tick() {
    if ($("screen-result").hidden) { clearInterval(countdownTimer); return; }
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const t = Math.max(0, Math.floor((next - now) / 1000));
    const hh = String(Math.floor(t / 3600)).padStart(2, "0"), mm = String(Math.floor((t % 3600) / 60)).padStart(2, "0"), ss = String(t % 60).padStart(2, "0");
    $("r-countdown").textContent = "Next block in " + hh + ":" + mm + ":" + ss;
    if (t === 0) setTimeout(() => show("title"), 1200);
  }

  function shareText() {
    const res = resultFor(today);
    const diff = res.count - res.par;
    const vs = diff === 0 ? "at par" : diff < 0 ? Math.abs(diff) + " under par" : diff + " over par";
    return "Whittle #" + today + " · Countries 🌍\n" + res.share + "\n" + res.count + " questions · " + vs + "\n🔥 Streak " + streak();
  }
  async function share() {
    const text = shareText();
    const btn = $("r-share");
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "COPIED";
      setTimeout(() => { btn.textContent = "SHARE"; }, 1600);
    } catch (e) {
      const ta = $("r-copy");
      ta.hidden = false; ta.value = text; ta.focus(); ta.select();
      btn.textContent = "SELECT & COPY";
      setTimeout(() => { btn.textContent = "SHARE"; }, 2400);
    }
  }

  /* ---------- shelf ---------- */
  const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  function renderShelf() {
    rollDayIfNeeded();
    const days = [];
    for (let d = 1; d <= today; d++) {
      const res = resultFor(d);
      const date = W.dateForDay(d);
      days.push({ d, date, res, kind: res ? res.grade : d === today ? "today" : "missed" });
    }
    const totals = { carved: 0, rough: 0, missed: 0 };
    days.forEach((x) => { if (totals[x.kind] !== undefined) totals[x.kind]++; });
    $("s-stats").innerHTML = "";
    [["carved", "Carved", "var(--tile)"], ["rough", "Rough", "var(--muted)"], ["missed", "Missed", "#8A7358"]].forEach(([k, l, c]) => {
      const el = document.createElement("div");
      el.className = "stat";
      el.innerHTML = '<span class="v" style="color:' + c + '">' + totals[k] + '</span><span class="label">' + l + "</span>";
      $("s-stats").appendChild(el);
    });

    const months = $("s-months");
    months.innerHTML = "";
    const groups = {};
    days.slice().reverse().forEach((x) => {
      const key = x.date.getFullYear() + "-" + x.date.getMonth();
      (groups[key] = groups[key] || { date: x.date, items: [] }).items.push(x);
    });
    Object.values(groups).forEach((grp) => {
      const sec = document.createElement("section");
      sec.className = "month";
      sec.innerHTML = "<h2>" + MONTHS[grp.date.getMonth()] + " " + grp.date.getFullYear() + "</h2>";
      const items = grp.items.slice().reverse();
      for (let i = 0; i < items.length; i += 4) {
        const row = items.slice(i, i + 4);
        const wrap = document.createElement("div");
        wrap.className = "shelf-row";
        const slots = document.createElement("div"); slots.className = "slots";
        const names = document.createElement("div"); names.className = "names";
        row.forEach((x) => {
          const slot = document.createElement(x.res ? "button" : "div");
          slot.className = "slot";
          if (x.res) {
            slot.type = "button";
            slot.setAttribute("aria-label", "Look closer at " + x.res.answer);
            slot.addEventListener("click", () => openViewer(x.d, slot));
          }
          const date = document.createElement("span");
          date.className = "date";
          date.textContent = SHORT[x.date.getMonth()] + " " + x.date.getDate();
          slot.appendChild(date);
          if (x.res) {
            const c = document.createElement("canvas");
            drawCarving(c, x.res.answer, x.res.grade);
            c.setAttribute("role", "img");
            c.setAttribute("aria-label", x.res.grade + " carving of " + x.res.answer);
            slot.appendChild(c);
          } else {
            const g = document.createElement("div");
            g.className = "ghost" + (x.kind === "today" ? " today" : "");
            slot.appendChild(g);
          }
          slots.appendChild(slot);
          const n = document.createElement("div");
          const tags = { carved: ["carved", "var(--tile)"], rough: ["rough", "var(--muted)"], missed: ["missed", "#8A7358"], today: ["play now", "var(--gold)"] };
          const nm = x.res ? x.res.answer : x.kind === "today" ? "Today" : "???";
          n.innerHTML = "<span></span><span class=\"t\" style=\"color:" + tags[x.kind][1] + "\">" + tags[x.kind][0] + "</span>";
          n.firstChild.textContent = nm;
          names.appendChild(n);
        });
        const plank = document.createElement("div"); plank.className = "plank";
        wrap.append(slots, plank, names);
        sec.appendChild(wrap);
      }
      months.appendChild(sec);
    });
  }

  /* ---------- close-up viewer ---------- */
  const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let viewerReturn = null;
  function openViewer(d, from) {
    const res = resultFor(d);
    if (!res) return;
    viewerReturn = from || null;
    const date = W.dateForDay(d);
    $("v-kind").textContent = res.grade === "rough" ? "Rough block" : "Carving";
    drawCarving($("v-carving"), res.answer, res.grade);
    $("v-name").textContent = res.answer;
    $("v-meta").textContent = "WHITTLE #" + pad3(d) + " · " + FULL_MONTHS[date.getMonth()].toUpperCase() + " " + date.getDate() + ", " + date.getFullYear();
    const diff = res.count - res.par;
    $("v-score").textContent = res.count + " questions · " + (diff === 0 ? "at par" : diff < 0 ? Math.abs(diff) + " under par" : diff + " over par") + " (par " + res.par + ")";
    $("v-trail").textContent = res.share || "";
    const notes = $("v-notes");
    notes.innerHTML = "";
    const country = window.WHITTLE_COUNTRIES.find((c) => c.name === res.answer);
    if (country) {
      [REGION[country.region]].concat([...country.tags].filter((t) => NOTES[t]).map((t) => NOTES[t])).forEach((n) => {
        const c = document.createElement("span"); c.className = "chip-note"; c.textContent = n; notes.appendChild(c);
      });
    }
    $("viewer").hidden = false;
    $("v-close").focus();
  }
  function closeViewer() {
    if ($("viewer").hidden) return;
    $("viewer").hidden = true;
    if (viewerReturn) viewerReturn.focus();
  }
  $("v-close").addEventListener("click", closeViewer);
  $("viewer").addEventListener("click", (e) => { if (e.target.id === "viewer") closeViewer(); });
  document.addEventListener("keydown", (e) => {
    if ($("viewer").hidden) return;
    if (e.key === "Escape") closeViewer();
    if (e.key === "Tab") { e.preventDefault(); $("v-close").focus(); }
  });

  /* ---------- helpers & wiring ---------- */
  function escapeHtml(s) { return s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])); }

  $("t-start").addEventListener("click", () => show(resultFor(today) ? "result" : "game"));
  $("t-shelf").addEventListener("click", () => show("shelf"));
  $("t-reset").addEventListener("click", () => { delete store.days[today]; save(); lastBanner = null; show("title"); });
  $("g-back").addEventListener("click", () => show("title"));
  $("r-back").addEventListener("click", () => show("title"));
  $("s-back").addEventListener("click", () => show("title"));
  $("r-share").addEventListener("click", share);
  $("r-shelf").addEventListener("click", () => show("shelf"));
  $("g-guess").addEventListener("click", () => { guessMode = !guessMode; pendingGuess = null; renderGame(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && rollDayIfNeeded()) show("title"); });

  show("title");
})();
