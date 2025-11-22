import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/i18n';
import { LayersIcon, LockOpenIcon, LockClosedIcon, TrashIcon, ResetIcon, ChevronDownIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon } from './icons';
import { TileState } from '../types';

export interface UILayer {
    id: string;
    name: string;
    thumbnail: string;
    visible: boolean;
    locked: boolean;
    disabled?: boolean;
    deletable?: boolean;
    type: 'area' | 'text' | 'result' | 'mask';
    level: number;
    isProcessed: boolean;
    isBeingProcessed: boolean;
    isCollapsed?: boolean;
    hasProcessableTextLayers?: boolean;
    error?: string;
    parentIsLocked: boolean;
}

interface LayersPanelProps {
    layers: UILayer[];
    onToggleVisibility: (layerId: string) => void;
    onToggleLock: (layerId: string) => void;
    onDeleteLayer: (layerId: string) => void;
    onHoverLayer: (layerId: string | null) => void;
    onRedrawLayer: (layerId: string) => void;
    onToggleCollapsed: (layerId: string) => void;
    hoveredLayerId?: string | null;
}

const getIconForLayer = (type: UILayer['type']) => {
    switch (type) {
        case 'area': return <div className="w-4 h-4 border-2 border-blue-600 bg-blue-100 rounded-sm" />;
        case 'text': return <div className="w-4 h-4 border-2 border-red-500 bg-red-100 rounded-sm" />;
        case 'mask': return <div className="w-4 h-4 border-2 border-gray-400 bg-gray-100 rounded-sm" />;
        case 'result': return <div className="w-4 h-4 bg-green-500 border-2 border-green-700 rounded-sm" />;
        default: return null;
    }
}

export const LayersPanel: React.FC<LayersPanelProps> = ({ layers, onToggleVisibility, onToggleLock, onDeleteLayer, onHoverLayer, onRedrawLayer, onToggleCollapsed, hoveredLayerId }) => {
    const { t } = useLanguage();
    const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Auto-scroll to the hovered layer if it's not in view
    // FIXED: Only run this on desktop (>= 1024px). On mobile, the layers panel is below the image,
    // so scrolling to it causes the page to jump and the image to move out of view.
    useEffect(() => {
        if (window.innerWidth >= 1024 && hoveredLayerId && layerRefs.current[hoveredLayerId]) {
            layerRefs.current[hoveredLayerId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [hoveredLayerId]);

    return (
        <div>
            <div className="flex items-center gap-2 mb-3 border-b-2 border-black pb-1">
                <LayersIcon className="w-5 h-5 text-black" />
                <h3 className="font-black uppercase text-black tracking-wide">{t('imageDisplay.layers.title')}</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {layers.map((layer) => {
                    const isLockedOrInheritsLock = layer.locked || layer.parentIsLocked;
                    const isHovered = layer.id === hoveredLayerId;
                    
                    return (
                        <div key={layer.id} ref={el => layerRefs.current[layer.id] = el}>
                            <div
                                className={`flex items-center gap-1 p-1 border-2 transition-all duration-200
                                    ${layer.error && layer.type === 'area' ? 'border-red-500 bg-red-50' : ''} 
                                    ${isHovered ? 'border-blue-600 bg-blue-50 shadow-[4px_4px_0px_0px_rgba(37,99,235,0.3)] -translate-y-1' : 'border-black bg-white'} 
                                    ${isLockedOrInheritsLock && !isHovered ? 'opacity-60 bg-gray-100' : ''} 
                                    ${layer.disabled ? 'opacity-40' : ''}
                                    ${!layer.disabled && !isHovered ? 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px]' : ''}
                                `}
                                onMouseEnter={() => layer.type === 'area' && onHoverLayer(layer.id)}
                                onMouseLeave={() => layer.type === 'area' && onHoverLayer(null)}
                            >
                                <div style={{ width: `${layer.level * 16}px` }} className="flex-shrink-0" />

                                {layer.type === 'area' ? (
                                    <button onClick={() => onToggleCollapsed(layer.id)} className="p-0.5 rounded hover:bg-gray-200">
                                        {layer.isCollapsed ? <ChevronRightIcon className="w-4 h-4 text-black" /> : <ChevronDownIcon className="w-4 h-4 text-black" />}
                                    </button>
                                ) : (
                                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                                        {getIconForLayer(layer.type)}
                                    </div>
                                )}
                                <button
                                    onClick={() => !layer.disabled && onToggleVisibility(layer.id)}
                                    className={`p-1 rounded text-black ${layer.disabled ? 'cursor-not-allowed' : 'hover:bg-black hover:text-white'}`}
                                    title={layer.visible ? t('imageDisplay.layers.hideLayer') : t('imageDisplay.layers.showLayer')}
                                    disabled={layer.disabled}
                                >
                                    {layer.visible ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                                </button>
                                {layer.type !== 'result' ? (
                                    <button
                                        onClick={() => !layer.disabled && onToggleLock(layer.id)}
                                        className={`p-1 rounded text-black ${layer.disabled ? 'cursor-not-allowed' : 'hover:bg-black hover:text-white'}`}
                                        title={layer.locked ? t('imageDisplay.layers.unlockLayer') : t('imageDisplay.layers.lockLayer')}
                                        disabled={layer.disabled}
                                    >
                                        {layer.locked ? <LockClosedIcon className="w-4 h-4" /> : <LockOpenIcon className="w-4 h-4" />}
                                    </button>
                                ) : (
                                    <div className="w-6 h-5 flex-shrink-0" />
                                )}
                                <div className="w-8 h-8 flex-shrink-0 bg-white border border-black flex items-center justify-center overflow-hidden">
                                <img src={layer.thumbnail} alt={`${layer.name} thumbnail`} className="max-w-full max-h-full object-contain" />
                                </div>
                                <span 
                                    title={layer.name}
                                    className={`text-xs font-bold flex-grow truncate ${layer.disabled || isLockedOrInheritsLock ? 'text-gray-500' : 'text-black'}`}
                                >
                                    {layer.name}
                                </span>
                                {layer.type === 'area' && layer.hasProcessableTextLayers && (
                                    <button
                                        onClick={() => !layer.disabled && !layer.isBeingProcessed && onRedrawLayer(layer.id)}
                                        className={`p-1 rounded text-black ${layer.disabled || layer.isBeingProcessed || layer.locked ? 'cursor-not-allowed' : 'hover:bg-indigo-600 hover:text-white'} ${layer.isBeingProcessed ? 'animate-spin' : ''}`}
                                        title={t('imageDisplay.layers.processAreaTooltip')}
                                        disabled={layer.disabled || layer.isBeingProcessed || layer.locked}
                                    >
                                        <ResetIcon className="w-4 h-4" />
                                    </button>
                                )}
                                {layer.deletable && (
                                    <button
                                        onClick={() => !layer.disabled && !layer.isBeingProcessed && onDeleteLayer(layer.id)}
                                        className={`p-1 rounded text-black ${layer.disabled || layer.isBeingProcessed ? 'cursor-not-allowed' : 'hover:bg-red-600 hover:text-white'}`}
                                        title={t('imageDisplay.layers.deleteLayerTooltip')}
                                        disabled={layer.disabled || layer.isBeingProcessed}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {layer.error && layer.type === 'area' && (
                                <div
                                    className="text-xs text-white bg-red-600 p-1 mx-1 border-l-2 border-r-2 border-b-2 border-black font-bold"
                                >
                                    {t('errors.errorPrefix')}: {layer.error}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};