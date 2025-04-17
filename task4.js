const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 400;
canvas.height = 400;
document.body.appendChild(canvas);

let points = [];
let bestLength = Infinity;
let bestPath = [];
let isAlgorithmRunning = false;

const pheromones = new Map();
const evaporationRate = 0.5;
const alpha = 1;
const beta = 2;
const antsCount = 50;
const iterations = 500;

const pointImage = new Image();
pointImage.src = 'main/assets/ant.png';

const clearButton = document.createElement('button');
clearButton.innerText = 'Очистить';
document.body.appendChild(clearButton);

const statusContainer = document.createElement('div');
statusContainer.style.fontSize = '18px';
statusContainer.style.marginTop = '10px';
document.body.appendChild(statusContainer);

const bestLengthText = document.createElement('div');
const statusText = document.createElement('div');
statusContainer.appendChild(bestLengthText);
statusContainer.appendChild(statusText);

clearButton.addEventListener('click', () => {
    points = [];
    bestLength = Infinity;
    bestPath = [];
    isAlgorithmRunning = false;
    pheromones.clear();
    drawPoints();
    bestLengthText.innerText = 'Минимальная длина пути: ';
    statusText.innerText = 'Статус: Ожидание ввода точек';
});

canvas.addEventListener('click', (e) => {
    if (isAlgorithmRunning) return;
    points.push({ x: e.offsetX, y: e.offsetY });
    bestPath = [];
    bestLength = Infinity;
    drawPoints();
    bestLengthText.innerText = 'Минимальная длина пути: ';
    statusText.innerText = `Статус: Добавлено точек: ${points.length}`;
});

pointImage.onload = () => {
    drawPoints();
    bestLengthText.innerText = 'Минимальная длина пути: ';
    statusText.innerText = 'Статус: Ожидание ввода точек';
};

function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const imageWidth = 15;
    const imageHeight = 15;
    points.forEach(p => ctx.drawImage(pointImage, p.x - imageWidth / 2, p.y - imageHeight / 2, imageWidth, imageHeight));
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function initializePheromones() {
    pheromones.clear();
    for (let i = 0; i < points.length; i++) {
        for (let j = 0; j < points.length; j++) {
            if (i !== j) {
                pheromones.set(`${i}-${j}`, 1);
            }
        }
    }
}

async function antColonyOptimization() {
    if (points.length <= 2) return;
    isAlgorithmRunning = true;

    statusText.innerText = 'Статус: Алгоритм выполняется...';
    initializePheromones();

    for (let iter = 0; iter < iterations; iter++) {
        let newBestPath = null;
        let newBestLength = Infinity;

        for (let ant = 0; ant < antsCount; ant++) {
            let path = constructSolution();
            let length = calculatePerimeter(path);
            if (length < newBestLength) {
                newBestLength = length;
                newBestPath = path;
            }
        }

        updatePheromones(newBestPath, newBestLength);

        const optimizedPath = removeCrossovers(newBestPath);
        const optimizedLength = calculatePerimeter(optimizedPath);

        if (optimizedLength < bestLength) {
            bestLength = optimizedLength;
            bestPath = optimizedPath;
            drawPath(bestPath);
            bestLengthText.innerText = `Минимальная длина пути: ${bestLength.toFixed(2)} пикселей`;
            statusText.innerText = 'Статус: Оптимизация продолжается';
        }

        await new Promise(resolve => setTimeout(resolve, 1));
    }

    isAlgorithmRunning = false;
    bestLengthText.innerText = `Минимальная длина пути: ${bestLength.toFixed(2)} пикселей`;
    statusText.innerText = 'Статус: Алгоритм завершен';
}

function constructSolution() {
    let unvisited = [...Array(points.length).keys()];
    let path = [unvisited.splice(Math.floor(Math.random() * unvisited.length), 1)[0]];

    while (unvisited.length > 0) {
        let last = path[path.length - 1];
        let probabilities = unvisited.map(next => {
            let tau = pheromones.get(`${last}-${next}`) ** alpha;
            let eta = (1 / distance(points[last], points[next])) ** beta;
            return tau * eta;
        });

        let sum = probabilities.reduce((a, b) => a + b, 0);
        let rand = Math.random() * sum;
        let cumulative = 0;
        for (let i = 0; i < probabilities.length; i++) {
            cumulative += probabilities[i];
            if (rand <= cumulative) {
                path.push(unvisited.splice(i, 1)[0]);
                break;
            }
        }
    }

    return removeCrossovers(path);
}

function updatePheromones(path, length) {
    for (let key of pheromones.keys()) {
        pheromones.set(key, pheromones.get(key) * (1 - evaporationRate));
    }

    for (let i = 0; i < path.length - 1; i++) {
        let key = `${path[i]}-${path[i + 1]}`;
        pheromones.set(key, pheromones.get(key) + 1 / length);
    }
    let key = `${path[path.length - 1]}-${path[0]}`;
    pheromones.set(key, pheromones.get(key) + 1 / length);
}

function calculatePerimeter(path) {
    let perimeter = 0;
    for (let i = 0; i < path.length - 1; i++) {
        perimeter += distance(points[path[i]], points[path[i + 1]]);
    }
    perimeter += distance(points[path[path.length - 1]], points[path[0]]);
    return perimeter;
}

function drawPath(path) {
    drawPoints();
    ctx.strokeStyle = "brown";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[path[0]].x, points[path[0]].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(points[path[i]].x, points[path[i]].y);
    }
    ctx.lineTo(points[path[0]].x, points[path[0]].y);
    ctx.stroke();
}

function removeCrossovers(path) {
    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 0; i < path.length - 2; i++) {
            for (let j = i + 2; j < path.length; j++) {
                if (j === path.length - 1 && i === 0) continue;

                let A = points[path[i]];
                let B = points[path[i + 1]];
                let C = points[path[j]];
                let D = points[path[(j + 1) % path.length]];

                if (segmentsCrossover(A, B, C, D)) {
                    path = reverseSegment(path, i + 1, j);
                    improved = true;
                }
            }
        }
    }
    return path;
}

function segmentsCrossover(A, B, C, D) {
    function ccw(P, Q, R) {
        return (R.y - P.y) * (Q.x - P.x) > (Q.y - P.y) * (R.x - P.x);
    }
    return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

function reverseSegment(path, i, j) {
    return [...path.slice(0, i), ...path.slice(i, j + 1).reverse(), ...path.slice(j + 1)];
}

document.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && points.length > 2) {
        await antColonyOptimization();
        drawPath(bestPath);
    }
});