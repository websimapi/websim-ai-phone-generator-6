export const state = {
    phoneState: 'initial', // 'initial', 'generating', 'locked', 'unlocked', 'in-app'
    phoneBodyOverlay: null,
    screenBackground: null,
    screenBounds: null,
    iconBounds: [],
    currentApp: null,
    timeInterval: null,
};

export function resetState() {
    state.phoneState = 'initial';
    state.phoneBodyOverlay = null;
    state.screenBackground = null;
    state.screenBounds = null;
    state.iconBounds = [];
    state.currentApp = null;
    if (state.timeInterval) {
        clearInterval(state.timeInterval);
        state.timeInterval = null;
    }
}