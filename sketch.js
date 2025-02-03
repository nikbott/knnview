let points = [];
let query;
let kSlider, weightSelect, metricSelect;
let particles = [];
let showAnnotations = true;

const COLORS = {
    background: '#1a1a2e',
    class0: '#4361ee',
    class1: '#ef476f',
    text: '#e2e2e2',
    grid: '#2a2a3e',
    controls: '#242435'
};

function setup() {
    const canvas = createCanvas(600, 500);
    canvas.parent('sketch-container');

    // Generate training points
    for (let i = 0; i < 30; i++) {
        points.push({
            x: random(50, width - 50),
            y: random(50, height - 50),
            label: random() < 0.5 ? 0 : 1
        });
    }

    // Initialize particles
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: random(width),
            y: random(height),
            size: random(1, 3),
            speed: random(0.2, 0.5)
        });
    }

    // Query point setup
    query = { 
        x: width / 2, 
        y: height / 2, 
        vx: random(-2, 2),
        vy: random(-2, 2),
        label: -1,
        pulseSize: 0,
        pulseAlpha: 255
    };

    setupControls();
}

function setupControls() {
    const controlPanel = select('#controls');
    
    // K-neighbors slider
    const kGroup = createDiv('').addClass('control-group');
    kGroup.child(createSpan('<i class="fas fa-users"></i> Neighbors').addClass('label'));
    kSlider = createSlider(1, 10, 3, 1);
    kGroup.child(kSlider);
    controlPanel.child(kGroup);

    // Weight selector
    const weightGroup = createDiv('').addClass('control-group');
    weightGroup.child(createSpan('<i class="fas fa-weight-hanging"></i> Weight').addClass('label'));
    weightSelect = createSelect();
    weightSelect.option('Uniform', 'uniform');
    weightSelect.option('Distance-based', 'distance');
    weightGroup.child(weightSelect);
    controlPanel.child(weightGroup);

    // Metric selector
    const metricGroup = createDiv('').addClass('control-group');
    metricGroup.child(createSpan('<i class="fas fa-ruler"></i> Metric').addClass('label'));
    metricSelect = createSelect();
    metricSelect.option('Euclidean', 'euclidean');
    metricSelect.option('Manhattan', 'manhattan');
    metricGroup.child(metricSelect);
    controlPanel.child(metricGroup);

    // Annotation toggle
    const toggleGroup = createDiv('').addClass('control-group');
    const toggleBtn = createButton('Hide Annotations');
    toggleBtn.mousePressed(() => {
        showAnnotations = !showAnnotations;
        toggleBtn.html(showAnnotations ? 'Hide Annotations' : 'Show Annotations');
    });
    toggleGroup.child(toggleBtn);
    controlPanel.child(toggleGroup);
}

function drawGradientLine(x1, y1, x2, y2, col1, col2) {
    const steps = 20;
    for (let i = 0; i < steps; i++) {
        const inter = i / steps;
        const x = lerp(x1, x2, inter);
        const y = lerp(y1, y2, inter);
        const col = lerpColor(color(col1), color(col2), inter);
        
        stroke(col);
        strokeWeight(2);
        point(x, y);
    }
}

function drawMeasurementMarkers(x1, y1, x2, y2) {
    if (!showAnnotations) return;
    
    // Horizontal measurement
    const hY = min(y1, y2) - 15;
    stroke(red(COLORS.class0), green(COLORS.class0), blue(COLORS.class0), 150);
    line(min(x1, x2), hY, max(x1, x2), hY);
    
    noStroke();
    fill(red(COLORS.text), green(COLORS.text), blue(COLORS.text), 180);
    textAlign(CENTER, BOTTOM);
    text(`${abs(x2 - x1).toFixed(0)}px`, (x1 + x2)/2, hY - 2);

    // Vertical measurement
    const vX = max(x1, x2) + 15;
    stroke(red(COLORS.class1), green(COLORS.class1), blue(COLORS.class1), 150);
    line(vX, min(y1, y2), vX, max(y1, y2));
    
    noStroke();
    fill(red(COLORS.text), green(COLORS.text), blue(COLORS.text), 180);
    textAlign(LEFT, CENTER);
    text(`${abs(y2 - y1).toFixed(0)}px`, vX + 5, (y1 + y2)/2);
}

function draw() {
    background(COLORS.background);
    
    // Update particles
    particles.forEach(p => {
        p.y += p.speed;
        if (p.y > height) p.y = 0;
        fill(255, 30);
        noStroke();
        circle(p.x, p.y, p.size);
    });

    // Update query point
    query.x = constrain(query.x + query.vx, 0, width);
    query.y = constrain(query.y + query.vy, 0, height);
    if (query.x <= 0 || query.x >= width) query.vx *= -1;
    if (query.y <= 0 || query.y >= height) query.vy *= -1;

    // Find neighbors
    const neighbors = points.map(pt => {
        const dx = abs(query.x - pt.x);
        const dy = abs(query.y - pt.y);
        const distance = metricSelect.value() === 'euclidean' ? 
            sqrt(dx*dx + dy*dy) : dx + dy;
        const weight = weightSelect.value() === 'uniform' ? 1 : 1/(distance + 0.001);
        return { pt, distance, weight };
    }).sort((a, b) => a.distance - b.distance);

    const kNearest = neighbors.slice(0, kSlider.value());

    // Classify query point
    let sum0 = 0, sum1 = 0;
    kNearest.forEach(n => n.pt.label === 0 ? sum0 += n.weight : sum1 += n.weight);
    query.label = sum0 > sum1 ? 0 : 1;

    // Draw connections
    kNearest.forEach(n => {
        const queryColor = query.label === 0 ? COLORS.class0 : COLORS.class1;
        const neighborColor = n.pt.label === 0 ? COLORS.class0 : COLORS.class1;

        if (metricSelect.value() === 'manhattan') {
            drawGradientLine(query.x, query.y, n.pt.x, query.y, queryColor, neighborColor);
            drawGradientLine(n.pt.x, query.y, n.pt.x, n.pt.y, neighborColor, neighborColor);
            drawMeasurementMarkers(query.x, query.y, n.pt.x, n.pt.y);
        } else {
            drawGradientLine(query.x, query.y, n.pt.x, n.pt.y, queryColor, neighborColor);
        }

        // Annotations
        if (showAnnotations) {
            const midX = (query.x + n.pt.x)/2;
            const midY = (query.y + n.pt.y)/2;
            const blendColor = lerpColor(color(queryColor), color(neighborColor), 0.5);
            
            fill(red(blendColor), green(blendColor), blue(blendColor), 200);
            noStroke();
            rectMode(CENTER);
            textSize(12);
            
            const displayText = `${metricSelect.value() === 'manhattan' ? 'Σ' : 'd:'} ${n.distance.toFixed(1)}${weightSelect.value() === 'distance' ? `\nw: ${n.weight.toFixed(2)}` : ''}`;
            const textH = weightSelect.value() === 'distance' ? 35 : 20;
            rect(midX, midY, textWidth(displayText) + 15, textH, 5);
            
            fill(blendColor.levels[0] + blendColor.levels[1] + blendColor.levels[2] > 382 ? 
                 color(0, 0, 0, 220) : color(255, 255, 255, 220));
            textAlign(CENTER, CENTER);
            text(displayText, midX, midY);
        }
    });

    // Draw training points
    points.forEach(pt => {
        fill(pt.label === 0 ? COLORS.class0 : COLORS.class1);
        noStroke();
        circle(pt.x, pt.y, 12);
    });

    // Draw query point
    query.pulseSize = (query.pulseSize + 2) % 20;
    query.pulseAlpha = map(query.pulseSize, 0, 20, 255, 0);
    
    const pulseColor = color(query.label === 0 ? COLORS.class0 : COLORS.class1);
    pulseColor.setAlpha(query.pulseAlpha);
    noFill();
    stroke(pulseColor);
    circle(query.x, query.y, 30 + query.pulseSize);
    
    fill(query.label === 0 ? COLORS.class0 : COLORS.class1);
    noStroke();
    circle(query.x, query.y, 20);
}
