# Whittle

A daily guessing game. One hidden country sits on a board of 64. Play yes/no question cards to carve the board down to one, in as few questions as you can.

## How it runs

There is no server. The site is four static files:

- `index.html`: the page and its styles
- `data.js`: the countries, their facts, and the question cards
- `engine.js`: picks today's answer, board, card order and par from the date
- `game.js`: the screens, saving progress, sharing, and the shelf

Each player's browser works out the puzzle number from their own date, so a new puzzle appears at their local midnight with no updates from you. Progress and carvings are saved in the player's browser.

## Publish on GitHub Pages

1. Create a new repository (for example `whittle`) and upload these files to it.
2. In the repository, open Settings, then Pages.
3. Under "Build and deployment", choose "Deploy from a branch", pick `main` and `/ (root)`, and save.
4. The game appears at `https://<your-username>.github.io/whittle/` within a minute or two.

## Adding content

- The answer list has 78 countries, so answers are unique for the first 78 days. Before then, add new countries to the END of the list in `data.js` and add their count to `WHITTLE_RELEASES` (for example `[78, 40]`). Earlier puzzles stay exactly the same. Never remove or reorder countries after launch.
- Finished days are saved as summaries in each player's browser, so content updates never change a carving someone already earned.
- Every fact in `data.js` should be checked before launch. One wrong "yes" makes a player feel cheated.
- `LAUNCH` in `engine.js` sets which date is Whittle #1.

## Testing tip

Open the page with `#dev` at the end of the address to show a "Reset today" button.
