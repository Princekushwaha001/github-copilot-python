# GitHub Copilot Instructions — Sudoku Flask Project

## Project Objective
Refactor the existing Udacity Python Flask Sudoku application into a modern, modular, accessible, responsive web application.

## Technology Stack
- Backend: Python 3, Flask
- Frontend: HTML5, CSS3, JavaScript
- Testing: pytest and Flask test client
- Persistence: Browser localStorage
- Version Control: Git and GitHub

## Development Standards
1. Follow PEP 8 for Python code.
2. Use clear names, type hints, and docstrings.
3. Separate Flask routes, Sudoku logic, and frontend code.
4. Avoid unnecessary dependencies.
5. Preserve existing functionality during refactoring.
6. Handle invalid input and errors gracefully.
7. Write reusable, testable functions.
8. Do not modify unrelated files.
9. Explain important architectural decisions.

## Sudoku Requirements
- Generate valid 9×9 Sudoku puzzles.
- Support Easy, Medium, and Hard difficulties.
- Verify each puzzle has exactly one solution.
- Prevent editing original and hinted cells.
- Provide immediate conflict feedback.
- Support hints, answer checking, and completion detection.

## Frontend Requirements
- Responsive design for mobile and desktop.
- Alternating 3×3 square colors.
- Accessible keyboard navigation and visible focus states.
- Dark and light themes.
- Game timer and persistent top 10 leaderboard.

## Testing Requirements
- Establish baseline pytest tests before refactoring.
- Run tests after every major change.
- Test Sudoku validation and uniqueness.
- Test Flask endpoints and error handling.
- Add regression tests for fixed bugs.

## Copilot Collaboration
- Explain proposed changes before implementing them.
- Make incremental changes.
- Do not claim tests pass unless they have been executed.
- Ask for approval before making major architectural changes.
- Prioritize correctness, readability, and maintainability.