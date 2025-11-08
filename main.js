// The websim object is globally available and does not need to be imported.

const controls = document.querySelector('.controls');
const promptInput = document.getElementById('prompt-input');
const generateBtn = document.getElementById('generate-btn');
const loader = document.getElementById('loader');
const canvas = document.getElementById('phone-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const resetText = document.getElementById('reset-text');

let timeInterval = null;
let originalImageWithBlackScreen = null; // To store the phone image with the black screen
let phoneState = 'initial'; // 'initial', 'generating', 'locked', 'unlocked'
let screenBounds = null;

generateBtn.addEventListener('click', generatePhone);
promptInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        generatePhone();
    }
});

canvas.addEventListener('click', () => {
    if (phoneState === 'locked') {
        phoneState = 'unlocked';
        if (timeInterval) {
            clearInterval(timeInterval);
            timeInterval = null;
        }
        drawHomeScreen(screenBounds);
    } else if (phoneState === 'unlocked') {
        phoneState = 'locked';
        startClock(screenBounds);
    }
});

resetText.addEventListener('click', () => {
    if (originalImageWithBlackScreen) { // only if an image is present
        phoneState = 'initial';
        controls.classList.remove('hidden');
        resetText.classList.add('hidden');
        if (timeInterval) {
            clearInterval(timeInterval);
            timeInterval = null;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        originalImageWithBlackScreen = null;
        screenBounds = null;
        // make canvas small to hide it until next generation
        canvas.width = 1;
        canvas.height = 1;
    }
});

function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    promptInput.disabled = isLoading;
    if (isLoading) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

async function generatePhone() {
    const userPrompt = promptInput.value.trim();
    if (!userPrompt) {
        alert('Please enter a description for the phone.');
        return;
    }

    phoneState = 'generating';

    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
    }

    controls.classList.add('hidden');
    setLoading(true);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    originalImageWithBlackScreen = null;
    screenBounds = null;

    // A specific, vibrant pink is used to make detection easier and more reliable.
    const fullPrompt = `A front-facing close-up of ${userPrompt}, smartphone, with a solid bright fuchsia pink (#FF00FF) screen, on a transparent background, studio lighting, photorealistic.`;

    try {
        const result = await websim.imageGen({
            prompt: fullPrompt,
            transparent: true,
            width: 512,
            height: 768,
            aspect_ratio: "2:3"
        });
        processImage(result.url);
    } catch (error) {
        console.error('Error generating image:', error);
        alert('Failed to generate image. Please try again.');
        setLoading(false);
        controls.classList.remove('hidden');
    }
}

function processImage(imageUrl) {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Required for loading images from other domains into canvas
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Get the color of the center pixel as the target "pink"
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const centerIndex = (centerY * canvas.width + centerX) * 4;
        const targetColor = {
            r: data[centerIndex],
            g: data[centerIndex + 1],
            b: data[centerIndex + 2]
        };

        const colorThreshold = 80; // How similar colors can be to be replaced
        let foundScreen = false;
        let localScreenBounds = { minX: canvas.width, minY: canvas.height, maxX: 0, maxY: 0 };

        for (let i = 0; i < data.length; i += 4) {
            const currentColor = { r: data[i], g: data[i+1], b: data[i+2] };
            const distance = colorDistance(currentColor, targetColor);

            if (distance < colorThreshold) {
                // Replace with black
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
                // Keep original alpha

                // Update screen bounding box
                const x = (i / 4) % canvas.width;
                const y = Math.floor((i / 4) / canvas.width);
                localScreenBounds.minX = Math.min(localScreenBounds.minX, x);
                localScreenBounds.minY = Math.min(localScreenBounds.minY, y);
                localScreenBounds.maxX = Math.max(localScreenBounds.maxX, x);
                localScreenBounds.maxY = Math.max(localScreenBounds.maxY, y);
                foundScreen = true;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Store this canvas state to redraw from
        originalImageWithBlackScreen = new Image();
        originalImageWithBlackScreen.src = canvas.toDataURL();
        originalImageWithBlackScreen.onload = () => {
            if (foundScreen) {
                screenBounds = localScreenBounds;
                phoneState = 'locked';
                startClock(screenBounds);
            } else {
                phoneState = 'initial';
            }
            resetText.classList.remove('hidden');
        };

        setLoading(false);
    };
    img.onerror = () => {
        alert('Failed to load the generated image.');
        setLoading(false);
        controls.classList.remove('hidden');
    };
    img.src = imageUrl;
}

function colorDistance(c1, c2) {
    const rmean = (c1.r + c2.r) / 2;
    const r = c1.r - c2.r;
    const g = c1.g - c2.g;
    const b = c1.b - c2.b;
    return Math.sqrt((((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8));
}

function startClock(bounds) {
    if (timeInterval) {
        clearInterval(timeInterval);
    }

    const drawTime = () => {
        if (!originalImageWithBlackScreen || !originalImageWithBlackScreen.complete) return;

        // Redraw the base image to clear old time
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImageWithBlackScreen, 0, 0);

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const screenWidth = bounds.maxX - bounds.minX;
        const centerX = bounds.minX + screenWidth / 2;
        const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Dynamically adjust font size based on screen width
        const fontSize = Math.max(12, Math.floor(screenWidth / 8));
        ctx.font = `bold ${fontSize}px sans-serif`;

        ctx.fillText(timeString, centerX, centerY);
    };

    drawTime(); // Initial draw
    timeInterval = setInterval(drawTime, 1000);
}

function drawHomeScreen(bounds) {
    if (!originalImageWithBlackScreen || !originalImageWithBlackScreen.complete) return;

    // Redraw the base image to clear old time
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImageWithBlackScreen, 0, 0);

    const screenWidth = bounds.maxX - bounds.minX;
    const screenHeight = bounds.maxY - bounds.minY;
    
    // Simple fallback if screen is not found or too small
    if (screenWidth < 50 || screenHeight < 50) return;

    const numCols = 4;
    const numRows = 5;
    const iconGridWidth = screenWidth * 0.9;
    const iconGridHeight = screenHeight * 0.8;
    const iconSize = Math.min(iconGridWidth / numCols, iconGridHeight / numRows) * 0.75;
    const colGap = (iconGridWidth - (iconSize * numCols)) / (numCols + 1);
    const rowGap = (iconGridHeight - (iconSize * numRows)) / (numRows + 1);

    const startX = bounds.minX + (screenWidth - iconGridWidth) / 2;
    const startY = bounds.minY + (screenHeight - iconGridHeight) / 2;

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B'];
    const icons = ['phone', 'messages', 'music', 'browser', 'camera', 'settings', 'mail', 'clock'];

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            const index = row * numCols + col;
            if (index >= 8) break; // We only have 8 icon types for now

            const x = startX + colGap + (iconSize + colGap) * col;
            const y = startY + rowGap + (iconSize + rowGap) * row;
            drawAppIcon(x, y, iconSize, colors[index % colors.length], icons[index % icons.length]);
        }
    }
}

function drawAppIcon(x, y, size, color, type) {
    const radius = size * 0.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + size, y, x + size, y + size, radius);
    ctx.arcTo(x + size, y + size, x, y + size, radius);
    ctx.arcTo(x, y + size, x, y, radius);
    ctx.arcTo(x, y, x + size, y, radius);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const p = size * 0.25;
    const cX = x + size / 2;
    const cY = y + size / 2;
    const iSize = size - p * 2;
    
    ctx.save();
    ctx.translate(cX, cY);
    
    // Simplified icons
    switch(type) {
        case 'phone':
            ctx.rotate(Math.PI / 4 * 3);
            ctx.beginPath();
            ctx.arc(0, 0, iSize*0.4, Math.PI * 0.2, Math.PI * 1.5);
            ctx.stroke();
            break;
        case 'messages':
            ctx.beginPath();
            ctx.rect(-iSize/2, -iSize/2, iSize, iSize*0.8);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, iSize*0.4);
            ctx.lineTo(-iSize*0.1, iSize*0.5);
            ctx.lineTo(iSize*0.1, iSize*0.4);
            ctx.fill();
            break;
        case 'music':
            ctx.beginPath();
            ctx.arc(-iSize * 0.25, iSize*0.1, iSize * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-iSize * 0.05, iSize*0.1);
            ctx.lineTo(-iSize * 0.05, -iSize*0.4);
            ctx.lineTo(iSize*0.3, -iSize*0.3);
            ctx.stroke();
            break;
        case 'browser':
            ctx.beginPath();
            ctx.arc(0, 0, iSize / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.moveTo(-iSize/2, 0);
            ctx.lineTo(iSize/2, 0);
            ctx.stroke();
            break;
        case 'camera':
            ctx.beginPath();
            ctx.rect(-iSize/2, -iSize/3, iSize, iSize*0.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, iSize*0.2, 0, Math.PI*2);
            ctx.stroke();
            break;
        case 'settings':
             for(let i=0; i<8; i++){
                ctx.rotate(Math.PI/4);
                ctx.beginPath();
                ctx.moveTo(0, iSize*0.2);
                ctx.lineTo(0, iSize*0.5);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(0,0,iSize*0.2,0,Math.PI*2);
            ctx.fill();
            break;
        case 'mail':
            ctx.strokeRect(-iSize/2, -iSize/3, iSize, iSize*0.7);
            ctx.beginPath();
            ctx.moveTo(-iSize/2, -iSize/3);
            ctx.lineTo(0, iSize*0.1);
            ctx.lineTo(iSize/2, -iSize/3);
            ctx.stroke();
            break;
        case 'clock':
            ctx.beginPath();
            ctx.arc(0, 0, iSize/2, 0, Math.PI*2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(0, -iSize*0.3);
            ctx.moveTo(0,0);
            ctx.lineTo(iSize*0.2, 0);
            ctx.stroke();
            break;
    }
    ctx.restore();
}