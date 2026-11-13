# Sudoku — Flask and GitHub Copilot project

A browser-based Sudoku game built on a small Flask backend. The project began as a Udacity GitHub Copilot exercise and has been extended with puzzle generation, gameplay validation, hints, timing, completion tracking, and a browser-local leaderboard.

## Features

- Easy, Medium, and Hard puzzles with 40–45, 32–39, and 25–31 starting clues, respectively.
- Randomized backtracking solution generation and clue removal that retains puzzles with exactly one solution.
- Responsive 9×9 board with separated, alternating 3×3 regions and locked starting clues.
- Keyboard navigation, digit-only entry, and live row, column, and box conflict feedback.
- Server-checked answers and one-cell hints; the complete solution is not sent to the browser.
- Game timer and verified completion summary with difficulty, elapsed time, and hints used.
- Light/dark theme preference and a Top 10 fastest-times leaderboard saved in browser `localStorage`.
- Accessible labels and status feedback, with responsive desktop and mobile layouts.

## Requirements

- Python 3
- Flask (installed from `starter/requirements.txt`)
- Node.js with the built-in `node:test` runner (Node.js 18 or newer)
- A modern web browser

## Technology

- Python 3 and Flask
- HTML, CSS, and vanilla JavaScript
- pytest for Python tests
- Node.js built-in `node:test` for frontend-module tests (no additional JavaScript test dependencies)

## Install and run

From the repository root, open PowerShell and run:

```powershell
cd starter
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python app.py
```

Open [http://127.0.0.1:5555](http://127.0.0.1:5555). Flask listens on port **5555**.

## How to play

1. Choose Easy, Medium, or Hard, then select **New game**.
2. Fill open cells with digits 1–9. The original clues and revealed hints are locked.
3. Use the arrow keys to move between cells. Conflicting entries are highlighted as you play.
4. Select **Check** to mark entries that do not match the solution, or **Hint** to reveal and lock one correct cell.
5. Solve the complete board to stop the timer and see the completion message. Enter a name if prompted to submit the result to the Top 10 leaderboard saved in this browser.
6. Use the theme button to switch between light and dark modes.

## Tests

Run both test suites from the repository root in PowerShell:

```powershell
python -m pytest -v
node --test starter/frontend-tests/*.test.js
```

The root `pytest.ini` configures collection and the `starter` import path, so the Python command works from the repository root. If you prefer to run both suites from `starter`, use:

```powershell
cd starter
python -m pytest -v
node --test frontend-tests/*.test.js
```

The Python tests cover puzzle validity and uniqueness, difficulty ranges, and Flask routes and payload validation. The JavaScript tests cover timer behavior, completion state, leaderboard sorting/limits/persistence/corrupt data/duplicate prevention, theme persistence, and new-game state reset.

## Project structure

```text
.
├── .github/
│   └── copilot-instructions.md
├── Screenshots/
├── README.md
└── starter/
    ├── app.py
    ├── sudoku_logic.py
    ├── requirements.txt
    ├── requirements-dev.txt
    ├── pytest.ini
    ├── templates/
    │   └── index.html
    ├── static/
    │   ├── game-completion.js
    │   ├── game-timer.js
    │   ├── leaderboard.js
    │   ├── main.js
    │   ├── styles.css
    │   └── theme.js
    ├── tests/
    └── frontend-tests/
```

## GitHub Copilot usage

This project was developed incrementally with GitHub Copilot as part of the Udacity exercise. The work included repository-specific guidance in `.github/copilot-instructions.md`, test-first baseline coverage, and feature-focused implementation and verification for the milestones listed above. Screenshots in `Screenshots/` are retained as project evidence; they are not a substitute for running the tests or manually verifying the browser experience.
