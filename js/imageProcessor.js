import { state } from './state.js';
import { canvas, ctx } from './canvas.js';

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

        // Create a separate image for the phone body overlay
        const phoneBodyOverlayData = new Uint8ClampedArray(scaledData.length);
        const screenBackgroundData = ctx.createImageData(canvas.width, canvas.height);

        // Screen detection: search for a pink starting pixel in the center of the image.
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const searchRadius = Math.min(canvas.width, canvas.height) * 0.1; // Search 10% of smaller dimension

        let startPixel = null;
        const pinkThreshold = 80; // More lenient threshold. Was 50.
        const magenta = { r: 255, g: 0, b: 255 };

        for (let y = Math.floor(centerY - searchRadius); y < Math.floor(centerY + searchRadius); y++) {
            for (let x = Math.floor(centerX - searchRadius); x < Math.floor(centerX + searchRadius); x++) {
                if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                    const index = (y * canvas.width + x) * 4;
                    const color = { r: scaledData[index], g: scaledData[index + 1], b: scaledData[index + 2] };
                    if (colorDistance(color, magenta) < pinkThreshold) {
                        startPixel = { x, y, color };
                        break;
                    }
                }
            }
            if (startPixel) break;
        }

        let foundScreen = false;
        let localScreenBounds = null;

        if (startPixel) {
            const targetColor = startPixel.color;
            const screenMask = new Uint8Array(canvas.width * canvas.height);
            const q = [[startPixel.x, startPixel.y]];
            screenMask[startPixel.y * canvas.width + startPixel.x] = 1;

            let head = 0;
            localScreenBounds = { minX: startPixel.x, minY: startPixel.y, maxX: startPixel.x, maxY: startPixel.y };

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

            const screenArea = q.length;
            if (screenArea > canvas.width * canvas.height * 0.1) {
                foundScreen = true;

                // Populate overlay and background data based on the screen mask
                for (let i = 0; i < screenMask.length; i++) {
                    const i4 = i * 4;
                    if (screenMask[i] === 1) {
                        // This is a screen pixel
                        // Make it transparent in the overlay
                        phoneBodyOverlayData[i4] = 0;
                        phoneBodyOverlayData[i4 + 1] = 0;
                        phoneBodyOverlayData[i4 + 2] = 0;
                        phoneBodyOverlayData[i4 + 3] = 0;
                        // Make it black in the background
                        screenBackgroundData.data[i4] = 0;
                        screenBackgroundData.data[i4 + 1] = 0;
                        screenBackgroundData.data[i4 + 2] = 0;
                        screenBackgroundData.data[i4 + 3] = 255;
                    } else {
                        // This is a phone body pixel
                        // Copy it to the overlay
                        phoneBodyOverlayData[i4] = scaledData[i4];
                        phoneBodyOverlayData[i4 + 1] = scaledData[i4 + 1];
                        phoneBodyOverlayData[i4 + 2] = scaledData[i4 + 2];
                        phoneBodyOverlayData[i4 + 3] = scaledData[i4 + 3];
                        // Make it transparent in the background
                        screenBackgroundData.data[i4] = 0;
                        screenBackgroundData.data[i4 + 1] = 0;
                        screenBackgroundData.data[i4 + 2] = 0;
                        screenBackgroundData.data[i4 + 3] = 0;
                    }
                }

            } else {
                console.log("Detected pink area is too small to be a screen.");
                // fall through to treat as no screen found
            }
        } else {
            console.log("No pink pixels found in center. Could not detect screen.");
        }

        if (!foundScreen) {
            // if no screen, the whole image is the "overlay"
            state.phoneBodyOverlay = new Image();
            state.phoneBodyOverlay.src = canvas.toDataURL();
            state.screenBackground = null;
            onProcessed(false);
            return;
        }

        // Convert ImageData to Image objects for efficient drawing
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        // tempCtx is already declared. Resizing the canvas resets its state.

        tempCtx.putImageData(new ImageData(phoneBodyOverlayData, canvas.width, canvas.height), 0, 0);
        state.phoneBodyOverlay = new Image();
        state.phoneBodyOverlay.src = tempCanvas.toDataURL();

        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.putImageData(new ImageData(screenBackgroundData.data, canvas.width, canvas.height), 0, 0);
        state.screenBackground = new Image();
        state.screenBackground.src = tempCanvas.toDataURL();

        let loadedCount = 0;
        const onAllLoaded = () => {
            loadedCount++;
            if (loadedCount === 2) {
                if (foundScreen) {
                    state.screenBounds = localScreenBounds;
                    onProcessed(true);
                } else {
                    onProcessed(false);
                }
            }
        };

        state.phoneBodyOverlay.onload = onAllLoaded;
        state.screenBackground.onload = onAllLoaded;
    };
    img.onerror = () => {
        alert('Failed to load the generated image.');
        onProcessed(false, true); // Pass error flag
    };
    img.src = imageUrl;
}