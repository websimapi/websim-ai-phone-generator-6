import { state } from './state.js';
import * as apps from './apps.js';
import { canvas, ctx } from './canvas.js';

function applyScreenClip() {
    ctx.save();
    ctx.beginPath();
    // Use the screen background image (which is a black shape of the screen on a transparent background)
    // to create a clipping path.
    // The "source-in" operation means we'll only draw where the new shape (the screen background)
    // and the existing content are both non-transparent. Since the canvas is clear, this effectively
    // sets the screen shape as the clipping region.
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(state.screenBackground, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; // Reset for normal drawing
}

export function startClock() {
    if (state.timeInterval) {
        clearInterval(state.timeInterval);
    }

    const drawTime = () => {
        if (!state.screenBackground || !state.phoneBodyOverlay || !state.screenBackground.complete || !state.phoneBodyOverlay.complete) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw screen background first
        ctx.drawImage(state.screenBackground, 0, 0);

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

        applyScreenClip();

        // Draw phone body on top
        ctx.drawImage(state.phoneBodyOverlay, 0, 0);
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
    if (!state.screenBackground || !state.phoneBodyOverlay || !state.screenBackground.complete || !state.phoneBodyOverlay.complete) return;
    if (state.timeInterval) {
        clearInterval(state.timeInterval);
        state.timeInterval = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.screenBackground, 0, 0);

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
    
    applyScreenClip();

    // Draw phone body on top of icons
    ctx.drawImage(state.phoneBodyOverlay, 0, 0);
}

export function drawAppScreen(appName) {
    if (!state.screenBackground || !state.phoneBodyOverlay || !state.screenBackground.complete || !state.phoneBodyOverlay.complete) return;
    if (state.timeInterval) {
        clearInterval(state.timeInterval);
        state.timeInterval = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.screenBackground, 0, 0);
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

    applyScreenClip();

    // Draw phone body on top of app content
    ctx.drawImage(state.phoneBodyOverlay, 0, 0);
}