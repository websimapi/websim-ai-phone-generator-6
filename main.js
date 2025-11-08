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
let phoneState = 'initial'; // 'initial', 'generating', 'locked', 'unlocked', 'in-app'
let screenBounds = null;
let iconBounds = [];
let currentApp = null;

generateBtn.addEventListener('click', generatePhone);
promptInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        generatePhone();
    }
});

canvas.addEventListener('click', (e) => {
    if (!screenBounds) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (phoneState === 'locked') {
        phoneState = 'unlocked';
        if (timeInterval) {
            clearInterval(timeInterval);
            timeInterval = null;
        }
        drawHomeScreen(screenBounds);
    } else if (phoneState === 'unlocked') {
        const clickedIcon = iconBounds.find(icon =>
            x >= icon.x && x <= icon.x + icon.size &&
            y >= icon.y && y <= icon.y + icon.size
        );
        if (clickedIcon) {
            phoneState = 'in-app';
            currentApp = clickedIcon.type;
            drawAppScreen(currentApp, screenBounds);
        }
    } else if (phoneState === 'in-app') {
        // Check for home button click
        const screenWidth = screenBounds.maxX - screenBounds.minX;
        const homeButtonSize = screenWidth * 0.1;
        const homeButtonX = screenBounds.minX + screenWidth / 2 - homeButtonSize / 2;
        const homeButtonY = screenBounds.maxY - homeButtonSize * 1.5;

        if (x >= homeButtonX && x <= homeButtonX + homeButtonSize && y >= homeButtonY && y <= homeButtonY + homeButtonSize) {
            phoneState = 'unlocked';
            currentApp = null;
            drawHomeScreen(screenBounds);
        }
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
        iconBounds = [];
        currentApp = null;
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
    iconBounds = [];
    currentApp = null;

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

    iconBounds = []; // Clear old bounds

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
            const iconType = icons[index % icons.length];
            drawAppIcon(x, y, iconSize, colors[index % colors.length], iconType);
            iconBounds.push({ x, y, size: iconSize, type: iconType });
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

function drawAppScreen(appName, bounds) {
    if (!originalImageWithBlackScreen || !originalImageWithBlackScreen.complete) return;

    // Redraw the base image with black screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImageWithBlackScreen, 0, 0);

    // Call the specific app drawing function
    switch(appName) {
        case 'phone': drawPhoneApp(bounds); break;
        case 'messages': drawMessagesApp(bounds); break;
        case 'music': drawMusicApp(bounds); break;
        case 'browser': drawBrowserApp(bounds); break;
        case 'camera': drawCameraApp(bounds); break;
        case 'settings': drawSettingsApp(bounds); break;
        case 'mail': drawMailApp(bounds); break;
        case 'clock': drawClockApp(bounds); break;
        default:
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = '20px sans-serif';
            ctx.fillText(`${appName} app`, bounds.minX + (bounds.maxX - bounds.minX) / 2, bounds.minY + 50);
            break;
    }

    // Draw a home button at the bottom
    const screenWidth = bounds.maxX - bounds.minX;
    const homeButtonSize = screenWidth * 0.1;
    const homeButtonX = bounds.minX + screenWidth / 2 - homeButtonSize / 2;
    const homeButtonY = bounds.maxY - homeButtonSize * 1.5;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(homeButtonX, homeButtonY, homeButtonSize, homeButtonSize);
}

function drawPhoneApp(bounds) {
    const screenWidth = bounds.maxX - bounds.minX;
    const centerX = bounds.minX + screenWidth / 2;
    const screenHeight = bounds.maxY - bounds.minY;
    const keypadTop = bounds.minY + screenHeight * 0.3;

    ctx.fillStyle = '#333';
    ctx.fillRect(bounds.minX, bounds.minY, screenWidth, screenHeight * 0.25);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.floor(screenWidth/12)}px sans-serif`;
    ctx.fillText("555-4242", centerX, bounds.minY + screenHeight * 0.15);


    const buttons = [
        '1', '2', '3',
        '4', '5', '6',
        '7', '8', '9',
        '*', '0', '#'
    ];
    const btnSize = screenWidth * 0.2;
    const gap = screenWidth * 0.05;
    const keypadWidth = 3 * btnSize + 2 * gap;
    const startX = centerX - keypadWidth / 2;
    
    for(let i=0; i<buttons.length; i++) {
        const row = Math.floor(i/3);
        const col = i % 3;
        const x = startX + col * (btnSize + gap);
        const y = keypadTop + row * (btnSize + gap);
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(x + btnSize/2, y + btnSize/2, btnSize/2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.floor(btnSize/2)}px sans-serif`;
        ctx.fillText(buttons[i], x + btnSize/2, y + btnSize/2 + 5);
    }
}

function drawMessagesApp(bounds) {
    const screenWidth = bounds.maxX - bounds.minX;
    const centerX = bounds.minX + screenWidth / 2;
    const padding = screenWidth * 0.05;
    
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.floor(screenWidth/15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText("Messages", centerX, bounds.minY + padding*2);

    function drawBubble(text, y, isUser) {
        ctx.font = `${Math.floor(screenWidth/20)}px sans-serif`;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = screenWidth/20;
        const bubbleWidth = textWidth + padding*2;
        const bubbleHeight = textHeight + padding;
        const x = isUser ? bounds.maxX - bubbleWidth - padding : bounds.minX + padding;
        
        ctx.fillStyle = isUser ? '#007bff' : '#e5e5ea';
        ctx.beginPath();
        ctx.roundRect(x, y, bubbleWidth, bubbleHeight, 15);
        ctx.fill();
        
        ctx.fillStyle = isUser ? 'white' : 'black';
        ctx.textAlign = isUser ? 'right' : 'left';
        ctx.fillText(text, isUser ? x + bubbleWidth - padding : x + padding, y + textHeight * 0.8);
    }
    
    drawBubble("Hey, how's it going?", bounds.minY + 80, false);
    drawBubble("Good! You?", bounds.minY + 140, true);
    drawBubble("Can't complain.", bounds.minY + 200, false);
}

function drawMusicApp(bounds) {
    const screenWidth = bounds.maxX - bounds.minX;
    const centerX = bounds.minX + screenWidth / 2;

    ctx.fillStyle = '#c0392b';
    const artSize = screenWidth * 0.6;
    ctx.fillRect(centerX - artSize/2, bounds.minY + 50, artSize, artSize);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText("?", centerX, bounds.minY + 50 + artSize/2 + 10);

    ctx.font = `bold ${Math.floor(screenWidth/15)}px sans-serif`;
    ctx.fillText("AI Generated Tune", centerX, bounds.minY + 80 + artSize);
    ctx.font = `${Math.floor(screenWidth/20)}px sans-serif`;
    ctx.fillText("By The Circuits", centerX, bounds.minY + 110 + artSize);

    // Play button
    ctx.beginPath();
    ctx.arc(centerX, bounds.maxY - 80, 30, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(centerX - 10, bounds.maxY - 95);
    ctx.lineTo(centerX + 15, bounds.maxY - 80);
    ctx.lineTo(centerX - 10, bounds.maxY - 65);
    ctx.closePath();
    ctx.fill();
}

function drawBrowserApp(bounds) {
    const screenWidth = bounds.maxX - bounds.minX;
    const centerX = bounds.minX + screenWidth / 2;
    const padding = screenWidth * 0.05;

    // Address bar
    ctx.fillStyle = '#eee';
    ctx.fillRect(bounds.minX + padding, bounds.minY + padding, screenWidth - padding*2, 40);
    ctx.fillStyle = '#aaa';
    ctx.font = `16px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText("https://websim.ai", bounds.minX + padding*2, bounds.minY + padding + 26);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.floor(screenWidth/12)}px sans-serif`;
    ctx.fillText("Welcome to the", centerX, bounds.minY + 150);
    ctx.fillText("Internet!", centerX, bounds.minY + 200);

}

function drawCameraApp(bounds) {
    const screenWidth = bounds.maxX - bounds.minX;
    const centerX = bounds.minX + screenWidth / 2;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(bounds.minX, bounds.minY, screenWidth, bounds.maxY - bounds.minY);

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bounds.minX + screenWidth/3, bounds.minY);
    ctx.lineTo(bounds.minX + screenWidth/3, bounds.maxY);
    ctx.moveTo(bounds.minX + 2*screenWidth/3, bounds.minY);
    ctx.lineTo(bounds.minX + 2*screenWidth/3, bounds.maxY);
    ctx.moveTo(bounds.minX, bounds.minY + (bounds.maxY - bounds.minY)/3);
    ctx.lineTo(bounds.maxX, bounds.minY + (bounds.maxY - bounds.minY)/3);
    ctx.moveTo(bounds.minX, bounds.minY + 2*(bounds.maxY - bounds.minY)/3);
    ctx.lineTo(bounds.maxX, bounds.minY + 2*(bounds.maxY - bounds.minY)/3);
    ctx.stroke();

    // Shutter button
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, bounds.maxY - 60, 30, 0, Math.PI*2);
    ctx.stroke();
}

function drawSettingsApp(bounds) {
    const screenWidth = bounds.maxX - bounds.minX;
    const padding = screenWidth * 0.05;
    const itemHeight = 50;

    const settings = ["Wi-Fi", "Bluetooth", "Cellular", "Display", "Sound"];

    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.font = `${Math.floor(screenWidth/18)}px sans-serif`;

    for (let i = 0; i < settings.length; i++) {
        const y = bounds.minY + padding + i * itemHeight;
        ctx.fillText(settings[i], bounds.minX + padding, y + itemHeight/2 + 5);
        ctx.fillStyle = '#444';
        ctx.fillRect(bounds.minX, y + itemHeight, screenWidth, 1);
        ctx.fillStyle = 'white';
    }
}

function drawMailApp(bounds) {
    const screenWidth = bounds.maxX - bounds.minX;
    const padding = screenWidth * 0.05;
    
    const emails = [
        { from: "Websim", subject: "Welcome!" },
        { from: "AI Weekly", subject: "New Models Available" },
        { from: "Team", subject: "Project Update" },
    ];
    
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    
    for (let i = 0; i < emails.length; i++) {
        const y = bounds.minY + padding + i * 80;
        ctx.font = `bold ${Math.floor(screenWidth/20)}px sans-serif`;
        ctx.fillText(emails[i].from, bounds.minX + padding, y + 30);
        ctx.font = `${Math.floor(screenWidth/25)}px sans-serif`;
        ctx.fillStyle = '#aaa';
        ctx.fillText(emails[i].subject, bounds.minX + padding, y + 55);
        ctx.fillStyle = '#444';
        ctx.fillRect(bounds.minX, y + 79, screenWidth, 1);
        ctx.fillStyle = 'white';
    }
}

function drawClockApp(bounds) {
    const screenWidth = bounds.maxX - bounds.minX;
    const centerX = bounds.minX + screenWidth / 2;
    const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.floor(screenWidth/5)}px sans-serif`;
    ctx.fillText(timeString, centerX, centerY);
}