const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const points = [];
let clusterCount = 3;
let centroids = [];
let animationId = null;

const clusterColors = [
    '#FF5252', '#FFD740', '#64FFDA', '#448AFF', '#B388FF',
    '#FF80AB', '#00BFA5', '#FFAB00', '#7C4DFF', '#D500F9'
];

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

canvas.addEventListener('click', (e) => {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    resetClusters();
    
    const rect = canvas.getBoundingClientRect();
    const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        cluster: -1
    };
    points.push(point);
    drawPoints();
});

function resetClusters() {
    points.forEach(point => {
        point.cluster = -1;
    });
}

function initCentroids(k) {
    centroids = [];
    
    const firstIdx = Math.floor(Math.random() * points.length);
    centroids.push({ x: points[firstIdx].x, y: points[firstIdx].y, isRandom: false });
    
    for (let i = 1; i < k; i++) {
        const distances = points.map(p => {
            const minDist = Math.min(...centroids.map(c => 
                Math.hypot(p.x - c.x, p.y - c.y)
            ));
            return minDist * minDist;
        });
        
        const sum = distances.reduce((a, b) => a + b, 0);
        let threshold = Math.random() * sum;
        let j = 0;
        let runningSum = 0;
        
        while (runningSum < threshold && j < points.length - 1) {
            runningSum += distances[j];
            j++;
        }
        
        centroids.push({ x: points[j].x, y: points[j].y, isRandom: false });
    }
    
    return centroids;
}

function kMeans(k = clusterCount, maxIterations = 100, animate = true) {
    if (points.length < k) {
        alert(`Нужно минимум ${k} точек!`);
        return;
    }

    resetClusters();
    initCentroids(k);
    let iteration = 0;
    let changed = true;
    
    function step() {
        if (!changed || iteration >= maxIterations) {
            if (animate) {
                drawPoints();
                drawCentroids(true);
            }
            return;
        }
        
        changed = false;
        iteration++;
        
        points.forEach(point => {
            let minDist = Infinity;
            let newCluster = -1;
            
            centroids.forEach((centroid, cluster) => {
                const dist = Math.hypot(point.x - centroid.x, point.y - centroid.y);
                if (dist < minDist) {
                    minDist = dist;
                    newCluster = cluster;
                }
            });

            if (point.cluster !== newCluster) {
                point.cluster = newCluster;
                changed = true;
            }
        });
        
        const newCentroids = [];
        const clusterAssignments = Array(k).fill().map(() => []);
        
        points.forEach(point => {
            if (point.cluster !== -1) {
                clusterAssignments[point.cluster].push(point);
            }
        });
        
        clusterAssignments.forEach((clusterPoints, cluster) => {
            if (clusterPoints.length > 0) {
                newCentroids[cluster] = {
                    x: clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length,
                    y: clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length,
                    isRandom: false
                };
            }
        });
        
        const unusedPoints = points.filter(p => 
            !newCentroids.some(c => c && c.x === p.x && c.y === p.y)
        );
        
        clusterAssignments.forEach((clusterPoints, cluster) => {
            if (clusterPoints.length === 0) {
                if (unusedPoints.length > 0) {
                    let farthestPoint = unusedPoints[0];
                    let maxDistance = 0;
                    
                    unusedPoints.forEach(point => {
                        const minDist = Math.min(...newCentroids
                            .filter(c => c)
                            .map(c => Math.hypot(point.x - c.x, point.y - c.y))
                        );
                        if (minDist > maxDistance) {
                            maxDistance = minDist;
                            farthestPoint = point;
                        }
                    });
                    
                    newCentroids[cluster] = {
                        x: farthestPoint.x,
                        y: farthestPoint.y,
                        isRandom: true
                    };
                } else if (points.length > 0) {
                    const randomPoint = points[Math.floor(Math.random() * points.length)];
                    newCentroids[cluster] = {
                        x: randomPoint.x,
                        y: randomPoint.y,
                        isRandom: true
                    };
                }
            }
        });
        
        centroids = newCentroids;
        
        if (animate) {
            drawPoints();
            drawCentroids(false);
            animationId = requestAnimationFrame(step);
        }
    }
    
    if (animate) {
        animationId = requestAnimationFrame(step);
    } else {
        while (changed && iteration < maxIterations) {
            step();
        }
        drawPoints();
        drawCentroids(true);
    }
}

function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (points.some(p => p.cluster !== -1)) {
        drawCentroids(true);
    }
    
    points.forEach(point => {
        if (point.cluster === -1) {
            drawStar(ctx, point.x, point.y, 5, 15, 7, '#ffffff');
        } else {
            const clusterIndex = point.cluster % clusterColors.length;
            drawStar(ctx, point.x, point.y, 5, 15, 7, clusterColors[clusterIndex]);
        }
    });
}

function drawCentroids(final) {
    if (!final) return;
    
    centroids.forEach((centroid, cluster) => {
        const clusterPoints = points.filter(p => p.cluster === cluster);
        if (clusterPoints.length === 0) return;
        
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        clusterPoints.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });
        
        const padding = 30;
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;
        
        ctx.fillStyle = `${clusterColors[cluster]}${Math.floor(0.2 * 255).toString(16).padStart(2, '0')}`;
        ctx.beginPath();
        ctx.roundRect(minX, minY, maxX - minX, maxY - minY, 20);
        ctx.fill();
        
        ctx.strokeStyle = clusterColors[cluster];
        ctx.lineWidth = 3;
        ctx.stroke();
    });
}

function runClustering() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    kMeans(clusterCount, 100, true);
}

function clearCanvas() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    points.length = 0;
    centroids = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function updateClusterValue() {
    const value = parseInt(document.getElementById('clusterSlider').value);
    clusterCount = Math.max(1, value);
    document.getElementById('clusterValue').textContent = clusterCount;
}