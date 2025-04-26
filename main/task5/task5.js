let treeData = null;
let trainingData = null;
let categories = [];
let targetCategory = null;
let currentPathIndex = 0;
let paths = [];
let animationInterval = null;
let currentlyHighlightedPath = null;
let testData = null;

const csvFileInput = document.getElementById('csvFile');
const buildTreeBtn = document.getElementById('buildTreeBtn');
const predictBtn = document.getElementById('predictBtn');
const runAlgorithmBtn = document.getElementById('runAlgorithmBtn');
const stopAlgorithmBtn = document.getElementById('stopAlgorithmBtn');
const errorDiv = document.getElementById('error');
const treeContainer = document.getElementById('treeContainer');
const speedControl = document.getElementById('speedControl');

buildTreeBtn.addEventListener('click', handleTrainingFileUpload);
predictBtn.addEventListener('click', handleTestFileUpload);
runAlgorithmBtn.addEventListener('click', runAlgorithm);
stopAlgorithmBtn.addEventListener('click', stopAlgorithm);

function stopAlgorithm() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    stopAlgorithmBtn.disabled = true;
    runAlgorithmBtn.disabled = false;
    
    if (treeData) {
        drawTree(treeData);
    }
}

function handleTrainingFileUpload() {
    stopAlgorithm();
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    
    const file = csvFileInput.files[0];
    
    if (!file) {
        errorDiv.textContent = 'Пожалуйста, выберите CSV файл.';
        errorDiv.style.display = 'block';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            parseTrainingCSV(content);
            buildTree();
            predictBtn.disabled = false;
            runAlgorithmBtn.disabled = false;
            stopAlgorithmBtn.disabled = true;
        } catch (error) {
            errorDiv.textContent = `Ошибка обработки CSV: ${error.message}`;
            errorDiv.style.display = 'block';
            console.error(error);
        }
    };
    reader.onerror = function() {
        errorDiv.textContent = 'Ошибка чтения файла.';
        errorDiv.style.display = 'block';
    };
    reader.readAsText(file, 'UTF-8');
}

function handleTestFileUpload() {
    stopAlgorithm();
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    
    fileInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                parseTestCSV(content);
                predictOnTree();
            } catch (error) {
                errorDiv.textContent = `Ошибка обработки тестового CSV: ${error.message}`;
                errorDiv.style.display = 'block';
                console.error(error);
            }
        };
        reader.onerror = function() {
            errorDiv.textContent = 'Ошибка чтения файла.';
            errorDiv.style.display = 'block';
        };
        reader.readAsText(file, 'UTF-8');
    };
    
    fileInput.click();
}

function parseTrainingCSV(content) {
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.substring(1);
    }
    
    const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
    
    if (lines.length < 2) {
        throw new Error('CSV файл должен содержать как минимум 2 строки (заголовки и данные)');
    }

    categories = lines[0].split(';').map(cat => cat.trim());
    targetCategory = categories[categories.length - 1];
    
    trainingData = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map(val => val.trim());
        
        if (values.length !== categories.length) {
            console.warn(`Строка ${i+1} пропущена: несоответствие количества значений`);
            continue;
        }
        
        const row = {};
        categories.forEach((category, index) => {
            row[category] = values[index];
        });
        trainingData.push(row);
    }
    
    console.log('Обучающие данные:', trainingData);
}

function parseTestCSV(content) {
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.substring(1);
    }
    
    const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
    
    if (lines.length < 1) {
        throw new Error('Тестовый CSV файл должен содержать как минимум заголовки');
    }

    const testCategories = lines[0].split(';').map(cat => cat.trim());
    
    const trainingCategoriesWithoutTarget = categories.slice(0, -1);
    if (testCategories.length !== trainingCategoriesWithoutTarget.length || 
        !testCategories.every((cat, i) => cat === trainingCategoriesWithoutTarget[i])) {
        throw new Error('Тестовые данные должны иметь те же категории, что и обучающие (без целевой переменной)');
    }
    
    testData = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map(val => val.trim());
        
        if (values.length !== testCategories.length) {
            console.warn(`Строка ${i+1} пропущена: несоответствие количества значений`);
            continue;
        }
        
        const row = {};
        testCategories.forEach((category, index) => {
            row[category] = values[index];
        });
        testData.push(row);
    }
    
    console.log('Тестовые данные:', testData);
}

function buildTree() {
    if (!categories.length || !trainingData.length) {
        throw new Error('Нет данных для построения дерева');
    }
    
    const root = {
        name: "Корень",
        id: "root",
        children: [],
        depth: 0,
        category: null,
        value: null
    };
    
    buildTreeRecursive(root, trainingData, 0);
    treeData = root;
    drawTree(treeData);
}

function buildTreeRecursive(node, data, depth) {
    if (depth >= categories.length - 1) {
        const targetValues = data.map(row => row[targetCategory]);
        node.prediction = getMostFrequentValue(targetValues);
        return;
    }
    
    const currentCategory = categories[depth];
    const uniqueValues = [...new Set(data.map(row => row[currentCategory]))];
    
    uniqueValues.forEach(value => {
        const nodeId = `${node.id}-${depth}-${value.replace(/\s+/g, '_')}`;
        
        const filteredData = data.filter(row => row[currentCategory] === value);
        const targetValues = filteredData.map(row => row[targetCategory]);
        const prediction = getMostFrequentValue(targetValues);
        
        const newNode = {
            name: value,
            id: nodeId,
            children: [],
            depth: depth + 1,
            value: value,
            category: currentCategory,
            prediction: prediction
        };
        
        node.children.push(newNode);
        buildTreeRecursive(newNode, filteredData, depth + 1);
    });
}

function getMostFrequentValue(values) {
    const frequency = {};
    let maxCount = 0;
    let mostFrequent = null;
    
    values.forEach(value => {
        frequency[value] = (frequency[value] || 0) + 1;
        if (frequency[value] > maxCount) {
            maxCount = frequency[value];
            mostFrequent = value;
        }
    });
    
    return mostFrequent;
}

function predictOnTree() {
    if (!treeData || !testData) return;
    
    const predictions = testData.map(row => {
        let currentNode = treeData;
        const path = ['root'];
        
        for (let depth = 0; depth < categories.length - 1; depth++) {
            const category = categories[depth];
            const value = row[category];
            
            if (!currentNode.children) break;
            
            const childNode = currentNode.children.find(child => child.value === value);
            if (!childNode) break;
            
            currentNode = childNode;
            path.push(currentNode.id);
        }
        
        return {
            row: row,
            prediction: currentNode.prediction,
            path: path,
            node: currentNode
        };
    });
    
    console.log('Прогнозы:', predictions);
    visualizePredictions(predictions);
}

function visualizePredictions(predictions) {
    const highlightedNodes = [];
    predictions.forEach(pred => {
        highlightedNodes.push(...pred.path);
    });
    
    drawTree(treeData, highlightedNodes, predictions);
    
    animatePredictions(predictions);
}

function animatePredictions(predictions) {
    stopAlgorithm();
    
    let currentIndex = 0;
    const speed = 2000; 
    
    function animateNext() {
        if (currentIndex >= predictions.length) {
            const allPaths = predictions.flatMap(p => p.path);
            drawTree(treeData, allPaths, predictions);
            animationInterval = null;
            return;
        }
        
        const pred = predictions[currentIndex];
        drawTree(treeData, pred.path, [pred]);
        
        currentIndex++;
        animationInterval = setTimeout(animateNext, speed);
    }
    
    animateNext();
    stopAlgorithmBtn.disabled = false;
}

function drawTree(rootData, highlightedNodes = [], predictions = []) {
    const margin = { top: 40, right: 120, bottom: 40, left: 200 };
    const width = treeContainer.clientWidth - margin.left - margin.right;
    const height = Math.max(500, (categories.length) * 100) - margin.top - margin.bottom;
    
    d3.select('#treeVisualization').remove();
    
    const svg = d3.select('#treeContainer')
        .append('svg')
        .attr('id', 'treeVisualization')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const root = d3.hierarchy(rootData);
    const treeLayout = d3.tree().size([width, height]);
    treeLayout(root);

    svg.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', d => {
            const isHighlighted = highlightedNodes && highlightedNodes.includes(d.target.data.id);
            return `link ${isHighlighted ? 'highlight' : ''}`;
        })
        .attr('d', d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y)
        );

    const node = svg.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', d => {
            let classes = 'node';
            if (highlightedNodes && highlightedNodes.includes(d.data.id)) classes += ' prediction-path';

            const isCurrentPrediction = predictions.some(p => p.node.id === d.data.id);
            if (isCurrentPrediction) classes += ' current-prediction';
            
            return classes;
        })
        .attr('transform', d => `translate(${d.x},${d.y})`);

    node.append('circle')
        .attr('r', 10)
        .attr('fill', d => {
            if (d.data.prediction === 'да') return '#2ecc71';
            if (d.data.prediction === 'нет') return '#e74c3c';
            return d.data.depth % 2 === 0 ? '#6baed6' : '#9ecae1';
        });

    node.append('text')
        .attr('dy', '.35em')
        .attr('y', d => d.children ? -20 : 20)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text(d => d.data.name);

    if (rootData.depth === 0) {
        const categoryLabels = svg.append('g')
            .attr('class', 'category-labels');
        
        categories.slice(0, -1).forEach((category, i) => {
            categoryLabels.append('text')
                .attr('x', -margin.left + 20)
                .attr('y', (i + 0.5) * (height / (categories.length - 1)))
                .style('text-anchor', 'start')
                .style('font-weight', 'bold')
                .style('font-size', '12px')
                .text(category);
        });
    }
}
function runAlgorithm() {
    if (!treeData || !trainingData) return;
    
    paths = trainingData.map(row => {
        let currentNode = treeData;
        const path = ['root'];
        
        for (let depth = 0; depth < categories.length - 1; depth++) {
            const category = categories[depth];
            const value = row[category];
            
            if (!currentNode.children) break;
            
            const childNode = currentNode.children.find(child => child.value === value);
            if (!childNode) break;
            
            currentNode = childNode;
            path.push(childNode.id);
        }
        
        return {
            path: path,
            row: row
        };
    });
    
    animateTrainingPaths();
    stopAlgorithmBtn.disabled = false;
    runAlgorithmBtn.disabled = true;
}

function animateTrainingPaths() {
    stopAlgorithm();
    
    let currentIndex = 0;
    const speed = 1010 - speedControl.value;
    
    function animateNext() {
        if (currentIndex >= paths.length) {
            animationInterval = null;
            return;
        }
        
        const path = paths[currentIndex].path;
        drawTree(treeData, path);
        
        currentIndex++;
        animationInterval = setTimeout(animateNext, speed);
    }
    
    animateNext();
}