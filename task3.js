const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 400;
canvas.height = 400;
document.body.appendChild(canvas);

let points = [];
let bestLength = Infinity;
let bestPath = [];
let isAlgorithmRunning = false;

const pointImage = new Image();
pointImage.src = 'main/assets/star.png';

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
    drawPoints();
    displayPerimeter(bestLength);
    bestLengthText.innerText = 'Минимальная длина пути: ';
    statusText.innerText = 'Статус: Ожидание ввода точек';
});

canvas.addEventListener('click', (e) => {
    if (isAlgorithmRunning) return;
    points.push({ x: e.offsetX, y: e.offsetY });
    if (!isAlgorithmRunning) {
        bestPath = [];
        bestLength = Infinity;
        drawPoints();
        bestLengthText.innerText = 'Минимальная длина пути: ';
        statusText.innerText = `Статус: Добавлено точек: ${points.length}`;
    }
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

function calculatePerimeter(path) {
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
    statusText.innerText = 'Статус: Алгоритм выполняется...';

    let populationSize = 5000;
    let generations = 10000;
    let stagnationCounter = 0;
    
    let population = Array.from({ length: populationSize }, () => 
        [...Array(points.length).keys()].sort(() => Math.random() - 0.5)
    );

    for (let gen = 0; gen < generations; gen++) {
        population.forEach(individual => {
            individual.fitness = 1 / (calculatePerimeter(individual) + 1);
        });

        population.sort((a, b) => b.fitness - a.fitness);

        const currentBestPath = population[0];
        const currentBestLength = calculatePerimeter(currentBestPath);

        if (currentBestLength < bestLength) {
            bestLength = currentBestLength;
            bestPath = [...currentBestPath];
            drawPath(bestPath);
            stagnationCounter = 0;
            bestLengthText.innerText = `Минимальная длина пути: ${bestLength.toFixed(2)} пикселей`;
            statusText.innerText = 'Статус: Оптимизация продолжается';
        } else {
            stagnationCounter++;
        }

        if (stagnationCounter > 100) break;

        let newPopulation = population.slice(0, populationSize / 2);

        while (newPopulation.length < populationSize) {
            const parentA = newPopulation[Math.floor(Math.random() * newPopulation.length)];
            const parentB = newPopulation[Math.floor(Math.random() * newPopulation.length)];
            const child = pmxCrossover(parentA, parentB);
            mutate(child);
            newPopulation.push(child);
        }

        population = newPopulation;
        await new Promise(resolve => setTimeout(resolve, 1));
    }

    bestPath = localOptimization(bestPath);
    drawPath(bestPath);
    isAlgorithmRunning = false;
    bestLengthText.innerText = `Минимальная длина пути: ${bestLength.toFixed(2)} пикселей`;
    statusText.innerText = 'Статус: Алгоритм завершен';
}

function pmxCrossover(parentA, parentB) {
    const size = parentA.length;
    const start = Math.floor(Math.random() * size);
    const end = Math.floor(Math.random() * size);
    const child = Array(size).fill(null);
    
    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
        child[i] = parentA[i];
    }
    
    let fillIndex = 0;
    for (let i = 0; i < size; i++) {
        if (!child.includes(parentB[i])) {
            while (child[fillIndex] !== null) fillIndex++;
            child[fillIndex] = parentB[i];
        }
    }
    return child;
}

function mutate(path) {
    if (Math.random() < 0.05) {
        const a = Math.floor(Math.random() * path.length);
        const b = Math.floor(Math.random() * path.length);
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        path.splice(min, max - min + 1, ...path.slice(min, max + 1).reverse());
    }
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

function drawPath(path) {
    drawPoints();
    ctx.strokeStyle = "violet";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[path[0]].x, points[path[0]].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(points[path[i]].x, points[path[i]].y);
    }
    ctx.lineTo(points[path[0]].x, points[path[0]].y);
    ctx.stroke();
}

document.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && points.length > 2) {
        await geneticAlgorithm();
        drawPath(bestPath);
    }
});