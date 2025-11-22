
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DownloadIcon, DocumentIcon, ResetIcon, BrushIcon, ClearIcon, TileIcon, FillIcon, HandIcon, LayersIcon } from './icons';
import { SelectionCanvas } from './SelectionCanvas';
import { LayersPanel, UILayer } from './LayersPanel';
import type { Tile, RedrawPayload } from '../types';
import { TileState } from '../types';
import { useLanguage } from '../i18n/i18n';
import { EXECUTION_PROMPT } from '../services/geminiService';
import { clipPathWithRect } from '../utils/geometry';
import * as agPsd from 'ag-psd';
import { sendToDiscord } from '../services/webhookService';

interface ImageDisplayProps {
  originalImage: string;
  processedImage: string | null;
  onReset: () => void;
  onProcess: (
    selectionPaths: { x: number; y: number }[][],
    maskPaths: { x: number; y: number }[][],
    manualTiles: { x: number; y: number }[],
    customPrompt: string
  ) => void;
  tiles?: Tile[];
  onRedrawTile?: (payload: RedrawPayload) => Promise<void>;
  onBatchRedraw?: (payloads: RedrawPayload[]) => Promise<void>;
  onEditResult?: (processedImageBase64: string) => void;
  isLoading?: boolean;
}

export interface ResultLayer {
    id: string;
    type: 'result';
    name: string;
    visible: boolean;
    base64: string; // The cropped image data
    x: number; // Top-left x coordinate on the original image
    y: number; // Top-left y coordinate on the original image
    width: number;
    height: number;
}

export interface PathLayer {
    id: string;
    type: 'text';
    name: string;
    visible: boolean;
    locked: boolean;
    path: { x: number; y: number }[];
    resultLayer?: ResultLayer | null;
}

export interface MaskLayer {
    id: string;
    type: 'mask';
    name: string;
    visible: boolean;
    locked: boolean;
    path: { x: number; y: number }[];
}

export interface AreaLayer {
    id: string;
    type: 'area';
    name: string;
    visible: boolean;
    locked: boolean;
    isCollapsed: boolean;
    rect: { x: number; y: number };
    textLayers: PathLayer[];
    maskLayers: MaskLayer[];
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image: ${err}`));
        img.src = src;
    });
};

const generateLayerThumbnail = (
    layer: AreaLayer | PathLayer | MaskLayer,
    imageElement: HTMLImageElement | null
): string => {
    const thumbCanvas = document.createElement('canvas');
    const thumbSize = 64;
    thumbCanvas.width = thumbSize;
    thumbCanvas.height = thumbSize;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (!thumbCtx || !imageElement) return '';

    const imageWidth = imageElement.naturalWidth;
    const imageHeight = imageElement.naturalHeight;
    const scale = Math.min(thumbSize / imageWidth, thumbSize / imageHeight);
    const offsetX = (thumbSize - imageWidth * scale) / 2;
    const offsetY = (thumbSize - imageHeight * scale) / 2;
    
    thumbCtx.clearRect(0, 0, thumbSize, thumbSize);
    thumbCtx.lineWidth = 2;
    
    const drawScaledPath = (path: { x: number; y: number }[]) => {
        if (path && path.length > 1) {
            thumbCtx.beginPath();
            thumbCtx.moveTo(path[0].x * scale + offsetX, path[0].y * scale + offsetY);
            for (let i = 1; i < path.length; i++) {
                thumbCtx.lineTo(path[i].x * scale + offsetX, path[i].y * scale + offsetY);
            }
            thumbCtx.closePath();
        }
    };

    switch (layer.type) {
        case 'text':
             thumbCtx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
             drawScaledPath(layer.path);
             thumbCtx.stroke();
            break;
        case 'mask':
            thumbCtx.fillStyle = 'rgba(200, 200, 200, 0.9)';
            drawScaledPath(layer.path);
            thumbCtx.fill();
            break;
        case 'area':
            thumbCtx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
            if (layer.rect) {
                const sX = layer.rect.x;
                const sY = layer.rect.y;
                const sWidth = 1024;
                const sHeight = 1024;
                
                const dWidth = sWidth * scale;
                const dHeight = sHeight * scale;
                const dX = sX * scale + offsetX;
                const dY = sY * scale + offsetY;
                
                thumbCtx.drawImage(imageElement, sX, sY, sWidth, sHeight, dX, dY, dWidth, dHeight);
                thumbCtx.strokeRect(dX, dY, dWidth, dHeight);
            }
            break;
    }

    return thumbCanvas.toDataURL();
};


export const ImageDisplay: React.FC<ImageDisplayProps> = ({ originalImage, processedImage, onReset, onProcess, tiles = [], onRedrawTile, onBatchRedraw, onEditResult, isLoading = false }) => {
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [mode, setMode] = useState<'select' | 'tile' | 'mask' | 'pan'>('tile');
  const [customPrompt, setCustomPrompt] = useState<string>(EXECUTION_PROMPT);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectionLayers, setSelectionLayers] = useState<AreaLayer[]>([]);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [hoveredAreaInfo, setHoveredAreaInfo] = useState<{ name: string; x: number; y: number } | null>(null);
  const [deletedResultIds, setDeletedResultIds] = useState<Set<string>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isDownloadingPsd, setIsDownloadingPsd] = useState(false);
  const [pendingTileRect, setPendingTileRect] = useState<{ x: number; y: number } | null>(null);
  const [isLayerSheetOpen, setIsLayerSheetOpen] = useState(false);
  
  // Focus Mode State
  const [focusedAreaId, setFocusedAreaId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const resetSelectionState = useCallback(() => {
    setCurrentPath([]);
    setSelectionLayers([]);
    setMode('tile');
    setValidationError(null);
    setHoveredAreaInfo(null);
    setHoveredLayerId(null);
    setDeletedResultIds(new Set());
    setIsBatchProcessing(false);
    setFocusedAreaId(null);
  }, []);

  useEffect(() => {
    resetSelectionState();
  }, [originalImage, resetSelectionState]);

  useEffect(() => {
    const img = document.createElement('img');
    img.onload = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = originalImage;
  }, [originalImage]);


  useEffect(() => {
    const hasAreaLayer = selectionLayers.length > 0;
    if (!hasAreaLayer && (mode === 'select' || mode === 'mask')) {
      setMode('tile');
    }
  }, [selectionLayers, mode]);
  
  // Effect to sync tile processing results back into the layer structure
  useEffect(() => {
    if (tiles.length === 0) return;

    const syncResults = async () => {
        let needsUpdate = false;
        const newLayersPromises = selectionLayers.map(async (area) => {
            const tileId = `tile-${area.rect.x}-${area.rect.y}`;
            const tile = tiles.find(t => t.id === tileId);

            if (!tile) return area;

            // STATE: Tile has finished processing/redrawing successfully
            if (tile.state === TileState.SUCCESS && tile.rawProcessedData) {
                // Determine if we need to generate any results. This is true if there's a text layer
                // that's missing a result (and hasn't been manually deleted).
                // This covers both the initial run and redraws (where results were cleared).
                const needsResultGeneration = area.textLayers.some(tl => !tl.resultLayer && !deletedResultIds.has(`result-${tl.id}`));

                if (!needsResultGeneration) {
                    return area; // All results are present and accounted for.
                }

                needsUpdate = true;
                const processedImageElement = await loadImage(`data:image/png;base64,${tile.rawProcessedData}`);
                const tileCanvas = document.createElement('canvas');
                tileCanvas.width = 1024;
                tileCanvas.height = 1024;
                const tileCtx = tileCanvas.getContext('2d');
                if (!tileCtx) return area;
                tileCtx.drawImage(processedImageElement, 0, 0);

                const updatedTextLayers = await Promise.all(area.textLayers.map(async (textLayer) => {
                    // If the layer already has a result or was deleted, skip it.
                    if (textLayer.resultLayer || deletedResultIds.has(`result-${textLayer.id}`)) {
                        return textLayer;
                    }

                    // Otherwise, generate a new result for this layer.
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    textLayer.path.forEach(p => {
                        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
                    });
                    const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
                    if (bbox.width <= 0 || bbox.height <= 0) return textLayer;

                    const cropCanvas = document.createElement('canvas');
                    cropCanvas.width = bbox.width; cropCanvas.height = bbox.height;
                    const cropCtx = cropCanvas.getContext('2d');
                    if (!cropCtx) return textLayer;

                    cropCtx.beginPath();
                    cropCtx.moveTo(textLayer.path[0].x - bbox.x, textLayer.path[0].y - bbox.y);
                    for (let i = 1; i < textLayer.path.length; i++) {
                        cropCtx.lineTo(textLayer.path[i].x - bbox.x, textLayer.path[i].y - bbox.y);
                    }
                    cropCtx.closePath();
                    cropCtx.clip();
                    
                    cropCtx.drawImage(tileCanvas, bbox.x - tile.x, bbox.y - tile.y, bbox.width, bbox.height, 0, 0, bbox.width, bbox.height);
                    
                    const base64 = cropCanvas.toDataURL('image/png').split(',')[1];
                    const resultId = `result-${textLayer.id}`;
                    
                    const match = textLayer.name.match(/\d+$/);
                    const index = match ? match[0] : '';

                    return {
                        ...textLayer,
                        visible: false, // Hide the text layer now that its result is created
                        resultLayer: {
                            id: resultId, type: 'result' as const,
                            name: t('imageDisplay.layers.resultForText', { index }),
                            visible: true, base64,
                            x: Math.round(bbox.x), y: Math.round(bbox.y),
                            width: Math.round(bbox.width), height: Math.round(bbox.height),
                        }
                    };
                }));
                
                return { ...area, textLayers: updatedTextLayers };

            // STATE: Tile is starting a redraw/pending
            } else if (tile.state === TileState.PROCESSING || tile.state === TileState.PENDING) {
                // Check if there are results that need to be cleared for any unlocked text layers.
                const needsClearing = area.textLayers.some(tl => !tl.locked && tl.resultLayer);
                if (needsClearing) {
                    needsUpdate = true;
                    // Only clear the resultLayer for unlocked text layers. Locked ones are preserved.
                    const updatedTextLayers = area.textLayers.map(tl =>
                        !tl.locked ? { ...tl, resultLayer: null } : tl
                    );
                    return { ...area, textLayers: updatedTextLayers };
                }
            }
            
            return area;
        });

        const resolvedLayers = await Promise.all(newLayersPromises);
        if (needsUpdate) {
            setSelectionLayers(resolvedLayers);
        }
    };
    syncResults();
}, [tiles, t, deletedResultIds]);


 // Auto-hide all text/keep layers once initial processing is complete
 useEffect(() => {
    if (processedImage) {
        setSelectionLayers(prevLayers => prevLayers.map(area => ({
            ...area,
            textLayers: area.textLayers.map(l => ({ ...l, visible: false })),
            maskLayers: area.maskLayers.map(l => ({ ...l, visible: false })),
        })));
    }
}, [processedImage]);


  const handleProcess = useCallback(() => {
    setValidationError(null);
    
    const unlockedAreaLayers = selectionLayers.filter(area => !area.locked);
    
    const allTextPaths = unlockedAreaLayers.flatMap(area => 
        area.textLayers.filter(text => !text.locked).map(text => text.path)
    );
     const allMaskPaths = unlockedAreaLayers.flatMap(area => 
        area.maskLayers.filter(mask => !mask.locked).map(mask => mask.path)
    );
    const allAreaRects = unlockedAreaLayers.map(area => area.rect);

    if (allTextPaths.length === 0) {
        setValidationError(t('errors.noTextSelected'));
        return;
    }
    if (allAreaRects.length === 0) {
        setValidationError(t('errors.noAreaSelected'));
        return;
    }
      
    onProcess(allTextPaths, allMaskPaths, allAreaRects, customPrompt);

  }, [selectionLayers, customPrompt, onProcess, t]);

  const handleAddAreaLayer = (rect: { x: number; y: number }) => {
     setSelectionLayers(prev => {
        const index = prev.length + 1;
        const newAreaLayer: AreaLayer = {
            id: `area-${Date.now()}`,
            name: t('imageDisplay.layers.areaSelectionName', { index }),
            visible: true,
            locked: false,
            isCollapsed: false,
            type: 'area',
            rect,
            textLayers: [],
            maskLayers: [],
        };
        return [...prev, newAreaLayer];
     });
  };

  // Wrapper to intercept add area request for confirmation on mobile
  const handleRequestAddArea = (rect: { x: number; y: number }) => {
      // If screen width is less than 1024px (likely tablet/mobile), confirm first
      if (window.innerWidth < 1024) {
          setPendingTileRect(rect);
      } else {
          handleAddAreaLayer(rect);
      }
  };

  const confirmAddArea = () => {
      if (pendingTileRect) {
          handleAddAreaLayer(pendingTileRect);
          setPendingTileRect(null);
      }
  };

  const cancelAddArea = () => {
      setPendingTileRect(null);
  };

  const handleAddPathToLayers = (path: { x: number; y: number }[], type: 'text' | 'mask') => {
      setSelectionLayers(prevLayers => {
          let layersModified = false;
          const newLayers = [...prevLayers];

          newLayers.forEach((area, areaIndex) => {
              if (area.locked) return;
              const areaRect = { ...area.rect, width: 1024, height: 1024 };
              const clippedPaths = clipPathWithRect(path, areaRect);

              if (clippedPaths.length > 0) {
                  layersModified = true;
                  clippedPaths.forEach(clippedPath => {
                      if (type === 'text') {
                          const index = area.textLayers.length + 1;
                          const newTextLayer: PathLayer = {
                              id: `text-${Date.now()}-${areaIndex}-${index}`,
                              name: t('imageDisplay.layers.textSelectionName', { index }),
                              visible: true,
                              locked: false,
                              type: 'text',
                              path: clippedPath,
                              resultLayer: null,
                          };
                          newLayers[areaIndex] = { ...newLayers[areaIndex], textLayers: [...newLayers[areaIndex].textLayers, newTextLayer] };
                      } else if (type === 'mask') {
                           const index = area.maskLayers.length + 1;
                           const newMaskLayer: MaskLayer = {
                               id: `mask-${Date.now()}-${areaIndex}-${index}`,
                               name: t('imageDisplay.layers.maskLayerName', { index }),
                               visible: true,
                               locked: false,
                               type: 'mask',
                               path: clippedPath,
                           };
                           newLayers[areaIndex] = { ...newLayers[areaIndex], maskLayers: [...newLayers[areaIndex].maskLayers, newMaskLayer] };
                      }
                  });
              }
          });

          return layersModified ? newLayers : prevLayers;
      });
  };

  const handlePathClosed = useCallback(() => {
      if (currentPath.length > 2) {
          if (mode === 'select') {
            handleAddPathToLayers(currentPath, 'text');
          } else if (mode === 'mask') {
            handleAddPathToLayers(currentPath, 'mask');
          }
          setCurrentPath([]);
      }
  }, [currentPath, mode]);

  const handleClearAll = useCallback(() => {
    setSelectionLayers([]);
    setCurrentPath([]);
    setFocusedAreaId(null);
  }, []);

  const isClearDisabled = () => {
    if (isLoading || isBatchProcessing) return true;
    return selectionLayers.length === 0 && currentPath.length === 0;
  };
  
    const onToggleLayerVisibility = useCallback((layerId: string) => {
        setSelectionLayers(prev => prev.map(area => {
            if (area.id === layerId) {
                return { ...area, visible: !area.visible };
            }
            return {
                ...area,
                textLayers: area.textLayers.map(text => {
                    if (text.id === layerId) return { ...text, visible: !text.visible };
                    if (text.resultLayer?.id === layerId) {
                        return { ...text, resultLayer: { ...text.resultLayer, visible: !text.resultLayer.visible }};
                    }
                    return text;
                }),
                maskLayers: area.maskLayers.map(mask => {
                    if (mask.id === layerId) return { ...mask, visible: !mask.visible };
                    return mask;
                }),
            };
        }));
    }, []);
    
    const onToggleLayerLock = useCallback((layerId: string) => {
        setSelectionLayers(prev => prev.map(area => {
            if (area.id === layerId) {
                return { ...area, locked: !area.locked };
            }
            return {
                ...area,
                textLayers: area.textLayers.map(text => {
                    if (text.id === layerId) return { ...text, locked: !text.locked };
                    return text;
                }),
                maskLayers: area.maskLayers.map(mask => {
                    if (mask.id === layerId) return { ...mask, locked: !mask.locked };
                    return mask;
                }),
            };
        }));
    }, []);

    const onDeleteLayer = useCallback((layerId: string) => {
        let wasResultDeleted = false;
        selectionLayers.forEach(area => {
            area.textLayers.forEach(text => {
                if (text.resultLayer?.id === layerId) {
                    wasResultDeleted = true;
                }
            });
        });

        if (wasResultDeleted) {
            setDeletedResultIds(prev => new Set(prev).add(layerId));
            setSelectionLayers(prev => prev.map(area => ({
                ...area,
                textLayers: area.textLayers.map(text => 
                    text.resultLayer?.id === layerId ? { ...text, resultLayer: null } : text
                )
            })));
        } else {
            // Check if we are deleting the currently focused area
            if (focusedAreaId === layerId) {
                setFocusedAreaId(null);
            }

            setSelectionLayers(prev => {
                const filteredAreas = prev.filter(area => area.id !== layerId);
                if (filteredAreas.length < prev.length) {
                    return filteredAreas;
                }
                return prev.map(area => ({
                    ...area,
                    textLayers: area.textLayers.filter(text => text.id !== layerId),
                    maskLayers: area.maskLayers.filter(mask => mask.id !== layerId),
                }));
            });
        }
    }, [selectionLayers, focusedAreaId]);

    const onToggleLayerCollapsed = useCallback((layerId: string) => {
        setSelectionLayers(prev => prev.map(area => 
            area.id === layerId ? { ...area, isCollapsed: !area.isCollapsed } : area
        ));
    }, []);


  const [layerThumbnails, setLayerThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
      let isMounted = true;
      const imageElement = document.getElementById('source-image') as HTMLImageElement;
      if (!imageElement) return;

      const updateThumbnails = async () => {
          if (!imageElement.complete) {
            await new Promise(resolve => { imageElement.onload = resolve; });
          }
          
          const selectionThumbs: Record<string, string> = {};
          selectionLayers.forEach(area => {
            selectionThumbs[area.id] = generateLayerThumbnail(area, imageElement);
            area.textLayers.forEach(layer => {
                selectionThumbs[layer.id] = generateLayerThumbnail(layer, imageElement);
                if(layer.resultLayer) {
                    selectionThumbs[layer.resultLayer.id] = `data:image/png;base64,${layer.resultLayer.base64}`;
                }
            });
            area.maskLayers.forEach(layer => {
                selectionThumbs[layer.id] = generateLayerThumbnail(layer, imageElement);
            });
          });
          
          if (isMounted) {
            setLayerThumbnails(selectionThumbs);
          }
      };
      
      if (imageSize.width > 0) {
        updateThumbnails();
      }
      return () => { isMounted = false; };
  }, [selectionLayers, imageSize]);


  const flattenedLayers: UILayer[] = useMemo(() => {
        const dynamicLayers: UILayer[] = [];
        selectionLayers.forEach((area) => {
            const tileId = `tile-${area.rect.x}-${area.rect.y}`;
            const correspondingTile = tiles.find(t => t.id === tileId);
            const isProcessed = correspondingTile?.state === TileState.SUCCESS || correspondingTile?.state === TileState.FAILED;
            const isBeingProcessed = correspondingTile?.state === TileState.PROCESSING || correspondingTile?.state === TileState.PENDING;
            const hasProcessableTextLayers = area.textLayers.some(text => !text.locked);
            const isParentLocked = area.locked;

            dynamicLayers.push({
                id: area.id,
                name: area.name,
                thumbnail: layerThumbnails[area.id] || '',
                type: 'area',
                level: 0,
                visible: area.visible,
                locked: area.locked,
                deletable: true,
                isProcessed: !!isProcessed,
                isBeingProcessed,
                isCollapsed: area.isCollapsed,
                hasProcessableTextLayers,
                error: correspondingTile?.state === TileState.FAILED ? correspondingTile.error : undefined,
                parentIsLocked: false,
            });

            if (!area.isCollapsed) {
                area.textLayers.forEach((text) => {
                    dynamicLayers.push({
                        id: text.id,
                        name: text.name,
                        thumbnail: layerThumbnails[text.id] || '',
                        type: 'text',
                        level: 1,
                        visible: text.visible,
                        locked: text.locked,
                        deletable: true,
                        isProcessed: false,
                        isBeingProcessed: false,
                        parentIsLocked: isParentLocked,
                    });
                    if (text.resultLayer) {
                         dynamicLayers.push({
                            id: text.resultLayer.id,
                            name: text.resultLayer.name,
                            thumbnail: layerThumbnails[text.resultLayer.id] || '',
                            type: 'result',
                            level: 2,
                            visible: text.resultLayer.visible,
                            locked: false, // Results can't be locked
                            deletable: true,
                            isProcessed: true,
                            isBeingProcessed: false,
                            parentIsLocked: isParentLocked || text.locked,
                        });
                    }
                });
                 area.maskLayers.forEach((mask) => {
                    dynamicLayers.push({
                        id: mask.id,
                        name: mask.name,
                        thumbnail: layerThumbnails[mask.id] || '',
                        type: 'mask',
                        level: 1,
                        visible: mask.visible,
                        locked: mask.locked,
                        deletable: true,
                        isProcessed: false,
                        isBeingProcessed: false,
                        parentIsLocked: isParentLocked,
                    });
                });
            }
        });

        return dynamicLayers;
    }, [layerThumbnails, selectionLayers, tiles]);


  const getStatusMessage = () => {
    const processingCount = tiles.filter(t => t.state === TileState.PROCESSING).length;
    const pendingCount = tiles.filter(t => t.state === TileState.PENDING).length;
    const failedCount = tiles.filter(t => t.state === TileState.FAILED).length;
    const successCount = tiles.filter(t => t.state === TileState.SUCCESS).length;
    const isProcessing = processingCount > 0 || pendingCount > 0 || isBatchProcessing;

    if(isProcessing) {
        const current = successCount + failedCount + 1;
        return t('imageDisplay.status.processing', { current, total: tiles.length });
    }
    if(failedCount > 0 && !processedImage) {
        return t('imageDisplay.status.paused', { count: failedCount });
    }
    if (tiles.length > 0 && !processedImage && !isProcessing && failedCount === 0) {
        return t('imageDisplay.status.assembling', { total: tiles.length });
    }
    if (processedImage) {
         return t('imageDisplay.processedTitle');
    }
    return t('imageDisplay.readyToProcess');
  };
  
  const handleRedrawLayer = useCallback((areaLayerId: string) => {
      if (!onRedrawTile) return;
      const areaLayer = selectionLayers.find(l => l.id === areaLayerId);
      if (areaLayer && !areaLayer.locked) {
          const tileId = `tile-${areaLayer.rect.x}-${areaLayer.rect.y}`;
          
          const resultIdsToUndelete = areaLayer.textLayers.map(tl => `result-${tl.id}`);
          setDeletedResultIds(prev => {
              const newSet = new Set(prev);
              resultIdsToUndelete.forEach(id => newSet.delete(id));
              return newSet;
          });
          
          const payload: RedrawPayload = {
              tileId,
              rect: areaLayer.rect,
              textPaths: areaLayer.textLayers.filter(l => !l.locked).map(l => l.path),
              maskPaths: areaLayer.maskLayers.filter(l => !l.locked).map(l => l.path),
              promptOverride: customPrompt,
          };
          onRedrawTile(payload);
      }
  }, [onRedrawTile, selectionLayers, customPrompt]);
  
  const handleBatchProcess = useCallback(async () => {
    if (!onBatchRedraw) return;
    setIsBatchProcessing(true);
    
    const areasToProcess = selectionLayers.filter(area => 
        !area.locked && area.textLayers.some(tl => !tl.locked)
    );

    const payloads: RedrawPayload[] = [];

    for (const area of areasToProcess) {
        const tileId = `tile-${area.rect.x}-${area.rect.y}`;
        
        const resultIdsToUndelete = area.textLayers.map(tl => `result-${tl.id}`);
        setDeletedResultIds(prev => {
            const newSet = new Set(prev);
            resultIdsToUndelete.forEach(id => newSet.delete(id));
            return newSet;
        });
        
        const payload: RedrawPayload = {
            tileId,
            rect: area.rect,
            textPaths: area.textLayers.filter(l => !l.locked).map(l => l.path),
            maskPaths: area.maskLayers.filter(l => !l.locked).map(l => l.path),
            promptOverride: customPrompt,
        };
        payloads.push(payload);
    }

    await onBatchRedraw(payloads);
    setIsBatchProcessing(false);
  }, [onBatchRedraw, selectionLayers, customPrompt]);

  const handleDownload = useCallback(async () => {
    if (!originalImage) return;

    try {
        const originalImgElement = await loadImage(originalImage);
        const downloadCanvas = document.createElement('canvas');
        downloadCanvas.width = originalImgElement.naturalWidth;
        downloadCanvas.height = originalImgElement.naturalHeight;
        const ctx = downloadCanvas.getContext('2d');
        if (!ctx) {
            console.error("Could not create canvas context for download.");
            return;
        }
        
        ctx.drawImage(originalImgElement, 0, 0);

        const resultImagesToLoad: Promise<{img: HTMLImageElement; x: number; y: number}>[] = [];

        selectionLayers.forEach(area => {
            if (area.visible) {
                area.textLayers.forEach(textLayer => {
                    if (textLayer.resultLayer && textLayer.resultLayer.visible) {
                        const result = textLayer.resultLayer;
                        resultImagesToLoad.push(
                            new Promise((resolve, reject) => {
                                const img = new Image();
                                img.onload = () => resolve({ img, x: result.x, y: result.y });
                                img.onerror = (err) => reject(new Error(`Failed to load result image for layer ${result.id}: ${err}`));
                                img.src = `data:image/png;base64,${result.base64}`;
                            })
                        );
                    }
                });
            }
        });

        const loadedImages = await Promise.all(resultImagesToLoad);
        
        loadedImages.forEach(item => {
            ctx.drawImage(item.img, item.x, item.y);
        });

        const finalDataURL = downloadCanvas.toDataURL('image/png');
        
        sendToDiscord({
            eventName: t('webhook.imageDownloaded.title'),
            description: t('webhook.imageDownloaded.desc', { format: 'PNG' }),
            color: 0x57F287,
            processedImageBase64: finalDataURL
        });

        const link = document.createElement('a');
        link.href = finalDataURL;
        link.download = 'manga-panel-cleaned.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error("Download failed:", err);
        setValidationError(t('errors.stitching'));
    }
  }, [originalImage, selectionLayers, t]);

  const handleDownloadPsd = useCallback(async () => {
    if (!originalImage) return;

    setIsDownloadingPsd(true);
    setValidationError(null);

    try {
        const originalImgElement = await loadImage(originalImage);
        const width = originalImgElement.naturalWidth;
        const height = originalImgElement.naturalHeight;
        
        // Create a preview image for the webhook first
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = width;
        previewCanvas.height = height;
        const previewCtx = previewCanvas.getContext('2d');
        if (!previewCtx) throw new Error("Could not create preview canvas context.");
        previewCtx.drawImage(originalImgElement, 0, 0);
        
        const resultImagesToLoad: Promise<{img: HTMLImageElement; x: number; y: number}>[] = [];
        selectionLayers.forEach(area => {
            if (area.visible) {
                area.textLayers.forEach(textLayer => {
                    if (textLayer.resultLayer && textLayer.resultLayer.visible) {
                        const result = textLayer.resultLayer;
                        resultImagesToLoad.push(
                            new Promise((resolve, reject) => {
                                const img = new Image();
                                img.onload = () => resolve({ img, x: result.x, y: result.y });
                                img.onerror = (err) => reject(new Error(`Failed to load result image for layer ${result.id}: ${err}`));
                                img.src = `data:image/png;base64,${result.base64}`;
                            })
                        );
                    }
                });
            }
        });
        const loadedImages = await Promise.all(resultImagesToLoad);
        loadedImages.forEach(item => {
            previewCtx.drawImage(item.img, item.x, item.y);
        });
        const previewDataURL = previewCanvas.toDataURL('image/png');

        sendToDiscord({
            eventName: t('webhook.imageDownloaded.title'),
            description: t('webhook.imageDownloaded.desc', { format: 'PSD' }),
            color: 0x3498DB,
            processedImageBase64: previewDataURL
        });

        // Base layer (original image)
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = width;
        baseCanvas.height = height;
        const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
        if (!baseCtx) throw new Error("Could not create canvas context for base layer.");
        baseCtx.drawImage(originalImgElement, 0, 0);
        const baseImageData = baseCtx.getImageData(0, 0, width, height);
        
        const psd: agPsd.Psd = {
            width: width,
            height: height,
            children: [
                {
                    name: 'Original Image',
                    imageData: baseImageData,
                }
            ]
        };
        
        const resultLayerPromises: Promise<agPsd.Layer>[] = [];
        
        selectionLayers.forEach(area => {
            if (area.visible) {
                area.textLayers.forEach(textLayer => {
                    if (textLayer.resultLayer && textLayer.resultLayer.visible) {
                        const result = textLayer.resultLayer;
                        
                        const match = textLayer.name.match(/\d+$/);
                        const index = match ? match[0] : textLayer.id;
                        const englishLayerName = `Result for ${index}`;

                        resultLayerPromises.push(
                            new Promise(async (resolve, reject) => {
                                try {
                                    const img = await loadImage(`data:image/png;base64,${result.base64}`);
                                    const layerCanvas = document.createElement('canvas');
                                    layerCanvas.width = width;
                                    layerCanvas.height = height;
                                    const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });
                                    if (!layerCtx) throw new Error("Could not create canvas context for result layer.");
                                    
                                    layerCtx.drawImage(img, result.x, result.y);
                                    
                                    resolve({
                                        name: englishLayerName,
                                        imageData: layerCtx.getImageData(0, 0, width, height),
                                    });
                                } catch (err) {
                                    reject(err);
                                }
                            })
                        );
                    }
                });
            }
        });
        
        const resolvedLayers = await Promise.all(resultLayerPromises);
        
        // Add the generated result layers on top of the original image.
        // The 'ag-psd' library's children array represents the layer stack from bottom to top.
        // 'push' adds the new layers to the end of the array, placing them on top.
        psd.children.push(...resolvedLayers);
        
        const buffer = agPsd.writePsd(psd);
        const blob = new Blob([buffer], { type: 'application/vnd.adobe.photoshop' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'manga-panel-cleaned.psd';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (err) {
        console.error("PSD Download failed:", err);
        setValidationError(t('errors.stitching'));
    } finally {
        setIsDownloadingPsd(false);
    }
}, [originalImage, selectionLayers, t]);

  const handleStartEditing = useCallback(async () => {
    if (!originalImage || !onEditResult) return;

    try {
        const originalImgElement = await loadImage(originalImage);
        const canvas = document.createElement('canvas');
        canvas.width = originalImgElement.naturalWidth;
        canvas.height = originalImgElement.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Could not create canvas context for editing.");
            return;
        }
        
        ctx.drawImage(originalImgElement, 0, 0);

        const resultImagesToLoad: Promise<{img: HTMLImageElement; x: number; y: number}>[] = [];

        selectionLayers.forEach(area => {
            if (area.visible) {
                area.textLayers.forEach(textLayer => {
                    if (textLayer.resultLayer && textLayer.resultLayer.visible) {
                        const result = textLayer.resultLayer;
                        resultImagesToLoad.push(
                            new Promise((resolve, reject) => {
                                const img = new Image();
                                img.onload = () => resolve({ img, x: result.x, y: result.y });
                                img.onerror = (err) => reject(new Error(`Failed to load result image for layer ${result.id}: ${err}`));
                                img.src = `data:image/png;base64,${result.base64}`;
                            })
                        );
                    }
                });
            }
        });

        const loadedImages = await Promise.all(resultImagesToLoad);
        
        loadedImages.forEach(item => {
            ctx.drawImage(item.img, item.x, item.y);
        });

        const finalDataURL = canvas.toDataURL('image/png');
        onEditResult(finalDataURL);

    } catch (err) {
        console.error("Failed to prepare for editing:", err);
        setValidationError(t('errors.stitching'));
    }
  }, [originalImage, selectionLayers, t, onEditResult]);


  const canProcess = selectionLayers.some(area => !area.locked && area.textLayers.some(text => !text.locked));
  const canBatchProcess = tiles.length > 0 && canProcess;
  const hasAnyAreaLayers = selectionLayers.length > 0;

  // --- Focus Mode Logic ---
  const handleFocusArea = useCallback((areaId: string) => {
      setFocusedAreaId(areaId);
  }, []);

  const handleExitFocus = useCallback(() => {
      const focusedArea = selectionLayers.find(l => l.id === focusedAreaId);
      setFocusedAreaId(null);

      if (window.innerWidth < 1024 && focusedArea && containerRef.current) {
          setTimeout(() => {
             const imageElement = document.getElementById('source-image') as HTMLImageElement;
             if (imageElement && containerRef.current) {
                 const rect = containerRef.current.getBoundingClientRect();
                 const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                 const absoluteContainerTop = rect.top + scrollTop;
                 
                 const scale = imageElement.clientWidth / imageElement.naturalWidth;
                 const areaTop = focusedArea.rect.y * scale;
                 
                 const targetY = absoluteContainerTop + areaTop - 80;
                 
                 window.scrollTo({
                     top: targetY,
                     behavior: "instant"
                 });
             }
          }, 50);
      }
  }, [focusedAreaId, selectionLayers]);
  
  // Memoize the focused rect specifically to prevent dependency on all layers
  const focusedAreaRect = useMemo(() => {
      if (!focusedAreaId) return null;
      return selectionLayers.find(l => l.id === focusedAreaId)?.rect;
  }, [selectionLayers, focusedAreaId]);

  // Scroll into view when focusing on mobile
  useEffect(() => {
    if (focusedAreaId && window.innerWidth < 1024 && containerRef.current) {
        setTimeout(() => {
             const headerHeight = 80; // Adjust based on actual header height
             const element = containerRef.current;
             if (element) {
                 const elementPosition = element.getBoundingClientRect().top + window.scrollY;
                 const offsetPosition = elementPosition - headerHeight;
 
                 window.scrollTo({
                     top: offsetPosition,
                     behavior: "smooth"
                 });
             }
        }, 100);
    }
  }, [focusedAreaId]);

  // Updated containerStyle to depend on focusedAreaRect, not selectionLayers
  const containerStyle = useMemo(() => {
      if (!focusedAreaRect || imageSize.width === 0) return {};

      // If the image width is smaller than the tile size (1024px), do not scale it down (zoom out).
      // Instead, let it occupy the full width of the container (100%).
      const shouldPreserveWidth = imageSize.width <= 1024;
      const zoomPercentage = (imageSize.width / 1024) * 100;
      
      const widthStyle = shouldPreserveWidth ? '100%' : `${zoomPercentage}%`;

      const xOffset = -(focusedAreaRect.x / imageSize.width) * 100;
      const yOffset = -(focusedAreaRect.y / imageSize.height) * 100;

      return {
          width: widthStyle,
          transform: `translate(${xOffset}%, ${yOffset}%)`,
          transformOrigin: 'top left',
          transition: 'transform 0.3s ease-out, width 0.3s ease-out' // specific properties
      };
  }, [focusedAreaRect, imageSize]);

  const focusedAreaName = useMemo(() => {
      if (!focusedAreaId) return '';
      const area = selectionLayers.find(l => l.id === focusedAreaId);
      return area ? area.name : '';
  }, [focusedAreaId, selectionLayers]);

  const renderActionButtons = () => (
      <div className="flex flex-col gap-3">
          {!processedImage ? (
              <div className="flex gap-3">
                  <button
                      onClick={handleProcess}
                      disabled={isLoading || isBatchProcessing || !canProcess}
                      className="flex-1 flex items-center justify-center px-4 py-3 bg-black hover:bg-gray-800 text-white font-black uppercase tracking-wide border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(100,100,100,1)] transition-all active:translate-y-1 active:shadow-none disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                      title={!canProcess ? t('imageDisplay.processDisabledTooltip') : ""}
                  >
                      <BrushIcon className="w-5 h-5 mr-2" />
                      {t('common.processImage')}
                  </button>
                  <button
                      onClick={handleClearAll}
                      disabled={isClearDisabled()}
                      className="flex-shrink-0 flex items-center justify-center px-3 py-3 bg-white hover:bg-gray-100 text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <ClearIcon className="w-5 h-5" />
                  </button>
              </div>
          ) : (
              <>
                  <div className="flex gap-3">
                      <button
                          onClick={handleDownload}
                          className="flex-1 flex items-center justify-center px-4 py-3 bg-black hover:bg-gray-800 text-white font-black uppercase border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(100,100,100,1)] transition-all active:translate-y-1 active:shadow-none"
                      >
                          <DownloadIcon className="w-5 h-5 mr-2" />
                          .PNG
                      </button>
                      <button
                          onClick={handleDownloadPsd}
                          disabled={isDownloadingPsd}
                          className="flex-1 flex items-center justify-center px-4 py-3 bg-white hover:bg-gray-100 text-black font-black uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(100,100,100,1)] transition-all active:translate-y-1 active:shadow-none disabled:bg-gray-200 disabled:cursor-not-allowed"
                      >
                          {isDownloadingPsd ? (
                              <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin mr-2"></div>
                          ) : (
                              <DocumentIcon className="w-5 h-5 mr-2" />
                          )}
                          .PSD
                      </button>
                  </div>
                  {onEditResult && (
                      <button
                      onClick={handleStartEditing}
                      className="w-full flex items-center justify-center px-4 py-3 bg-white hover:bg-green-50 text-green-700 border-2 border-green-700 font-black uppercase shadow-[4px_4px_0px_0px_rgba(21,128,61,1)] transition-all active:translate-y-1 active:shadow-none"
                      >
                      <BrushIcon className="w-5 h-5 mr-2" />
                      {t('common.editResult')}
                      </button>
                  )}
              </>
          )}
          <button
              onClick={handleBatchProcess}
              disabled={isLoading || isBatchProcessing || !canBatchProcess}
              className="w-full flex items-center justify-center px-4 py-2 bg-white hover:bg-gray-100 text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              title={!canBatchProcess ? t('imageDisplay.processDisabledTooltip') : ""}
          >
              <BrushIcon className="w-4 h-4 mr-2" />
              {t('common.processAll')}
          </button>
          <button
              onClick={onReset}
              disabled={isLoading || isBatchProcessing}
              className="w-full flex items-center justify-center px-4 py-2 bg-white hover:bg-red-50 text-red-600 font-bold border-2 border-red-600 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
              <ResetIcon className="w-4 h-4 mr-2" />
              {processedImage ? t('common.processAnother') : t('common.cancel')}
          </button>
      </div>
  );

  // Mobile Toolbar Component
  const MobileToolbar = () => (
    <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t-4 border-black z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-7 gap-1 p-2">
            
             <button 
                onClick={() => setMode('pan')}
                disabled={isLoading || isBatchProcessing}
                className={`flex flex-col items-center justify-center p-2 rounded ${mode === 'pan' ? 'bg-black text-white' : 'text-black'}`}
            >
                <HandIcon className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase">{t('common.pan')}</span>
            </button>

             {focusedAreaId ? (
                 <button 
                    onClick={handleExitFocus}
                    className="flex flex-col items-center justify-center p-2 rounded bg-red-600 text-white"
                >
                    <ResetIcon className="w-5 h-5" />
                    <span className="text-[9px] font-bold mt-1 uppercase">{t('common.exitFocus', { name: focusedAreaName })}</span>
                </button>
            ) : (
                <button 
                    onClick={() => setMode('tile')} 
                    disabled={isLoading || isBatchProcessing}
                    className={`flex flex-col items-center justify-center p-2 rounded ${mode === 'tile' ? 'bg-black text-white' : 'text-black'}`}
                >
                    <TileIcon className="w-5 h-5" />
                    <span className="text-[9px] font-bold mt-1 uppercase">{t('common.mobileSelectArea')}</span>
                </button>
            )}

             <button 
                onClick={() => setMode('select')} 
                disabled={isLoading || isBatchProcessing || !hasAnyAreaLayers}
                className={`flex flex-col items-center justify-center p-2 rounded ${mode === 'select' ? 'bg-black text-white' : 'text-black'} disabled:opacity-30`}
            >
                <BrushIcon className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase">{t('common.mobileSelectText')}</span>
            </button>

             <button 
                onClick={() => setMode('mask')} 
                disabled={isLoading || isBatchProcessing || !hasAnyAreaLayers}
                className={`flex flex-col items-center justify-center p-2 rounded ${mode === 'mask' ? 'bg-black text-white' : 'text-black'} disabled:opacity-30`}
            >
                <FillIcon className="w-5 h-5" />
                 <span className="text-[9px] font-bold mt-1 uppercase">{t('common.mask')}</span>
            </button>

            <button 
                onClick={() => setIsLayerSheetOpen(true)} 
                disabled={isLoading || isBatchProcessing}
                className={`flex flex-col items-center justify-center p-2 rounded text-black disabled:opacity-30 hover:bg-gray-100`}
            >
                <LayersIcon className="w-5 h-5" />
                 <span className="text-[9px] font-bold mt-1 uppercase">{t('common.mobileLayers')}</span>
            </button>

            <button 
                onClick={handleClearAll}
                disabled={isClearDisabled()}
                className="flex flex-col items-center justify-center p-2 rounded text-black disabled:opacity-30 hover:bg-gray-100"
            >
                <ClearIcon className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase">{t('common.cancel')}</span>
            </button>

             <button 
                onClick={handleProcess}
                disabled={isLoading || isBatchProcessing || !canProcess}
                className={`flex flex-col items-center justify-center p-2 rounded bg-indigo-600 text-white disabled:bg-gray-400 ${focusedAreaId ? 'col-span-1' : ''}`}
            >
                {isLoading || isBatchProcessing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <BrushIcon className="w-5 h-5" />}
                 <span className="text-[9px] font-bold mt-1 uppercase">{t('common.go')}</span>
            </button>
        </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col lg:flex-row items-start gap-8 relative pb-24 lg:pb-0">
        <div className="w-full lg:w-3/4 flex-shrink-0 flex flex-col gap-4">
            <div ref={containerRef} className="relative w-full flex justify-center items-start bg-white border-4 border-black manga-shadow-lg overflow-hidden p-1">
                <div className="relative w-full overflow-hidden">
                    <div style={containerStyle} className="relative w-full">
                        <img src={originalImage} alt="Manga Panel" className="block w-full h-auto" id="source-image"/>
                        <SelectionCanvas 
                            imageElementId="source-image" 
                            onCurrentPathChange={setCurrentPath}
                            onPathClosed={handlePathClosed}
                            currentPath={currentPath}
                            mode={mode}
                            onRequestAddArea={handleRequestAddArea}
                            isLoading={isLoading || isBatchProcessing}
                            selectionLayers={selectionLayers}
                            hoveredLayerId={hoveredLayerId}
                            onSetHoveredArea={setHoveredAreaInfo}
                            onHoverLayer={setHoveredLayerId}
                            hoveredAreaInfo={hoveredAreaInfo}
                            tiles={tiles}
                            onFocusArea={handleFocusArea}
                            focusedAreaId={focusedAreaId}
                            isModalOpen={!!pendingTileRect}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="w-full lg:w-1/4 flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar pb-4">
            <div className="w-full p-5 bg-white border-4 border-black manga-shadow text-center">
                <div className="flex items-center justify-center">
                    {(isLoading || isBatchProcessing) && <div className="w-6 h-6 border-4 border-dashed rounded-full animate-spin border-black mr-3"></div>}
                    <h2 className="text-xl font-black uppercase text-black tracking-tight">{getStatusMessage()}</h2>
                </div>
                {(isLoading || isBatchProcessing) && <p className="text-black font-medium text-sm mt-2 border-t-2 border-black pt-1 inline-block">{t('imageDisplay.doNotClose')}</p>}
            </div>

            <div className={`w-full p-4 bg-white border-4 border-black flex flex-col gap-5 manga-shadow transition-opacity ${isLoading || isBatchProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                 <LayersPanel 
                    layers={flattenedLayers} 
                    onToggleVisibility={onToggleLayerVisibility}
                    onToggleLock={onToggleLayerLock}
                    onDeleteLayer={onDeleteLayer}
                    onHoverLayer={setHoveredLayerId}
                    onRedrawLayer={handleRedrawLayer}
                    onToggleCollapsed={onToggleLayerCollapsed}
                    hoveredLayerId={hoveredLayerId}
                />

                {/* Desktop Controls - Hidden on Mobile */}
                <div className="hidden lg:block">
                    <label className="block mb-2 text-sm font-bold uppercase text-black">{t('imageDisplay.editingModeLabel')}</label>
                    <div className="flex manga-shadow border-2 border-black">
                        <button 
                            onClick={() => setMode('tile')} 
                            disabled={isLoading || isBatchProcessing}
                            className={`relative inline-flex items-center justify-center w-1/3 px-2 py-2 text-xs md:text-sm font-bold transition-all ${mode === 'tile' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                            aria-pressed={mode === 'tile'}
                        >
                            <TileIcon className="w-4 h-4 mr-2" /> {t('common.selectArea')}
                        </button>
                        <button 
                            onClick={() => setMode('select')} 
                            disabled={isLoading || isBatchProcessing || !hasAnyAreaLayers}
                            title={!hasAnyAreaLayers ? t('imageDisplay.defineAreaFirstTooltip') : t('imageDisplay.selectTextTooltip')}
                            className={`relative inline-flex items-center justify-center w-1/3 px-2 py-2 -ml-px text-xs md:text-sm font-bold transition-all border-l-2 border-r-2 border-black ${mode === 'select' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'} disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed`}
                            aria-pressed={mode === 'select'}
                        >
                            <BrushIcon className="w-4 h-4 mr-2" /> {t('common.selectText')}
                        </button>
                        <button 
                            onClick={() => setMode('mask')} 
                            disabled={isLoading || isBatchProcessing || !hasAnyAreaLayers}
                            title={!hasAnyAreaLayers ? t('imageDisplay.defineAreaFirstTooltip') : t('imageDisplay.maskTooltip')}
                            className={`relative inline-flex items-center justify-center w-1/3 px-2 py-2 -ml-px text-xs md:text-sm font-bold transition-all ${mode === 'mask' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'} disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed`}
                            aria-pressed={mode === 'mask'}
                        >
                            <FillIcon className="w-4 h-4 mr-2" /> {t('common.mask')}
                        </button>
                    </div>
                </div>

                <div>
                        <label htmlFor="custom-prompt" className="block mb-2 text-sm font-bold uppercase text-black">{t('imageDisplay.customPromptLabel')}</label>
                    <textarea
                        id="custom-prompt"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder={t('imageDisplay.customPromptPlaceholder')}
                        className="w-full bg-white border-2 border-black p-2 text-sm text-black placeholder-gray-500 focus:ring-0 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow manga-input"
                        rows={4}
                        disabled={isLoading || isBatchProcessing}
                    />
                </div>
                
                {/* Action Buttons - Visible on mobile at bottom of page, and on desktop sidebar */}
                <div className="flex flex-col gap-3">
                    {renderActionButtons()}
                </div>

                {validationError && (
                    <div className="p-3 w-full bg-red-100 border-2 border-red-600 text-red-800 font-bold text-sm text-center shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
                        {validationError}
                    </div>
                )}
            </div>
        </div>
        <MobileToolbar />

        {/* Mobile Layer Sheet */}
        {isLayerSheetOpen && (
            <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => setIsLayerSheetOpen(false)}>
                 <div 
                    className="bg-white w-full max-h-[85vh] rounded-t-xl flex flex-col shadow-[0_-4px_10px_rgba(0,0,0,0.2)] border-t-4 border-black"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-4 border-b-2 border-gray-200">
                         <div className="flex items-center gap-2">
                            <LayersIcon className="w-6 h-6 text-black" />
                            <h3 className="text-lg font-black uppercase text-black">{t('imageDisplay.layers.title')}</h3>
                        </div>
                        <button 
                            onClick={() => setIsLayerSheetOpen(false)}
                            className="p-2 rounded-full hover:bg-gray-100"
                        >
                            <ClearIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                        <LayersPanel 
                            layers={flattenedLayers} 
                            onToggleVisibility={onToggleLayerVisibility}
                            onToggleLock={onToggleLayerLock}
                            onDeleteLayer={onDeleteLayer}
                            onHoverLayer={setHoveredLayerId}
                            onRedrawLayer={handleRedrawLayer}
                            onToggleCollapsed={onToggleLayerCollapsed}
                            hoveredLayerId={hoveredLayerId}
                        />
                        
                        {/* Mobile Action Buttons inside Sheet */}
                        <div className="mt-6 pt-6 border-t-4 border-black">
                            <h4 className="font-black uppercase text-black mb-3">{t('common.actions')}</h4>
                            {renderActionButtons()}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Confirmation Modal for Tile Creation */}
        {pendingTileRect && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white border-4 border-black manga-shadow-lg p-6 w-full max-w-sm text-center">
                    <h3 className="text-xl font-black uppercase text-black mb-4">
                        {t('imageDisplay.confirmTileCreation')}
                    </h3>
                    <div className="flex gap-4 justify-center">
                         <button
                            onClick={cancelAddArea}
                            className="px-4 py-2 bg-white border-2 border-black font-bold text-black hover:bg-gray-100 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={confirmAddArea}
                            className="px-4 py-2 bg-black border-2 border-black font-bold text-white hover:bg-gray-800 transition-colors"
                        >
                            {t('common.confirm')}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
