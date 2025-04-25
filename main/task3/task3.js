const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const clearButton = document.getElementById('clearButton');

const statusElement = document.getElementById('status');
const lengthElement = document.getElementById('length');
const pointsElement = document.getElementById('points');

function resizeCanvas() {
    const container = document.querySelector('.canvas-container');
    const maxWidth = container.clientWidth;
    const maxHeight = window.innerHeight * 0.7;

    const width = Math.min(maxWidth, maxHeight * (4/3));
    const height = width * (3/4);

    canvas.width = width;
    canvas.height = height;

    drawPoints();
}

let points = [];
let bestLength = Infinity;
let bestPath = [];
let isAlgorithmRunning = false;

const pointImage = new Image();
pointImage.src = '../assets/gen.png';

function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const imageSize = Math.min(20, canvas.width * 0.02);

    points.forEach(p => {
        const x = p.rx * canvas.width;
        const y = p.ry * canvas.height;

        const clampedX = Math.max(imageSize, Math.min(x, canvas.width - imageSize));
        const clampedY = Math.max(imageSize, Math.min(y, canvas.height - imageSize));

        ctx.drawImage(pointImage,
            clampedX - imageSize * 1.25,
            clampedY - imageSize * 1.25,
            imageSize * 2.5,
            imageSize * 2.5);
    });

    if (bestPath.length > 0) {
        drawPath(bestPath);
    }
    displayPerimeter(bestLength);
}

clearButton.addEventListener('click', () => {
    points = [];
    bestLength = Infinity;
    bestPath = [];
    isAlgorithmRunning = false;
    statusElement.textContent = "Статус: очищено";
    lengthElement.textContent = "Длина пути: N/A";
    pointsElement.textContent = "Точек: 0";
    drawPoints();
});

canvas.addEventListener('click', (e) => {
    if (isAlgorithmRunning) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rx = x / rect.width;
    const ry = y / rect.height;

    points.push({ rx, ry });
    pointsElement.textContent = `Точек: ${points.length}`;

    if (!isAlgorithmRunning) {
        bestPath = [];
        bestLength = Infinity;
        lengthElement.textContent = "Длина пути: N/A";
        drawPoints();
    }
});

function distance(a, b) {
    const x1 = a.rx * canvas.width;
    const y1 = a.ry * canvas.height;
    const x2 = b.rx * canvas.width;
    const y2 = b.ry * canvas.height;

    return Math.hypot(x1 - x2, y1 - y2);
}

function calculatePerimeter(path) {
    if (path.length < 2) return Infinity;

    let perimeter = 0;
    for (let i = 0; i < path.length - 1; i++) {
        perimeter += distance(points[path[i]], points[path[i + 1]]);
        if (perimeter > bestLength) return Infinity;
    }
    perimeter += distance(points[path[path.length - 1]], points[path[0]]);
    return perimeter;
}

async function geneticAlgorithm() {
    if (points.length <= 2) return;

    isAlgorithmRunning = true;
    statusElement.textContent = "Статус: выполняется...";

    const popSize = 1000;
    const generations = 300;
    let population = Array.from({ length: popSize }, () =>
        [...Array(points.length).keys()].sort(() => Math.random() - 0.5)
    );

    for (let gen = 0; gen < generations; gen++) {
        population.forEach(ind => ind.fitness = 1 / (calculatePerimeter(ind) + 1));
        population.sort((a, b) => b.fitness - a.fitness);

        const elite = population.slice(0, 10);
        const newPop = [...elite];

        while (newPop.length < popSize) {
            const parent = elite[Math.floor(Math.random() * elite.length)];
            const child = mutate([...parent]);
            newPop.push(child);
        }

        population = newPop;

        const top = population[0];
        const len = calculatePerimeter(top);
        if (len < bestLength) {
            bestLength = len;
            bestPath = [...top];
            drawPath(bestPath);
        }

        await new Promise(r => setTimeout(r, 1));
    }

    bestPath = localOptimization(bestPath);
    drawPath(bestPath);
    isAlgorithmRunning = false;
    statusElement.textContent = "Статус: завершено";
}

function mutate(path) {
    if (Math.random() < 0.3) {
        const i = Math.floor(Math.random() * path.length);
        const j = Math.floor(Math.random() * path.length);
        [path[i], path[j]] = [path[j], path[i]];
    }
    return path;
}

function localOptimization(path) {
    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 0; i < path.length - 1; i++) {
            for (let j = i + 2; j < path.length; j++) {
                if (j === path.length - 1 && i === 0) continue;
                let newPath = [...path];
                newPath.splice(i + 1, j - i, ...path.slice(i + 1, j + 1).reverse());
                if (calculatePerimeter(newPath) < calculatePerimeter(path)) {
                    path = newPath;
                    improved = true;
                }
            }
        }
    }
    return path;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function drawPath(path) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const imageSize = Math.min(20, canvas.width * 0.02);

    points.forEach(p => {
        const x = p.rx * canvas.width;
        const y = p.ry * canvas.height;
        const clampedX = Math.max(imageSize, Math.min(x, canvas.width - imageSize));
        const clampedY = Math.max(imageSize, Math.min(y, canvas.height - imageSize));
        ctx.drawImage(pointImage, clampedX - imageSize * 1.25, clampedY - imageSize * 1.25, imageSize * 2.5, imageSize * 2.5);
    });

    if (path.length > 0 && points.length > 0) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 4;
        ctx.beginPath();

        const firstPoint = points[path[0]];
        const startX = firstPoint.rx * canvas.width;
        const startY = firstPoint.ry * canvas.height;
        ctx.moveTo(startX, startY);

        for (let i = 1; i < path.length; i++) {
            const point = points[path[i]];
            const x = point.rx * canvas.width;
            const y = point.ry * canvas.height;
            ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.stroke();
    }

    displayPerimeter(bestLength);
}

function displayPerimeter(perimeter) {
    const lengthText = perimeter !== Infinity ? perimeter.toFixed(2) : "N/A";
    lengthElement.textContent = `Длина пути: ${lengthText}`;
}

document.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && points.length > 2 && !isAlgorithmRunning) {
        await geneticAlgorithm();
        drawPath(bestPath); 
    }
});

window.addEventListener('load', () => {
    resizeCanvas();
    pointImage.onload = () => {
        if (points.length > 0) drawPoints();
    };
});

window.addEventListener('resize', () => {
    resizeCanvas();
});

pointImage.onload = () => {
    drawPoints();
};