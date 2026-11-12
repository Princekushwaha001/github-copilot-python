import copy
import random

SIZE = 9
EMPTY = 0
DIFFICULTY_CLUES = {
    "easy": (40, 45),
    "medium": (32, 39),
    "hard": (25, 31),
}
_FULL_MASK = (1 << SIZE) - 1


def deep_copy(board):
    return copy.deepcopy(board)


def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]


def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True


def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def count_solutions(board, limit=2):
    """Count solutions up to limit without changing the supplied board."""
    if limit < 1:
        raise ValueError("limit must be at least 1")
    if len(board) != SIZE or any(len(row) != SIZE for row in board):
        raise ValueError("board must be a 9-by-9 grid")
    if any(
        type(value) is not int or value < EMPTY or value > SIZE
        for row in board
        for value in row
    ):
        raise ValueError("board values must be integers from 0 to 9")

    working = deep_copy(board)
    row_masks = [0] * SIZE
    col_masks = [0] * SIZE
    box_masks = [0] * SIZE

    for row in range(SIZE):
        for col in range(SIZE):
            value = working[row][col]
            if value == EMPTY:
                continue
            bit = 1 << (value - 1)
            box = (row // 3) * 3 + col // 3
            if row_masks[row] & bit or col_masks[col] & bit or box_masks[box] & bit:
                return 0
            row_masks[row] |= bit
            col_masks[col] |= bit
            box_masks[box] |= bit

    def search():
        best_cell = None
        best_candidates = 0
        fewest_candidates = SIZE + 1

        for row in range(SIZE):
            for col in range(SIZE):
                if working[row][col] != EMPTY:
                    continue
                box = (row // 3) * 3 + col // 3
                candidates = _FULL_MASK & ~(
                    row_masks[row] | col_masks[col] | box_masks[box]
                )
                candidate_count = bin(candidates).count("1")
                if candidate_count == 0:
                    return 0
                if candidate_count < fewest_candidates:
                    best_cell = (row, col, box)
                    best_candidates = candidates
                    fewest_candidates = candidate_count
                    if candidate_count == 1:
                        break
            if fewest_candidates == 1:
                break

        if best_cell is None:
            return 1

        row, col, box = best_cell
        solutions = 0
        while best_candidates:
            bit = best_candidates & -best_candidates
            best_candidates ^= bit
            working[row][col] = bit.bit_length()
            row_masks[row] |= bit
            col_masks[col] |= bit
            box_masks[box] |= bit

            solutions += search()

            working[row][col] = EMPTY
            row_masks[row] ^= bit
            col_masks[col] ^= bit
            box_masks[box] ^= bit
            if solutions >= limit:
                return limit
        return solutions

    return search()


def _try_remove_cells(board, clues):
    cells = [
        (row, col)
        for row in range(SIZE)
        for col in range(SIZE)
        if board[row][col] != EMPTY
    ]
    random.shuffle(cells)
    current_clues = len(cells)

    for row, col in cells:
        if current_clues == clues:
            break
        value = board[row][col]
        board[row][col] = EMPTY
        if count_solutions(board) == 1:
            current_clues -= 1
        else:
            board[row][col] = value
    return current_clues == clues


def remove_cells(board, clues):
    if type(clues) is not int or not 17 <= clues <= SIZE * SIZE:
        raise ValueError("clues must be an integer from 17 to 81")

    original = deep_copy(board)
    for _ in range(10):
        candidate = deep_copy(original)
        if _try_remove_cells(candidate, clues):
            board[:] = candidate
            return
    raise RuntimeError(f"Unable to create a unique puzzle with {clues} clues")


def generate_puzzle(clues=35, difficulty=None):
    if difficulty is not None:
        difficulty = difficulty.lower()
        if difficulty not in DIFFICULTY_CLUES:
            choices = ", ".join(DIFFICULTY_CLUES)
            raise ValueError(f"difficulty must be one of: {choices}")
        clues = random.randint(*DIFFICULTY_CLUES[difficulty])

    if type(clues) is not int or not 17 <= clues <= SIZE * SIZE:
        raise ValueError("clues must be an integer from 17 to 81")

    while True:
        solution = create_empty_board()
        if not fill_board(solution):
            raise RuntimeError("Unable to generate a complete Sudoku solution")
        puzzle = deep_copy(solution)
        if _try_remove_cells(puzzle, clues):
            return puzzle, solution
