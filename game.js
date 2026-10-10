/* Whittle: screens, input, the carver, saving, sharing. */
(function () {
  const W = window.Whittle;
  const TAG_NOTES = window.WHITTLE_TAG_NOTES;
  const CLASS_NAMES = window.WHITTLE_CLASS_NAMES;
  const STORE_KEY = "whittle.v1";
  const MODE = "animals";
  const $ = (id) => document.getElementById(id);
  const pad3 = (n) => String(n).padStart(3, "0");
  const reduceMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  const puzzleCache = {};
  const getPuzzle = (d) => puzzleCache[d] || (puzzleCache[d] = W.puzzleFor(d));
  let puzzle = getPuzzle(today);
  // Rounds from the old countries game are kept on the shelf but never replayed as animals.
  const dayRec = (d) => (store.days[d] && store.days[d].mode === MODE ? store.days[d] : null);
  const actionsFor = (d) => (dayRec(d) && dayRec(d).actions) || [];
  /* The preview inside Claude is a test bench: it always offers Reset. */
  const DEMO = !/github\.io$/.test(location.hostname);

  function stateFor(d) { return W.replay(getPuzzle(d), actionsFor(d)); }

  /* A finished day is saved as a summary, so later content updates never rewrite a player's shelf. */
  function resultFor(d) {
    const saved = store.days[d] && store.days[d].result;
    if (saved) { if (saved.grade === "golden") saved.grade = "carved"; return saved; }
    if (!dayRec(d)) return null;
    const s = stateFor(d);
    if (!s.solved && !s.failed) return null;
    const p = getPuzzle(d);
    const result = {
      mode: MODE, answer: p.answer.name, count: s.count, par: p.par, solved: s.solved,
      grade: s.solved ? W.grade(s.count, p.par) : "rough", share: shareLine(s)
    };
    store.days[d].result = result;
    save();
    return result;
  }
  function shareLine(s) {
    return s.log.map((e) => (e.t === "g" ? (e.correct ? "🎯" : e.close ? "🟧" : "❌") : { Y: "🟩", N: "🟥", S: "🟨" }[e.ans])).join("");
  }
  function streak() {
    const ok = (d) => { const r = resultFor(d); return r && r.solved !== false; };
    let d = ok(today) ? today : today - 1;
    let n = 0;
    while (d >= 1 && ok(d)) { n++; d--; }
    return n;
  }

  /* ---------- screens ---------- */
  const screens = ["title", "game", "result", "shelf"];
  function show(name) {
    screens.forEach((s) => { $("screen-" + s).hidden = s !== name; });
    window.scrollTo(0, 0);
    if (name !== "game") Scene.stop();
    if (name === "title") renderTitle();
    if (name === "game") enterGame();
    if (name === "result") renderResult();
    if (name === "shelf") renderShelf();
  }
  function rollDayIfNeeded() {
    const d = W.dayNumberFor(new Date());
    if (d !== today) { today = d; puzzle = getPuzzle(d); return true; }
    return false;
  }

  /* ---------- title ---------- */
  function renderTitle() {
    rollDayIfNeeded();
    const done = !!resultFor(today);
    $("t-num").textContent = "DAILY #" + pad3(today);
    $("t-streak").textContent = "STREAK " + streak();
    $("t-cat").textContent = puzzle.category.toUpperCase();
    $("t-par").textContent = puzzle.par;
    $("t-start").textContent = done ? "SEE TODAY'S CARVING" : actionsFor(today).length ? "KEEP GOING" : "START";
    $("t-reset").hidden = !(location.hash === "#dev" || DEMO);
  }

  /* ---------- game ---------- */
  const HEAT = [
    ["COLD", "The carver is waiting for something to go on."],
    ["COOL", "He picks up the block and turns it over in his hands."],
    ["WARM", "First rough cuts. Something is starting to take shape."],
    ["WARMER", "He's leaning in now. You're getting warmer."],
    ["HOT", "Fine detail work. You're very close."],
    ["RED HOT", "He's sanding it smooth. All it needs is a name."]
  ];
  const STARTERS = ["Is it a mammal?", "Can it fly?", "Does it live in water?"];
  let pendingGuess = null;

  function enterGame() {
    const s = stateFor(today);
    if (s.solved || s.failed) { show("result"); return; }
    Scene.start($("g-scene"), W.warmth(s.remaining.length));
    renderGame();
    clearAsk();
    setTimeout(() => { try { $("g-input").focus({ preventScroll: true }); } catch (e) { /* older browsers */ } }, 50);
  }

  function renderGame(flashId) {
    const s = stateFor(today);
    $("g-num").textContent = "#" + pad3(today) + " · " + puzzle.category.toUpperCase();
    $("g-count").textContent = s.count + "/" + W.MAX_QUESTIONS;
    $("g-par").textContent = puzzle.par;
    $("g-left").textContent = s.left;
    const stage = W.warmth(s.remaining.length);
    $("g-caption").textContent = HEAT[stage][1];
    $("g-heat-word").textContent = HEAT[stage][0];
    $("g-heat").querySelectorAll("i").forEach((pip, i) => pip.classList.toggle("on", i < stage));
    $("g-heat").setAttribute("aria-label", "Warmth: " + HEAT[stage][0].toLowerCase());

    $("g-starter").hidden = s.log.length > 0;
    const chips = $("g-chips");
    if (!chips.childElementCount) {
      STARTERS.forEach((q) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "chip-btn"; b.textContent = q;
        b.addEventListener("click", () => submit(q));
        chips.appendChild(b);
      });
    }

    const log = $("g-log");
    log.innerHTML = "";
    s.log.forEach((e, i) => {
      const li = document.createElement("li");
      li.dataset.id = e.t === "q" ? e.id : "";
      li.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"></span><b class="ans"></b>';
      const ans = li.querySelector(".ans");
      if (e.t === "q") {
        li.querySelector(".t").textContent = e.q;
        ans.classList.add(e.ans);
        ans.textContent = { Y: "YES", N: "NO", S: "SOMETIMES" }[e.ans];
      } else {
        li.querySelector(".t").textContent = guessLine(e);
        ans.classList.add(e.correct ? "hit" : e.close ? "S" : "miss");
        ans.textContent = e.correct ? "YES!" : e.close ? "CLOSE" : "NO";
      }
      if (flashId && (flashId === "last" ? i === s.log.length - 1 : li.dataset.id === flashId)) li.classList.add("flash");
      log.appendChild(li);
    });
  }
  const article = (w) => (/^[aeiou]/i.test(w) ? "an" : "a");
  const guessLine = (e) => (e.group && !e.correct ? "Is it a kind of " + e.name.toLowerCase() + "?" : "Is it " + article(e.name) + " " + e.name.toLowerCase() + "?");

  /* ---------- the question box ---------- */
  function clearAsk() {
    $("g-input").value = "";
    $("g-sugg").innerHTML = "";
    $("g-msg").hidden = true;
    $("g-warn").hidden = true;
    pendingGuess = null;
  }
  function showMsg(text) { const m = $("g-msg"); m.textContent = text; m.hidden = !text; }
  function renderSuggestions(list, highlightTop) {
    const box = $("g-sugg");
    box.innerHTML = "";
    list.forEach((sg, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "option");
      b.className = (sg.kind === "g" ? "guess" : "") + (highlightTop && i === 0 ? " top" : "");
      const label = document.createElement("span");
      label.textContent = sg.kind === "g" ? guessLine(sg) : sg.text;
      const tag = document.createElement("small");
      tag.textContent = sg.kind === "g" ? "guess" : sg.asked ? "asked: " + { Y: "yes", N: "no", S: "sometimes" }[sg.asked] : "";
      b.append(label, tag);
      b.addEventListener("click", () => choose(sg));
      box.appendChild(b);
    });
  }
  function onType() {
    const text = $("g-input").value;
    $("g-warn").hidden = true;
    pendingGuess = null;
    if (!text.trim()) { $("g-sugg").innerHTML = ""; showMsg(""); return; }
    const s = stateFor(today);
    renderSuggestions(W.suggest(text, s.asked, { typing: true }).filter((x) => !x.unknown), true);
    showMsg("");
  }
  function submit(text) {
    text = String(text || "").trim();
    if (!text) return;
    if (rollDayIfNeeded()) { show("title"); return; }
    const s = stateFor(today);
    const list = W.suggest(text, s.asked, { typing: false });
    const top = list[0], second = list[1];
    const clear = top && !top.unknown && top.score >= 0.8 &&
      (!second || top.score - second.score >= 0.1 || (top.kind === "g" && second.kind === "q"));
    if (clear) { choose(top); return; }
    if (!list.length) {
      renderSuggestions([], false);
      showMsg("I can't answer that one. Try asking another way, like “Does it have fur?”");
      return;
    }
    renderSuggestions(list, false);
    if (top.unknown) showMsg("That isn't a question I can answer. Try asking another way, or tap below if it's your guess.");
    else showMsg("Which did you mean?");
  }
  function choose(sg) {
    const s = stateFor(today);
    if (sg.kind === "q") {
      if (s.asked[sg.id]) {
        clearAsk();
        showMsg("You already asked that one. The answer was " + { Y: "yes", N: "no", S: "sometimes" }[s.asked[sg.id]] + ". No charge.");
        renderGame(sg.id);
        return;
      }
      act({ t: "q", id: sg.id });
      return;
    }
    const clash = W.contradiction(sg.name, s.asked);
    if (clash && pendingGuess !== sg.name) {
      pendingGuess = sg.name;
      const w = $("g-warn");
      w.innerHTML = "";
      const p = document.createElement("span");
      p.textContent = "Careful: you already learned “" + clash.q + "” is " + (clash.ans === "Y" ? "yes" : "no") + ", which rules out " + article(sg.name) + " " + sg.name.toLowerCase() + ". Guess it anyway?";
      const a = document.createElement("div");
      a.className = "actions";
      const go = document.createElement("button");
      go.type = "button"; go.className = "btn-ghost"; go.style.borderColor = "var(--gold)"; go.style.color = "var(--gold)";
      go.textContent = "Guess anyway";
      go.addEventListener("click", () => choose(sg));
      const no = document.createElement("button");
      no.type = "button"; no.className = "btn-ghost"; no.textContent = "Cancel";
      no.addEventListener("click", () => { w.hidden = true; pendingGuess = null; $("g-input").focus(); });
      a.append(go, no);
      w.append(p, a);
      w.hidden = false;
      $("g-sugg").innerHTML = "";
      showMsg("");
      go.focus();
      return;
    }
    act({ t: "g", name: sg.name });
  }

  function act(action) {
    const before = stateFor(today);
    const rec = store.days[today] && store.days[today].mode === MODE ? store.days[today] : { mode: MODE, actions: [] };
    rec.actions = rec.actions.concat([action]);
    store.days[today] = rec;
    save();
    const after = stateFor(today);
    const was = W.warmth(before.remaining.length), now = W.warmth(after.remaining.length);
    const last = after.log[after.log.length - 1];
    clearAsk();
    renderGame("last");

    if (after.solved || after.failed) {
      const res = resultFor(today);
      Scene.setStage(5);
      Scene.react(after.solved ? "finish" : "shake");
      if (after.solved && res.grade === "carved") Sound.chime(); else Sound.rough();
      $("g-input").disabled = true;
      setTimeout(() => { $("g-input").disabled = false; show("result"); }, reduceMotion() ? 300 : 1600);
      return;
    }
    if (last.t === "g" && last.close) { Sound.knock(); showMsg("Close! It's a kind of " + last.name.toLowerCase() + ". Which one?"); }
    else if (last.t === "g") { Sound.thud(); Scene.react("shake"); }
    else Sound.knock();
    Scene.setStage(now);
    if (now > was) { Scene.react("carve"); Sound.carve(0.2 + now * 0.12); }
    else if (last.t === "g" && last.close) Scene.react("carve");
    else if (last.t === "q") Scene.react("ponder");
    $("g-input").focus({ preventScroll: true });
  }

  /* ---------- the carver ---------- */
  const Scene = (() => {
    const C = {
      wall: "#1E140D", wallLine: "#170F09", floor: "#2A1C12", floorLine: "#3A2818",
      bench: "#93613A", benchEdge: "#6E4A2B", benchLeg: "#5C3A1E",
      skin: "#D7A27A", skinDark: "#B9845E", beard: "#D8D0C4", cap: "#4A3020", capDark: "#3A2414",
      shirt: "#5D7A6E", shirtDark: "#4A6358", apron: "#8C5C33", trousers: "#3E3A4A", boot: "#23180F",
      blade: "#C9D0D4", ink: "#22170F", bubble: "#F3E6CF", shaving: ["#E8C08A", "#D6A468", "#F2D2A2"]
    };
    let ctx = null, canvas = null, raf = 0, stage = 0, last = 0, t = 0;
    let reaction = null, reactUntil = 0;
    let particles = [], pile = [];

    function seedPile(n) {
      const r = W.rng(4242);
      pile = [];
      for (let i = 0; i < n; i++) pile.push({ x: 60 + Math.floor(r() * 40) + (r() < 0.3 ? -10 : 0), c: C.shaving[i % 3] });
    }
    function start(cv, s) {
      canvas = cv; ctx = cv.getContext("2d");
      if (!ctx) return;
      stage = s; particles = []; reaction = null;
      seedPile(s * 10);
      stop();
      last = performance.now();
      if (reduceMotion()) { draw(); return; }
      const loop = (now) => {
        const dt = Math.min(100, now - last); last = now; t += dt;
        update(dt); draw();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function setStage(s) { stage = s; if (reduceMotion() && ctx) draw(); }
    function react(kind) {
      reaction = kind; reactUntil = t + (kind === "finish" ? 2400 : kind === "carve" ? 1400 : 1100);
      if (reduceMotion() && ctx) draw();
    }

    function strokePeriod() {
      if (reaction === "carve" || reaction === "finish") return 140;
      return [0, 900, 420, 300, 210, 260][stage];
    }
    function armFrame() {
      if (reaction === "ponder") return "ponder";
      if (stage === 5 || reaction === "finish") return Math.floor(t / 130) % 2 ? "sandA" : "sandB";
      if (stage === 0 && reaction !== "carve") return "idle";
      if (reduceMotion()) return "up";
      return Math.floor(t / strokePeriod()) % 2 ? "down" : "up";
    }
    let lastFrame = "";
    function update(dt) {
      if (reaction && t > reactUntil) reaction = null;
      const f = armFrame();
      if (f === "down" && lastFrame !== "down") {
        const n = reaction === "carve" ? 4 : 1 + Math.floor(stage / 2);
        for (let i = 0; i < n; i++) particles.push({ x: 66 + Math.random() * 6, y: 42 + Math.random() * 4, vx: (Math.random() - 0.3) * 0.05, vy: -0.03 - Math.random() * 0.03, c: C.shaving[i % 3] });
      }
      if ((f === "sandA" || f === "sandB") && Math.random() < 0.15) particles.push({ x: 64 + Math.random() * 16, y: 50, vx: (Math.random() - 0.5) * 0.02, vy: 0, c: "#F2D2A2", dust: true });
      lastFrame = f;
      particles.forEach((p) => { p.vy += 0.00025 * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
      particles = particles.filter((p) => {
        if (p.y >= 91) { if (!p.dust && pile.length < 90) pile.push({ x: Math.round(p.x), c: p.c }); return false; }
        return true;
      });
    }

    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const GLYPH = {
      "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
      "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
      ".": [".....", ".....", ".....", ".....", ".....", ".....", "#.#.#"]
    };
    function bubble(x, y, ch) {
      px(x, y, 9, 11, C.bubble); px(x - 1, y + 1, 11, 9, C.bubble); px(x + 1, y + 11, 2, 2, C.bubble);
      GLYPH[ch].forEach((row, j) => [...row].forEach((v, i) => { if (v === "#") px(x + 2 + i, y + 2 + j, 1, 1, C.ink); }));
    }

    function drawBlock() {
      // The block gets smaller, rounder and paler as the carver works. Its final shape stays a secret.
      const spec = [[22, 26, "#A8723E", 0], [22, 26, "#A8723E", 1], [20, 24, "#B9844C", 2], [18, 22, "#C4905A", 3], [16, 21, "#CC9A5E", 4], [15, 20, "#E0B27A", 5]][stage];
      const [w, h, col, round] = spec;
      const x0 = 72 - Math.floor(w / 2), y0 = 62 - h;
      for (let j = 0; j < h; j++) {
        const fromTop = j, fromBot = h - 1 - j;
        let inset = Math.max(0, round - Math.min(fromTop, fromBot));
        if (stage >= 3 && Math.abs(j - Math.floor(h * 0.55)) <= 1) inset += 1; // a waist appears
        px(x0 + inset, y0 + j, w - inset * 2, 1, col);
        px(x0 + w - inset - 2, y0 + j, 2, 1, "rgba(0,0,0,0.18)");
      }
      if (stage <= 1) { px(x0, y0, 2, h, "#6E4A2B"); px(x0 + w - 2, y0, 2, h, "#6E4A2B"); px(x0 + 4, y0 + 8, 10, 1, "#8C5C33"); px(x0 + 6, y0 + 16, 8, 1, "#8C5C33"); }
      if (stage === 5) {
        const s = Math.floor(t / 300) % 4;
        px(x0 + 4, y0 + 3, 2, 1, "#FFF4D6");
        if (s < 2) { px(x0 + w - 3, y0 - 3, 1, 3, "#FFF4D6"); px(x0 + w - 4, y0 - 2, 3, 1, "#FFF4D6"); }
      }
    }
    function drawCarver() {
      const shake = reaction === "shake" ? (Math.floor(t / 90) % 2 ? 1 : -1) : 0;
      const lean = stage >= 3 || reaction === "carve" || reaction === "finish" ? 2 : 0;
      // stool
      px(28, 72, 22, 3, "#6E4A2B"); px(30, 75, 3, 17, "#4A3020"); px(45, 75, 3, 17, "#4A3020");
      // legs
      px(34, 66, 22, 6, C.trousers); px(51, 66, 6, 22, C.trousers); px(50, 88, 10, 4, C.boot);
      // torso and apron
      px(32 + lean, 44, 16, 23, C.shirt); px(32 + lean, 44, 3, 23, C.shirtDark);
      px(37 + lean, 50, 11, 17, C.apron); px(39 + lean, 44, 2, 6, C.apron);
      // head
      const hx = 33 + lean + shake;
      px(hx, 28, 14, 14, C.skin); px(hx + 2, 34, 2, 3, C.skinDark);
      px(hx - 1, 25, 16, 5, C.cap); px(hx + 11, 29, 6, 2, C.capDark);
      const lookUp = reaction === "ponder";
      px(hx + 10, lookUp ? 32 : 33, 2, 2, C.ink);
      px(hx + 14, 35, 2, 3, C.skinDark);
      px(hx + 4, 38, 11, 7, C.beard); px(hx + 10, 37, 5, 2, C.beard);
      // holding arm
      if (stage >= 1 || reaction === "carve") { px(44 + lean, 48, 7, 4, C.shirt); px(50 + lean, 52, 8, 4, C.shirt); px(58, 52, 4, 4, C.skin); }
      else { px(44, 56, 8, 4, C.shirt); px(52, 60, 4, 4, C.skin); }
      // working arm
      const f = armFrame();
      if (f === "idle") { px(42, 52, 5, 6, C.shirt); px(45, 58, 9, 4, C.shirt); px(54, 59, 4, 4, C.skin); px(96, 60, 8, 2, C.blade); px(104, 60, 4, 2, "#6E4A2B"); }
      else if (f === "ponder") { px(42 + lean, 46, 5, 6, C.shirt); px(45 + lean, 44, 4, 6, C.shirt); px(hx + 9, 41, 4, 4, C.skin); px(96, 60, 8, 2, C.blade); px(104, 60, 4, 2, "#6E4A2B"); }
      else if (f === "up") { px(42 + lean, 46, 5, 4, C.shirt); px(46 + lean, 42, 6, 4, C.shirt); px(51 + lean, 39, 6, 4, C.shirt); px(57 + lean, 37, 4, 4, C.skin); px(61 + lean, 36, 6, 2, C.blade); }
      else if (f === "down") { px(42 + lean, 48, 5, 4, C.shirt); px(47 + lean, 46, 8, 4, C.shirt); px(55 + lean, 44, 6, 4, C.shirt); px(61, 43, 4, 4, C.skin); px(65, 44, 6, 2, C.blade); }
      else { const dx = f === "sandA" ? 0 : 6; px(42 + lean, 48, 5, 4, C.shirt); px(47 + lean, 48, 10 + dx, 4, C.shirt); px(57 + lean + dx, 47, 5, 5, C.skin); px(60 + lean + dx, 49, 4, 3, "#C9B07A"); }
      // thought bubbles
      if (reaction === "ponder" || reaction === "shake") bubble(hx + 14, 10, "?");
      else if (reaction === "carve" || reaction === "finish") bubble(hx + 14, 10, "!");
      else if (stage === 0 && Math.floor(t / 2500) % 3 === 2) bubble(hx + 14, 10, ".");
    }
    function draw() {
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      px(0, 0, 200, 100, C.wall);
      for (let x = 12; x < 200; x += 24) px(x, 0, 1, 92, C.wallLine);
      // the lamp glows warmer the closer you get
      const glow = ctx.createRadialGradient(118, 18, 2, 118, 18, 26 + stage * 12);
      glow.addColorStop(0, "rgba(255,196,120," + (0.12 + stage * 0.07) + ")");
      glow.addColorStop(1, "rgba(255,196,120,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 200, 100);
      px(118, 0, 1, 11, "#3A2A20"); px(112, 11, 13, 3, "#5C4330"); px(114, 14, 9, 2, "#5C4330");
      px(116, 16, 5, 2, ["#6E5A3A", "#9C7A3E", "#C9963E", "#E8B04B", "#F5C86A", "#FFE29A"][stage]);
      // tool rack
      px(140, 22, 50, 3, "#5C4330");
      [[146, 10], [156, 14], [166, 8], [178, 12]].forEach(([x, h], i) => { px(x, 25, 3, 6, "#6E4A2B"); px(x, 31, i % 2 ? 2 : 3, h, "#8A949A"); });
      // floor and shavings pile
      px(0, 92, 200, 8, C.floor); px(0, 92, 200, 1, C.floorLine);
      pile.forEach((p, i) => px(p.x, 91 - Math.floor(i / 30), 2, 1, p.c));
      // bench
      px(50, 62, 104, 5, C.bench); px(50, 62, 104, 1, "#B07A45"); px(50, 67, 104, 3, C.benchEdge);
      px(54, 70, 4, 22, C.benchLeg); px(144, 70, 4, 22, C.benchLeg); px(58, 82, 86, 2, "#4A3020");
      drawBlock();
      drawCarver();
      particles.forEach((p) => px(Math.round(p.x), Math.round(p.y), p.dust ? 1 : 2, 1, p.c));
    }
    return { start, stop, setStage, react };
  })();

  /* ---------- carvings: one figure per answer ---------- */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const PALETTE = { base: "#E0B27A", light: "#F2D2A2", dark: "#B9844C", stand: "#7A4E2A", standDark: "#5C3A1E" };
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
    return { grid: keep, eyeRow: 1 + Math.floor(r() * 2), eyes: r() < 0.7 };
  }
  function drawCarving(canvas, name, grade) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 20; canvas.height = 22;
    ctx.clearRect(0, 0, 20, 22);
    if (grade === "rough") {
      ctx.fillStyle = "#6E4A2B"; ctx.fillRect(5, 6, 10, 12);
      ctx.fillStyle = "#4A3020"; ctx.fillRect(5, 17, 10, 1); ctx.fillRect(14, 6, 1, 12);
      ctx.fillStyle = "#7F5532"; ctx.fillRect(6, 9, 6, 1); ctx.fillRect(7, 13, 5, 1);
      ctx.fillStyle = "#3A2414"; ctx.fillRect(3, 18, 14, 3);
      return;
    }
    const f = figureFor(name), ox = 5, oy = 5, H = f.grid.length, Wd = f.grid[0].length;
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      if (!f.grid[y][x]) continue;
      const above = y > 0 && f.grid[y - 1][x], right = x < Wd - 1 && f.grid[y][x + 1];
      ctx.fillStyle = !above ? PALETTE.light : !right ? PALETTE.dark : PALETTE.base;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
    if (f.eyes) { ctx.fillStyle = "#22170F"; [3, 6].forEach((x) => { if (f.grid[f.eyeRow][x]) ctx.fillRect(ox + x, oy + f.eyeRow, 1, 1); }); }
    ctx.fillStyle = PALETTE.stand; ctx.fillRect(3, oy + H, 14, 2);
    ctx.fillStyle = PALETTE.standDark; ctx.fillRect(3, oy + H + 2, 14, 1);
  }
  function notesFor(answer) {
    const a = W.ANIMALS.find((x) => x.name === answer);
    if (!a) return [];
    return [CLASS_NAMES[a.cls]].concat(Object.keys(TAG_NOTES).filter((k) => a.tags[k] === "Y").map((k) => TAG_NOTES[k]));
  }
  function fillNotes(el, list) {
    el.innerHTML = "";
    list.forEach((n) => { const c = document.createElement("span"); c.className = "chip-note"; c.textContent = n; el.appendChild(c); });
  }

  /* ---------- result ---------- */
  let countdownTimer = null;
  function renderResult() {
    const res = resultFor(today);
    if (!res) { show("game"); return; }
    const s = stateFor(today);
    $("r-num").textContent = "WHITTLE #" + pad3(today) + " · " + (res.mode === MODE ? "ANIMALS" : "COUNTRIES");
    drawCarving($("r-carving"), res.answer, res.grade);
    $("r-answer").textContent = res.answer.toUpperCase();
    const diff = res.count - res.par;
    $("r-verdict").textContent = res.solved === false
      ? "Out of questions. This one stays a rough block. Tomorrow's a new animal."
      : res.grade === "carved"
        ? (diff < 0 ? "Under par." : "Right at par.") + " The carver finishes it, and it joins your shelf."
        : "You got it, but over par, so this one stays a rough block. Hit par tomorrow to earn your next carving.";
    $("r-count").textContent = res.count;
    $("r-vs").textContent = diff === 0 ? "E" : (diff > 0 ? "+" : "−") + Math.abs(diff);
    $("r-streak").textContent = streak();

    const cuts = $("r-cuts");
    cuts.innerHTML = '<span class="label">Your questions</span>';
    s.log.forEach((e, i) => {
      const row = document.createElement("div");
      row.className = "cut";
      row.innerHTML = '<span class="label">' + (i + 1) + '</span><span class="q"></span><b class="ans"></b>';
      const ans = row.querySelector(".ans");
      if (e.t === "q") { row.querySelector(".q").textContent = e.q; ans.classList.add(e.ans); ans.textContent = { Y: "YES", N: "NO", S: "SOMETIMES" }[e.ans]; }
      else { row.querySelector(".q").textContent = guessLine(e); ans.classList.add(e.correct ? "hit" : e.close ? "S" : "miss"); ans.textContent = e.correct ? "YES!" : e.close ? "CLOSE" : "NO"; }
      cuts.appendChild(row);
    });
    cuts.hidden = !s.log.length;
    fillNotes($("r-notes"), notesFor(res.answer));
    $("r-notes").parentElement.hidden = !notesFor(res.answer).length;
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
    $("r-countdown").textContent = "Next animal in " + hh + ":" + mm + ":" + ss;
    if (t === 0) setTimeout(() => show("title"), 1200);
  }
  function shareText() {
    const res = resultFor(today);
    const diff = res.count - res.par;
    const vs = res.solved === false ? "stumped" : diff === 0 ? "at par" : diff < 0 ? Math.abs(diff) + " under par" : diff + " over par";
    return "Whittle #" + today + " · Animals 🐾\n" + res.share + "\n" + (res.solved === false ? "20/20" : res.count + " questions") + " · " + vs + "\n🔥 Streak " + streak();
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
      days.push({ d, date: W.dateForDay(d), res, kind: res ? res.grade : d === today ? "today" : "missed" });
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
        const wrap = document.createElement("div"); wrap.className = "shelf-row";
        const slots = document.createElement("div"); slots.className = "slots";
        const names = document.createElement("div"); names.className = "names";
        items.slice(i, i + 4).forEach((x) => {
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
          n.innerHTML = '<span></span><span class="t" style="color:' + tags[x.kind][1] + '">' + tags[x.kind][0] + "</span>";
          n.firstChild.textContent = x.res ? x.res.answer : x.kind === "today" ? "Today" : "???";
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
    $("v-score").textContent = res.solved === false ? "Stumped after 20 questions" :
      res.count + " questions · " + (diff === 0 ? "at par" : diff < 0 ? Math.abs(diff) + " under par" : diff + " over par") + " (par " + res.par + ")";
    $("v-trail").textContent = res.share || "";
    fillNotes($("v-notes"), notesFor(res.answer));
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

  /* ---------- how to play: opens by itself on a first visit and whenever the rules change ---------- */
  const HOWTO_VERSION = 4;
  let howReturn = null;
  function openHowto(from) {
    howReturn = from || null;
    drawCarving($("h-carved"), "Octopus", "carved");
    drawCarving($("h-rough"), "Octopus", "rough");
    $("howto").hidden = false;
    $("h-go").focus();
  }
  function closeHowto() {
    if ($("howto").hidden) return;
    $("howto").hidden = true;
    if (store.seenHowTo !== HOWTO_VERSION) { store.seenHowTo = HOWTO_VERSION; save(); }
    if (howReturn) howReturn.focus();
  }
  $("h-close").addEventListener("click", closeHowto);
  $("h-go").addEventListener("click", closeHowto);
  $("howto").addEventListener("click", (e) => { if (e.target.id === "howto") closeHowto(); });
  $("t-how").addEventListener("click", (e) => openHowto(e.currentTarget));
  $("g-how").addEventListener("click", (e) => openHowto(e.currentTarget));

  document.addEventListener("keydown", (e) => {
    const open = !$("howto").hidden ? "howto" : !$("viewer").hidden ? "viewer" : null;
    if (!open) return;
    if (e.key === "Escape") { open === "howto" ? closeHowto() : closeViewer(); return; }
    if (e.key === "Tab") {
      const items = [...$(open).querySelectorAll("button")];
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
    }
  });

  /* ---------- sound: made in code, off until the player turns it on ---------- */
  const Sound = (() => {
    let ctx = null, master = null, noiseBuf = null;
    function ready() {
      if (!store.sound) return false;
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return false;
          ctx = new AC();
          master = ctx.createGain(); master.gain.value = 0.45; master.connect(ctx.destination);
          noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
          const d = noiseBuf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === "suspended") ctx.resume();
        return true;
      } catch (e) { return false; }
    }
    function tone(freq, endFreq, dur, type, vol, at) {
      const t = ctx.currentTime + (at || 0);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(freq, q, dur, vol, at, sweepTo) {
      const t = ctx.currentTime + (at || 0);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; f.type = "bandpass"; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
      if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
    }
    return {
      knock() { if (!ready()) return; tone(190, 95, 0.12, "triangle", 0.5); noise(1300, 5, 0.05, 0.35); },
      carve(share) {
        if (!ready()) return;
        const chips = share >= 0.6 ? 5 : share >= 0.4 ? 4 : 3;
        for (let i = 0; i < chips; i++) noise(2600 - i * 250, 3, 0.09, 0.28, 0.12 + i * 0.07, 1100);
        noise(900, 1.5, 0.25, 0.12, 0.12, 500);
      },
      thud() { if (!ready()) return; tone(110, 55, 0.3, "sine", 0.6); noise(400, 2, 0.12, 0.25); },
      chime() {
        if (!ready()) return;
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { tone(f, null, 0.6, "sine", 0.3, i * 0.09); tone(f * 4, null, 0.08, "sine", 0.05, i * 0.09); });
      },
      rough() { if (!ready()) return; tone(140, 80, 0.18, "triangle", 0.45); tone(120, 70, 0.22, "triangle", 0.4, 0.16); }
    };
  })();
  function renderSoundButtons() {
    ["t-sound", "g-sound"].forEach((id) => {
      const b = $(id);
      b.setAttribute("aria-pressed", String(!!store.sound));
      b.setAttribute("aria-label", store.sound ? "Sound on. Turn off" : "Sound off. Turn on");
      b.querySelector(".on").style.display = store.sound ? "" : "none";
      b.querySelector(".off").style.display = store.sound ? "none" : "";
    });
  }
  ["t-sound", "g-sound"].forEach((id) => $(id).addEventListener("click", () => {
    store.sound = !store.sound; save(); renderSoundButtons(); Sound.knock();
  }));
  renderSoundButtons();

  /* ---------- wiring ---------- */
  $("g-ask").addEventListener("submit", (e) => { e.preventDefault(); submit($("g-input").value); });
  $("g-input").addEventListener("input", onType);
  $("t-start").addEventListener("click", () => show(resultFor(today) ? "result" : "game"));
  $("t-shelf").addEventListener("click", () => show("shelf"));
  $("t-reset").addEventListener("click", () => { delete store.days[today]; save(); show("title"); });
  $("g-back").addEventListener("click", () => show("title"));
  $("r-back").addEventListener("click", () => show("title"));
  $("s-back").addEventListener("click", () => show("title"));
  $("r-share").addEventListener("click", share);
  $("r-shelf").addEventListener("click", () => show("shelf"));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { Scene.stop(); return; }
    if (rollDayIfNeeded()) show("title");
    else if (!$("screen-game").hidden) Scene.start($("g-scene"), W.warmth(stateFor(today).remaining.length));
  });

  show("title");
  if (store.seenHowTo !== HOWTO_VERSION) openHowto($("t-start"));
})();
