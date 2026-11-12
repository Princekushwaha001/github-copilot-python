import pytest

import app as sudoku_app
import sudoku_logic


SOLVED_BOARD = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
]


@pytest.fixture(autouse=True)
def clear_current_game(monkeypatch):
    monkeypatch.setitem(sudoku_app.CURRENT, "puzzle", None)
    monkeypatch.setitem(sudoku_app.CURRENT, "solution", None)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setitem(sudoku_app.app.config, "TESTING", True)
    return sudoku_app.app.test_client()


def test_index_returns_html_page(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.mimetype == "text/html"
    assert b"Sudoku Game" in response.data


@pytest.mark.parametrize(
    ("path", "expected_clues"),
    [("/new", 35), ("/new?clues=40", 40)],
)
def test_new_game_returns_puzzle_with_requested_clue_count(
    client, path, expected_clues
):
    response = client.get(path)

    assert response.status_code == 200
    puzzle = response.get_json()["puzzle"]
    assert len(puzzle) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert sum(value != sudoku_logic.EMPTY for row in puzzle for value in row) == expected_clues
    assert sudoku_app.CURRENT["puzzle"] == puzzle
    assert sudoku_app.CURRENT["solution"] is not None


@pytest.mark.parametrize(
    ("difficulty", "minimum_clues", "maximum_clues"),
    [
        ("easy", 40, 45),
        ("medium", 32, 39),
        ("hard", 25, 31),
    ],
)
def test_new_game_supports_difficulty_parameter(
    client, difficulty, minimum_clues, maximum_clues
):
    response = client.get(f"/new?difficulty={difficulty}")

    assert response.status_code == 200
    puzzle = response.get_json()["puzzle"]
    clue_count = sum(value != sudoku_logic.EMPTY for row in puzzle for value in row)
    assert minimum_clues <= clue_count <= maximum_clues
    assert sudoku_logic.count_solutions(puzzle) == 1


def test_new_game_rejects_unknown_difficulty(client):
    response = client.get("/new?difficulty=expert")

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "difficulty must be one of: easy, medium, hard"
    }


def test_check_solution_returns_error_when_no_game_is_in_progress(client):
    response = client.post("/check", json={"board": SOLVED_BOARD})

    assert response.status_code == 400
    assert response.get_json() == {"error": "No game in progress"}


def test_check_solution_returns_empty_incorrect_list_for_correct_board(client, monkeypatch):
    monkeypatch.setitem(sudoku_app.CURRENT, "solution", SOLVED_BOARD)

    response = client.post("/check", json={"board": SOLVED_BOARD})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": []}


def test_check_solution_returns_coordinates_of_incorrect_cells(client, monkeypatch):
    monkeypatch.setitem(sudoku_app.CURRENT, "solution", SOLVED_BOARD)
    submitted_board = [row.copy() for row in SOLVED_BOARD]
    submitted_board[0][0] = 0

    response = client.post("/check", json={"board": submitted_board})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": [[0, 0]]}
