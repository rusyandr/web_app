const mapContainer = document.getElementById('mapContainer');
const mapSizeInput = document.getElementById('mapSize');
const generateMapButton = document.getElementById('generateMap');
const generateMazeButton = document.getElementById('generateMaze');
const setStartButton = document.getElementById('setStart');
const setEndButton = document.getElementById('setEnd');
const findPathButton = document.getElementById('findPath');
const clearMapButton = document.getElementById('clearMap');
const resultParagraph = document.getElementById('result');
const speedControl = document.getElementById('speedControl');

let mapSize = parseInt(mapSizeInput.value);
let map = [];
let start = null;
let end = null;
let isSettingStart = false;
let isSettingEnd = false;
let animationSpeed = 100 - speedControl.value;
let animationInterval;
let isAnimating = false;

function generateMap(size) {
    stopAnimation();
    mapSize = size;
    map = [];
    mapContainer.innerHTML = '';
    mapContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    for (let row = 0; row < size; row++) {
        map[row] = [];
        for (let col = 0; col < size; col++) {
            map[row][col] = 0;
            const cell = createCell(row, col);
            mapContainer.appendChild(cell);
        }
    }
}

function createCell(row, col) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = row;
    cell.dataset.col = col;
    
    cell.addEventListener('click', function(event) {
        if (event.target === cell) {
            cellClickHandler(event);
        }
    });
    
    cell.addEventListener('click', function(event) {
        if (event.target.closest('.path-arrow')) {
            event.stopPropagation();
            stopAnimation();
            map[row][col] = 1;
            cell.classList.add('wall');
            cell.classList.remove('path');
        }
    });
    
    return cell;
}

async function generateMaze(size) {
    stopAnimation();
    generateMap(size);
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            map[row][col] = 1;
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            cell.classList.add('wall');
        }
    }
    
    let startRow = Math.floor(Math.random() * (size / 2)) * 2 + 1;
    let startCol = Math.floor(Math.random() * (size / 2)) * 2 + 1;
    
    let frontier = [[startRow, startCol, startRow, startCol]];
    map[startRow][startCol] = 0;
    document.querySelector(`.cell[data-row="${startRow}"][data-col="${startCol}"]`).classList.remove('wall');
    
    while (frontier.length > 0) {
        const [row, col, parentRow, parentCol] = frontier.splice(Math.floor(Math.random() * frontier.length), 1)[0];
        
        if (map[row][col] === 1) {
            map[row][col] = 0;
            map[parentRow][parentCol] = 0;
            
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            const parentCell = document.querySelector(`.cell[data-row="${parentRow}"][data-col="${parentCol}"]`);
            
            cell.classList.remove('wall');
            parentCell.classList.remove('wall');
            
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        if (row >= 2 && map[row - 2][col] === 1) frontier.push([row - 2, col, row - 1, col]);
        if (col >= 2 && map[row][col - 2] === 1) frontier.push([row, col - 2, row, col - 1]);
        if (row < size - 2 && map[row + 2][col] === 1) frontier.push([row + 2, col, row + 1, col]);
        if (col < size - 2 && map[row][col + 2] === 1) frontier.push([row, col + 2, row, col + 1]);
    }
}

function cellClickHandler(event) {
    if (isAnimating) return;
    
    const row = parseInt(event.currentTarget.dataset.row);
    const col = parseInt(event.currentTarget.dataset.col);

    if (isSettingStart) {
        if (map[row][col] === 1) return;
        if (start) document.querySelector(`.cell[data-row="${start.row}"][data-col="${start.col}"]`).classList.remove('start');
        start = { row, col };
        event.currentTarget.classList.add('start');
        isSettingStart = false;
        setStartButton.disabled = false;
        stopAnimation();
    } else if (isSettingEnd) {
        if (map[row][col] === 1) return;
        if (end) document.querySelector(`.cell[data-row="${end.row}"][data-col="${end.col}"]`).classList.remove('end');
        end = { row, col };
        event.currentTarget.classList.add('end');
        isSettingEnd = false;
        setEndButton.disabled = false;
        stopAnimation();
    } else {
        if ((start && start.row === row && start.col === col) || (end && end.row === row && end.col === col)) return;
        
        stopAnimation();
        
        map[row][col] = map[row][col] === 0 ? 1 : 0;
        event.currentTarget.classList.toggle('wall');
        
        if (map[row][col] === 1) {
            event.currentTarget.classList.remove('path');
            const arrow = event.currentTarget.querySelector('.path-arrow');
            if (arrow) arrow.remove();
        }
    }
}

function stopAnimation() {
    clearInterval(animationInterval);
    isAnimating = false;
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('visited', 'frontier', 'path', 'current');
        cell.querySelectorAll('.path-arrow').forEach(arrow => arrow.remove());
    });
    if (start) document.querySelector(`.cell[data-row="${start.row}"][data-col="${start.col}"]`).classList.add('start');
    if (end) document.querySelector(`.cell[data-row="${end.row}"][data-col="${end.col}"]`).classList.add('end');
}

function heuristic(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function findPath() {
    if (!start || !end) {
        resultParagraph.textContent = "Установите старт и финиш.";
        return;
    }
    
    stopAnimation();
    isAnimating = true;
    
    const openSet = [];
    const closedSet = [];
    
    const startNode = {
        row: start.row,
        col: start.col,
        gScore: 0,
        fScore: heuristic(start, end),
        cameFrom: null
    };
    
    openSet.push(startNode);
    
    function animationStep() {
        if (openSet.length === 0) {
            stopAnimation();
            resultParagraph.textContent = "Путь не найден.";
            return;
        }
        
        let current = openSet.reduce((min, node) => node.fScore < min.fScore ? node : min, openSet[0]);
        const currentIndex = openSet.indexOf(current);
        const currentCell = document.querySelector(`.cell[data-row="${current.row}"][data-col="${current.col}"]`);
        currentCell.classList.add('current');
        
        if (current.row === end.row && current.col === end.col) {
            stopAnimation();
            const path = reconstructPath(current);
            animatePath(path);
            resultParagraph.textContent = `Путь найден! Длина: ${path.length-1}`;
            return;
        }
        
        openSet.splice(currentIndex, 1);
        closedSet.push(current);
        
        getNeighbors(current.row, current.col).forEach(neighbor => {
            if (map[neighbor.row][neighbor.col] === 1 || closedSet.some(n => n.row === neighbor.row && n.col === neighbor.col)) {
                return;
            }
            
            const tentativeGScore = current.gScore + 1;
            let neighborNode = openSet.find(n => n.row === neighbor.row && n.col === neighbor.col);
            
            if (!neighborNode || tentativeGScore < neighborNode.gScore) {
                neighborNode = {
                    row: neighbor.row,
                    col: neighbor.col,
                    gScore: tentativeGScore,
                    fScore: tentativeGScore + heuristic(neighbor, end),
                    cameFrom: current
                };
                
                if (!openSet.some(n => n.row === neighbor.row && n.col === neighbor.col)) {
                    openSet.push(neighborNode);
                    const neighborCell = document.querySelector(`.cell[data-row="${neighbor.row}"][data-col="${neighbor.col}"]`);
                    if (!neighborCell.classList.contains('start') && !neighborCell.classList.contains('end')) {
                        neighborCell.classList.add('frontier');
                    }
                }
            }
        });
        
        setTimeout(() => {
            if (!currentCell.classList.contains('start') && !currentCell.classList.contains('end')) {
                currentCell.classList.remove('current', 'frontier');
                currentCell.classList.add('visited');
            }
        }, animationSpeed / 2);
    }
    
    animationInterval = setInterval(animationStep, animationSpeed);
}

function getNeighbors(row, col) {
    const neighbors = [];
    if (row > 0) neighbors.push({ row: row - 1, col });
    if (row < mapSize - 1) neighbors.push({ row: row + 1, col });
    if (col > 0) neighbors.push({ row, col: col - 1 });
    if (col < mapSize - 1) neighbors.push({ row, col: col + 1 });
    return neighbors;
}

function reconstructPath(current) {
    const path = [];
    while (current) {
        path.unshift(current);
        current = current.cameFrom;
    }
    return path;
}

async function animatePath(path) {
    document.querySelectorAll('.path, .path-arrow').forEach(el => el.remove());
    
    for (let i = 0; i < path.length; i++) {
        const point = path[i];
        const cell = document.querySelector(`.cell[data-row="${point.row}"][data-col="${point.col}"]`);
        if (!cell || cell.classList.contains('start') || cell.classList.contains('end')) continue;
        
        cell.classList.add('path');
        
        if (i < path.length - 1) {
            const next = path[i + 1];
            const arrow = document.createElement('div');
            arrow.className = 'path-arrow';
            
            let svgPath = '';
            if (next.row < point.row) svgPath = 'M12 4l-8 8h5v8h6v-8h5z';
            else if (next.row > point.row) svgPath = 'M12 20l-8-8h5v-8h6v8h5z';
            else if (next.col < point.col) svgPath = 'M4 12l8-8v5h8v6h-8v5z';
            else svgPath = 'M20 12l-8 8v-5h-8v-6h8v-5z';
            
            arrow.innerHTML = `
                <svg viewBox="0 0 24 24" class="arrow-svg">
                    <path d="${svgPath}"/>
                </svg>
            `;
            
            cell.appendChild(arrow);
        }
        
        cell.style.transform = 'scale(1.1)';
        setTimeout(() => {
            cell.style.transform = 'scale(1)';
        }, 200);
        
        await new Promise(resolve => setTimeout(resolve, animationSpeed / 2));
    }
}

function clearMap() {
    stopAnimation();
    map = [];
    mapContainer.innerHTML = '';
    start = null;
    end = null;
    isSettingStart = false;
    isSettingEnd = false;
    setStartButton.disabled = false;
    setEndButton.disabled = false;
    resultParagraph.textContent = "";
    generateMap(mapSize);
}

generateMapButton.addEventListener('click', () => {
    generateMap(parseInt(mapSizeInput.value));
    start = null;
    end = null;
    resultParagraph.textContent = "";
});

generateMazeButton.addEventListener('click', () => {
    generateMaze(parseInt(mapSizeInput.value));
    start = null;
    end = null;
    resultParagraph.textContent = "";
});

setStartButton.addEventListener('click', () => {
    if (isAnimating) return;
    isSettingStart = true;
    isSettingEnd = false;
    setStartButton.disabled = true;
    setEndButton.disabled = false;
});

setEndButton.addEventListener('click', () => {
    if (isAnimating) return;
    isSettingEnd = true;
    isSettingStart = false;
    setEndButton.disabled = true;
    setStartButton.disabled = false;
});

findPathButton.addEventListener('click', findPath);
clearMapButton.addEventListener('click', clearMap); 

speedControl.addEventListener('input', () => {
    animationSpeed = 100 - speedControl.value;
});

generateMap(mapSize);