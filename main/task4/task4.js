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
pointImage.src = '../assets/stone.png';

function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const imageSize = Math.min(20, canvas.width * 0.02);
    
    points.forEach(p => {
        const x = p.rx * canvas.width;
        const y = p.ry * canvas.height;
        
        const clampedX = Math.max(imageSize, Math.min(x, canvas.width - imageSize));
        const clampedY = Math.max(imageSize, Math.min(y, canvas.height - imageSize));
        
        ctx.drawImage(pointImage, 
            clampedX - imageSize*1.25, 
            clampedY - imageSize*1.25, 
            imageSize*2.5, 
            imageSize*2.5);
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

async function antColonyOptimization({
    alpha = 1, 
    beta = 5, 
    evaporation = 0.5, 
    Q = 100, 
    iterations = 200, 
    antCount = points.length
} = {}) {
    isAlgorithmRunning = true;
    statusElement.textContent = "Статус: выполняется...";

    const n = points.length;
    const pheromones = Array.from({ length: n }, () => Array(n).fill(1));
    const distances = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) =>
            i === j ? 0 : distance(points[i], points[j])
        )
    );

    for (let iter = 0; iter < iterations; iter++) {
        const antPaths = [];
        const pathLengths = [];

        for (let ant = 0; ant < antCount; ant++) {
            const path = [Math.floor(Math.random() * n)];
            const visited = new Set(path);

            while (path.length < n) {
                const last = path[path.length - 1];
                const probabilities = [];

                let sum = 0;
                for (let j = 0; j < n; j++) {
                    if (!visited.has(j)) {
                        const tau = pheromones[last][j] ** alpha;
                        const eta = (1 / distances[last][j]) ** beta;
                        const prob = tau * eta;
                        probabilities.push({ j, prob });
                        sum += prob;
                    }
                }

                const rand = Math.random() * sum;
                let acc = 0;
                let nextCity = -1;
                for (const { j, prob } of probabilities) {
                    acc += prob;
                    if (rand <= acc) {
                        nextCity = j;
                        break;
                    }
                }

                path.push(nextCity);
                visited.add(nextCity);
            }

            antPaths.push(path);
            const len = calculatePerimeter(path);
            pathLengths.push(len);

            if (len < bestLength) {
                bestLength = len;
                bestPath = path.slice();
                drawPath(bestPath);
                await sleep(30);
            }
        }

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                pheromones[i][j] *= (1 - evaporation);
            }
        }

        for (let k = 0; k < antCount; k++) {
            const path = antPaths[k];
            const len = pathLengths[k];
            const delta = Q / len;

            for (let i = 0; i < path.length - 1; i++) {
                const a = path[i];
                const b = path[i + 1];
                pheromones[a][b] += delta;
                pheromones[b][a] += delta;
            }

            const last = path[path.length - 1];
            const first = path[0];
            pheromones[last][first] += delta;
            pheromones[first][last] += delta;
        }
    }

    statusElement.textContent = "Статус: завершено";
    isAlgorithmRunning = false;
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
        ctx.drawImage(pointImage, clampedX - imageSize*1.25, clampedY - imageSize*1.25, imageSize*2.5, imageSize*2.5);
    });

    if (path.length > 0 && points.length > 0) {
        ctx.strokeStyle = "gray";
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
        await antColonyOptimization();
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