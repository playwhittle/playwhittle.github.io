/* Whittle: country data and question deck.
   Each country: [name, region, tags]
   Regions: E Europe, A Asia, F Africa, N North/Central America & Caribbean, S South America, O Oceania
   Tags (present = "yes"):
     ll    landlocked
     isl   made up entirely of islands
     p50   population over 50 million
     p100  population over 100 million
     big   area over 1,000,000 km²
     sc    capital south of the equator
     eur   uses the euro
     eu    European Union member
     left  drives on the left
     mon   monarch as head of state
     med   Mediterranean coastline
     red   flag contains red
     star  flag has a star
     es    Spanish is an official language
     ar    Arabic is an official language
     fr    French is an official language
     oly   has hosted the Summer Olympics
     wc    has hosted the men's FIFA World Cup (through 2026)
     g7    G7 member
   Facts as of October 2026. Spot-check before launch. */

const WHITTLE_COUNTRIES = [
  ["United Kingdom", "E", "isl p50 left mon red oly wc g7"],
  ["Ireland", "E", "isl eur eu left"],
  ["France", "E", "p50 eur eu med red fr oly wc g7"],
  ["Spain", "E", "eur eu mon med red es oly wc"],
  ["Portugal", "E", "eur eu red"],
  ["Italy", "E", "p50 eur eu med red oly wc g7"],
  ["Germany", "E", "p50 eur eu red oly wc g7"],
  ["Netherlands", "E", "eur eu mon red oly"],
  ["Belgium", "E", "eur eu mon red fr oly"],
  ["Switzerland", "E", "ll red fr wc"],
  ["Austria", "E", "ll eur eu red"],
  ["Poland", "E", "eu red"],
  ["Czechia", "E", "ll eu red"],
  ["Hungary", "E", "ll eu red"],
  ["Greece", "E", "eur eu med oly"],
  ["Sweden", "E", "eu mon oly wc"],
  ["Norway", "E", "mon red"],
  ["Denmark", "E", "eu mon red"],
  ["Finland", "E", "eur eu oly"],
  ["Iceland", "E", "isl red"],
  ["Ukraine", "E", ""],
  ["Romania", "E", "eu red"],
  ["Croatia", "E", "eur eu med red"],
  ["Serbia", "E", "ll red"],

  ["China", "A", "p50 p100 big red star oly"],
  ["Japan", "A", "isl p50 p100 left mon red oly wc g7"],
  ["South Korea", "A", "p50 red oly wc"],
  ["India", "A", "p50 p100 big left"],
  ["Pakistan", "A", "p50 p100 left star"],
  ["Bangladesh", "A", "p50 p100 left red"],
  ["Nepal", "A", "ll left red"],
  ["Thailand", "A", "p50 left mon red"],
  ["Vietnam", "A", "p50 p100 red star"],
  ["Philippines", "A", "isl p50 p100 red star"],
  ["Indonesia", "A", "isl p50 p100 big sc left red"],
  ["Malaysia", "A", "left mon red star"],
  ["Singapore", "A", "isl left red star"],
  ["Mongolia", "A", "ll big red"],
  ["Saudi Arabia", "A", "big mon ar"],
  ["Iran", "A", "p50 big red"],
  ["Iraq", "A", "red ar"],
  ["Jordan", "A", "mon red star ar"],
  ["United Arab Emirates", "A", "red ar"],

  ["Egypt", "F", "p50 p100 big med red ar"],
  ["Morocco", "F", "mon med red star ar"],
  ["Algeria", "F", "big med red star ar"],
  ["Tunisia", "F", "med red star ar"],
  ["Nigeria", "F", "p50 p100"],
  ["Ghana", "F", "red star"],
  ["Senegal", "F", "red star fr"],
  ["Kenya", "F", "p50 sc left red"],
  ["Ethiopia", "F", "ll p50 p100 big red star"],
  ["Tanzania", "F", "p50 sc left"],
  ["South Africa", "F", "p50 big sc left red wc"],
  ["DR Congo", "F", "p50 p100 big sc red star fr"],
  ["Madagascar", "F", "isl sc red fr"],
  ["Zimbabwe", "F", "ll sc left red star"],

  ["United States", "N", "p50 p100 big red star oly wc g7"],
  ["Canada", "N", "big mon red fr oly wc g7"],
  ["Mexico", "N", "p50 p100 big red es oly wc"],
  ["Cuba", "N", "isl red star es"],
  ["Jamaica", "N", "isl left mon"],
  ["Guatemala", "N", "es"],
  ["Panama", "N", "red star es"],
  ["Haiti", "N", "isl red fr"],

  ["Brazil", "S", "p50 p100 big sc star oly wc"],
  ["Argentina", "S", "big sc es wc"],
  ["Chile", "S", "sc red star es wc"],
  ["Peru", "S", "big sc red es"],
  ["Colombia", "S", "p50 big red es"],
  ["Venezuela", "S", "red star es"],
  ["Ecuador", "S", "sc red es"],
  ["Paraguay", "S", "ll sc red star es"],
  ["Uruguay", "S", "sc es wc"],

  ["Australia", "O", "big sc left mon red star oly"],
  ["New Zealand", "O", "isl sc left mon red star"],
  ["Fiji", "O", "isl sc left red"],
  ["Papua New Guinea", "O", "isl sc left mon red star"]
].map(([name, region, tags]) => ({ name, region, tags: new Set(tags.split(" ").filter(Boolean)) }));

/* Releases: how many countries each content drop added, in order.
   To add countries later, append them to the END of the list above and add their count here,
   e.g. [78, 40]. Earlier puzzles stay exactly as they were. */
const WHITTLE_RELEASES = [78];

const inList = (names) => { const s = new Set(names); return (c) => s.has(c.name); };

const WHITTLE_QUESTIONS = [
  { id: "europe", q: "Is it in Europe?", test: (c) => c.region === "E" },
  { id: "asia", q: "Is it in Asia?", test: (c) => c.region === "A" },
  { id: "africa", q: "Is it in Africa?", test: (c) => c.region === "F" },
  { id: "americas", q: "Is it in the Americas?", test: (c) => c.region === "N" || c.region === "S" },
  { id: "southam", q: "Is it in South America?", test: (c) => c.region === "S" },
  { id: "oceania", q: "Is it in Oceania?", test: (c) => c.region === "O" },
  { id: "ll", q: "Is it landlocked?", test: (c) => c.tags.has("ll") },
  { id: "isl", q: "Is it made up entirely of islands?", test: (c) => c.tags.has("isl") },
  { id: "p50", q: "Is its population over 50 million?", test: (c) => c.tags.has("p50") },
  { id: "p100", q: "Is its population over 100 million?", test: (c) => c.tags.has("p100") },
  { id: "big", q: "Is it larger than 1 million km²?", test: (c) => c.tags.has("big") },
  { id: "sc", q: "Is its capital south of the equator?", test: (c) => c.tags.has("sc") },
  { id: "eur", q: "Does it use the euro?", test: (c) => c.tags.has("eur") },
  { id: "eu", q: "Is it in the European Union?", test: (c) => c.tags.has("eu") },
  { id: "left", q: "Do people drive on the left?", test: (c) => c.tags.has("left") },
  { id: "mon", q: "Is its head of state a monarch?", test: (c) => c.tags.has("mon") },
  { id: "med", q: "Does it have a Mediterranean coast?", test: (c) => c.tags.has("med") },
  { id: "red", q: "Does its flag contain red?", test: (c) => c.tags.has("red") },
  { id: "star", q: "Does its flag have a star?", test: (c) => c.tags.has("star") },
  { id: "es", q: "Is Spanish an official language?", test: (c) => c.tags.has("es") },
  { id: "ar", q: "Is Arabic an official language?", test: (c) => c.tags.has("ar") },
  { id: "fr", q: "Is French an official language?", test: (c) => c.tags.has("fr") },
  { id: "oly", q: "Has it hosted the Summer Olympics?", test: (c) => c.tags.has("oly") },
  { id: "wc", q: "Has it hosted the men's World Cup?", test: (c) => c.tags.has("wc") },
  { id: "g7", q: "Is it a G7 member?", test: (c) => c.tags.has("g7") },
  { id: "unsc", q: "Is it a permanent UN Security Council member?", test: inList(["United States", "United Kingdom", "France", "China"]) },
  { id: "cw", q: "Is it in the Commonwealth?", test: inList(["United Kingdom", "India", "Pakistan", "Bangladesh", "Malaysia", "Singapore", "Nigeria", "Ghana", "Kenya", "Tanzania", "South Africa", "Canada", "Jamaica", "Australia", "New Zealand", "Fiji", "Papua New Guinea"]) },
  { id: "land", q: "Does it share a land border with another country?", test: (c) => !["Iceland", "Japan", "Philippines", "Singapore", "Madagascar", "Cuba", "Jamaica", "New Zealand", "Fiji", "Australia"].includes(c.name) },
  { id: "equator", q: "Does the equator pass through it?", test: inList(["Ecuador", "Colombia", "Brazil", "Kenya", "DR Congo", "Indonesia"]) },
  { id: "bger", q: "Does it border Germany?", test: inList(["Denmark", "Poland", "Czechia", "Austria", "Switzerland", "France", "Belgium", "Netherlands"]) },
  { id: "bchn", q: "Does it border China?", test: inList(["India", "Pakistan", "Nepal", "Vietnam", "Mongolia"]) },
  { id: "biran", q: "Does it border Iran?", test: inList(["Iraq", "Pakistan"]) },
  { id: "bbra", q: "Does it border Brazil?", test: inList(["Argentina", "Uruguay", "Paraguay", "Colombia", "Venezuela", "Peru"]) },
  { id: "baltic", q: "Does it have a Baltic Sea coast?", test: inList(["Poland", "Germany", "Denmark", "Sweden", "Finland"]) }
];

/* Plain-language notes for the result screen, built from the same tags. */
const WHITTLE_NOTES = {
  ll: "Landlocked", isl: "All islands", p100: "Over 100 million people", big: "Over 1 million km²",
  sc: "Capital south of the equator", eur: "Uses the euro", left: "Drives on the left", mon: "Has a monarch",
  med: "Mediterranean coast", star: "Star on the flag", oly: "Hosted the Summer Olympics",
  wc: "Hosted the World Cup", g7: "G7 member"
};

if (typeof module !== "undefined") module.exports = { WHITTLE_COUNTRIES, WHITTLE_QUESTIONS, WHITTLE_NOTES, WHITTLE_RELEASES };
else Object.assign(window, { WHITTLE_COUNTRIES, WHITTLE_QUESTIONS, WHITTLE_NOTES, WHITTLE_RELEASES });
