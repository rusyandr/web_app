const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const points = [];
const imageSize = 25;
let clusterCount = 3;

const clusterImages = {
    default: loadImage('../assets/star0.png'),
    clusters: []
};
for (let i = 1; i <= 10; i++) {
    clusterImages.clusters.push(loadImage(`../assets/star${i}.png`));
}

function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        cluster: -1
    };
    points.push(point);
    drawPoints();
});

function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    points.forEach(point => {
        let img;
        if (point.cluster === -1) {
            img = clusterImages.default;
        } else {
            const clusterIndex = Math.min(point.cluster, 9);
            img = clusterImages.clusters[clusterIndex];
        }

        if (img.complete) {
            ctx.drawImage(img, point.x - imageSize/2, point.y - imageSize/2, imageSize, imageSize);
        } else {
            drawFallbackPoint(point);
        }
    });
}

function drawFallbackPoint(point) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, imageSize/2, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0000';
    ctx.fill();
}

function kMeans(k = clusterCount, maxIterations = 100) {
    if (points.length < k) {
        return;
    }

    let centroids = [];
    const usedIndices = new Set();
    while (centroids.length < k) {
        const randomIndex = Math.floor(Math.random() * points.length);
        if (!usedIndices.has(randomIndex)) {
            usedIndices.add(randomIndex);
            centroids.push({ x: points[randomIndex].x, y: points[randomIndex].y });
        }
    }

    let changed;
    for (let iter = 0; iter < maxIterations; iter++) {
        changed = false;
        
        points.forEach(point => {
            let minDist = Infinity;
            let newCluster = -1;
            
            centroids.forEach((centroid, cluster) => {
                const dist = Math.hypot(
                    point.x - centroid.x,
                    point.y - centroid.y
                );
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

        if (!changed) break;

        centroids = centroids.map((_, cluster) => {
            const clusterPoints = points.filter(p => p.cluster === cluster);
            if (clusterPoints.length === 0) {
                const randomPoint = points[Math.floor(Math.random() * points.length)];
                return { x: randomPoint.x, y: randomPoint.y };
            }
            
            return {
                x: clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length,
                y: clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length
            };
        });
    }
}

function runClustering() {
    kMeans();
    drawPoints();
}

function clearCanvas() {
    points.length = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function updateClusterValue() {
    clusterCount = document.getElementById('clusterSlider').value;
    document.getElementById('clusterValue').textContent = clusterCount;
}