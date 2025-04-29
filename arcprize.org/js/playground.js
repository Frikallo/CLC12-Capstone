var gtag = gtag || function () { };
const jsConfetti = new JSConfetti();
const dailyPuzzle = "e9b4f6fc";
let TEST_PAIRS = [];
let CURRENT_TEST_PAIR_INDEX = 0;
let COPY_PASTE_DATA = [];
const EDITION_STANDARD = 150;
const MAX_CELL_SIZE = 100;

let TASKS = [
    "3aa6fb7a",
    "0ca9ddb6",
    "1e0a9b12",
    "0d3d703e",
    "150deff5",
    "0520fde7",
];
let TASKS_INDEX = 0;
let successfulTasks = [];
let DAILY_PUZZLE_SHARE_DATA = {};

class Grid {
    constructor(height, width, values) {
        this.height = height;
        this.width = width;
        this.grid = Array(height).fill().map((_, i) =>
            Array(width).fill().map((_, j) =>
                values && values[i] && values[i][j] !== undefined ? values[i][j] : 0
            )
        );
    }
}

let CURRENT_INPUT_GRID = new Grid(3, 3);
let CURRENT_OUTPUT_GRID = new Grid(3, 3);
let CURRENT_OUTPUT_GRID_CORRECT = new Grid(3, 3);

const parseSizeTuple = (size) => {
    const [width, height] = size.split('x').map(Number);
    if (width < 1 || height < 1 || width > 30 || height > 30) {
        alert('Grid size must be between 1x1 and 30x30.');
        return null;
    }
    return [width, height];
};

const convertSerializedGridToGridObject = (values) =>
    new Grid(values.length, values[0].length, values);

const fitCellsToContainer = (jqGrid, height, width) => {
    jqGrid.css({
        "grid-template-columns": `repeat(${width}, 1fr)`,
        "grid-template-rows": `repeat(${height}, 1fr)`
    });
};

const fillJqGridWithData = (jqGrid, dataGrid) => {
    jqGrid.empty();
    dataGrid.grid.forEach((row, i) => {
        const $row = $('<div>').addClass('grid-row');
        row.forEach((cellValue, j) => {
            const $cell = $('<div>')
                .addClass('cell')
                .attr({ x: i, y: j });
            setCellSymbol($cell, cellValue);
            $row.append($cell);
        });
        jqGrid.append($row);
    });
};

const copyJqGridToDataGrid = (jqGrid, dataGrid) => {
    const rowCount = jqGrid.find('.grid-row').length;
    if (dataGrid.height !== rowCount) return;
    const colCount = jqGrid.find('.cell').length / rowCount;
    if (dataGrid.width !== colCount) return;
    jqGrid.find('.grid-row').each((i, row) => {
        $(row).find('.cell').each((j, cell) => {
            dataGrid.grid[i][j] = parseInt($(cell).attr('symbol'));
        });
    });
};

const setCellSymbol = (cell, symbol, divmode = 'no', pairId = 'no') => {
    if (pairId !== 'no') {
        const newCell = $('#' + divmode + '_grid_' + pairId).find(cell);
        newCell.attr('symbol', symbol);
        newCell.removeClass(Array.from({ length: 10 }, (_, i) => `symbol_${i}`).join(' '));
        newCell.addClass(`symbol_${symbol}`);
    } else {
        const toolMode = $("input[name=tool_switching]:checked").val();
        if (toolMode === "edit" && cell.attr('symbol') === symbol) {
            symbol = 0;
        }
        cell.attr('symbol', symbol);
        cell.removeClass(Array.from({ length: 10 }, (_, i) => `symbol_${i}`).join(' '));
        cell.addClass(`symbol_${symbol}`);
    }
};

const infoMsg = (msg) => {
    $('#info_display').html(msg).show();
};

const hideInfoMsg = () => {
    $('#info_display').hide().html("");
};

const resetTask = () => {
    CURRENT_INPUT_GRID = new Grid(3, 3);
    resetOutputGrid();
    TEST_PAIRS = [];
    CURRENT_TEST_PAIR_INDEX = 0;
    if (GAME_LOCATION === "puzzle") {
        $(".game-column").append($("#task_train, #task_test"));
    }
    $("#task_train").html("");
    $("#task_test").html("");
    gtag('event', 'reset_puzzle', {
        'puzzle_id': TASKS[TASKS_INDEX],
    });
};

const refreshEditionGrid = (jqGrid, dataGrid) => {
    fillJqGridWithData(jqGrid, dataGrid);
    setUpEditionGridListeners(jqGrid);
    fitCellsToContainer(jqGrid, dataGrid.height, dataGrid.width);
    initializeSelectable();
};

const syncFromEditionGridToDataGrid = () => {
    copyJqGridToDataGrid($("#output_grid .edition_grid"), CURRENT_OUTPUT_GRID);
};

const syncFromDataGridToEditionGrid = () => {
    refreshEditionGrid($("#output_grid .edition_grid"), CURRENT_OUTPUT_GRID);
};

const getSelectedSymbol = () => {
    const selected = $("#symbol_picker .selected-symbol-preview")[0];
    return $(selected).attr("symbol");
};

const setUpEditionGridListeners = (jqGrid) => {
    jqGrid.find(".cell").click(function (event) {
        const cell = $(event.target);
        const symbol = getSelectedSymbol();
        const toolMode = $("input[name=tool_switching]:checked").val();
        if (toolMode === "floodfill") {
            syncFromEditionGridToDataGrid();
            const grid = CURRENT_OUTPUT_GRID.grid;
            floodfillFromLocation(grid, cell.attr("x"), cell.attr("y"), symbol);
            syncFromDataGridToEditionGrid();
        } else if (toolMode === "edit") {
            setCellSymbol(cell, symbol);
        }
    });
};

const resizeOutputGrid = () => {
    const size = $("#output_grid_size").val();
    const [width, height] = parseSizeTuple(size);
    if (!width || !height) return;
    const jqGrid = $("#output_grid .edition_grid");
    syncFromEditionGridToDataGrid();
    const dataGrid = JSON.parse(JSON.stringify(CURRENT_OUTPUT_GRID.grid));
    CURRENT_OUTPUT_GRID = new Grid(height, width, dataGrid);
    $("#output_grid .task-label .grid-size").html(`(${width}x${height})`);
    refreshEditionGrid(jqGrid, CURRENT_OUTPUT_GRID);
};

const resetOutputGrid = () => {
    syncFromEditionGridToDataGrid();
    if (GAME_LOCATION === "home" || GAME_LOCATION === "puzzle") {
        CURRENT_OUTPUT_GRID = CURRENT_OUTPUT_GRID_CORRECT;
    } else {
        CURRENT_OUTPUT_GRID = new Grid(3, 3);
    }
    syncFromDataGridToEditionGrid();
    $("#output_grid_size").val(`${CURRENT_OUTPUT_GRID.width}x${CURRENT_OUTPUT_GRID.height}`);
    $("#output_grid .task-label .grid-size").html(`(${CURRENT_OUTPUT_GRID.width}x${CURRENT_OUTPUT_GRID.height})`);
};

const clearOutputGrid = () => {
    const cells = $("#output_grid .cell");
    if (cells.length === 0) return;
    cells.each((_, cell) => {
        setCellSymbol($(cell), 0);
    });
};

const copyFromInput = () => {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(CURRENT_INPUT_GRID.grid);
    syncFromDataGridToEditionGrid();
    $("#output_grid_size").val(`${CURRENT_OUTPUT_GRID.width}x${CURRENT_OUTPUT_GRID.height}`);
    $("#output_grid .task-label .grid-size").html(`(${CURRENT_OUTPUT_GRID.width}x${CURRENT_OUTPUT_GRID.height})`);
    gtag('event', 'copy_from_input', {
        'puzzle_id': TASKS[TASKS_INDEX],
    });
};

const fillPair = (pairId, inputGrid, outputGrid) => {
    if (pairId !== null) {
        const pairSlot = $('<div id="pair_preview_' +
            pairId +
            '" class="pair-preview" index="' +
            pairId +
            '"></div>');
        pairSlot.appendTo("#task_train");
        const jqInputContainer = $('<div class="puzzle-container">' +
            '<div class="task-label">Ex.' + (pairId + 1) + ' Input ' +
            ' <span class="grid-size">(' + inputGrid.width + 'x' + inputGrid.height + ')</span></div>' +
            '</div>');
        const jqInputGrid = $('<div class="input_preview puzzle"></div>');
        jqInputGrid.appendTo(jqInputContainer);
        jqInputContainer.appendTo(pairSlot);
        $('<div class="arrow-column"><div>&rarr;</div></div>').appendTo(pairSlot);
        const jqOutputContainer = $('<div class="puzzle-container">' +
            '<div class="task-label">Ex.' + (pairId + 1) + ' Output ' +
            ' <span class="grid-size">(' + outputGrid.width + 'x' + outputGrid.height + ')</span></div>' +
            '</div>');
        const jqOutputGrid = $('<div class="output_preview puzzle"></div>');
        jqOutputGrid.appendTo(jqOutputContainer);
        jqOutputContainer.appendTo(pairSlot);
        fillJqGridWithData(jqInputGrid, inputGrid);
        fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width);
        fillJqGridWithData(jqOutputGrid, outputGrid);
        fitCellsToContainer(jqOutputGrid, outputGrid.height, outputGrid.width);
    } else {
        const pairSlot = $('<div id="pair_preview_test" class="pair-preview"></div>');
        pairSlot.appendTo("#task_test");
        const taskLabelInput = GAME_LOCATION === "puzzle" ? "Test Input" : "Input";
        const taskLabelOutput = GAME_LOCATION === "puzzle" ? "Test Output" : "Output";
        const jqInputContainer = $('<div class="puzzle-container">' +
            '<div class="task-label">' + taskLabelInput +
            ' <span class="grid-size">(' + inputGrid.width + 'x' + inputGrid.height + ')</span></div>' +
            '</div>');
        const jqInputGrid = $('<div class="input_preview puzzle selectable_grid" id="evaluation_input"></div>');
        jqInputGrid.appendTo(jqInputContainer);
        jqInputContainer.appendTo(pairSlot);
        $('<div class="arrow-column"><div>&rarr;</div></div>').appendTo(pairSlot);
        const jqOutputContainer = $('<div class="puzzle-container" id="output_grid">' +
            '<div class="task-label">' + taskLabelOutput +
            ' <span class="grid-size">(' + outputGrid.width + 'x' + outputGrid.height + ')</span></div>' +
            '</div>');
        const jqOutputGrid = $('<div class="output_preview puzzle edition_grid selectable_grid"></div>');
        jqOutputGrid.appendTo(jqOutputContainer);
        jqOutputContainer.appendTo(pairSlot);
        fillJqGridWithData(jqInputGrid, inputGrid);
        fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width);
        fillJqGridWithData(jqOutputGrid, outputGrid);
        fitCellsToContainer(jqOutputGrid, outputGrid.height, outputGrid.width);
        refreshEditionGrid($(".edition_grid"), outputGrid);
    }
};

const loadJSONTask = (train, test) => {
    if (GAME_LOCATION === "puzzle") {
        $(".game-column").empty().append('<div id="task_train"></div><div id="task_test"></div>');
    }
    resetTask();
    hideInfoMsg();

    train.forEach((pair, i) => {
        const input_grid = convertSerializedGridToGridObject(pair.input);
        const output_grid = convertSerializedGridToGridObject(pair.output);
        fillPair(i, input_grid, output_grid);
    });

    TEST_PAIRS = test;
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(TEST_PAIRS[0].input);

    if (GAME_LOCATION === "home" || GAME_LOCATION === "puzzle") {
        const outputGrid = Array(test[0].output.length)
            .fill()
            .map(() => Array(test[0].output[0].length).fill(0));
        CURRENT_OUTPUT_GRID_CORRECT = convertSerializedGridToGridObject(outputGrid);
        CURRENT_OUTPUT_GRID = CURRENT_OUTPUT_GRID_CORRECT;
    } else {
        CURRENT_OUTPUT_GRID = new Grid(3, 3);
    }

    fillPair(null, CURRENT_INPUT_GRID, CURRENT_OUTPUT_GRID);
    CURRENT_TEST_PAIR_INDEX = 0;

    $('#current_test_input_id_display').html('1');
    $('#total_test_input_count_display').html(test.length);
    $('#test-controls').toggle(test.length > 1);

    if (GAME_LOCATION === "puzzle") {
        $("#task_train, #task_test").contents().unwrap();
    }
};

const displayTaskName = (task_name, task_index, number_of_tasks) => {
    if (GAME_LOCATION === "puzzle") {
        $('#task_name').html('arcprize.org/play?task=' + task_name);
    } else {
        document.getElementById("task_name").innerHTML = "Puzzle ID: " + task_name;
        document.getElementById("task_order").innerHTML = (String(task_index) + " of " + String(number_of_tasks));
    }
    if (GAME_LOCATION !== "home" && task_name !== dailyPuzzle) {
        const queryParams = new URLSearchParams(window.location.search);
        queryParams.set("task", task_name);
        history.replaceState(null, null, "?" + queryParams.toString());
    }
};

let timerInterval;
let timerSeconds = 0;
let submitAttempts = 0;

const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')} sec`;
    } else if (minutes > 0) {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} sec`;
    } else {
        return `0:${remainingSeconds.toString().padStart(2, '0')} sec`;
    }
};

const resetCounters = () => {
    timerSeconds = 0;
    submitAttempts = 0;
    clearInterval(timerInterval);
};

const startTimer = () => {
    timerInterval = setInterval(() => {
        timerSeconds++;
        $('#timer').text(`Time: ${formatTime(timerSeconds)}`);
    }, 1000);
};

const stopTimer = () => {
    clearInterval(timerInterval);
};

const setupDailyPuzzle = () => {
    $(".game").hide();
    $("#daily-puzzle").show();
    $("#daily-puzzle-stats").hide();
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    $("#current-date").text(today);
    if (!$('#timer').length) {
        $('#daily-puzzle-stats').append('<div id="timer">Time: 00:00</div> | ');
    }
    if (!$('#attempts').length) {
        $('#daily-puzzle-stats').append('<div id="attempts">Attempts: 0</div>');
    }
    resetCounters();
    $('#timer').text('Time: 0:00 sec');
    $('#attempts').text('Attempts: 0');
}

const returnSetForTask = async (taskId) => {
    const taskSets = ['https://arcprize.org/media/json/v1_public_training_set.json', 'https://arcprize.org/media/json/v1_public_evaluation_set.json', 'https://arcprize.org/media/json/v2_public_training_set.json', 'https://arcprize.org/media/json/v2_public_evaluation_set.json'];

    for (const set of taskSets) {
        try {
            const tasksList = await $.getJSON(set);
            const position = tasksList.indexOf(taskId);
            if (position !== -1) {
                return { set, position, tasks: tasksList };
            }
        } catch (e) {
            infoMsg("Error loading tasks.");
        }
    }

    return null;
};

const loadSet = async (set) => {
    let tasksFile;

    if (set === "daily_puzzle") {
        TASKS = [dailyPuzzle];
        $("#task_nav").hide();
        history.replaceState(null, null, window.location.pathname);
    } else {
        tasksFile = `https://arcprize.org/media/json/${set}.json`;

        try {
            TASKS = await $.getJSON(tasksFile);
        } catch (e) {
            infoMsg("Error loading tasks.");
            return;
        }
    }

    loadTask(TASKS[0]);
    $("#load_task_control_btns").fadeIn();
};

const loadTask = async (taskId) => {
    const task = "https://arcprize.org/media/json/" + taskId + ".json";
    try {
        if (taskId === dailyPuzzle && GAME_LOCATION !== "home") {
            setupDailyPuzzle();
        } else {
            $(".game").hide().fadeIn();
            $("#task_nav").show();
            $("#daily-puzzle").hide();
            $("#daily-puzzle-stats").hide();
            resetCounters();
            startTimer();
        }

        const taskData = await $.getJSON(task);
        loadJSONTask(taskData.train, taskData.test);
        displayTaskName(taskId, TASKS_INDEX + 1, TASKS.length);
        if (GAME_LOCATION === "puzzle") {
            $('.edition_grid').append('<div class="thinker"></div>');
        }
    } catch (e) {
        infoMsg("Error loading task.");
    }
};

const previousTask = () => {
    if (TASKS_INDEX !== 0) {
        TASKS_INDEX--;
    } else {
        alert('You are on the first task.');
        return;
    }
    loadTask(TASKS[TASKS_INDEX]);
};

const nextTask = () => {
    if (TASKS_INDEX < TASKS.length - 1) {
        TASKS_INDEX++;
    } else {
        alert('You are on the last task.');
        return;
    }
    loadTask(TASKS[TASKS_INDEX]);
};

const findTaskSet = async (taskId) => {
    try {
        const result = await returnSetForTask(taskId);
        TASKS = result.tasks;
        TASKS_INDEX = result.position;
        loadTask(taskId);
        $("#load_task_control_btns").fadeIn();
        const select_option = result.set.split('/').pop().split('.').shift();
        $('#set option[value="' + select_option + '"]').prop("selected", "selected");
    } catch (error) {
        $('#task_train').html('<p class="magenta"><b>There is no puzzle with that ID.</b></p>');
        $('#set').append(
            $('<option selected="selected"></option>').val("invalid_task").html('Invalid Task')
        );
        throw new Error("Invalid task ID");
    }
};

const copyToOutput = () => {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(CURRENT_INPUT_GRID.grid);
    syncFromDataGridToEditionGrid();
    $("#output_grid_size").val(`${CURRENT_OUTPUT_GRID.width}x${CURRENT_OUTPUT_GRID.height}`);
};

const initializeSelectable = () => {
    if ($(".selectable_grid").hasClass("ui-selectable")) {
        $(".selectable_grid").selectable("destroy");
        $("#selection-tooltip").remove();
    }
    const toolMode = $("input[name=tool_switching]:checked").val();
    if (toolMode === "select") {
        let selectedCells = new Set();
        let tooltip = $('<div id="selection-tooltip"></div>').appendTo('body');
        
        $(".selectable_grid").selectable({
            autoRefresh: false,
            filter: "> .grid-row > .cell",
            selecting: function(event, ui) {
                updateSelectionInfo(ui, event);
            },
            unselecting: function(event, ui) {
                updateSelectionInfo(ui, event);
            },
            start: function(event, ui) {
                let allSelectableAreas = $('.ui-selectable');
                allSelectableAreas.not(this).each(function() {
                    $(this).find('.ui-selected').removeClass('ui-selected');
                });
            },
            stop: function() {
                tooltip.hide();
            }
        });

        function updateSelectionInfo(ui, event) {
            let selecting = $('.ui-selecting, .ui-selected');
            selectedCells.clear();
            selecting.each(function() {
                var cell = $(this);
                var x = parseInt(cell.attr('x'));
                var y = parseInt(cell.attr('y'));
                selectedCells.add([x, y]);    
            });

            if (selectedCells.size > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                selectedCells.forEach(([x, y]) => {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                });
                
                let width = maxX - minX + 1;
                let height = maxY - minY + 1;
                
                tooltip.text(`${width}x${height}`);
                tooltip.css({
                    left: event.pageX + 20,
                    top: event.pageY + 20
                }).show();
            } else {
                tooltip.hide();
            }
        }
    }
};

const floodfillFromLocation = (grid, i, j, symbol) => {
    const xi = parseInt(i);
    const yj = parseInt(j);
    const target = grid[xi][yj];
    if (target === symbol) return;

    const flow = (xi, yj, symbol, target) => {
        if (xi >= 0 && xi < grid.length && yj >= 0 && yj < grid[xi].length) {
            if (grid[xi][yj] === target) {
                grid[xi][yj] = symbol;
                flow(xi - 1, yj, symbol, target);
                flow(xi + 1, yj, symbol, target);
                flow(xi, yj - 1, symbol, target);
                flow(xi, yj + 1, symbol, target);
            }
        }
    };
    flow(xi, yj, symbol, target);
};

const fillTestInput = (inputGrid) => {
    const jqInputGrid = $('#evaluation_input');
    fillJqGridWithData(jqInputGrid, inputGrid);
    fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width);
};

const previousTestInput = () => {
    if (CURRENT_TEST_PAIR_INDEX === 0) {
        alert('You are on the first test input.');
        return;
    }
    CURRENT_TEST_PAIR_INDEX--;
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['input']);
    fillTestInput(CURRENT_INPUT_GRID);
    $('#current_test_input_id_display').html(CURRENT_TEST_PAIR_INDEX + 1);
    $('#total_test_input_count_display').html(TEST_PAIRS.length);
};

const nextTestInput = () => {
    if (TEST_PAIRS.length <= CURRENT_TEST_PAIR_INDEX + 1) {
        alert('You are on the last test input.');
        return;
    }
    CURRENT_TEST_PAIR_INDEX++;
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['input']);
    fillTestInput(CURRENT_INPUT_GRID);
    $('#current_test_input_id_display').html(CURRENT_TEST_PAIR_INDEX + 1);
    $('#total_test_input_count_display').html(TEST_PAIRS.length);
};

const submitSolution = () => {
    syncFromEditionGridToDataGrid();
    const reference_output = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]["output"];
    const submitted_output = CURRENT_OUTPUT_GRID.grid;
    const taskId = TASKS[TASKS_INDEX];
    let success = true;
    const isDailyPuzzle = taskId === dailyPuzzle;
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const time = `${minutes}:${seconds.toString().padStart(2, '0')} sec`;

    if (!successfulTasks.includes(taskId)) {
        submitAttempts++;
        $('#attempts').text(`Attempts: ${submitAttempts}`);
    }

    // First, check if the number of rows (height) matches.
    if (reference_output.length !== submitted_output.length) {
        success = false;
    } else {
        // If heights match, iterate through each row to check width and cell values.
        for (let i = 0; i < reference_output.length; i++) {
            const ref_row = reference_output[i];
            const sub_row = submitted_output[i];

            // Explicitly check if the number of columns (width) matches for the current row.
            // This fixes a bug where submissions with incorrect width but correct height and
            // matching cell values within the reference bounds were marked as successful.
            if (ref_row.length !== sub_row.length) {
                success = false;
                break; // Exit the row loop if width mismatch is found
            }

            // If dimensions match for this row, check individual cell values.
            for (let j = 0; j < ref_row.length; j++) {
                if (ref_row[j] !== sub_row[j]) {
                    success = false;
                    break; // Exit the column loop if cell mismatch is found
                }
            }
            // Exit the row loop if a mismatch was found in the inner cell loop.
            if (!success) break;
        }
    }

    if (!success) {
        infoMsg("Wrong. Try again!");
        posthog.capture('task_submit', {
            task_id: taskId,
            result: success,
            duration: timerSeconds,
            attempts: submitAttempts,
            daily_puzzle: isDailyPuzzle
        });
    } else {
        stopTimer();
        jsConfetti.addConfetti({
            confettiColors: ['#FFDC00', '#E53AA3', '#F93C31', '#1E93FF', '#87D8F1', '#4FCC30'],
            confettiRadius: 3,
        });
        if (!successfulTasks.includes(taskId)) {
            successfulTasks.push(taskId);
            gtag('event', 'puzzle_submission', {
                'puzzle_id': taskId,
                'submission_successful': success,
                'time_taken': timerSeconds,
                'attempts': submitAttempts
            });
            posthog.capture('task_submit', {
                task_id: taskId,
                result: success,
                duration: timerSeconds,
                attempts: submitAttempts,
                daily_puzzle: isDailyPuzzle
            });
        }
        if (isDailyPuzzle) {
            const shareDiv = document.getElementById('daily-puzzle-share');
            if (shareDiv) {
                const resultTaskId = shareDiv.querySelector('#result-task-id');
                const resultDate = shareDiv.querySelector('#result-date');
                const resultTime = shareDiv.querySelector('#result-time');
                const resultAttempts = shareDiv.querySelector('#result-attempts');
                if (resultTaskId) {
                    resultTaskId.textContent = taskId;
                }
                if (resultDate) {
                    resultDate.textContent = today;
                }
                if (resultTime) {
                    resultTime.textContent = time;
                }
                if (resultAttempts) {
                    resultAttempts.textContent = submitAttempts;
                }
                DAILY_PUZZLE_SHARE_DATA = {
                    id: taskId,
                    date: today,
                    time: timerSeconds,
                    attempts: submitAttempts
                };
            }
            openModal("daily-puzzle-share");
        } else {
            infoMsg(`Correct! Try the next puzzle.`);
        }
    }
};

$(document).ready(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('task');
    GAME_LOCATION = (typeof GAME_LOCATION === 'undefined') ? 'play' : GAME_LOCATION;

    if (GAME_LOCATION === "home") {
        loadTask(TASKS[0]);
    } else {
        if (taskId) {
            if (GAME_LOCATION === "play") {
                const page_title = "ARC Prize - Puzzle #" + taskId;
                const page_description = "Can you solve it? Play the game.";
                document.title = page_title;
                document.querySelector('meta[property="og:title"]').setAttribute("content", page_title);
                document.querySelector('meta[property="twitter:title"]').setAttribute("content", page_title);
                document.querySelector('meta[name="description"]').setAttribute("content", page_description);
                document.querySelector('meta[property="og:description"]').setAttribute("content", page_description);
                document.querySelector('meta[property="twitter:description"]').setAttribute("content", page_description);
            }
            findTaskSet(taskId);
        } else {
            loadSet("daily_puzzle");
        }
        $("#set").on('change', function () {
            const validSets = ["v1_public_evaluation_set", "v1_public_training_set", "v2_public_evaluation_set", "v2_public_training_set", "daily_puzzle"];
            if (validSets.includes(this.value)) {
                TASKS_INDEX = 0;
                loadSet(this.value);
                const invalid_task_option = $("#set option[value='invalid_task']");
                if (invalid_task_option.length > 0) {
                    invalid_task_option.remove();
                }
            }
        });
    }

    $("#symbol_picker").find(".symbol_preview").click(function () {
        $("#symbol_picker").find(".symbol_preview").removeClass("selected-symbol-preview");
        $(this).addClass("selected-symbol-preview");

        if ($("input[name=tool_switching]:checked").val() === "select") {
            const symbol = getSelectedSymbol();
            $(".edition_grid").find(".ui-selected").each((_, cell) => {
                setCellSymbol($(cell), symbol);
            });
        }
    });

    $("input[type=radio][name=tool_switching]").change(initializeSelectable);

    // $("#tool_edit").click(() => {
    //     $(this).addClass();
    // });

    $("input[type=text][name=size]").on("keydown", (event) => {
        if (event.keyCode === 13) {
            resizeOutputGrid();
        }
    });

    $("body").keydown((event) => {
        if (event.which === 8) { // Delete
            const selected = $("#output_grid .ui-selected");
            if (selected.length === 0) return;
            selected.each((_, cell) => {
                setCellSymbol($(cell), 0);
            });
        }
        if (event.which === 67) { // Copy
            const selected = $(".ui-selected");
            if (selected.length === 0) return;
            COPY_PASTE_DATA = [];
            selected.each((_, cell) => {
                const x = parseInt($(cell).attr("x"));
                const y = parseInt($(cell).attr("y"));
                const symbol = parseInt($(cell).attr("symbol"));
                COPY_PASTE_DATA.push([x, y, symbol]);
            });
        }
        if (event.which === 86) { // Paste
            if (COPY_PASTE_DATA.length === 0) {
                alert("No data to paste.");
                return;
            }
            const selected = $(".edition_grid").find(".ui-selected");
            if (selected.length === 0) {
                alert("Select a single target cell on the output grid.");
                return;
            }
            const jqGrid = $(selected.parent().parent()[0]);
            if (selected.length === 1) {
                const targetx = parseInt(selected.attr("x"));
                const targety = parseInt(selected.attr("y"));
                const xs = COPY_PASTE_DATA.map(data => data[0]);
                const ys = COPY_PASTE_DATA.map(data => data[1]);
                const symbols = COPY_PASTE_DATA.map(data => data[2]);
                const minx = Math.min(...xs);
                const miny = Math.min(...ys);
                COPY_PASTE_DATA.forEach(([x, y, symbol], i) => {
                    const newx = x - minx + targetx;
                    const newy = y - miny + targety;
                    const res = jqGrid.find(`[x="${newx}"][y="${newy}"]`);
                    if (res.length === 1) {
                        setCellSymbol(res, symbol);
                    }
                });
            } else {
                alert("Paste at a specific location - select one cell as the paste destination.");
            }
        }
        if (event.which === 69) { // 'E' key for edit tool
            $("input[name=tool_switching][value=edit]").prop("checked", true).trigger("change");
        }
        if (event.which === 83) { // 'S' key for select tool
            $("input[name=tool_switching][value=select]").prop("checked", true).trigger("change");
        }
        if (event.which === 70) { // 'F' key for fill tool
            $("input[name=tool_switching][value=floodfill]").prop("checked", true).trigger("change");
        }
        // if (event.which === 48 || event.which === 96) { // '0' key (both main keyboard and numpad)
        //     $(".symbol_preview[symbol='0']").click();
        // }
        // Handle keys 0 through 9 for symbol selection
        if (event.which >= 48 && event.which <= 57) { // Main keyboard 0-9
            const symbolNumber = event.which - 48;
            $(`.symbol_preview[symbol='${symbolNumber}']`).click();
        } else if (event.which >= 96 && event.which <= 105) { // Numpad 0-9
            const symbolNumber = event.which - 96;
            $(`.symbol_preview[symbol='${symbolNumber}']`).click();
        }
    });

    $("#daily-puzzle-start").click(function (event) {
        $(".game").hide().fadeIn();
        $("#daily-puzzle-stats").show();
        $("#daily-puzzle").hide();
        startTimer();
    });
});

$(document).on('click', '#results-copy', function () {
    const timeInSeconds = DAILY_PUZZLE_SHARE_DATA.time;
    const attempts = DAILY_PUZZLE_SHARE_DATA.attempts;
    
    let timeEmoji;
    if (timeInSeconds <= 60) {
        timeEmoji = "⏱️🟩⬜️⬜️⬜️⬜️";
    } else if (timeInSeconds <= 120) {
        timeEmoji = "⏱️🟩🟩⬜️⬜️⬜️";
    } else if (timeInSeconds <= 180) {
        timeEmoji = "⏱️🟨🟨🟨⬜️⬜️";
    } else if (timeInSeconds <= 240) {
        timeEmoji = "⏱️🟨🟨🟨🟨⬜️";
    } else {
        timeEmoji = "⏱️🟥🟥🟥🟥🟥";
    }
    
    let attemptsEmoji;
    if (attempts <= 1) {
        attemptsEmoji = "🤔🟩⬜️⬜️⬜️⬜️";
    } else if (attempts <= 2) {
        attemptsEmoji = "🤔🟩🟩⬜️⬜️⬜️";
    } else if (attempts <= 3) {
        attemptsEmoji = "🤔🟨🟨🟨⬜️⬜️";
    } else if (attempts <= 4) {
        attemptsEmoji = "🤔🟨🟨🟨🟨⬜️";
    } else {
        attemptsEmoji = "🤔🟥🟥🟥🟥🟥";
    }
    
    const resultsText = 'ARC Prize Daily Puzzle\n' +
        'Task: ' + DAILY_PUZZLE_SHARE_DATA.id + '\n\n' +
        timeEmoji + ' ' + formatTime(timeInSeconds) + '\n' +
        attemptsEmoji + ' ' + attempts + (attempts === 1 ? ' attempt\n\n' : ' attempts\n\n') +
        'Can you solve it?\n' +
        'arcprize.org/play';

    navigator.clipboard.writeText(resultsText)
        .then(() => {
            $("#modal-container #copy-success").text("Copied!");
        })
        .catch(err => {
            console.error('Failed to copy results: ', err);
        });
});