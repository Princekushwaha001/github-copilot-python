import copy

import pytest

import sudoku_logic


def assert_valid_solution(board):
    expected = set(range(1, sudoku_logic.SIZE + 1))
    assert len(board) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in board)
    assert all(set(row) == expected for row in board)
    assert all(
        {board[row][col] for row in range(sudoku_logic.SIZE)} == expected
        for col in range(sudoku_logic.SIZE)
    )
    for box_row in range(0, sudoku_logic.SIZE, 3):
        for box_col in range(0, sudoku_logic.SIZE, 3):
            box = {
                board[row][col]
                for row in range(box_row, box_row + 3)
                for col in range(box_col, box_col + 3)
            }
            assert box == expected


def test_create_empty_board_has_nine_rows_of_nines():
    board = sudoku_logic.create_empty_board()

    assert len(board) == sudoku_logic.SIZE
    assert all(row == [sudoku_logic.EMPTY] * sudoku_logic.SIZE for row in board)


def test_deep_copy_is_independent_from_original_board():
    board = sudoku_logic.create_empty_board()

    copied_board = sudoku_logic.deep_copy(board)
    copied_board[0][0] = 1

    assert board[0][0] == sudoku_logic.EMPTY


def test_is_safe_rejects_number_already_in_row():
    board = sudoku_logic.create_empty_board()
    board[0][1] = 5

    assert not sudoku_logic.is_safe(board, 0, 0, 5)


def test_is_safe_rejects_number_already_in_column():
    board = sudoku_logic.create_empty_board()
    board[1][0] = 5

    assert not sudoku_logic.is_safe(board, 0, 0, 5)


def test_is_safe_rejects_number_already_in_box():
    board = sudoku_logic.create_empty_board()
    board[1][1] = 5

    assert not sudoku_logic.is_safe(board, 0, 0, 5)


def test_is_safe_accepts_number_absent_from_row_column_and_box():
    board = sudoku_logic.create_empty_board()
    board[0][3] = 4
    board[3][0] = 6
    board[3][3] = 7

    assert sudoku_logic.is_safe(board, 0, 0, 5)


def test_count_solutions_returns_one_for_a_valid_completed_board():
    board = sudoku_logic.create_empty_board()
    assert sudoku_logic.fill_board(board)
    original = copy.deepcopy(board)

    assert sudoku_logic.count_solutions(board) == 1
    assert board == original


def test_count_solutions_stops_at_two_for_an_empty_board():
    assert sudoku_logic.count_solutions(sudoku_logic.create_empty_board()) == 2


def test_count_solutions_returns_zero_for_conflicting_givens():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 1
    board[0][1] = 1

    assert sudoku_logic.count_solutions(board) == 0


def test_fill_board_completes_a_valid_sudoku():
    board = sudoku_logic.create_empty_board()

    assert sudoku_logic.fill_board(board)
    assert_valid_solution(board)


def test_remove_cells_removes_requested_number_of_clues():
    board = sudoku_logic.create_empty_board()
    assert sudoku_logic.fill_board(board)

    sudoku_logic.remove_cells(board, clues=35)

    assert sum(value != sudoku_logic.EMPTY for row in board for value in row) == 35


def test_generate_puzzle_returns_puzzle_and_valid_solution():
    puzzle, solution = sudoku_logic.generate_puzzle(clues=40)

    assert_valid_solution(solution)
    assert len(puzzle) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert sum(value != sudoku_logic.EMPTY for row in puzzle for value in row) == 40
    assert all(
        value == sudoku_logic.EMPTY or value == solution[row][col]
        for row, values in enumerate(puzzle)
        for col, value in enumerate(values)
    )
    assert puzzle is not solution
    assert all(
        puzzle_row is not solution_row
        for puzzle_row, solution_row in zip(puzzle, solution)
    )


def test_generate_puzzle_does_not_mutate_solution_when_puzzle_changes():
    puzzle, solution = sudoku_logic.generate_puzzle(clues=35)
    solution_before_change = copy.deepcopy(solution)

    puzzle[0][0] = 0 if puzzle[0][0] != 0 else 1

    assert solution == solution_before_change


@pytest.mark.parametrize(
    ("difficulty", "minimum_clues", "maximum_clues"),
    [
        ("easy", 40, 45),
        ("medium", 32, 39),
        ("hard", 25, 31),
    ],
)
def test_generate_puzzle_difficulty_has_unique_solution_and_expected_clue_count(
    difficulty, minimum_clues, maximum_clues
):
    puzzle, solution = sudoku_logic.generate_puzzle(difficulty=difficulty)
    clue_count = sum(value != sudoku_logic.EMPTY for row in puzzle for value in row)

    assert minimum_clues <= clue_count <= maximum_clues
    assert_valid_solution(solution)
    assert sudoku_logic.count_solutions(puzzle) == 1
    assert all(
        value == sudoku_logic.EMPTY or value == solution[row][col]
        for row, values in enumerate(puzzle)
        for col, value in enumerate(values)
    )


def test_generate_puzzle_rejects_unknown_difficulty():
    with pytest.raises(ValueError, match="difficulty must be one of"):
        sudoku_logic.generate_puzzle(difficulty="expert")
