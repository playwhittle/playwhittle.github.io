# Whittle

A daily game of 20 Questions. Every day there's one hidden animal. Ask yes/no questions in your own words, watch the woodcarver get to work as you get closer, and name the animal in as few questions as you can. Solve it at or under par to earn the day's carving for your shelf.

Play it at https://playwhittle.github.io

## How it runs

There is no server. The site is four static files:

- `index.html`: the page and its styles
- `data.js`: the animals, their answers, the question bank, and group names like "lizard" or "bear"
- `engine.js`: picks today's animal and par from the date, answers questions, and understands typed questions
- `game.js`: the screens, the woodcarver, saving progress, sharing, and the shelf

Each player's browser works out the puzzle number from their own date, so a new animal appears at their local midnight with no updates from you. Progress and carvings are saved in the player's browser.

## How typed questions are answered

There is no AI running while people play. Every question in the bank has its answer worked out ahead of time for every animal. When a player types a question, the game matches it to the closest question in the bank, forgiving small typos. If nothing matches well, it says it can't answer and suggests other wordings. The log always shows the exact question that was answered.

## Adding content

- Each animal is one line in `data.js`. A tag means "yes", `~tag` means "sometimes", and no tag means "no".
- Answers never repeat until every animal has been used once. With 78 animals, that's 78 days.
- To add a question, add a line to the question bank with the wording, how to answer it, and a few ways players might phrase it.
- Every fact should be checked before launch. One wrong answer makes a player feel cheated.
- Keep answers to animals most people would recognize by name.
- `LAUNCH` in `engine.js` sets which date is Whittle #1. Don't change it after launch.

## Testing tip

Open the page with `#dev` at the end of the address to show a "Reset today" button.
