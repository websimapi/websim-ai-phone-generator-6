export function drawPhoneApp(ctx, bounds) {
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

export function drawMessagesApp(ctx, bounds) {
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

export function drawMusicApp(ctx, bounds) {
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

export function drawBrowserApp(ctx, bounds) {
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

export function drawCameraApp(ctx, bounds) {
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

export function drawSettingsApp(ctx, bounds) {
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

export function drawMailApp(ctx, bounds) {
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

export function drawClockApp(ctx, bounds) {
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