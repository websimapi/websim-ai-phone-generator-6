export const canvas = document.getElementById('phone-canvas');
// willReadFrequently is important for performance of getImageData
export const ctx = canvas.getContext('2d', { willReadFrequently: true });

export function getCanvas() {
    return canvas;
}

// removed colorDistance()
// removed processImage()
// removed startClock()
// removed drawAppIcon()
// removed drawHomeScreen()
// removed drawAppScreen()

export function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 1;
    canvas.height = 1;
}

