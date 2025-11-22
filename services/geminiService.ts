import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { Tile } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];


export const EXECUTION_PROMPT = `Remove only the text contained within the red-marked regions. It is absolutely crucial that no part of the image outside these specific red-marked regions is altered in any way. Do not add, remove, draw, or modify any existing details, lines, patterns, or content. This includes, but is not limited to, speech balloon borders, outlines, internal patterns (such as screen tones, shading, or textures), and any background art. Preserve all these elements exactly as they are, pixel-perfectly. Even if text touches a balloon border, only the text should be removed, leaving the balloon border and its patterns completely untouched. The task is strictly to remove text by inpainting the red-marked areas using only existing surrounding pixel data, ensuring no shift, resize, or alteration to the surrounding content or the overall image composition. The output image must maintain the exact same dimensions and precise pixel-for-pixel alignment as the input, with the sole change being the removal of text within the red-marked areas.`;


// This function sends a single tile with a red outline to the Gemini API.
export async function processSingleTile(base64MaskedTile: string, customPrompt?: string): Promise<string> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  const maskedImagePart = {
    inlineData: { data: base64MaskedTile, mimeType: 'image/png' },
  };
  
  const finalPrompt = (customPrompt && customPrompt.trim() !== '') ? customPrompt : EXECUTION_PROMPT;
  const textPart = { text: finalPrompt };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [maskedImagePart, textPart] },
              config: { 
                  responseModalities: [Modality.IMAGE],
              },
          });
          
          if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];

            // 1. Check for response blocking due to safety
            if (candidate.finishReason && (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'PROHIBITED_CONTENT')) {
                const safetyRating = candidate.safetyRatings?.find(r => r.blocked);
                let reasonDetail = safetyRating ? ` (vi phạm: ${safetyRating.category.replace('HARM_CATEGORY_', '')})` : '';
                const message = `Kết quả bị chặn vì vi phạm chính sách an toàn. Lý do: ${candidate.finishReason}${reasonDetail}.`;
                // This is a final error, don't retry.
                throw new Error(message);
            }
            
            // 2. Happy path: check for image data
            if (candidate.content?.parts) {
              for (const part of candidate.content.parts) {
                if (part.inlineData?.data) {
                  return part.inlineData.data; // Success!
                }
              }
            }
          }
          
          // 3. Check for prompt blocking (as a fallback)
          if (response.promptFeedback?.blockReason) {
              const reason = response.promptFeedback.blockReason;
              const details = response.promptFeedback.safetyRatings?.find(r => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW');
              let specificReason: string = reason;
              if (details) {
                  specificReason = `${reason} (vi phạm: ${details.category.replace('HARM_CATEGORY_', '')})`;
              }
              const message = `Lỗi ảnh: ${specificReason}.`;
              // This is a final error, don't retry.
              throw new Error(message);
          }

          throw new Error("Phản hồi của AI không chứa dữ liệu hình ảnh hợp lệ hoặc đã bị chặn mà không rõ lý do.");

      } catch (error) {
           lastError = error instanceof Error ? error : new Error(String(error));
           console.error(`Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);

           // Don't retry on fatal errors
           if (lastError.message.includes('API key not valid')) {
               throw new Error("API key được định cấu hình không hợp lệ.");
           }
           if (lastError.message.toLowerCase().includes('billing') || lastError.message.toLowerCase().includes('quota')) {
               throw new Error('Đã xảy ra lỗi liên quan đến thanh toán hoặc hạn ngạch API. Vui lòng kiểm tra tài khoản Google Cloud của bạn.');
           }
           if (lastError.message.includes('chính sách an toàn') || lastError.message.includes('bị chặn')) {
               throw lastError;
           }

           // Retry for transient errors
           if (attempt < MAX_RETRIES) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
  }
   throw new Error(`Xử lý thất bại sau ${MAX_RETRIES} lần thử. Lỗi cuối cùng: ${lastError?.message || 'Lỗi API không xác định'}.`);
}

type TileJob = Omit<Tile, 'state' | 'processedData' | 'rawProcessedData' | 'error'>;

// This function prepares the image by creating 1024x1024 tiles based on user-defined coordinates.
export async function createTileJobs(
    base64Image: string, 
    selectionPaths: { x: number; y: number }[][],
    maskPaths: { x: number; y: number }[][],
    manualTiles: { x: number; y: number }[],
): Promise<TileJob[]> {
    if (manualTiles.length === 0) {
        throw new Error("Please define at least one 1024x1024 processing area using the 'Select Area' tool.");
    }

    const originalImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image for processing."));
        img.src = base64Image;
    });
    
    const TILE_SIZE = 1024;
    const tileJobs: TileJob[] = [];
    
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = TILE_SIZE;
    tileCanvas.height = TILE_SIZE;
    const tileCtx = tileCanvas.getContext('2d');
    if (!tileCtx) { throw new Error("Could not create canvas context for tiling."); }

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = TILE_SIZE;
    maskCanvas.height = TILE_SIZE;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) { throw new Error("Could not create canvas context for mask."); }


    for (const tile of manualTiles) {
        const { x: tileX, y: tileY } = tile;
        const jobId = `tile-${tileX}-${tileY}`;

        // Create Path2D objects for the RED selections relative to the current tile
        const pathsForTile = selectionPaths.map(path => {
            const p = new Path2D();
            if (path.length < 2) return p;
            p.moveTo(path[0].x - tileX, path[0].y - tileY);
            for (let i = 1; i < path.length; i++) {
                p.lineTo(path[i].x - tileX, path[i].y - tileY);
            }
            p.closePath();
            return p;
        });

        const maskPathsForTile = maskPaths.map(path => {
            const p = new Path2D();
            if (path.length < 2) return p;
            p.moveTo(path[0].x - tileX, path[0].y - tileY);
            for (let i = 1; i < path.length; i++) {
                p.lineTo(path[i].x - tileX, path[i].y - tileY);
            }
            p.closePath();
            return p;
        });

        // 1. Create clean tile data
        tileCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
        tileCtx.drawImage(originalImage, tileX, tileY, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
        const cleanTileURL = tileCanvas.toDataURL('image/png');
        const cleanTileData = cleanTileURL.split(',')[1];
        
        // 2. Burn white "mask" layers onto the tile before adding red lines
        tileCtx.fillStyle = 'white';
        maskPathsForTile.forEach(p => tileCtx.fill(p));

        // 3. Create the tile with the red overlay for the AI
        tileCtx.strokeStyle = 'rgba(255, 0, 0, 1)';
        tileCtx.lineWidth = 3;
        tileCtx.lineJoin = 'round';
        pathsForTile.forEach(p => tileCtx.stroke(p));
        const tileWithOverlayURL = tileCanvas.toDataURL('image/png');
        const tileWithOverlayData = tileWithOverlayURL.split(',')[1];
        
        // 4. Create the default mask data from red selections for compositing.
        maskCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
        maskCtx.fillStyle = 'white';
        pathsForTile.forEach(p => maskCtx.fill(p));
        const maskDataURL = maskCanvas.toDataURL('image/png');
        const maskData = maskDataURL.split(',')[1];

        tileJobs.push({ 
            id: jobId,
            x: tileX, 
            y: tileY, 
            originalData: tileWithOverlayData,
            cleanData: cleanTileData,
            maskData: maskData,
        });
    }

    return tileJobs;
}