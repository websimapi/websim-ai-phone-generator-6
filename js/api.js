export async function generatePhoneImage(userPrompt) {
    // Detailed technical specification for consistent front-facing phone generation
    const technicalSpec = `Professional product photography of a smartphone device. CRITICAL REQUIREMENTS: Perfect front-facing view at 0° angle, completely flat to camera with no perspective distortion or rotation. Device must be vertically oriented in portrait mode. Screen must be filled with solid magenta color (#FF00FF, RGB 255,0,255) with no gradients or variations. Transparent background (alpha channel). Studio lighting with soft shadows. Photorealistic rendering with accurate materials and textures. Sharp focus across entire device. No hands, no props, no environment - only the isolated phone.`;
    
    const fullPrompt = `${technicalSpec} DEVICE DESCRIPTION: ${userPrompt}. ${technicalSpec}`;

    try {
        const result = await websim.imageGen({
            prompt: fullPrompt,
            transparent: true,
            aspect_ratio: "9:16"
        });
        return result.url;
    } catch (error) {
        console.error('Error generating image:', error);
        alert('Failed to generate image. Please try again.');
        throw error;
    }
}