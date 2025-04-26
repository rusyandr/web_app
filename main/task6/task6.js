const drawingArea = document.querySelector('#canva');
drawingArea.willReadFrequently = true;
const drawingContext = drawingArea.getContext('2d');

drawingContext.fillStyle = '#ffffff';
drawingContext.fillRect(0, 0, drawingArea.width, drawingArea.height);
drawingContext.fillStyle = '#000000';

document.querySelector('#clearButton').addEventListener('click', resetCanvas);
document.querySelector('#startButton').addEventListener('click', processDigit);

let isDrawing = false;
let lastX = 0;
let lastY = 0;
const BRUSH_DIAMETER = 25;
const BRUSH_RADIUS = BRUSH_DIAMETER / 2;

function beginDrawing(event) {
    isDrawing = true;
    const position = getRelativePosition(event);
    lastX = position.x;
    lastY = position.y;
    sketch(event);
}

function stopDrawing() {
    isDrawing = false;
    drawingContext.beginPath();
}

function sketch(event) {
    if (!isDrawing) return;

    const position = getRelativePosition(event);
    const currentX = position.x;
    const currentY = position.y;

    drawingContext.lineJoin = 'round';
    drawingContext.lineCap = 'round';
    drawingContext.lineWidth = BRUSH_DIAMETER;
    drawingContext.strokeStyle = '#000000';
    
    drawingContext.beginPath();
    drawingContext.moveTo(lastX, lastY);
    drawingContext.lineTo(currentX, currentY);
    drawingContext.stroke();

    drawingContext.beginPath();
    drawingContext.arc(currentX, currentY, BRUSH_RADIUS, 0, Math.PI * 2);
    drawingContext.fill();

    lastX = currentX;
    lastY = currentY;
}

function getRelativePosition(event) {
    const canvasRect = drawingArea.getBoundingClientRect();
    return {
        x: event.clientX - canvasRect.left,
        y: event.clientY - canvasRect.top
    };
}

drawingArea.addEventListener('mousedown', beginDrawing);
drawingArea.addEventListener('mouseup', stopDrawing);
drawingArea.addEventListener('mousemove', sketch);
drawingArea.addEventListener('mouseleave', stopDrawing);

function resetCanvas() {
    drawingContext.clearRect(0, 0, drawingArea.width, drawingArea.height);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fillRect(0, 0, drawingArea.width, drawingArea.height);
    drawingContext.fillStyle = '#000000';
    document.getElementById('result').textContent = 'Напишите цифру ';
}

let weightsLayer1, biasesLayer1, weightsLayer2, biasesLayer2;

async function initializeModel() {
    try {
        const [w1, b1, w2, b2] = await Promise.all([
            loadTextFile('W1.txt'),
            loadTextFile('b1.txt'),
            loadTextFile('W2.txt'),
            loadTextFile('b2.txt')
        ]);
        
        weightsLayer1 = convertToMatrix(w1);
        biasesLayer1 = convertToVector(b1);
        weightsLayer2 = convertToMatrix(w2);
        biasesLayer2 = convertToVector(b2);
    } catch (error) {
        console.error('Ошибка загрузки весов:', error);
    }
}

async function loadTextFile(url) {
    const response = await fetch(url);
    return await response.text();
}

function convertToMatrix(text) {
    return text.trim().split('\n').map(row => row.trim().split(' ').map(Number));
}

function convertToVector(text) {
    return text.trim().split(' ').map(Number);
}

function prepareDigitData() {
    const imageData = drawingContext.getImageData(0, 0, drawingArea.width, drawingArea.height);
    const pixelData = imageData.data;
    const thresholdValue = 0.5 * 255;

    let bounds = findDrawingBounds(pixelData, thresholdValue);
    if (!bounds.hasDrawing) {
        return new Array(28 * 28).fill(0);
    }

    bounds = adjustBoundsWithPadding(bounds, 2, drawingArea.width, drawingArea.height);

    return createNormalizedImage(bounds);
}

function findDrawingBounds(pixels, threshold) {
    let bounds = {
        minX: drawingArea.width,
        minY: drawingArea.height,
        maxX: 0,
        maxY: 0,
        hasDrawing: false
    };

    for (let y = 0; y < drawingArea.height; y++) {
        for (let x = 0; x < drawingArea.width; x++) {
            const pixelIndex = (y * drawingArea.width + x) * 4;
            const brightness = (pixels[pixelIndex] + pixels[pixelIndex+1] + pixels[pixelIndex+2]) / 3;
            
            if (brightness < threshold) {
                bounds.hasDrawing = true;
                bounds.minX = Math.min(bounds.minX, x);
                bounds.maxX = Math.max(bounds.maxX, x);
                bounds.minY = Math.min(bounds.minY, y);
                bounds.maxY = Math.max(bounds.maxY, y);
            }
        }
    }

    return bounds;
}

function adjustBoundsWithPadding(bounds, padding, maxWidth, maxHeight) {
    return {
        ...bounds,
        minX: Math.max(0, bounds.minX - padding),
        minY: Math.max(0, bounds.minY - padding),
        maxX: Math.min(maxWidth - 1, bounds.maxX + padding),
        maxY: Math.min(maxHeight - 1, bounds.maxY + padding)
    };
}

function createNormalizedImage(bounds) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempContext = tempCanvas.getContext('2d');
    
    tempContext.fillStyle = 'white';
    tempContext.fillRect(0, 0, 28, 28);
    
    const digitWidth = bounds.maxX - bounds.minX + 1;
    const digitHeight = bounds.maxY - bounds.minY + 1;
    const maxSize = 20;
    
    const scaleFactor = Math.min(maxSize / digitWidth, maxSize / digitHeight);
    const scaledWidth = Math.floor(digitWidth * scaleFactor);
    const scaledHeight = Math.floor(digitHeight * scaleFactor);
    
    const offsetX = Math.floor((28 - scaledWidth) / 2);
    const offsetY = Math.floor((28 - scaledHeight) / 2);
    
    tempContext.drawImage(
        drawingArea, 
        bounds.minX, bounds.minY, digitWidth, digitHeight,
        offsetX, offsetY, scaledWidth, scaledHeight
    );
    return convertToNormalizedArray(tempContext);
}

function convertToNormalizedArray(context) {
    const imageData = context.getImageData(0, 0, 28, 28).data;
    const normalized = new Array(28 * 28);
    
    for (let i = 0, j = 0; i < imageData.length; i += 4, j++) {
        const r = imageData[i];
        const g = imageData[i+1];
        const b = imageData[i+2];
        const brightness = (r + g + b) / 3;
        normalized[j] = Math.min(1, (255 - brightness) / 255);
    }

    return normalized;
}

function processDigit() {
    const inputArray = prepareDigitData();
    const prediction = makePrediction([inputArray]);
    const digit = findMaxIndex(prediction[0]);
    displayResult(digit);
    updateProbabilities(prediction[0]);
}

function makePrediction(input) {
    const layer1Output = applyLayer(input, weightsLayer1, biasesLayer1);
    const activated = applyReLU(layer1Output);
    const layer2Output = applyLayer(activated, weightsLayer2, biasesLayer2);
    return applySoftmax(layer2Output);
}

function applyLayer(input, weights, biases) {
    const multiplied = matrixMultiply(input, weights);
    return addBiasTerm(multiplied, biases);
}

function applyReLU(matrix) {
    return matrix.map(row => 
        row.map(value => Math.max(0, value))
    );
}

function applySoftmax(values) {
    const maxValue = Math.max(...values[0]);
    const exps = values[0].map(v => Math.exp(v - maxValue));
    const sumExps = exps.reduce((sum, val) => sum + val, 0);
    return [exps.map(exp => exp / sumExps)];
}

function matrixMultiply(a, b) {
    const result = [];
    for (let i = 0; i < a.length; i++) {
        result[i] = [];
        for (let j = 0; j < b[0].length; j++) {
            let sum = 0;
            for (let k = 0; k < a[0].length; k++) {
                sum += a[i][k] * b[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}

function addBiasTerm(matrix, bias) {
    return matrix.map(row => 
        row.map((value, j) => value + bias[j])
    );
}

function findMaxIndex(array) {
    return array.reduce(
        (maxIndex, current, index, arr) => 
            current > arr[maxIndex] ? index : maxIndex, 0
    );
}

function displayResult(digit) {
    const outputElement = document.getElementById('result');
    outputElement.textContent = ` ⠀ ⠀  ⠀  ⠀ Вы написали ${digit}, верно?`;
}

function updateProbabilities(probabilities) {
    const container = document.getElementById('probabilities');
    container.innerHTML = '';
    
    probabilities.forEach((prob, index) => {
        const probBar = document.createElement('div');
        probBar.className = 'prob-bar';
        
        const probFill = document.createElement('div');
        probFill.className = 'prob-fill';
        
        const probFillInner = document.createElement('div');
        probFillInner.style.height = `${prob * 100}%`;
        probFillInner.style.backgroundColor = '#2721c3';
        probFillInner.style.position = 'absolute';
        probFillInner.style.bottom = '0';
        probFillInner.style.width = '100%';
        
        probFill.appendChild(probFillInner);
        
        const probLabel = document.createElement('div');
        probLabel.className = 'prob-label';
        probLabel.textContent = index;
        
        probBar.appendChild(probFill);
        probBar.appendChild(probLabel);
        container.appendChild(probBar);
    });
}

initializeModel();