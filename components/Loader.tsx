import React, { useState } from 'react';
import type { Tile } from '../types';
import { TileState } from '../types';
import { ResetIcon } from './icons';
import { useLanguage } from '../i18n/i18n';

interface LoaderProps {
    tiles: Tile[];
    onRedraw: (tileId: string, promptOverride?: string) => void;
}

const TileCard: React.FC<{ tile: Tile; onRedraw: (tileId: string, promptOverride?: string) => void; }> = ({ tile, onRedraw }) => {
    const [redrawPrompt, setRedrawPrompt] = useState('');
    const { t } = useLanguage();
    const getBorderColor = () => {
        switch (tile.state) {
            case TileState.PROCESSING: return 'border-indigo-600 shadow-[4px_4px_0px_0px_rgba(79,70,229,1)]';
            case TileState.SUCCESS: return 'border-green-600 shadow-[4px_4px_0px_0px_rgba(22,163,74,1)]';
            case TileState.FAILED: return 'border-red-600 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]';
            case TileState.PENDING:
            default: return 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]';
        }
    };

    return (
        <div className={`relative bg-white border-4 ${getBorderColor()} overflow-hidden transition-all duration-300 group hover:-translate-y-1`}>
            <img 
                src={tile.state === TileState.SUCCESS && tile.processedData ? `data:image/png;base64,${tile.processedData}` : `data:image/png;base64,${tile.originalData}`}
                alt={`Tile ${tile.id}`}
                className="w-full h-auto object-contain bg-gray-100"
            />
            {tile.state === TileState.PROCESSING && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="w-10 h-10 border-4 border-dashed rounded-full animate-spin border-black"></div>
                </div>
            )}
            {tile.state === TileState.FAILED && (
                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-2 text-center gap-2">
                    <p className="text-xs text-red-600 font-black uppercase">{t('loader.processingFailed')}</p>
                    <textarea
                        value={redrawPrompt}
                        onChange={(e) => setRedrawPrompt(e.target.value)}
                        placeholder={t('loader.redrawPlaceholder')}
                        className="w-full bg-white border-2 border-black rounded-none p-1 text-xs focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
                        rows={2}
                    />
                    <button 
                        onClick={() => onRedraw(tile.id, redrawPrompt)}
                        className="flex items-center justify-center px-3 py-1 bg-black hover:bg-gray-800 text-white border-2 border-transparent text-xs font-bold uppercase"
                    >
                        <ResetIcon className="w-3 h-3 mr-1" />
                        {t('common.redraw')}
                    </button>
                </div>
            )}
             <div className="absolute bottom-0 left-0 bg-black text-white text-[10px] px-1 font-bold">
                {tile.x},{tile.y}
            </div>
        </div>
    );
};

export const Loader: React.FC<LoaderProps> = ({ tiles, onRedraw }) => {
    const { t } = useLanguage();
    const processingCount = tiles.filter(t => t.state === TileState.PROCESSING).length;
    const pendingCount = tiles.filter(t => t.state === TileState.PENDING).length;
    const failedCount = tiles.filter(t => t.state === TileState.FAILED).length;
    const successCount = tiles.filter(t => t.state === TileState.SUCCESS).length;
    const isProcessing = processingCount > 0 || pendingCount > 0;

    const getStatusMessage = () => {
        if(isProcessing) {
            const current = successCount + failedCount + 1;
            return t('loader.status.processing', { current, total: tiles.length });
        }
        if(failedCount > 0) {
            return t('loader.status.paused', { count: failedCount });
        }
        return t('loader.status.assembling', { total: tiles.length });
    };
    
    return (
        <div className="flex flex-col items-center justify-center p-4 text-center w-full max-w-7xl">
            <div className="w-full p-6 mb-8 bg-white border-4 border-black manga-shadow-lg">
                <h2 className="text-2xl font-black uppercase text-black">{getStatusMessage()}</h2>
                 <p className="text-black font-bold text-sm mt-2">{t('loader.doNotClose')}</p>
            </div>

            <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-6">
                {tiles.map(tile => (
                    <TileCard key={tile.id} tile={tile} onRedraw={onRedraw} />
                ))}
            </div>
        </div>
    );
};