export interface ProcessedImage {
    blob: Blob;
    width: number;
    height: number;
    isGif: boolean;
}

export interface FrameRange {
    start: number;
    end: number;
}
