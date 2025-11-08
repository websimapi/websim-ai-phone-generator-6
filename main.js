import { state, resetState } from './js/state.js';
import * as ui from './js/ui.js';
import { generatePhoneImage } from './js/api.js';
import { getCanvas, clearCanvas } from './js/canvas.js';
import { processImage } from './js/imageProcessor.js';
import { startClock, drawHomeScreen, drawAppScreen } from './js/renderer.js';

function handleCanvasClick(e) {
    if (!state.screenBounds) return;

    const rect = getCanvas().getBoundingClientRect();
    const scaleX = getCanvas().width / rect.width;
    const scaleY = getCanvas().height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Ignore clicks outside the detected screen area
    if (x < state.screenBounds.minX || x > state.screenBounds.maxX || y < state.screenBounds.minY || y > state.screenBounds.maxY) {
        return;
    }

    if (state.phoneState === 'locked') {
        state.phoneState = 'unlocked';
        drawHomeScreen();
    } else if (state.phoneState === 'unlocked') {
        const clickedIcon = state.iconBounds.find(icon =>
            x >= icon.x && x <= icon.x + icon.size &&
            y >= icon.y && y <= icon.y + icon.size
        );
        if (clickedIcon) {
            state.phoneState = 'in-app';
            state.currentApp = clickedIcon.type;
            drawAppScreen(state.currentApp);
        }
    } else if (state.phoneState === 'in-app') {
        const screenWidth = state.screenBounds.maxX - state.screenBounds.minX;
        const homeButtonSize = screenWidth * 0.1;
        const homeButtonX = state.screenBounds.minX + screenWidth / 2 - homeButtonSize / 2;
        const homeButtonY = state.screenBounds.maxY - homeButtonSize * 1.5;

        if (x >= homeButtonX && x <= homeButtonX + homeButtonSize && y >= homeButtonY && y <= homeButtonY + homeButtonSize) {
            state.phoneState = 'unlocked';
            state.currentApp = null;
            drawHomeScreen();
        }
    }
}

async function generatePhone() {
    const userPrompt = ui.getPromptValue();
    if (!userPrompt) {
        alert('Please enter a description for the phone.');
        return;
    }

    state.phoneState = 'generating';
    resetState();
    ui.showControls(false);
    ui.setLoading(true);
    clearCanvas();

    try {
        const imageUrl = await generatePhoneImage(userPrompt);
        processImage(imageUrl, (foundScreen, error) => {
            ui.setLoading(false);
            if(error) {
                 ui.showControls(true);
                 return;
            }
            if (foundScreen) {
                state.phoneState = 'locked';
                startClock();
            } else {
                state.phoneState = 'no-screen'; // Keep the static image, don't revert to initial.
            }
            ui.showResetText(true);
        });
    } catch (error) {
        ui.setLoading(false);
        ui.showControls(true);
    }
}

function resetApp() {
    if (state.phoneBodyOverlay) {
        resetState();
        ui.showControls(true);
        ui.showResetText(false);
        clearCanvas();
    }
}

function main() {
    ui.initUI(generatePhone, resetApp);
    getCanvas().addEventListener('click', handleCanvasClick);
}

main();