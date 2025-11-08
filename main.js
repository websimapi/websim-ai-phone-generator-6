import { state, resetState } from './js/state.js';
import * as ui from './js/ui.js';
import { generatePhoneImage } from './js/api.js';
import * as canvas from './js/canvas.js';

function handleCanvasClick(e) {
    if (!state.screenBounds) return;

    const rect = canvas.getCanvas().getBoundingClientRect();
    const scaleX = canvas.getCanvas().width / rect.width;
    const scaleY = canvas.getCanvas().height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (state.phoneState === 'locked') {
        state.phoneState = 'unlocked';
        canvas.drawHomeScreen();
    } else if (state.phoneState === 'unlocked') {
        const clickedIcon = state.iconBounds.find(icon =>
            x >= icon.x && x <= icon.x + icon.size &&
            y >= icon.y && y <= icon.y + icon.size
        );
        if (clickedIcon) {
            state.phoneState = 'in-app';
            state.currentApp = clickedIcon.type;
            canvas.drawAppScreen(state.currentApp);
        }
    } else if (state.phoneState === 'in-app') {
        const screenWidth = state.screenBounds.maxX - state.screenBounds.minX;
        const homeButtonSize = screenWidth * 0.1;
        const homeButtonX = state.screenBounds.minX + screenWidth / 2 - homeButtonSize / 2;
        const homeButtonY = state.screenBounds.maxY - homeButtonSize * 1.5;

        if (x >= homeButtonX && x <= homeButtonX + homeButtonSize && y >= homeButtonY && y <= homeButtonY + homeButtonSize) {
            state.phoneState = 'unlocked';
            state.currentApp = null;
            canvas.drawHomeScreen();
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
    canvas.clearCanvas();

    try {
        const imageUrl = await generatePhoneImage(userPrompt);
        canvas.processImage(imageUrl, (foundScreen, error) => {
            ui.setLoading(false);
            if(error) {
                 ui.showControls(true);
                 return;
            }
            if (foundScreen) {
                state.phoneState = 'locked';
                canvas.startClock();
            } else {
                state.phoneState = 'initial';
            }
            ui.showResetText(true);
        });
    } catch (error) {
        ui.setLoading(false);
        ui.showControls(true);
    }
}

function resetApp() {
    if (state.originalImageWithBlackScreen) {
        resetState();
        ui.showControls(true);
        ui.showResetText(false);
        canvas.clearCanvas();
    }
}

function main() {
    ui.initUI(generatePhone, resetApp);
    canvas.getCanvas().addEventListener('click', handleCanvasClick);
}

main();

