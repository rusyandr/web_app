let treeData = null;
let csvData = null;
let categories = [];
let currentPathIndex = 0;
let paths = [];
let animationInterval = null;
let currentlyHighlightedPath = null;

const csvFileInput = document.getElementById('csvFile');
const buildTreeBtn = document.getElementById('buildTreeBtn');
const runAlgorithmBtn = document.getElementById('runAlgorithmBtn');
const errorDiv = document.getElementById('error');
const resultsDiv = document.getElementById('results');
const treeContainer = document.getElementById('treeContainer');
const speedControl = document.getElementById('speedControl');
const stopAlgorithmBtn = document.getElementById('stopAlgorithmBtn');

buildTreeBtn.addEventListener('click', handleFileUpload);
runAlgorithmBtn.addEventListener('click', runAlgorithm);
stopAlgorithmBtn.addEventListener('click', stopAlgorithm);

function stopAlgorithm() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    stopAlgorithmBtn.disabled = true;
    runAlgorithmBtn.disabled = false;
    
    document.querySelectorAll('.path-step').forEach(el => {
        el.classList.remove('active');
    });
    
    if (treeData) {
        drawTree(treeData);
    }
}

function handleFileUpload() {
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
            parseCSV(content);
            buildTree();
            runAlgorithmBtn.disabled = false;
            stopAlgorithmBtn.disabled = true;
        } catch (error) {
            errorDiv.textContent = `Ошибка обработки CSV: ${error.message}`;
            console.error(error);
        }
    };
    reader.onerror = function() {
        errorDiv.textContent = 'Ошибка чтения файла.';
    };
    reader.readAsText(file, 'UTF-8');
}

function parseCSV(content) {
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
    
    csvData = [];
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
        csvData.push(row);
    }
    
    console.log('Категории:', categories);
    console.log('Данные:', csvData);
}

function buildTree() {
    if (!categories.length || !csvData.length) {
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
    
    const allPaths = csvData.map(row => findPathValues(row));
    
    function buildTreeFromPaths(node, currentDepth, pathValues) {
        if (currentDepth >= categories.length) return;
        
        const currentCategory = categories[currentDepth];
        const uniqueValues = [...new Set(pathValues.map(path => path[currentDepth]))];
        
        uniqueValues.forEach(value => {
            const nodeId = `${node.id}-${currentDepth}-${value.replace(/\s+/g, '_')}`;
            
            const newNode = {
                name: value,
                id: nodeId,
                children: [],
                depth: currentDepth + 1,
                value: value,
                category: currentCategory
            };
            
            node.children.push(newNode);
            
            const nextLevelPaths = pathValues.filter(path => path[currentDepth] === value);
            buildTreeFromPaths(newNode, currentDepth + 1, nextLevelPaths);
        });
    }
    
    buildTreeFromPaths(root, 0, allPaths);
    
    treeData = root;
    drawTree(treeData);
}

function findPathValues(row) {
    return categories.map(category => row[category]);
}

function drawTree(rootData, highlightedNodes = []) {
    const margin = { top: 40, right: 120, bottom: 40, left: 200 };
    const width = treeContainer.clientWidth - margin.left - margin.right;
    const height = Math.max(500, categories.length * 100) - margin.top - margin.bottom;
    
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
            const isHighlighted = highlightedNodes.includes(d.target.data.id);
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
        .attr('class', d => `node ${highlightedNodes.includes(d.data.id) ? 'highlight' : ''}`)
        .attr('transform', d => `translate(${d.x},${d.y})`);
    
    node.append('circle')
        .attr('r', 10)
        .attr('fill', d => d.data.depth % 2 === 0 ? '#6baed6' : '#9ecae1');
    
    node.append('text')
        .attr('dy', '.35em')
        .attr('y', d => d.children ? -20 : 20)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text(d => d.data.name);
    
    if (rootData.depth === 0) {
        const categoryLabels = svg.append('g')
            .attr('class', 'category-labels');
        
        categories.forEach((category, i) => {
            categoryLabels.append('text')
                .attr('x', -margin.left + 20)
                .attr('y', (i + 0.5) * (height / categories.length))
                .style('text-anchor', 'start')
                .style('font-weight', 'bold')
                .style('font-size', '12px')
                .text(category);
        });
    }
}

function runAlgorithm() {
    stopAlgorithm();
    
    if (!treeData || !csvData.length) return;
    
    resultsDiv.innerHTML = '';
    paths = [];
    
    csvData.forEach((row, index) => {
        const path = findPath(row);
        paths.push({path, row, index});
    });
    
    paths.forEach((item, idx) => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'path-step';
        resultDiv.dataset.index = idx;
        
        const rowText = categories.map(cat => `${cat}: ${item.row[cat]}`).join(', ');
        resultDiv.innerHTML = `
            <strong>Строка ${item.index + 1}:</strong> ${rowText}<br>
            <strong>Путь:</strong> ${item.path.map(id => {
                const parts = id.split('-');
                return parts[parts.length - 1].replace(/_/g, ' ');
            }).join(' → ')}
        `;
        
        resultDiv.addEventListener('click', () => {
            const speed = 1010 - speedControl.value;
            highlightSpecificPath(idx, true, speed);
        });
        
        resultsDiv.appendChild(resultDiv);
    });
    
    currentPathIndex = 0;
    animatePaths();
    stopAlgorithmBtn.disabled = false;
    runAlgorithmBtn.disabled = true;
}

function findPath(row) {
    const path = ['root'];
    let currentNode = treeData;
    
    for (let level = 0; level < categories.length; level++) {
        if (!currentNode.children || currentNode.children.length === 0) break;
        
        const value = row[categories[level]];
        const childNode = currentNode.children.find(child => 
            child.value === value
        );
        
        if (childNode) {
            path.push(childNode.id);
            currentNode = childNode;
        } else {
            break;
        }
    }
    
    return path;
}

function animatePaths() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }

    const speed = 1010 - speedControl.value;
    let currentStep = 0;
    currentPathIndex = 0;
    let currentHighlightedNodes = [];

    highlightSpecificPath(currentPathIndex, false);
    animateStep();

    function animateStep() {
        const currentPath = paths[currentPathIndex]?.path || [];
        
        if (currentStep >= currentPath.length) {
            currentPathIndex++;
            currentStep = 0;
            currentHighlightedNodes = [];
            
            if (currentPathIndex >= paths.length) {
                animationInterval = null;
                return;
            }
            
            highlightSpecificPath(currentPathIndex, false);
            animationInterval = setTimeout(animateStep, 500);
            return;
        }

        currentHighlightedNodes.push(currentPath[currentStep]);
        drawTree(treeData, currentHighlightedNodes);
        currentStep++;

        animationInterval = setTimeout(animateStep, speed);
    }
}

function highlightSpecificPath(pathIndex, scrollToElement = true, speed = 500) {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    
    document.querySelectorAll('.path-step').forEach(el => {
        el.classList.remove('active');
    });
    
    currentlyHighlightedPath = pathIndex;
    const element = document.querySelector(`.path-step[data-index="${pathIndex}"]`);
    if (element) {
        element.classList.add('active');
        if (scrollToElement) {
            element.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
    }
    
    const pathToHighlight = paths[pathIndex]?.path || [];
    let currentStep = 0;
    
    function highlightStep() {
        if (currentStep >= pathToHighlight.length) {
            return;
        }
        
        const highlighted = pathToHighlight.slice(0, currentStep + 1);
        drawTree(treeData, highlighted);
        currentStep++;
        
        animationInterval = setTimeout(highlightStep, speed);
    }
    
    highlightStep();
    stopAlgorithmBtn.disabled = false;
    runAlgorithmBtn.disabled = true;
}
