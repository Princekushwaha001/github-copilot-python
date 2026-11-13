# GitHub Copilot Instructions — Flask Sudoku Project

## Project Context

This repository contains a Flask-based Sudoku web application refactored from legacy Python code for the Udacity "Refactoring Legacy Code with Copilot" project.

The application uses:
- Python and Flask for backend routes and game state
- HTML, CSS, and JavaScript for the frontend
- pytest for Python testing
- Node.js built-in test runner for JavaScript testing
- Browser localStorage for leaderboard and theme preferences

## Code Style and Architecture

- Follow PEP 8 conventions for Python.
- Use descriptive names for functions and variables.
- Keep game logic separate from Flask routes.
- Prefer small, reusable functions and modules.
- Avoid unnecessary changes to existing working code.
- Preserve existing API contracts.
- Use clear error messages and consistent validation.
- Add comments where logic is non-obvious.

## Sudoku Game Requirements

- Every generated puzzle must have exactly one valid solution.
- Support Easy, Medium, and Hard difficulties.
- Prevent editing original clues and revealed hints.
- Highlight invalid moves and incorrect entries.
- Keep the complete solution on the server.
- Ensure hints reveal only one correct value at a time.
- Verify completion using the backend.
- Track elapsed time accurately.
- Store only the top 10 fastest leaderboard entries.
- Include player name, completion time, difficulty, and hint count.
- Support responsive layouts and light/dark themes.

## Security and Accessibility

- Validate all incoming API requests.
- Never expose the complete Sudoku solution through an API.
- Use safe DOM manipulation instead of inserting untrusted HTML.
- Preserve keyboard accessibility and visible focus indicators.
- Ensure text remains readable in light and dark modes.

## Testing Requirements

Run Python tests using:

`python -m pytest -v`

Run JavaScript tests using:

`node --test frontend-tests/*.test.js`

- Preserve existing passing tests.
- Add regression tests when fixing defects.
- Do not claim tests pass unless they have actually been executed.

## Responsible Copilot Usage

- Treat Copilot-generated code as a proposal, not automatically correct.
- Review suggestions for correctness, maintainability, and security.
- Modify or reject suggestions that violate project requirements.
- Document meaningful human decisions when evaluating generated code.
- Do not introduce unrelated functionality during focused fixes.

## Current Maintenance Constraint

The Sudoku application has already passed the Udacity code quality, UI, game logic, and interactive feature criteria. Avoid modifying these accepted components unless a specific defect requires it.