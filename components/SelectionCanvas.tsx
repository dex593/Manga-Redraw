
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Tile } from '../types';
import { TileState } from '../types';
import type { AreaLayer } from './ImageDisplay';
import { isPointInPolygon } from '../utils/geometry';

interface SelectionCanvasProps {
    imageElementId: string;
    currentPath: { x: number; y: number }[];
    onCurrentPathChange: (path: { x: number; y: number }[]) => void;
    onPathClosed: () => void;
    mode: 'select' | 'tile' | 'mask' | 'pan';
    onRequestAddArea: (rect: { x: number; y: number }) => void;
    isLoading?: boolean;
    selectionLayers: AreaLayer[];
    hoveredLayerId: string | null;
    onSetHoveredArea: (info: { name: string; x: number; y: number } | null) => void;
    onHoverLayer: (layerId: string | null) => void;
    hoveredAreaInfo: { name: string; x: number; y: number } | null;
    tiles: Tile[];
    onFocusArea: (areaId: string) => void;
    focusedAreaId: string | null;
    isModalOpen?: boolean;
}

const CLOSING_THRESHOLD = 30; // pixels - Increased for better mobile experience

export const SelectionCanvas: React.FC<SelectionCanvasProps> = ({
    imageElementId,
    currentPath,
    onCurrentPathChange,
    onPathClosed,
    mode,
    onRequestAddArea,
    isLoading = false,
    selectionLayers,
    hoveredLayerId,
    onSetHoveredArea,
    onHoverLayer,
    hoveredAreaInfo,
    tiles,
    onFocusArea,
    focusedAreaId,
    isModalOpen = false,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const loadedResultImages = useRef(new Map<string, HTMLImageElement>());
    const animationFrameRef = useRef<number | null>(null);
    
    const getNaturalCoords = useCallback((canvasX: number, canvasY: number) => {
        const imageElement = document.getElementById(imageElementId) as HTMLImageElement;
        if (!imageElement) return null;
        
        // Calculate natural coordinates based on the displayed size vs natural size
        const scaleX = imageElement.naturalWidth / imageElement.clientWidth;
        const scaleY = imageElement.naturalHeight / imageElement.clientHeight;

        return {
            x: canvasX * scaleX,
            y: canvasY * scaleY,
            scaleX,
            scaleY
        };
    }, [imageElementId]);

    // Effect to pre-load successful result images into memory for smooth drawing
    useEffect(() => {
        const activeResultIds = new Set<string>();
        selectionLayers.forEach(area => {
            area.textLayers.forEach(textLayer => {
                if (textLayer.resultLayer) {
                    const result = textLayer.resultLayer;
                    activeResultIds.add(result.id);
                    // Load image if it's not already loading/loaded
                    if (!loadedResultImages.current.has(result.id)) {
                        const img = new Image();
                        img.src = `data:image/png;base64,${result.base64}`;
                        loadedResultImages.current.set(result.id, img);
                    }
                }
            });
        });
        
        // Cleanup images that are no longer needed
        for (const id of loadedResultImages.current.keys()) {
            if (!activeResultIds.has(id)) {
                loadedResultImages.current.delete(id);
            }
        }
    }, [selectionLayers]);

    // Effect to clear mouse pos when modal is closed (canceling "ghost" cursors)
    useEffect(() => {
        if (!isModalOpen) {
            setMousePos(null);
        }
    }, [isModalOpen]);

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        const imageElement = document.getElementById(imageElementId) as HTMLImageElement;
        
        if (!canvas || !imageElement || !imageElement.complete) return;
        
        const isMobile = window.innerWidth < 1024;

        canvas.width = imageElement.naturalWidth;
        canvas.height = imageElement.naturalHeight;
        canvas.style.position = 'absolute';
        canvas.style.left = `0px`;
        canvas.style.top = `0px`;
        canvas.style.width = `100%`;
        canvas.style.height = `100%`;
        
        // Apply touch-action to control scrolling.
        // In 'pan' mode: 'auto' allows the browser to handle touch as scroll.
        // In other modes: 'none' prevents browser scroll, letting us capture touches for drawing.
        if (mode === 'pan') {
            canvas.style.touchAction = 'auto'; 
            canvas.style.pointerEvents = 'auto'; // Allow clicks to pass through for Focus logic
        } else {
            canvas.style.touchAction = 'none'; // Disable browser scroll for drawing
            canvas.style.pointerEvents = 'auto';
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // --- DRAW MASK IF FOCUSED ---
        // This hides everything outside the focused area
        if (focusedAreaId) {
            const focusedLayer = selectionLayers.find(l => l.id === focusedAreaId);
            if (focusedLayer) {
                ctx.fillStyle = 'rgba(20, 20, 20, 0.95)'; // Almost solid dark grey overlay
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // Punch a hole for the focused area to show the image through
                ctx.clearRect(focusedLayer.rect.x, focusedLayer.rect.y, 1024, 1024);
            }
        }

        // --- DRAW CROPPED PROCESSED RESULTS FIRST ---
        selectionLayers.forEach(areaLayer => {
            if (focusedAreaId && areaLayer.id !== focusedAreaId) return; // Skip other areas if focused

            if (areaLayer.visible) {
                areaLayer.textLayers.forEach(textLayer => {
                    if (textLayer.resultLayer && textLayer.resultLayer.visible) {
                        const result = textLayer.resultLayer;
                        const resultImage = loadedResultImages.current.get(result.id);
                        if (resultImage && resultImage.complete) {
                            ctx.drawImage(resultImage, result.x, result.y);
                        }
                    }
                });
            }
        });
        
        ctx.lineJoin = 'round';

        // === DRAW LAYERS AND OVERLAYS ===
        selectionLayers.forEach(areaLayer => {
            if (!areaLayer.visible) return;
            if (focusedAreaId && areaLayer.id !== focusedAreaId) return; // Skip other areas if focused

            const tileId = `tile-${areaLayer.rect.x}-${areaLayer.rect.y}`;
            const tile = tiles.find(t => t.id === tileId);
            
            // Check if this area is highlighted (either hovered on canvas or hovered in layers panel)
            const isHovered = areaLayer.id === hoveredLayerId;
            const isAreaLocked = areaLayer.locked;

            // Desktop Highlight Logic: Area is highlighted if hovered
            const isHighlighted = isHovered && !isMobile;
            const isDimmed = hoveredLayerId !== null && !isHighlighted && mode === 'select' && !isMobile;

            // --- Draw Status Overlays ---
            if (tile) {
                const start = { x: tile.x, y: tile.y };
                const width = 1024;
                const height = 1024;
                
                 if (tile.state === TileState.PROCESSING) {
                    const opacity = 0.4 + Math.sin(Date.now() / 300) * 0.2; // Pulsating effect
                    ctx.fillStyle = `rgba(165, 55, 253, ${opacity})`; // purple-500
                    ctx.fillRect(start.x, start.y, width, height);
                } else if (isLoading && tile.state === TileState.PENDING) {
                     ctx.fillStyle = 'rgba(100, 116, 139, 0.5)'; // slate-500
                     ctx.fillRect(start.x, start.y, width, height);
                } else if (isLoading && tile.state === TileState.FAILED) {
                     ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'; // red-500
                     ctx.fillRect(start.x, start.y, width, height);
                }
            }
           
            // --- Draw Layer Visuals (Box, Text Paths) ---

            // Area Selection Box
            if (isAreaLocked) {
                ctx.lineWidth = isHovered ? 5 : 3;
                ctx.strokeStyle = 'rgba(100, 116, 139, 0.7)';
                ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
                ctx.fillRect(areaLayer.rect.x, areaLayer.rect.y, 1024, 1024);
                ctx.strokeRect(areaLayer.rect.x, areaLayer.rect.y, 1024, 1024);
            } else { // not locked
                if (isHovered && !isMobile && mode === 'tile') {
                     // Only use the fill highlight in 'Tile' mode, not select mode
                    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                    ctx.fillRect(areaLayer.rect.x, areaLayer.rect.y, 1024, 1024);
                }

                if (isMobile) {
                    // Tri-color stroke for maximum visibility on mobile (black/white/cyan)
                    ctx.lineWidth = 8;
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.strokeRect(areaLayer.rect.x, areaLayer.rect.y, 1024, 1024);

                    ctx.lineWidth = 6;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.strokeRect(areaLayer.rect.x, areaLayer.rect.y, 1024, 1024);

                    ctx.lineWidth = 3;
                    ctx.strokeStyle = 'rgba(0, 255, 255, 1)'; // High contrast cyan
                    ctx.strokeRect(areaLayer.rect.x, areaLayer.rect.y, 1024, 1024);
                } else {
                    // Desktop style
                    if (isHighlighted) {
                        // Highlighted State (Active area in Select Mode or Hovered)
                        ctx.lineWidth = 4;
                        ctx.strokeStyle = 'rgba(255, 255, 0, 1)'; // Bright Gold/Yellow
                        ctx.shadowColor = 'rgba(255, 255, 0, 1)';
                        ctx.shadowBlur = 10;
                        ctx.strokeRect(areaLayer.rect.x, areaLayer.rect.y, 1024, 1024);
                        ctx.shadowBlur = 0; // Reset shadow
                    } else if (isDimmed) {
                        // Dimmed state (when another area is highlighted)
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)'; // Faint Grey
                        ctx.strokeRect(areaLayer.rect.x, areaLayer.rect.y, 1024, 1024);
                    } else {
                        // Normal State
                        ctx.lineWidth = isHovered ? 5 : 3;
                        ctx.strokeStyle = isHovered ? 'rgba(0, 255, 255, 1)' : 'rgba(59, 130, 246, 0.9)';
                        ctx.strokeRect(areaLayer.rect.x, areaLayer.rect.y, 1024, 1024);
                    }
                }
            }
            
            // Draw Mask Layers inside this Area
            areaLayer.maskLayers.forEach(layer => {
                if (!layer.visible) return;
                if (layer.path && layer.path.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(layer.path[0].x, layer.path[0].y);
                    for (let i = 1; i < layer.path.length; i++) {
                        ctx.lineTo(layer.path[i].x, layer.path[i].y);
                    }
                    ctx.closePath();
                    
                    if (layer.locked) {
                        ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
                        ctx.strokeStyle = 'rgba(100, 116, 139, 0.7)';
                        ctx.lineWidth = 3;
                        ctx.fill();
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = isDimmed ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 1)';
                        ctx.fill();
                    }
                }
            });

            // Draw Text Path Layers inside this Area
            areaLayer.textLayers.forEach(layer => {
                if (!layer.visible) return;

                if (layer.path && layer.path.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(layer.path[0].x, layer.path[0].y);
                    for (let i = 1; i < layer.path.length; i++) {
                        ctx.lineTo(layer.path[i].x, layer.path[i].y);
                    }
                    ctx.closePath();

                    const isTextLocked = layer.locked;
                    ctx.lineWidth = 3;
                    if (isTextLocked) {
                        ctx.strokeStyle = 'rgba(100, 116, 139, 0.7)';
                        ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
                        ctx.fill();
                    } else {
                         if (isDimmed) {
                             ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)'; // Dimmed red
                         } else {
                            ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
                         }
                    }
                    ctx.stroke();
                }
            });
        });
        
        // --- Draw Current in-progress path (SELECT or MASK mode) ---
        if ((mode === 'select' || mode === 'mask') && currentPath.length > 0) {
            ctx.strokeStyle = mode === 'select' ? '#FF0000' : '#00FF00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }
            ctx.stroke();

            // Check for mobile to determine node radius
            const nodeRadius = isMobile ? 16 : 8;

            currentPath.forEach((p, index) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, nodeRadius, 0, 2 * Math.PI); 
                ctx.fillStyle = index === 0 ? '#00FF00' : (mode === 'select' ? '#FF0000' : '#00FF00');
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();
            });
        }

        // --- Draw Tile placement preview (TILE mode) ---
        // Hide preview if modal is open or we are focused
        if (mode === 'tile' && mousePos && !focusedAreaId && !isModalOpen) {
            const TILE_SIZE = 1024;
            const naturalCoords = getNaturalCoords(mousePos.x, mousePos.y);
            if (naturalCoords) {
                const idealNaturalX = naturalCoords.x - TILE_SIZE / 2;
                const idealNaturalY = naturalCoords.y - TILE_SIZE / 2;
                const clampedNaturalX = Math.max(0, Math.min(idealNaturalX, imageElement.naturalWidth - TILE_SIZE));
                const clampedNaturalY = Math.max(0, Math.min(idealNaturalY, imageElement.naturalHeight - TILE_SIZE));
                
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
                ctx.lineWidth = 3;
                ctx.strokeRect(clampedNaturalX, clampedNaturalY, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                ctx.fillRect(clampedNaturalX, clampedNaturalY, TILE_SIZE, TILE_SIZE);
            }
        }
        
        // Draw hovered area name tooltip (Only if hoveredAreaInfo is set)
        if (hoveredAreaInfo) {
            ctx.font = '16px sans-serif';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            const textMetrics = ctx.measureText(hoveredAreaInfo.name);
            const textWidth = textMetrics.width;
            const textHeight = 16;
            const rectX = hoveredAreaInfo.x + 15;
            const rectY = hoveredAreaInfo.y + 15;
            ctx.fillRect(rectX, rectY, textWidth + 16, textHeight + 8);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(hoveredAreaInfo.name, rectX + 8, rectY + textHeight);
        }

    }, [
        canvasRef, imageElementId, currentPath, getNaturalCoords,
        isLoading, mode, mousePos,
        selectionLayers, hoveredLayerId, hoveredAreaInfo, tiles, focusedAreaId,
        isModalOpen
    ]);

    // This effect handles the animation loop and resizing.
    useEffect(() => {
        const imageElement = document.getElementById(imageElementId) as HTMLImageElement;
        if (!imageElement) return;

        let isMounted = true;
        const animate = () => {
            if (!isMounted) return;
            redraw();
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        const startDrawing = () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            animate();
        };

        if (imageElement.complete) {
            startDrawing();
        } else {
            imageElement.addEventListener('load', startDrawing);
        }

        return () => {
            isMounted = false;
            imageElement.removeEventListener('load', startDrawing);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [redraw, imageElementId]);
    
    // Common logic for processing an interaction point (Mouse or Touch)
    const processInteraction = useCallback((clientX: number, clientY: number, isEnd = false) => {
        if (isLoading) return;
        // Allow 'pan' to proceed for hit testing (hover/tooltip), but we handle it carefully later
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Get canvas bounding rect to calculate offset correctly
        const rect = canvas.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;

        const naturalCoords = getNaturalCoords(offsetX, offsetY);
        if (!naturalCoords) return;

        // --- TOOLTIP / HOVER LOGIC ---
        let foundAreaId: string | null = null;
        let foundAreaName: string | null = null;
        
        // Optimization: If focused, only check that area
        const layersToCheck = focusedAreaId 
            ? selectionLayers.filter(l => l.id === focusedAreaId) 
            : selectionLayers;

        let foundArea = false;
        for (const area of layersToCheck) {
            if (naturalCoords.x >= area.rect.x && naturalCoords.x <= area.rect.x + 1024 &&
                naturalCoords.y >= area.rect.y && naturalCoords.y <= area.rect.y + 1024) {
                
                foundAreaName = area.name;
                foundAreaId = area.id;
                foundArea = true;
                break;
            }
        }
        
        const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
        
        // Decide whether to update the global hover state (which highlights the Layer in the Panel)
        // Enable for Tile, Pan, AND Select (only on Desktop)
        const shouldUpdateHover = mode === 'tile' || mode === 'pan' || (mode === 'select' && isDesktop);

        if (shouldUpdateHover) {
             // Only update global state if ID actually changed to prevent render thrashing
             if (onHoverLayer && foundAreaId !== hoveredLayerId) {
                onHoverLayer(foundAreaId);
             }

             // Tooltip Logic:
             // In 'select' mode, we prevent the tooltip from showing near the cursor to keep the
             // drawing area clean, even though we highlight the layer.
             if (mode === 'select') {
                 onSetHoveredArea(null);
             } else {
                 onSetHoveredArea(foundArea && foundAreaName ? { name: foundAreaName, x: naturalCoords.x, y: naturalCoords.y } : null);
             }

        } else {
            // Clear states if we are in a mode that shouldn't show hover info
             onSetHoveredArea(null);
             // Only clear if it was set previously
             if (hoveredLayerId !== null && onHoverLayer) onHoverLayer(null);
        }

        // --- DRAWING / SELECTION LOGIC ---
        if (mode === 'tile') {
             setMousePos({ x: offsetX, y: offsetY });
             canvas.style.cursor = 'copy';
        } else if (mode === 'pan') {
             // In pan mode, we don't draw a cursor, and we let the browser handle drag.
             // We only need hit detection (above).
             setMousePos(null);
             canvas.style.cursor = 'grab';
        } else {
             // IMPORTANT: Keep tracking mouse position for highlighting active area in 'select' mode
             setMousePos({ x: offsetX, y: offsetY });

             let isOverTextLayer = false;
             if (mode === 'mask') {
                 isOverTextLayer = layersToCheck.some(area =>
                    !area.locked && area.textLayers.some(textLayer =>
                        !textLayer.locked && textLayer.visible && isPointInPolygon(naturalCoords, textLayer.path)
                    )
                );
            }
            const isMouseInAnyUnlockedTile = layersToCheck.some(layer =>
                !layer.locked &&
                naturalCoords.x >= layer.rect.x && naturalCoords.x <= layer.rect.x + 1024 &&
                naturalCoords.y >= layer.rect.y && naturalCoords.y <= layer.rect.y + 1024
            );
            
            if (isOverTextLayer) {
                canvas.style.cursor = 'not-allowed';
            } else {
                canvas.style.cursor = isMouseInAnyUnlockedTile ? 'crosshair' : 'not-allowed';
            }
        }
        
        return { naturalCoords, foundAreaId };
    }, [isLoading, getNaturalCoords, selectionLayers, onSetHoveredArea, onHoverLayer, mode, focusedAreaId, hoveredLayerId]);


    const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (isLoading) return;
        const result = processInteraction(event.clientX, event.clientY);
        if (!result) return;
        
        // PAN MODE: Tap to Focus
        if (mode === 'pan') {
            if (result.foundAreaId && result.foundAreaId !== focusedAreaId) {
                // Only allow focus on mobile devices
                if (window.innerWidth < 1024) {
                    onFocusArea(result.foundAreaId);
                }
            }
            return;
        }

        // Drawing Modes: Only draw, NEVER auto-focus to prevent jumps
        if (mode === 'select' || mode === 'mask') {
             // Logic continues below to handleInteractionEnd
        } else if (mode === 'tile') {
             // Logic continues below
        }

        handleInteractionEnd(result.naturalCoords);
    };

    const handleInteractionEnd = (naturalCoords: { x: number, y: number }) => {
         if (mode === 'select' || mode === 'mask') {
            if (mode === 'mask') {
                const isOverTextLayer = selectionLayers.some(area =>
                    !area.locked && area.textLayers.some(textLayer =>
                        !textLayer.locked && textLayer.visible && isPointInPolygon(naturalCoords, textLayer.path)
                    )
                );
                if (isOverTextLayer) {
                    return; // Prevent drawing mask over a text layer
                }
            }

            const isPointInAnyUnlockedTile = selectionLayers.some(areaLayer =>
                !areaLayer.locked &&
                naturalCoords.x >= areaLayer.rect.x && naturalCoords.x <= areaLayer.rect.x + 1024 &&
                naturalCoords.y >= areaLayer.rect.y && naturalCoords.y <= areaLayer.rect.y + 1024
            );

            if (!isPointInAnyUnlockedTile) return;

            // Auto-focus on interaction if not already focused
            // Only allow auto-focus on mobile devices
            if (!focusedAreaId && window.innerWidth < 1024) {
                 const area = selectionLayers.find(l => 
                    !l.locked &&
                    naturalCoords.x >= l.rect.x && naturalCoords.x <= l.rect.x + 1024 &&
                    naturalCoords.y >= l.rect.y && naturalCoords.y <= l.rect.y + 1024
                );
                if (area) {
                    onFocusArea(area.id);
                }
            }

            if (currentPath.length > 2) {
                const firstPoint = currentPath[0];
                const dist = Math.sqrt(Math.pow(firstPoint.x - naturalCoords.x, 2) + Math.pow(firstPoint.y - naturalCoords.y, 2));

                if (dist < CLOSING_THRESHOLD) {
                    onPathClosed();
                    return;
                }
            }
            onCurrentPathChange([...currentPath, naturalCoords]);
        } else if (mode === 'tile') {
             const imageElement = document.getElementById(imageElementId) as HTMLImageElement;
            if (!imageElement) return;
            const TILE_SIZE = 1024;
            const idealNaturalX = naturalCoords.x - TILE_SIZE / 2;
            const idealNaturalY = naturalCoords.y - TILE_SIZE / 2;
            
            const clampedNaturalX = Math.max(0, Math.min(idealNaturalX, imageElement.naturalWidth - TILE_SIZE));
            const clampedNaturalY = Math.max(0, Math.min(idealNaturalY, imageElement.naturalHeight - TILE_SIZE));
            
            const newTile = { x: Math.round(clampedNaturalX), y: Math.round(clampedNaturalY) };
            
            const exists = selectionLayers.some(l => l.rect?.x === newTile.x && l.rect?.y === newTile.y);
            if (!exists) {
                onRequestAddArea(newTile);
            }
        }
    }
    
    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        processInteraction(event.clientX, event.clientY);
    };

    const handleMouseLeave = () => {
        setMousePos(null);
        onSetHoveredArea(null);
        if (onHoverLayer) onHoverLayer(null);
    };

    // --- TOUCH EVENTS HANDLERS ---
    
    const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
        if (mode === 'pan') return; // Allow scrolling
        if (event.cancelable) event.preventDefault(); // Stop scrolling for drawing tools
        event.stopPropagation(); // Stop propagation to avoid bubbling up to parent containers
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            processInteraction(touch.clientX, touch.clientY);
        }
    };

    const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
        if (mode === 'pan') return; // Allow scrolling
        if (event.cancelable) event.preventDefault(); // Stop scrolling for drawing tools
        event.stopPropagation(); // Stop propagation
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            processInteraction(touch.clientX, touch.clientY);
        }
    };

    const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
        if (mode === 'pan') return; // Allow scrolling, handleClick will fire for tap
        if (event.cancelable) event.preventDefault();
        
        // Use changedTouches because touches is empty on end
        if (event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            const result = processInteraction(touch.clientX, touch.clientY, true);
            if (result) {
                // NOTE: Auto-focus removed here to prevent jumps
                handleInteractionEnd(result.naturalCoords);
            }
        }
        // Force clear hovered state on touch end to be clean
        onSetHoveredArea(null);
        if (onHoverLayer) onHoverLayer(null);
    };


    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0"
            style={{ 
                touchAction: mode === 'pan' ? 'auto' : 'none',
                pointerEvents: 'auto' // Always capture events, we filter in handlers
            }}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        />
    );
};
