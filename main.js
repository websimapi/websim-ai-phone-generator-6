// The websim object is globally available and does not need to be imported.

const controls = document.querySelector('.controls');
const promptInput = document.getElementById('prompt-input');
const generateBtn = document.getElementById('generate-btn');
const loader = document.getElementById('loader');
const canvas = document.getElementById('phone-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const resetContainer = document.getElementById('reset-container');
const pinFeedback = document.getElementById('pin-feedback');

let timeInterval = null;
let originalImageWithBlackScreen = null;
let phoneState = 'locked'; // 'locked', 'unlocking', 'unlocked'
let screenBounds = null;
const pinDots = [];
let currentPinPath = [];
let isDrawingPin = false;
const correctPin = [4, 7, 8, 9, 6];


generateBtn.addEventListener('click', generatePhone);
promptInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        generatePhone();
    }
});

function resetApp() {
    controls.classList.remove('hidden');
    resetContainer.classList.add('hidden');
    pinFeedback.classList.add('hidden');
    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    originalImageWithBlackScreen = null;
    screenBounds = null;
    phoneState = 'locked';
    currentPinPath = [];
    pinDots.length = 0;
    canvas.width = 1;
    canvas.height = 1;
}

resetContainer.addEventListener('click', resetApp);

canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('pointerleave', handlePointerUp);


function handlePointerDown(e) {
    if (phoneState === 'locked' && originalImageWithBlackScreen) {
        phoneState = 'unlocking';
        if (timeInterval) {
            clearInterval(timeInterval);
            timeInterval = null;
        }
        preparePinPad();
        drawPinPadUI();
    }

    if (phoneState !== 'unlocking') return;
    isDrawingPin = true;
    currentPinPath = [];
    checkPinDotHit(e);
}

function handlePointerMove(e) {
    if (phoneState !== 'unlocking' || !isDrawingPin) return;
    drawPinPadUI(); // Redraw base
    drawCurrentPinPath(e.offsetX, e.offsetY); // Draw lines
    checkPinDotHit(e); // Check for new dots
}

function handlePointerUp() {
    if (phoneState !== 'unlocking' || !isDrawingPin) return;
    isDrawingPin = false;
    checkPin();
}

function checkPinDotHit(e) {
    const { offsetX: x, offsetY: y } = e;
    pinDots.forEach(dot => {
        const dist = Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2);
        if (dist < dot.radius * 2 && !currentPinPath.includes(dot.id)) {
            currentPinPath.push(dot.id);
        }
    });
}


function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    promptInput.disabled = isLoading;
    if (isLoading) {
        loader.classList.remove('hidden');
        resetContainer.classList.add('hidden');
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

    resetApp(); // Reset state before generating a new one

    controls.classList.add('hidden');
    setLoading(true);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    originalImageWithBlackScreen = null;

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
        let screenBounds = { minX: canvas.width, minY: canvas.height, maxX: 0, maxY: 0 };
        let foundScreen = false;

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
                if (x < screenBounds.minX) screenBounds.minX = x;
                if (y < screenBounds.minY) screenBounds.minY = y;
                if (x > screenBounds.maxX) screenBounds.maxX = x;
                if (y > screenBounds.maxY) screenBounds.maxY = y;
                foundScreen = true;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Store this canvas state to redraw from
        originalImageWithBlackScreen = new Image();
        originalImageWithBlackScreen.src = canvas.toDataURL();
        originalImageWithBlackScreen.onload = () => {
             if (foundScreen) {
                // Store screen bounds globally
                this.screenBounds = screenBounds;
                phoneState = 'locked';
                startClock();
            }
            resetContainer.classList.remove('hidden');
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

function startClock() {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
    const bounds = this.screenBounds;
    const drawTime = () => {
        if (!originalImageWithBlackScreen || !originalImageWithBlackScreen.complete || phoneState !== 'locked') return;

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

function preparePinPad() {
    if (!screenBounds) return;
    pinDots.length = 0;
    const screenWidth = screenBounds.maxX - screenBounds.minX;
    const screenHeight = screenBounds.maxY - screenBounds.minY;
    const dotRadius = Math.min(screenWidth, screenHeight) / 20;

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const x = screenBounds.minX + screenWidth * (0.25 + col * 0.25);
            const y = screenBounds.minY + screenHeight * (0.25 + row * 0.25);
            const id = row * 3 + col + 1;
            pinDots.push({ id, x, y, radius: dotRadius });
        }
    }
}

function drawPinPadUI() {
    if (!originalImageWithBlackScreen || !originalImageWithBlackScreen.complete) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImageWithBlackScreen, 0, 0);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    pinDots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawCurrentPinPath(endX, endY) {
    if (currentPinPath.length === 0) return;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = pinDots[0] ? pinDots[0].radius / 2 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const startDot = pinDots.find(d => d.id === currentPinPath[0]);
    ctx.moveTo(startDot.x, startDot.y);

    for (let i = 1; i < currentPinPath.length; i++) {
        const dot = pinDots.find(d => d.id === currentPinPath[i]);
        ctx.lineTo(dot.x, dot.y);
    }

    if (isDrawingPin && endX !== undefined && endY !== undefined) {
        ctx.lineTo(endX, endY);
    }

    ctx.stroke();

    // Highlight active dots
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    currentPinPath.forEach(dotId => {
        const dot = pinDots.find(d => d.id === dotId);
        if (dot) {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dot.radius * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function checkPin() {
    const isCorrect = currentPinPath.length === correctPin.length && currentPinPath.every((val, index) => val === correctPin[index]);
    
    showFeedback(isCorrect);

    setTimeout(() => {
        pinFeedback.classList.add('hidden');
        currentPinPath = [];
        if (isCorrect) {
            phoneState = 'unlocked';
            setTimeout(resetApp, 500); // Reset after a short delay
        } else {
            drawPinPadUI(); // Reset to initial pin pad view
        }
    }, 1000);
}

function showFeedback(isCorrect) {
    pinFeedback.classList.remove('hidden', 'success', 'error');
    if (isCorrect) {
        pinFeedback.textContent = 'Unlocked!';
        pinFeedback.classList.add('success');
    } else {
        pinFeedback.textContent = 'Try Again';
        pinFeedback.classList.add('error');
    }
}