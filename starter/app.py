import random

from flask import Flask, render_template, jsonify, request
import sudoku_logic

app = Flask(__name__)

# Keep a simple in-memory store for current puzzle and solution
CURRENT = {
    'puzzle': None,
    'solution': None
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    clues = request.args.get('clues')
    difficulty = request.args.get('difficulty')
    try:
        if clues is not None:
            puzzle, solution = sudoku_logic.generate_puzzle(clues=int(clues))
        elif difficulty is not None:
            puzzle, solution = sudoku_logic.generate_puzzle(difficulty=difficulty)
        else:
            puzzle, solution = sudoku_logic.generate_puzzle()
    except ValueError as error:
        return jsonify({'error': str(error)}), 400
    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    CURRENT['hinted_cells'] = set()
    return jsonify({'puzzle': puzzle})


def _validated_board(data):
    board = data.get('board') if isinstance(data, dict) else None
    if (
        not isinstance(board, list)
        or len(board) != sudoku_logic.SIZE
        or any(
            not isinstance(row, list) or len(row) != sudoku_logic.SIZE
            for row in board
        )
        or any(
            type(value) is not int
            or value < sudoku_logic.EMPTY
            or value > sudoku_logic.SIZE
            for row in board
            for value in row
        )
    ):
        return None
    return board


def _board_validation_error():
    return jsonify({
        'error': 'Board must be a 9-by-9 grid containing integers from 0 to 9'
    }), 400


@app.route('/check', methods=['POST'])
def check_solution():
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    board = _validated_board(request.get_json(silent=True))
    if board is None:
        return _board_validation_error()
    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    return jsonify({'incorrect': incorrect})


@app.route('/hint', methods=['POST'])
def reveal_hint():
    puzzle = CURRENT.get('puzzle')
    solution = CURRENT.get('solution')
    if puzzle is None or solution is None:
        return jsonify({'error': 'No game in progress'}), 400

    board = _validated_board(request.get_json(silent=True))
    if board is None:
        return _board_validation_error()

    for row in range(sudoku_logic.SIZE):
        for col in range(sudoku_logic.SIZE):
            if (
                puzzle[row][col] != sudoku_logic.EMPTY
                and board[row][col] != puzzle[row][col]
            ):
                return jsonify({'error': 'Original clues cannot be changed'}), 400

    hinted_cells = CURRENT.setdefault('hinted_cells', set())
    for row, col in hinted_cells:
        if board[row][col] != solution[row][col]:
            return jsonify({'error': 'Previously revealed hints cannot be changed'}), 400

    empty_cells = [
        (row, col)
        for row in range(sudoku_logic.SIZE)
        for col in range(sudoku_logic.SIZE)
        if board[row][col] == sudoku_logic.EMPTY
        and puzzle[row][col] == sudoku_logic.EMPTY
        and (row, col) not in hinted_cells
    ]
    if not empty_cells:
        return jsonify({'error': 'No empty cells remain'}), 409

    row, col = random.choice(empty_cells)
    hinted_cells.add((row, col))
    return jsonify({'row': row, 'col': col, 'value': solution[row][col]})


if __name__ == '__main__':
    app.run(port=5555)