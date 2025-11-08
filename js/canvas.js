import { state } from './state.js';
import * as apps from './apps.js';

const canvas = document.getElementById('phone-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

export function getCanvas() {
    return canvas;
}

function colorDistance(c1, c2) {
    const rmean = (c1.r + c2.r) / 2;
    const r = c1.r - c2.r;
    const g = c1.g - c2.g;
    const b = c1.b - c2.b;
    return Math.sqrt((((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8));
}

export function processImage(imageUrl, onProcessed) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        // Find phone body bounds (non-transparent pixels)
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        let phoneBounds = { minX: tempCanvas.width, minY: tempCanvas.height, maxX: 0, maxY: 0 };
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) { // Check alpha channel
                const x = (i / 4) % tempCanvas.width;
                const y = Math.floor((i / 4) / tempCanvas.width);
                phoneBounds.minX = Math.min(phoneBounds.minX, x);
                phoneBounds.minY = Math.min(phoneBounds.minY, y);
                phoneBounds.maxX = Math.max(phoneBounds.maxX, x);
                phoneBounds.maxY = Math.max(phoneBounds.maxY, y);
            }
        }

        const phoneWidth = phoneBounds.maxX - phoneBounds.minX;
        const phoneHeight = phoneBounds.maxY - phoneBounds.minY;
        
        if (phoneWidth <=0 || phoneHeight <= 0) {
            alert("Could not detect a phone in the generated image.");
            onProcessed(false, true);
            return;
        }

        // Scale phone to fit container height
        const containerHeight = document.getElementById('result-container').clientHeight;
        const scale = containerHeight / phoneHeight;
        const newWidth = phoneWidth * scale;
        const newHeight = phoneHeight * scale;

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw cropped and scaled phone image
        ctx.drawImage(
            img,
            phoneBounds.minX, phoneBounds.minY, phoneWidth, phoneHeight, // source rect
            0, 0, newWidth, newHeight // destination rect
        );

        const scaledImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const scaledData = scaledImageData.data;

        // Screen detection using center pixel and flood fill
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const centerIndex = (centerY * canvas.width + centerX) * 4;
        const targetColor = { r: scaledData[centerIndex], g: scaledData[centerIndex + 1], b: scaledData[centerIndex + 2] };

        const pinkThreshold = 80; // More lenient threshold. Was 50.
        const magenta = { r: 255, g: 0, b: 255 };
        // Check distance from pure magenta to see if we should start flood fill
        const isPink = colorDistance(targetColor, magenta) < pinkThreshold;

        let foundScreen = false;
        let localScreenBounds = null;

        if (isPink) {
            const screenMask = new Uint8Array(canvas.width * canvas.height);
            const q = [[centerX, centerY]];
            screenMask[centerY * canvas.width + centerX] = 1;
            
            let head = 0;
            localScreenBounds = { minX: centerX, minY: centerY, maxX: centerX, maxY: centerY };

            while(head < q.length) {
                const [x, y] = q[head++];

                localScreenBounds.minX = Math.min(localScreenBounds.minX, x);
                localScreenBounds.minY = Math.min(localScreenBounds.minY, y);
                localScreenBounds.maxX = Math.max(localScreenBounds.maxX, x);
                localScreenBounds.maxY = Math.max(localScreenBounds.maxY, y);

                const neighbors = [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]];
                for (const [nx, ny] of neighbors) {
                    if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                        const nIndex = ny * canvas.width + nx;
                        if (screenMask[nIndex] === 0) {
                            const nIndex4 = nIndex * 4;
                            const neighborColor = { r: scaledData[nIndex4], g: scaledData[nIndex4 + 1], b: scaledData[nIndex4 + 2] };
                            if (colorDistance(targetColor, neighborColor) < pinkThreshold) {
                                screenMask[nIndex] = 1;
                                q.push([nx, ny]);
                            }
                        }
                    }
                }
            }

            const screenArea = (localScreenBounds.maxX - localScreenBounds.minX) * (localScreenBounds.maxY - localScreenBounds.minY);
            if (screenArea > canvas.width * canvas.height * 0.1) {
                foundScreen = true;
                ctx.fillStyle = 'black';
                ctx.fillRect(localScreenBounds.minX, localScreenBounds.minY, localScreenBounds.maxX - localScreenBounds.minX, localScreenBounds.maxY - localScreenBounds.minY);
            } else {
                 console.log("Detected pink area is too small to be a screen.");
            }
        } else {
            console.log("Center pixel is not pink. Could not detect screen.");
        }
    
        // This part is now handled differently. The logic is moved inside the `if (foundScreen)` block.
        if (foundScreen) {
             // Create the bezel image.
            const bezelCanvas = document.createElement('canvas');
            bezelCanvas.width = canvas.width;
            bezelCanvas.height = canvas.height;
            const bezelCtx = bezelCanvas.getContext('2d');
            // Draw the original scaled phone image
            bezelCtx.drawImage(
                img,
                phoneBounds.minX, phoneBounds.minY, phoneWidth, phoneHeight,
                0, 0, canvas.width, canvas.height
            );
            // Clear the detected screen area to create the bezel overlay
            bezelCtx.clearRect(
                localScreenBounds.minX, 
                localScreenBounds.minY, 
                localScreenBounds.maxX - localScreenBounds.minX, 
                localScreenBounds.maxY - localScreenBounds.minY
            );
            
            state.phoneBezelImage = new Image();
            state.phoneBezelImage.src = bezelCanvas.toDataURL();
            state.phoneBezelImage.onload = () => {
                state.screenBounds = localScreenBounds;
                onProcessed(true);
            };
        } else {
            // Draw the unprocessed image if no screen is found
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(
                img,
                phoneBounds.minX, phoneBounds.minY, phoneWidth, phoneHeight,
                0, 0, canvas.width, canvas.height
            );
            onProcessed(false);
        }
    };
    img.onerror = () => {
        alert('Failed to load the generated image.');
        onProcessed(false, true); // Pass error flag
    };
    img.src = imageUrl;
}

function setupScreenClip() {
    if (!state.screenBounds) return;
    const bounds = state.screenBounds;
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    // Dynamic radius based on screen size, with a max value
    const radius = Math.min(width * 0.08, height * 0.08, 30); 

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bounds.minX + radius, bounds.minY);
    ctx.lineTo(bounds.maxX - radius, bounds.minY);
    ctx.quadraticCurveTo(bounds.maxX, bounds.minY, bounds.maxX, bounds.minY + radius);
    ctx.lineTo(bounds.maxX, bounds.maxY - radius);
    ctx.quadraticCurveTo(bounds.maxX, bounds.maxY, bounds.maxX - radius, bounds.maxY);
    ctx.lineTo(bounds.minX + radius, bounds.maxY);
    ctx.quadraticCurveTo(bounds.minX, bounds.maxY, bounds.minX, bounds.maxY - radius);
    ctx.lineTo(bounds.minX, bounds.minY + radius);
    ctx.quadraticCurveTo(bounds.minX, bounds.minY, bounds.minX + radius, bounds.minY);
    ctx.closePath();
    ctx.clip();
}

export function startClock() {
    if (state.timeInterval) {
        clearInterval(state.timeInterval);
    }

    const drawTime = () => {
        if (!state.phoneBezelImage || !state.phoneBezelImage.complete) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        setupScreenClip();

        // Draw black background for the screen
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const screenWidth = state.screenBounds.maxX - state.screenBounds.minX;
        const centerX = state.screenBounds.minX + screenWidth / 2;
        const centerY = state.screenBounds.minY + (state.screenBounds.maxY - state.screenBounds.minY) / 2;

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = Math.max(12, Math.floor(screenWidth / 8));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillText(timeString, centerX, centerY);

        ctx.restore(); // remove clipping
        ctx.drawImage(state.phoneBezelImage, 0, 0);
    };

    drawTime();
    state.timeInterval = setInterval(drawTime, 1000);
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

    switch (type) {
        case 'phone':
            ctx.rotate(Math.PI / 4 * 3);
            ctx.beginPath();
            ctx.arc(0, 0, iSize * 0.4, Math.PI * 0.2, Math.PI * 1.5);
            ctx.stroke();
            break;
        case 'messages':
            ctx.beginPath();
            ctx.rect(-iSize / 2, -iSize / 2, iSize, iSize * 0.8);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, iSize * 0.4);
            ctx.lineTo(-iSize * 0.1, iSize * 0.5);
            ctx.lineTo(iSize * 0.1, iSize * 0.4);
            ctx.fill();
            break;
        case 'music':
            ctx.beginPath();
            ctx.arc(-iSize * 0.25, iSize * 0.1, iSize * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-iSize * 0.05, iSize * 0.1);
            ctx.lineTo(-iSize * 0.05, -iSize * 0.4);
            ctx.lineTo(iSize * 0.3, -iSize * 0.3);
            ctx.stroke();
            break;
        case 'browser':
            ctx.beginPath();
            ctx.arc(0, 0, iSize / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.moveTo(-iSize / 2, 0);
            ctx.lineTo(iSize / 2, 0);
            ctx.stroke();
            break;
        case 'camera':
            ctx.beginPath();
            ctx.rect(-iSize / 2, -iSize / 3, iSize, iSize * 0.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, iSize * 0.2, 0, Math.PI * 2);
            ctx.stroke();
            break;
        case 'settings':
            for (let i = 0; i < 8; i++) {
                ctx.rotate(Math.PI / 4);
                ctx.beginPath();
                ctx.moveTo(0, iSize * 0.2);
                ctx.lineTo(0, iSize * 0.5);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(0, 0, iSize * 0.2, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'mail':
            ctx.strokeRect(-iSize / 2, -iSize / 3, iSize, iSize * 0.7);
            ctx.beginPath();
            ctx.moveTo(-iSize / 2, -iSize / 3);
            ctx.lineTo(0, iSize * 0.1);
            ctx.lineTo(iSize / 2, -iSize / 3);
            ctx.stroke();
            break;
        case 'clock':
            ctx.beginPath();
            ctx.arc(0, 0, iSize / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -iSize * 0.3);
            ctx.moveTo(0, 0);
            ctx.lineTo(iSize * 0.2, 0);
            ctx.stroke();
            break;
    }
    ctx.restore();
}

export function drawHomeScreen() {
    if (!state.phoneBezelImage || !state.phoneBezelImage.complete) return;
    if (state.timeInterval) {
        clearInterval(state.timeInterval);
        state.timeInterval = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    setupScreenClip();

    // Draw black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    state.iconBounds = [];

    const screenWidth = state.screenBounds.maxX - state.screenBounds.minX;
    const screenHeight = state.screenBounds.maxY - state.screenBounds.minY;

    if (screenWidth < 50 || screenHeight < 50) return;

    const numCols = 4;
    const numRows = 5;
    const iconGridWidth = screenWidth * 0.9;
    const iconGridHeight = screenHeight * 0.8;
    const iconSize = Math.min(iconGridWidth / numCols, iconGridHeight / numRows) * 0.75;
    const colGap = (iconGridWidth - (iconSize * numCols)) / (numCols + 1);
    const rowGap = (iconGridHeight - (iconSize * numRows)) / (numRows + 1);

    const startX = state.screenBounds.minX + (screenWidth - iconGridWidth) / 2;
    const startY = state.screenBounds.minY + (screenHeight - iconGridHeight) / 2;

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B'];
    const icons = ['phone', 'messages', 'music', 'browser', 'camera', 'settings', 'mail', 'clock'];

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            const index = row * numCols + col;
            if (index >= 8) break;

            const x = startX + colGap + (iconSize + colGap) * col;
            const y = startY + rowGap + (iconSize + rowGap) * row;
            const iconType = icons[index % icons.length];
            drawAppIcon(x, y, iconSize, colors[index % colors.length], iconType);
            state.iconBounds.push({ x, y, size: iconSize, type: iconType });
        }
    }

    ctx.restore(); // remove clipping
    ctx.drawImage(state.phoneBezelImage, 0, 0);
}

export function drawAppScreen(appName) {
    if (!state.phoneBezelImage || !state.phoneBezelImage.complete) return;
    if (state.timeInterval) {
        clearInterval(state.timeInterval);
        state.timeInterval = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    setupScreenClip();
    
    // Draw black background before app content
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bounds = state.screenBounds;

    const appFunctionName = `draw${appName.charAt(0).toUpperCase() + appName.slice(1)}App`;
    if (apps[appFunctionName]) {
        apps[appFunctionName](ctx, bounds);
    } else {
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '20px sans-serif';
        ctx.fillText(`${appName} app`, bounds.minX + (bounds.maxX - bounds.minX) / 2, bounds.minY + 50);
    }

    const screenWidth = bounds.maxX - bounds.minX;
    const homeButtonSize = screenWidth * 0.1;
    const homeButtonX = bounds.minX + screenWidth / 2 - homeButtonSize / 2;
    const homeButtonY = bounds.maxY - homeButtonSize * 1.5;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(homeButtonX, homeButtonY, homeButtonSize, homeButtonSize);

    ctx.restore(); // remove clipping
    ctx.drawImage(state.phoneBezelImage, 0, 0);
}

export function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 1;
    canvas.height = 1;
}