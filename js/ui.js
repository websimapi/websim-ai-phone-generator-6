const controls = document.querySelector('.controls');
const promptInput = document.getElementById('prompt-input');
const generateBtn = document.getElementById('generate-btn');
const loader = document.getElementById('loader');
const resetText = document.getElementById('reset-text');

export function initUI(generateCallback, resetCallback) {
    generateBtn.addEventListener('click', generateCallback);
    promptInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && !generateBtn.disabled) {
            generateCallback();
        }
    });
    resetText.addEventListener('click', resetCallback);
}

export function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    promptInput.disabled = isLoading;
    if (isLoading) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

export function showControls(show) {
    if (show) {
        controls.classList.remove('hidden');
    } else {
        controls.classList.add('hidden');
    }
}

export function showResetText(show) {
    if (show) {
        resetText.classList.remove('hidden');
    } else {
        resetText.classList.add('hidden');
    }
}

export function getPromptValue() {
    return promptInput.value.trim();
}

