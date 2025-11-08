export const state = {
    phoneState: 'initial', // 'initial', 'generating', 'locked', 'unlocked', 'in-app'
    originalImageWithBlackScreen: null,
    screenBounds: null,
    iconBounds: [],
    currentApp: null,
    timeInterval: null,
};

export function resetState() {
    state.phoneState = 'initial';
    state.originalImageWithBlackScreen = null;
    state.screenBounds = null;
    state.iconBounds = [];
    state.currentApp = null;
    if (state.timeInterval) {
        clearInterval(state.timeInterval);
        state.timeInterval = null;
    }
}