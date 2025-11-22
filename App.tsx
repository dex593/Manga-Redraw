
import React, { useState, useCallback, useEffect } from 'react';
import type { ImageFile, Tile, RedrawPayload } from './types';
import { TileState } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ImageUploader } from './components/ImageUploader';
import { ImageDisplay } from './components/ImageDisplay';
import { UserGuide } from './components/UserGuide';
import { createTileJobs, processSingleTile, EXECUTION_PROMPT } from './services/geminiService';
import { useLanguage } from './i18n/i18n';
import { sendToDiscord } from './services/webhookService';

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image: ${err}`));
        img.src = src;
    });
};

/**
 * Helper to generate a full-size image with red outlines and white masks drawn on it.
 * Used for webhook previews to show what is being processed.
 */
const generateMarkedImage = async (
    originalBase64: string, 
    selectionPaths: { x: number; y: number }[][], 
    maskPaths: { x: number; y: number }[][]
): Promise<string> => {
    const img = await loadImage(originalBase64);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not create canvas context for marking.");

    ctx.drawImage(img, 0, 0);

    // Draw masks (white)
    ctx.fillStyle = 'white';
    maskPaths.forEach(path => {
        if (path.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.closePath();
        ctx.fill();
    });

    // Draw text selections (red outline)
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    selectionPaths.forEach(path => {
        if (path.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.closePath();
        ctx.stroke();
    });

    return canvas.toDataURL('image/png');
};

/**
 * Composites the AI-processed image with the original clean tile.
 * It uses the `mask` generated from the red text selections.
 * @param cleanTileBase64 The base64 of the original, unedited 1024x1024 tile.
 * @param processedDataBase64 The base64 of the AI-processed tile.
 * @param maskDataBase64 The base64 of the mask derived from red text selections.
 * @returns A promise that resolves to the base64 of the final composited image.
 */
const compositeTile = async (cleanTileBase64: string, processedDataBase64: string, maskDataBase64: string): Promise<string> => {
    const TILE_SIZE = 1024;
    
    const [cleanImg, processedImg, maskImg] = await Promise.all([
        loadImage(`data:image/png;base64,${cleanTileBase64}`),
        loadImage(`data:image/png;base64,${processedDataBase64}`),
        loadImage(`data:image/png;base64,${maskDataBase64}`)
    ]);

    // 1. Create a canvas for the final result. It starts with the original tile.
    const mainCanvas = document.createElement('canvas');
    mainCanvas.width = TILE_SIZE;
    mainCanvas.height = TILE_SIZE;
    const mainCtx = mainCanvas.getContext('2d');
    if (!mainCtx) throw new Error("Failed to create main canvas context.");
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.drawImage(cleanImg, 0, 0);

    // 2. Punch a hole in this canvas using the final mask.
    mainCtx.globalCompositeOperation = 'destination-out';
    mainCtx.drawImage(maskImg, 0, 0);
    
    // 3. Create a temporary canvas containing the AI's output.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = TILE_SIZE;
    tempCanvas.height = TILE_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error("Failed to create temporary canvas context.");
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(processedImg, 0, 0);

    // 4. Draw the AI's output *behind* the existing content of the main canvas.
    mainCtx.globalCompositeOperation = 'destination-over';
    mainCtx.drawImage(tempCanvas, 0, 0);

    return mainCanvas.toDataURL('image/png').split(',')[1];
};


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
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}


const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<ImageFile | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [stitchedCanvas, setStitchedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const { t } = useLanguage();


  const resetState = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setError(null);
    setIsLoading(false);
    setTiles([]);
    setStitchedCanvas(null);
    setCustomPrompt('');
    window.scrollTo(0, 0);
  };

  const handleImageUpload = useCallback((imageFile: ImageFile) => {
    resetState();
    setOriginalImage(imageFile);
    sendToDiscord({
      eventName: t('webhook.imageUploaded.title'),
      description: t('webhook.imageUploaded.desc', { 
          filename: imageFile.file.name, 
          size: Math.round(imageFile.file.size / 1024) 
      }),
      color: 0x5865F2,
      originalImageBase64: imageFile.base64
    });
  }, [t]);

  const handleProcessImage = useCallback(async (
    selectionPaths: { x: number; y: number }[][],
    maskPaths: { x: number; y: number }[][],
    manualTiles: { x: number; y: number }[],
    prompt: string
  ) => {
    if (!originalImage) return;
    
    setCustomPrompt(prompt);
    setError(null);
    setIsLoading(true);
    setProcessedImage(null);

    try {
      if (selectionPaths.length === 0) {
        throw new Error(t('errors.noTextSelected'));
      }
       if (manualTiles.length === 0) {
        throw new Error(t('errors.noAreaSelected'));
      }

      // Generate preview image with red outlines and masks for the webhook
      const markedImageBase64 = await generateMarkedImage(originalImage.base64, selectionPaths, maskPaths);

      sendToDiscord({
        eventName: t('webhook.processingStarted.title'),
        description: t('webhook.processingStarted.desc', {
          count: manualTiles.length,
          customPrompt: prompt.trim() !== '' && prompt !== EXECUTION_PROMPT ? t('common.yes') : t('common.no')
        }),
        color: 0xFEE75C,
        originalImageBase64: markedImageBase64
      });

      const tileJobs = await createTileJobs(originalImage.base64, selectionPaths, maskPaths, manualTiles);
      const initialTiles: Tile[] = tileJobs.map(job => ({
        ...job,
        state: TileState.PENDING,
        isRedraw: false
      }));
      setTiles(initialTiles);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('errors.failedToPrepare'));
      setIsLoading(false);
    }
  }, [originalImage, t]);

  const updateTile = useCallback((tileId: string, newState: Partial<Tile>) => {
    setTiles(prevTiles => prevTiles.map(t => t.id === tileId ? { ...t, ...newState } : t));
  }, []);

  // Unified Processing Loop: Handles both initial processing and redraws queue
  useEffect(() => {
    if (!isLoading || tiles.length === 0) return;

    const processNextTile = async () => {
      const pendingTile = tiles.find(t => t.state === TileState.PENDING);
      if (!pendingTile) {
        return;
      }

      // Start Processing State
      updateTile(pendingTile.id, { state: TileState.PROCESSING });

      // Send Webhook for specific tile start ONLY if it's a redraw operation
      if (pendingTile.isRedraw) {
          sendToDiscord({
            eventName: t('webhook.tileRedrawStarted.title'),
            description: t('webhook.tileRedrawStarted.desc', {
                tileId: pendingTile.id,
                customPrompt: customPrompt && customPrompt.trim() !== '' && customPrompt !== EXECUTION_PROMPT ? t('common.yes') : t('common.no')
            }),
            color: 0xFEE75C,
            originalImageBase64: `data:image/png;base64,${pendingTile.originalData}`
        });
      }

      try {
        const rawData = await processSingleTile(pendingTile.originalData, customPrompt);
        const compositedData = await compositeTile(pendingTile.cleanData, rawData, pendingTile.maskData);
        
        // Send Webhook for specific tile finish ONLY if it's a redraw operation
        if (pendingTile.isRedraw) {
            sendToDiscord({
                eventName: t('webhook.tileRedrawFinished.title'),
                description: t('webhook.tileRedrawFinished.desc', { tileId: pendingTile.id }),
                color: 0x57F287, // Green for success
                processedImageBase64: `data:image/png;base64,${compositedData}`,
            });
        }

        updateTile(pendingTile.id, { 
            state: TileState.SUCCESS, 
            rawProcessedData: rawData, 
            processedData: compositedData, 
            error: undefined 
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('errors.unknown');
        updateTile(pendingTile.id, { state: TileState.FAILED, error: errorMessage });
      }
    };

    // Only trigger if there is a pending tile and we are not already running multiple in parallel (limit 1 for safety)
    // Since useEffect runs on state change, this essentially creates a loop.
    const isAnyProcessing = tiles.some(t => t.state === TileState.PROCESSING);
    if (!isAnyProcessing) {
        processNextTile();
    }

  }, [tiles, isLoading, updateTile, customPrompt, t]);

  const reStitchCanvas = useCallback(async (updatedTiles: Tile[]): Promise<string | null> => {
      if (!originalImage) return null;
      try {
          const originalImgElement = await loadImage(originalImage.base64);
          const newCanvas = document.createElement('canvas');
          newCanvas.width = originalImgElement.naturalWidth;
          newCanvas.height = originalImgElement.naturalHeight;
          const ctx = newCanvas.getContext('2d');
          if (!ctx) throw new Error("Could not create canvas context for stitching.");
          ctx.drawImage(originalImgElement, 0, 0);

          const successfulTiles = updatedTiles.filter(t => t.state === TileState.SUCCESS && t.processedData);
          for (const tile of successfulTiles) {
              const tileImg = await loadImage(`data:image/png;base64,${tile.processedData!}`);
              ctx.drawImage(tileImg, tile.x, tile.y);
          }
          const finalDataURL = newCanvas.toDataURL(originalImage.file.type);
          setStitchedCanvas(newCanvas);
          setProcessedImage(finalDataURL);
          return finalDataURL;
      } catch (err) {
          console.error("Stitching failed:", err);
          setError(err instanceof Error ? err.message : t('errors.stitching'));
          return null;
      }
  }, [originalImage, t]);

const handleBatchRedraw = useCallback(async (payloads: RedrawPayload[]) => {
    if (!originalImage) return;
    
    // Prevent double submission if something is already processing? 
    // Actually, we allow adding to queue, but visual feedback is better if we don't.
    // For simplicity, we allow queueing.

    try {
        const newJobRequests = payloads.map(async (payload) => {
            const { tileId, promptOverride, textPaths, maskPaths, rect } = payload;
            
            // Regenerate the tile job with the latest path data
            const newTileJobs = await createTileJobs(originalImage.base64, textPaths, maskPaths, [rect]);
             if (newTileJobs.length !== 1) {
                throw new Error(`Failed to create job for tile ${tileId}`);
            }
            const job = newTileJobs[0];
            return { job, promptOverride };
        });

        const results = await Promise.all(newJobRequests);

        setTiles(prevTiles => {
            let newTiles = [...prevTiles];
            
            results.forEach(({ job, promptOverride }) => {
                // Update global customPrompt if an override was provided (last one wins in batch)
                if (promptOverride && promptOverride !== customPrompt) {
                    setCustomPrompt(promptOverride);
                }

                const existingIndex = newTiles.findIndex(t => t.id === job.id);
                if (existingIndex !== -1) {
                    newTiles[existingIndex] = {
                        ...newTiles[existingIndex],
                        ...job,
                        state: TileState.PENDING, // Queue it
                        isRedraw: true,
                        error: undefined
                    };
                } else {
                    newTiles.push({
                         ...job,
                         state: TileState.PENDING,
                         isRedraw: true,
                         error: undefined
                    });
                }
            });
            
            return newTiles;
        });

        setIsLoading(true); // Start the processing loop
        
    } catch (err) {
        console.error(err);
        setError(t('errors.failedToPrepare'));
    }
}, [originalImage, customPrompt, t]);


const handleRedrawTile = useCallback(async (payload: RedrawPayload) => {
    // Wrapper for single redraw
    await handleBatchRedraw([payload]);
}, [handleBatchRedraw]);


  // Monitor completion of processing
  useEffect(() => {
      if (isLoading && tiles.length > 0) {
          const allFinished = tiles.every(t => t.state === TileState.SUCCESS || t.state === TileState.FAILED);
          const hasPending = tiles.some(t => t.state === TileState.PENDING || t.state === TileState.PROCESSING);
          
          if (allFinished && !hasPending) {
              setIsLoading(false);
              reStitchCanvas(tiles).then((finalImage) => {
                  // Only send completion webhook if we are in the initial processing phase
                  // OR if we decide to send it for batch redraws too.
                  // Usually "Processing Finished" is good for any bulk operation completion.
                  const successTiles = tiles.filter(t => t.state === TileState.SUCCESS);
                  // Check if any tile was part of a redraw operation
                  const wasRedraw = tiles.some(t => t.isRedraw);

                  // If it was a redraw, we already sent individual tile finish hooks. 
                  // But we might want a summary. For now, let's keep it for initial process primarily,
                  // but sending it always ensures the user gets the final stitched image.
                  
                  sendToDiscord({
                      eventName: t('webhook.processingFinished.title'),
                      description: t('webhook.processingFinished.desc', { 
                          successCount: successTiles.length,
                          totalCount: tiles.length
                      }),
                      color: 0x57F287,
                      processedImageBase64: finalImage || undefined
                  });
              });
          }
      }
  }, [tiles, isLoading, reStitchCanvas, t]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <Header onOpenGuide={() => setIsGuideOpen(true)} />

      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center gap-8">
        {!originalImage ? (
          <ImageUploader onImageUpload={handleImageUpload} />
        ) : (
          <ImageDisplay 
            originalImage={originalImage.base64}
            processedImage={processedImage}
            onReset={resetState}
            onProcess={handleProcessImage}
            tiles={tiles}
            onRedrawTile={handleRedrawTile}
            onBatchRedraw={handleBatchRedraw}
            onEditResult={(base64) => {
                 const file = dataURLtoFile(base64, 'edited.png');
                 handleImageUpload({ file, base64 });
                sendToDiscord({
                    eventName: t('webhook.editResult.title'),
                    description: t('webhook.editResult.desc'),
                    color: 0x3498DB
                });
            }}
            isLoading={isLoading}
          />
        )}
      </main>

      <UserGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <Footer />
    </div>
  );
};

export default App;
