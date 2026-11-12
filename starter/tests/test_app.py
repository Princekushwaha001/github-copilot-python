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
HINT_TEST_PUZZLE = [row.copy() for row in SOLVED_BOARD]
HINT_TEST_PUZZLE[0][0] = 0
HINT_TEST_PUZZLE[4][4] = 0


def activate_hint_test_game(monkeypatch, puzzle=None):
    monkeypatch.setitem(
        sudoku_app.CURRENT,
        "puzzle",
        [row.copy() for row in (puzzle or HINT_TEST_PUZZLE)],
    )
    monkeypatch.setitem(sudoku_app.CURRENT, "solution", SOLVED_BOARD)
    monkeypatch.setitem(sudoku_app.CURRENT, "hinted_cells", set())


@pytest.fixture(autouse=True)
def clear_current_game(monkeypatch):
    monkeypatch.setitem(sudoku_app.CURRENT, "puzzle", None)
    monkeypatch.setitem(sudoku_app.CURRENT, "solution", None)
    monkeypatch.setitem(sudoku_app.CURRENT, "hinted_cells", set())


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setitem(sudoku_app.app.config, "TESTING", True)
    return sudoku_app.app.test_client()


def test_index_returns_html_page(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.mimetype == "text/html"
    assert b"Sudoku Game" in response.data


def test_index_renders_difficulty_and_check_and_disabled_hint_controls(client):
    response = client.get("/")

    assert b'id="difficulty"' in response.data
    assert b'id="new-game"' in response.data
    assert b'id="check-solution" type="button" aria-controls=' in response.data
    assert b'id="hint-button" type="button" aria-controls=' in response.data
    assert b'id="hint-count"' in response.data
    assert b'id="game-timer" class="timer-value"' in response.data
    assert b'game-completion.js' in response.data
    assert b'leaderboard.js' in response.data
    assert b'id="leaderboard"' in response.data
    assert b'id="theme-toggle"' in response.data
    assert b'Top 10 fastest times' in response.data


@pytest.mark.parametrize(
    ("path", "expected_clues"),
    [("/new", 35), ("/new?clues=40", 40)],
)
def test_new_game_returns_puzzle_with_requested_clue_count(
    client, path, expected_clues
):
    sudoku_app.CURRENT["hinted_cells"].add((0, 0))

    response = client.get(path)

    assert response.status_code == 200
    puzzle = response.get_json()["puzzle"]
    assert len(puzzle) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert sum(value != sudoku_logic.EMPTY for row in puzzle for value in row) == expected_clues
    assert sudoku_app.CURRENT["puzzle"] == puzzle
    assert sudoku_app.CURRENT["solution"] is not None
    assert sudoku_app.CURRENT["hinted_cells"] == set()


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


@pytest.mark.parametrize(
    "payload",
    [
        None,
        {},
        {"board": []},
        {"board": [[0] * sudoku_logic.SIZE]},
        {"board": [[0] * sudoku_logic.SIZE for _ in range(sudoku_logic.SIZE - 1)]},
        {
            "board": [
                [True] + [0] * (sudoku_logic.SIZE - 1)
            ] + [[0] * sudoku_logic.SIZE for _ in range(sudoku_logic.SIZE - 1)]
        },
        {
            "board": [
                [10] + [0] * (sudoku_logic.SIZE - 1)
            ] + [[0] * sudoku_logic.SIZE for _ in range(sudoku_logic.SIZE - 1)]
        },
    ],
)
def test_check_solution_rejects_malformed_boards(client, monkeypatch, payload):
    monkeypatch.setitem(sudoku_app.CURRENT, "solution", SOLVED_BOARD)

    response = client.post("/check", json=payload)

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Board must be a 9-by-9 grid containing integers from 0 to 9"
    }


def test_check_solution_does_not_return_solution_values(client, monkeypatch):
    monkeypatch.setitem(sudoku_app.CURRENT, "solution", SOLVED_BOARD)

    response = client.post("/check", json={"board": SOLVED_BOARD})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": []}


def test_check_solution_reports_wrong_filled_cells_without_solution(client, monkeypatch):
    monkeypatch.setitem(sudoku_app.CURRENT, "solution", SOLVED_BOARD)
    submitted_board = [row.copy() for row in SOLVED_BOARD]
    submitted_board[0][0] = 4

    response = client.post("/check", json={"board": submitted_board})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": [[0, 0]]}


def test_hint_reveals_exactly_one_empty_cell_and_only_returns_its_value(
    client, monkeypatch
):
    activate_hint_test_game(monkeypatch)

    response = client.post("/hint", json={"board": HINT_TEST_PUZZLE})

    assert response.status_code == 200
    hint = response.get_json()
    assert set(hint) == {"row", "col", "value"}
    row, col, value = hint["row"], hint["col"], hint["value"]
    assert (row, col) in {(0, 0), (4, 4)}
    assert value == SOLVED_BOARD[row][col]
    assert HINT_TEST_PUZZLE[row][col] == 0
    assert sudoku_app.CURRENT["hinted_cells"] == {(row, col)}


def test_hint_reveals_another_single_cell_without_losing_previous_hint(
    client, monkeypatch
):
    activate_hint_test_game(monkeypatch)

    first_response = client.post("/hint", json={"board": HINT_TEST_PUZZLE})
    first_hint = first_response.get_json()
    board_after_first = [row.copy() for row in HINT_TEST_PUZZLE]
    board_after_first[first_hint["row"]][first_hint["col"]] = first_hint["value"]

    second_response = client.post("/hint", json={"board": board_after_first})

    assert second_response.status_code == 200
    second_hint = second_response.get_json()
    assert (second_hint["row"], second_hint["col"]) != (
        first_hint["row"],
        first_hint["col"],
    )
    assert len(sudoku_app.CURRENT["hinted_cells"]) == 2
    assert board_after_first[first_hint["row"]][first_hint["col"]] == SOLVED_BOARD[
        first_hint["row"]
    ][first_hint["col"]]


def test_hint_rejects_request_when_no_game_is_active(client):
    response = client.post("/hint", json={"board": SOLVED_BOARD})

    assert response.status_code == 400
    assert response.get_json() == {"error": "No game in progress"}


@pytest.mark.parametrize("payload", [None, {}, {"board": [[0] * 9]}])
def test_hint_rejects_invalid_board_payload(client, monkeypatch, payload):
    activate_hint_test_game(monkeypatch)

    response = client.post("/hint", json=payload)

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Board must be a 9-by-9 grid containing integers from 0 to 9"
    }


def test_hint_reports_when_no_empty_cells_remain(client, monkeypatch):
    activate_hint_test_game(monkeypatch, SOLVED_BOARD)

    response = client.post("/hint", json={"board": SOLVED_BOARD})

    assert response.status_code == 409
    assert response.get_json() == {"error": "No empty cells remain"}


def test_hint_rejects_attempt_to_change_original_clue(client, monkeypatch):
    activate_hint_test_game(monkeypatch)
    changed_board = [row.copy() for row in HINT_TEST_PUZZLE]
    changed_board[0][1] = 4

    response = client.post("/hint", json={"board": changed_board})

    assert response.status_code == 400
    assert response.get_json() == {"error": "Original clues cannot be changed"}


def test_hint_rejects_attempt_to_change_previously_locked_hint(client, monkeypatch):
    activate_hint_test_game(monkeypatch)
    first_response = client.post("/hint", json={"board": HINT_TEST_PUZZLE})
    hint = first_response.get_json()
    changed_board = [row.copy() for row in HINT_TEST_PUZZLE]
    changed_board[hint["row"]][hint["col"]] = SOLVED_BOARD[hint["row"]][hint["col"]]
    changed_board[hint["row"]][hint["col"]] = 0

    response = client.post("/hint", json={"board": changed_board})

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Previously revealed hints cannot be changed"
    }
