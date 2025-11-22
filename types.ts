
export interface ImageFile {
  file: File;
  base64: string;
}

export enum TileState {
  PENDING,
  PROCESSING,
  SUCCESS,
  FAILED,
}

export interface Tile {
  id: string; // e.g., "tile-0-0"
  x: number;
  y: number;
  state: TileState;
  originalData: string; // The base64 of the tile with red outline
  cleanData: string; // The base64 of the original tile without overlay
  maskData: string; // The base64 of the black & white mask for compositing
  rawProcessedData?: string; // Raw output from Gemini
  processedData?: string; // The base64 of the FINAL composited tile
  error?: string;
  isRedraw?: boolean; // Flag to indicate if this is a redraw operation
}

export type Point = { x: number; y: number };

export interface RedrawPayload {
    tileId: string;
    promptOverride?: string;
    textPaths: Point[][];
    maskPaths: Point[][];
    rect: { x: number; y: number };
}
