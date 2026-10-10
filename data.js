/* Whittle: Animals. The animal pool and the bank of yes/no questions.
   Each animal: [name, class, tags, aliases]
   A tag means "yes"; "~tag" means "sometimes" (it varies by species, sex, age or situation); no tag means "no".
   "world" = found on every inhabited continent (Africa, Asia, Australia, Europe, North and South America).
   Spot-check these before launch: one wrong answer makes a player feel cheated. */

const WHITTLE_ANIMALS_RAW = [
  // Mammals
  ["Dog", "mammal", "land pet fur l4 tail meat plants ~groups fast swim ~danger ~small ~spots ~bw world dogfam", "dog puppy hound"],
  ["Cat", "mammal", "land pet fur l4 tail meat ~nocturnal climb fast ~swim ~stripes ~spots ~bw world catfam", "cat kitten|house cat"],
  ["Horse", "mammal", "land farm ~pet fur l4 tail hooves plants big fast groups ~swim ~spots ~bw world", "horse pony"],
  ["Cow", "mammal", "land farm fur l4 tail hooves ~horns plants big groups ~spots ~bw ~swim world", "cow cattle bull"],
  ["Pig", "mammal", "land farm ~pet fur l4 tail hooves meat plants ~big ~groups swim ~spots world", "pig hog boar|piglet"],
  ["Sheep", "mammal", "land farm fur l4 tail hooves ~horns plants groups ~bw ~swim world", "sheep lamb ram"],
  ["Goat", "mammal", "land farm ~pet fur l4 tail hooves horns plants groups climb ~spots ~bw world", "goat"],
  ["Rabbit", "mammal", "land pet ~farm fur l4 tail burrow plants hop fast ~groups ~small ~nocturnal ~spots world", "rabbit bunny hare"],
  ["Mouse", "mammal", "land ~pet fur l4 tail ~burrow meat plants tiny small nocturnal climb rodent ~groups world", "mouse mice"],
  ["Hamster", "mammal", "land pet fur l4 ~tail burrow meat plants tiny small nocturnal rodent world", "hamster"],
  ["Lion", "mammal", "land fur l4 tail meat catfam groups big fast danger af ~as ~nocturnal ~swim ~endangered", "lion lioness"],
  ["Tiger", "mammal", "land fur l4 tail stripes meat catfam big fast danger as ~rainforest swim endangered ~nocturnal", "tiger"],
  ["Cheetah", "mammal", "land fur l4 tail spots meat catfam fast af ~as ~endangered ~desert", "cheetah"],
  ["Elephant", "mammal", "land ~fur l4 tail tusks trunk plants big groups af as endangered swim ~danger", "elephant"],
  ["Giraffe", "mammal", "land fur l4 tail longneck spots hooves ~horns plants big fast groups af ~endangered", "giraffe"],
  ["Zebra", "mammal", "land fur l4 tail stripes bw hooves plants big fast groups af", "zebra"],
  ["Hippo", "mammal", "~water ~fresh ~land l4 tail ~hooves plants big danger groups af ~endangered ~swim ~nocturnal", "hippo hippopotamus"],
  ["Rhino", "mammal", "land l4 tail horns ~hooves plants big ~danger af as endangered", "rhino rhinoceros"],
  ["Gorilla", "mammal", "land fur l2 plants ~meat big groups primate rainforest af endangered climb", "gorilla"],
  ["Chimpanzee", "mammal", "land fur l2 meat plants primate rainforest af endangered climb groups ~danger", "chimpanzee chimp"],
  ["Monkey", "mammal", "land trees fur l2 tail ~meat plants primate rainforest climb groups ~small af as sa ~na", "monkey"],
  ["Kangaroo", "mammal", "land fur ~l4 ~l2 tail pouch hop plants groups au fast ~big", "kangaroo wallaby"],
  ["Koala", "mammal", "land trees fur l4 pouch plants au ~nocturnal climb", "koala|koala bear"],
  ["Panda", "mammal", "land fur bw bearfam l4 ~tail plants ~meat as ~endangered climb ~big", "panda|giant panda"],
  ["Polar bear", "mammal", "land ~water ~ocean fur l4 ~tail meat bearfam polar big danger swim na ~eu ~as ~endangered", "|polar bear|white bear"],
  ["Brown bear", "mammal", "land fur l4 ~tail meat plants bearfam big danger hibernate swim fast ~climb na eu as", "grizzly|brown bear|grizzly bear"],
  ["Wolf", "mammal", "land fur l4 tail meat dogfam groups fast ~danger ~nocturnal swim ~polar na eu as", "wolf wolves"],
  ["Fox", "mammal", "land fur l4 tail meat plants dogfam ~nocturnal burrow fast ~small world", "fox"],
  ["Deer", "mammal", "land fur l4 tail hooves ~horns plants fast groups ~spots eu as na sa ~af swim", "deer stag fawn"],
  ["Moose", "mammal", "land fur l4 ~tail hooves ~horns plants big swim polar ~danger na eu as", "moose elk"],
  ["Camel", "mammal", "land fur l4 tail hooves hump plants big desert af as au ~farm groups", "camel dromedary"],
  ["Bat", "mammal", "land fur l2 wings fly ~tail ~meat ~plants nocturnal groups ~hibernate small ~tiny world ~trees", "bat"],
  ["Squirrel", "mammal", "land trees fur l4 tail plants ~meat small rodent ~hibernate climb ~hop eu as na af sa", "squirrel chipmunk"],
  ["Hedgehog", "mammal", "land ~fur l4 ~tail meat ~plants nocturnal hibernate small eu af as ~pet ~na", "hedgehog"],
  ["Sloth", "mammal", "land trees fur l4 ~tail plants climb sa ~na rainforest swim ~nocturnal ~endangered", "sloth"],
  ["Raccoon", "mammal", "land ~trees fur l4 tail ~stripes ~bw meat plants nocturnal climb na ~eu ~as swim", "raccoon racoon"],
  ["Dolphin", "mammal", "water ocean ~fresh swim tail meat groups fast ~big world", "dolphin porpoise"],
  ["Whale", "mammal", "water ocean swim tail meat big ~groups ~endangered ~polar world", "whale|blue whale|humpback whale|humpback"],
  ["Seal", "mammal", "water ocean ~land swim fur ~tail meat groups ~polar ~big world", "seal|sea lion|walrus"],
  ["Otter", "mammal", "~water ~fresh ~ocean ~land swim fur l4 tail meat ~groups eu as na sa af", "otter|sea otter"],
  // Birds
  ["Penguin", "bird", "water ocean ~land swim feathers wings l2 ~tail beak meat groups ~polar bw af sa au", "penguin"],
  ["Eagle", "bird", "land fly feathers wings l2 tail beak meat raptor world", "eagle|bald eagle"],
  ["Owl", "bird", "land fly feathers wings l2 tail beak meat raptor nocturnal ~trees world", "owl"],
  ["Parrot", "bird", "land trees fly feathers wings l2 tail beak plants ~meat bright pet rainforest groups climb af as au sa na", "parrot macaw parakeet cockatoo budgie"],
  ["Flamingo", "bird", "~water ~fresh ~ocean ~land fly feathers wings l2 longneck tail beak meat plants bright groups af as eu na sa", "flamingo"],
  ["Ostrich", "bird", "land feathers wings l2 longneck tail beak plants ~meat big fast af ~groups ~danger ~desert", "ostrich emu"],
  ["Peacock", "bird", "land fly feathers wings l2 tail beak bright ~spots meat plants as", "peacock peafowl peahen"],
  ["Hummingbird", "bird", "land fly feathers wings l2 tail beak tiny small bright plants ~meat na sa fast", "hummingbird|humming bird"],
  ["Chicken", "bird", "land farm ~fly feathers wings l2 tail beak meat plants groups world", "chicken hen rooster chick"],
  ["Duck", "bird", "~water ~fresh ~land fly swim feathers wings l2 tail beak meat plants groups ~farm world", "duck duckling mallard"],
  ["Crow", "bird", "land fly feathers wings l2 tail beak meat plants groups world", "crow raven"],
  // Reptiles and amphibians
  ["Snake", "reptile", "land scales tail meat ~venom ~eggs ~danger ~swim ~trees ~burrow ~desert ~rainforest world", "snake python cobra serpent viper"],
  ["Crocodile", "reptile", "~water ~fresh ~ocean ~land scales l4 tail meat big danger eggs swim af as au na sa", "crocodile croc alligator"],
  ["Sea turtle", "reptile", "water ocean shell ~scales ~l4 swim eggs endangered ~tail ~meat ~plants world", "|sea turtle"],
  ["Tortoise", "reptile", "land shell scales l4 ~tail plants eggs ~pet ~desert ~hibernate ~endangered af as eu na sa", "tortoise"],
  ["Chameleon", "reptile", "land trees scales l4 tail climb meat ~bright small ~eggs af ~as ~eu ~pet ~rainforest", "chameleon"],
  ["Lizard", "reptile", "land scales l4 tail meat ~plants eggs small ~desert climb ~pet world", "lizard gecko iguana"],
  ["Komodo dragon", "reptile", "land scales l4 tail meat big danger venom eggs as endangered", "komodo|komodo dragon"],
  ["Frog", "amphibian", "~water ~fresh ~land swim l4 hop meat eggs small ~tiny ~bright ~venom ~rainforest world", "frog toad tadpole"],
  // Fish
  ["Shark", "fish", "water ocean swim scales tail meat ~danger ~big ~eggs ~fast world", "shark|great white|great white shark"],
  ["Goldfish", "fish", "water fresh swim scales tail pet tiny small plants meat eggs bright world", "goldfish|gold fish"],
  ["Salmon", "fish", "water ocean fresh swim scales tail meat eggs groups na eu as", "salmon"],
  ["Clownfish", "fish", "water ocean swim scales tail stripes bright tiny small meat plants eggs as au ~af ~pet", "clownfish nemo|clown fish"],
  // Invertebrates
  ["Octopus", "mollusc", "water ocean swim tentacles meat eggs ~nocturnal ~bright venom ~danger ~small world", "octopus octopi"],
  ["Jellyfish", "other", "water ocean swim tentacles meat venom ~danger ~groups ~bright ~eggs world", "jellyfish|jelly fish|jelly"],
  ["Starfish", "other", "water ocean tentacles meat eggs ~bright world", "starfish|sea star|star fish"],
  ["Crab", "crustacean", "~water ocean ~fresh ~land shell lmany meat plants eggs ~swim world", "crab"],
  ["Lobster", "crustacean", "water ocean shell lmany meat ~plants eggs ~swim world", "lobster crayfish"],
  ["Shrimp", "crustacean", "water ocean ~fresh swim ~shell lmany meat plants tiny small groups eggs world", "shrimp prawn krill"],
  ["Snail", "mollusc", "land ~water shell plants ~meat tiny small eggs ~pet world", "snail slug"],
  ["Bee", "insect", "land fly wings lmany venom groups eggs plants tiny small ~bright stripes ~farm ~danger world", "bee honeybee bumblebee|honey bee|bumble bee"],
  ["Butterfly", "insect", "land fly wings lmany plants eggs tiny small bright world", "butterfly caterpillar"],
  ["Ant", "insect", "land burrow lmany ~wings ~fly groups meat plants eggs tiny small ~venom world", "ant ants"],
  ["Ladybug", "insect", "land fly wings lmany spots bright meat eggs tiny small world", "ladybug ladybird|lady bug"],
  ["Spider", "arachnid", "land lmany meat venom eggs tiny small ~danger ~nocturnal ~fur ~trees climb world", "spider tarantula"],
  ["Scorpion", "arachnid", "land lmany tail meat venom ~danger nocturnal ~desert small af as au eu na sa", "scorpion"],
  ["Mosquito", "insect", "land ~water fly wings lmany ~meat plants eggs tiny small ~danger ~groups ~nocturnal world", "mosquito"],
  ["Earthworm", "other", "land burrow plants eggs tiny small world", "earthworm worm"]
];

const WORLD = ["af", "as", "au", "eu", "na", "sa"];
const VERTEBRATES = ["mammal", "bird", "fish", "reptile", "amphibian"];

const WHITTLE_ANIMALS = WHITTLE_ANIMALS_RAW.map(([name, cls, tagStr, aliasStr]) => {
  const tags = {};
  tagStr.split(/\s+/).filter(Boolean).forEach((t) => {
    const val = t[0] === "~" ? "S" : "Y";
    const key = t.replace(/^~/, "");
    if (key === "world") WORLD.forEach((c) => { tags[c] = val; });
    else tags[key] = val;
  });
  if (cls === "bird") { tags.eggs = tags.eggs || "Y"; }
  // "a b c|two words|more words": single words before the first bar, whole phrases after it
  const aliases = aliasStr.split("|").flatMap((part, i) => (i === 0 ? part.split(" ") : [part]));
  return { name, cls, tags, aliases: aliases.filter(Boolean).map((a) => a.toLowerCase()) };
});

/* ---------- the question bank ---------- */
const t = (key) => (a) => a.tags[key] || "N";
const yn = (b) => (b ? "Y" : "N");
const isCls = (...c) => (a) => yn(c.includes(a.cls));
const anyOf = (...keys) => (a) => {
  const v = keys.map((k) => a.tags[k] || "N");
  return v.includes("Y") ? "Y" : v.includes("S") ? "S" : "N";
};
const not = (fn) => (a) => ({ Y: "N", N: "Y", S: "S" }[fn(a)]);
const carnivore = (a) => {
  const m = a.tags.meat || "N", p = a.tags.plants || "N";
  if (m === "N" || p === "Y") return "N";
  return m === "S" || p === "S" ? "S" : "Y";
};
const herbivore = (a) => {
  const m = a.tags.meat || "N", p = a.tags.plants || "N";
  if (p === "N" || m === "Y") return "N";
  return m === "S" || p === "S" ? "S" : "Y";
};
const omnivore = (a) => {
  const m = a.tags.meat || "N", p = a.tags.plants || "N";
  if (m === "N" || p === "N") return "N";
  return m === "Y" && p === "Y" ? "Y" : "S";
};

/* Each question: id, the wording shown to the player, how to answer it, and phrasings players might type. */
const WHITTLE_QUESTIONS = [
  ["mammal", "Is it a mammal?", isCls("mammal"), ["mammal"]],
  ["bird", "Is it a bird?", isCls("bird"), ["bird"]],
  ["fish", "Is it a fish?", isCls("fish"), ["fish"]],
  ["reptile", "Is it a reptile?", isCls("reptile"), ["reptile"]],
  ["amphibian", "Is it an amphibian?", isCls("amphibian"), ["amphibian"]],
  ["insect", "Is it an insect?", isCls("insect"), ["insect", "bug"]],
  ["arachnid", "Is it an arachnid (like a spider or scorpion)?", isCls("arachnid"), ["arachnid"]],
  ["crustacean", "Is it a crustacean (like a crab or lobster)?", isCls("crustacean"), ["crustacean"]],
  ["mollusc", "Is it a mollusc (like a snail or octopus)?", isCls("mollusc"), ["mollusc", "mollusk"]],
  ["vertebrate", "Is it a vertebrate (does it have a backbone)?", (a) => yn(VERTEBRATES.includes(a.cls)), ["vertebrate", "backbone", "spine"]],
  ["invertebrate", "Is it an invertebrate (no backbone)?", (a) => yn(!VERTEBRATES.includes(a.cls)), ["invertebrate", "no backbone"]],
  ["warm", "Is it warm-blooded?", isCls("mammal", "bird"), ["warm blooded", "warm blood", "warmblooded"]],
  ["cold", "Is it cold-blooded?", (a) => yn(!["mammal", "bird"].includes(a.cls)), ["cold blooded", "cold blood", "coldblooded"]],

  ["water", "Does it live in water?", t("water"), ["water", "live water", "aquatic"]],
  ["ocean", "Does it live in the ocean?", t("ocean"), ["ocean", "sea", "saltwater", "salt water", "marine"]],
  ["fresh", "Does it live in fresh water, like rivers or lakes?", t("fresh"), ["fresh water", "freshwater", "river", "lake", "pond", "swamp"]],
  ["land", "Does it live on land?", t("land"), ["land", "live land", "ground"]],
  ["trees", "Does it live in trees?", t("trees"), ["tree", "live tree", "forest"]],
  ["burrow", "Does it live underground or in burrows?", t("burrow"), ["underground", "burrow", "dig", "hole", "tunnel"]],
  ["fly", "Can it fly?", t("fly"), ["fly", "flying", "fly air"]],
  ["swim", "Can it swim?", t("swim"), ["swim", "swimming"]],
  ["climb", "Can it climb?", t("climb"), ["climb", "climbing"]],
  ["hop", "Does it hop or jump?", t("hop"), ["hop", "jump", "hopping", "jumping", "leap"]],
  ["fast", "Can it move faster than a person can run?", t("fast"), ["fast", "faster than human", "quick", "speed", "run fast", "faster"]],

  ["af", "Is it found in Africa?", t("af"), ["africa", "african"]],
  ["as", "Is it found in Asia?", t("as"), ["asia", "asian", "china", "india", "japan"]],
  ["au", "Is it found in Australia?", t("au"), ["australia", "australian", "oceania"]],
  ["eu", "Is it found in Europe?", t("eu"), ["europe", "european"]],
  ["na", "Is it found in North America?", t("na"), ["north america", "america", "usa", "united states", "canada", "mexico"]],
  ["sa", "Is it found in South America?", t("sa"), ["south america", "brazil", "amazon"]],
  ["polar", "Does it live in cold, icy places?", t("polar"), ["cold", "cold place", "ice", "icy", "snow", "arctic", "antarctic", "antarctica", "polar", "north pole", "south pole"]],
  ["desert", "Does it live in deserts?", t("desert"), ["desert", "hot dry"]],
  ["rainforest", "Does it live in rainforests or jungles?", t("rainforest"), ["rainforest", "jungle", "rain forest", "tropical"]],

  ["pet", "Is it commonly kept as a pet?", t("pet"), ["pet", "keep pet", "house pet"]],
  ["farm", "Is it a farm animal?", t("farm"), ["farm", "farm animal", "livestock", "farmer"]],
  ["domestic", "Is it domesticated (a pet or farm animal)?", anyOf("pet", "farm"), ["domesticated", "domestic", "tame"]],
  ["extinct", "Is it extinct?", () => "N", ["extinct", "dinosaur", "prehistoric"]],

  ["fur", "Does it have fur or hair?", t("fur"), ["fur", "hair", "furry", "hairy", "fluffy", "wool"]],
  ["feathers", "Does it have feathers?", t("feathers"), ["feather", "feathered"]],
  ["scales", "Does it have scales?", t("scales"), ["scale", "scaly"]],
  ["shell", "Does it have a shell?", t("shell"), ["shell"]],
  ["wings", "Does it have wings?", t("wings"), ["wing"]],
  ["tail", "Does it have a tail?", t("tail"), ["tail"]],
  ["legs", "Does it have legs?", anyOf("l2", "l4", "lmany"), ["leg", "have leg"]],
  ["l4", "Does it have four legs?", t("l4"), ["four leg", "4 leg"]],
  ["l2", "Does it walk on two legs?", t("l2"), ["two leg", "2 leg", "walk two leg", "biped"]],
  ["lmany", "Does it have more than four legs?", t("lmany"), ["more than four leg", "more than 4 leg", "many leg", "lot leg"]],
  ["six", "Does it have six legs?", isCls("insect"), ["six leg", "6 leg"]],
  ["eight", "Does it have eight legs?", isCls("arachnid"), ["eight leg", "8 leg"]],
  ["tentacles", "Does it have tentacles or arms (instead of legs)?", t("tentacles"), ["tentacle", "arm"]],
  ["horns", "Does it have horns or antlers?", t("horns"), ["horn", "antler"]],
  ["hooves", "Does it have hooves?", t("hooves"), ["hoof", "hooves", "hoove"]],
  ["beak", "Does it have a beak?", t("beak"), ["beak", "bill"]],
  ["tusks", "Does it have tusks?", t("tusks"), ["tusk", "ivory"]],
  ["trunk", "Does it have a trunk?", t("trunk"), ["trunk"]],
  ["hump", "Does it have a hump?", t("hump"), ["hump"]],
  ["pouch", "Does it have a pouch (is it a marsupial)?", t("pouch"), ["pouch", "marsupial"]],
  ["longneck", "Does it have a long neck?", t("longneck"), ["long neck", "neck"]],
  ["stripes", "Does it have stripes?", t("stripes"), ["stripe", "striped", "stripy"]],
  ["spots", "Does it have spots?", t("spots"), ["spot", "spotted", "spotty"]],
  ["bw", "Is it black and white?", t("bw"), ["black white", "black and white"]],
  ["bright", "Is it brightly colored?", t("bright"), ["bright", "colorful", "colourful", "brightly colored", "bright color", "colored", "rainbow"]],

  ["big", "Is it bigger than a human?", t("big"), ["big", "large", "huge", "bigger than human", "bigger than person", "giant", "heavy"]],
  ["small", "Is it smaller than a cat?", t("small"), ["small", "little", "smaller than cat", "tiny"]],
  ["tiny", "Could it fit in your hand?", t("tiny"), ["fit hand", "fit in hand", "hand", "palm", "fit pocket"]],

  ["meat", "Does it eat meat?", t("meat"), ["meat", "eat meat", "eat other animal", "predator", "hunt", "prey"]],
  ["plants", "Does it eat plants?", t("plants"), ["plant", "eat plant", "grass", "leaves", "vegetable", "fruit", "vegetarian"]],
  ["carnivore", "Is it a carnivore (does it only eat meat)?", carnivore, ["carnivore", "only eat meat", "carnivorous"]],
  ["herbivore", "Is it a herbivore (does it only eat plants)?", herbivore, ["herbivore", "only eat plant", "herbivorous", "vegan"]],
  ["omnivore", "Is it an omnivore (does it eat both plants and meat)?", omnivore, ["omnivore", "eat both", "eat everything", "omnivorous"]],
  ["venom", "Is it venomous or poisonous?", t("venom"), ["venomous", "venom", "poisonous", "poison", "sting", "toxic"]],
  ["danger", "Is it dangerous to humans?", t("danger"), ["dangerous", "danger", "kill human", "attack human", "deadly", "scary", "harmful"]],
  ["nocturnal", "Is it nocturnal (active at night)?", t("nocturnal"), ["nocturnal", "night", "active night"]],
  ["eggs", "Does it lay eggs?", t("eggs"), ["egg", "lay egg"]],
  ["groups", "Does it live in groups, herds or packs?", t("groups"), ["group", "herd", "pack", "flock", "colony", "swarm", "school", "social", "alone"]],
  ["hibernate", "Does it hibernate?", t("hibernate"), ["hibernate", "hibernation", "sleep winter"]],
  ["endangered", "Is it endangered?", t("endangered"), ["endangered", "rare", "threatened"]],

  ["catfam", "Is it a type of cat (like a lion or tiger)?", t("catfam"), ["cat", "feline", "big cat", "cat family"]],
  ["dogfam", "Is it in the dog family (like a wolf or fox)?", t("dogfam"), ["dog", "canine", "dog family"]],
  ["bearfam", "Is it a type of bear?", t("bearfam"), ["bear", "bear family"]],
  ["primate", "Is it a primate (a monkey or ape)?", t("primate"), ["primate", "monkey", "ape"]],
  ["rodent", "Is it a rodent?", t("rodent"), ["rodent"]],
  ["raptor", "Is it a bird of prey?", t("raptor"), ["bird prey", "bird of prey", "raptor"]]
].map(([id, q, answer, aliases]) => ({ id, q, answer, aliases }));

const WHITTLE_TAG_NOTES = {
  water: "Lives in water", fly: "Can fly", venom: "Venomous", nocturnal: "Active at night", endangered: "Endangered",
  pet: "Kept as a pet", farm: "Farm animal", groups: "Lives in groups", hibernate: "Hibernates", fast: "Faster than you",
  danger: "Dangerous", eggs: "Lays eggs", pouch: "Has a pouch", polar: "Lives in the cold", rainforest: "Rainforest dweller"
};
/* Broader names a player might guess. Guessing a group the answer belongs to is "close", not wrong:
   it counts as a question and narrows things down. If the group's own name is also an animal in the
   pool (like Lizard), guessing it when that is the answer is simply correct. */
const WHITTLE_GROUPS = {
  lizard: ["Lizard", "Chameleon", "Komodo dragon"],
  bear: ["Brown bear", "Polar bear", "Panda"],
  ape: ["Gorilla", "Chimpanzee"],
  "big cat": ["Lion", "Tiger", "Cheetah"],
  turtle: ["Sea turtle", "Tortoise"],
  primate: ["Gorilla", "Chimpanzee", "Monkey"],
  "bird of prey": ["Eagle", "Owl"],
  rodent: ["Mouse", "Hamster", "Squirrel"],
  marsupial: ["Kangaroo", "Koala"],
  crustacean: ["Crab", "Lobster", "Shrimp"],
  insect: ["Bee", "Butterfly", "Ant", "Ladybug", "Mosquito"],
  dragon: ["Komodo dragon"]
};

const WHITTLE_CLASS_NAMES = {
  mammal: "Mammal", bird: "Bird", fish: "Fish", reptile: "Reptile", amphibian: "Amphibian", insect: "Insect",
  arachnid: "Arachnid", crustacean: "Crustacean", mollusc: "Mollusc", other: "Invertebrate"
};

if (typeof module !== "undefined") module.exports = { WHITTLE_ANIMALS, WHITTLE_QUESTIONS, WHITTLE_TAG_NOTES, WHITTLE_CLASS_NAMES, WHITTLE_GROUPS };
else Object.assign(window, { WHITTLE_ANIMALS, WHITTLE_QUESTIONS, WHITTLE_TAG_NOTES, WHITTLE_CLASS_NAMES, WHITTLE_GROUPS });
