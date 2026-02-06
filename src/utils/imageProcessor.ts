import { parseGIF, decompressFrames } from 'gifuct-js';
import GIF from 'gif.js';

export interface ProcessedImage {
    blob: Blob;
    width: number;
    height: number;
    isGif: boolean;
}

const MAX_SIZE = 128 * 1024; // 128KB
const TARGET_DIM = 128;

export const processFile = async (file: File): Promise<Blob> => {
    if (file.type === 'image/gif') {
        return processGif(file);
    } else {
        return processStaticImage(file);
    }
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

export const processStaticImage = async (file: File): Promise<Blob> => {
    const imageUrl = URL.createObjectURL(file);
    const img = await loadImage(imageUrl);
    URL.revokeObjectURL(imageUrl);

    // Calculate scaling to FIT within 128x128
    const scale = Math.min(TARGET_DIM / img.width, TARGET_DIM / img.height);
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    // Create canvas EXACTLY the size of the resized image (no padding/bars)
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Compression loop
    let quality = 0.9;
    let blob: Blob | null = null;
    let type = 'image/png'; // Default to PNG to preserve transparency

    // Try PNG first
    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type));

    if (blob && blob.size > MAX_SIZE) {
        // Fallback to JPEG if PNG is too large (loses transparency)
        type = 'image/jpeg';
        while (quality > 0.1) {
            blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));
            if (blob && blob.size <= MAX_SIZE) {
                return blob;
            }
            quality -= 0.1;
        }
    } else {
        return blob!;
    }

    if (!blob) throw new Error('Image processing failed');
    return blob;
};

export const processGif = async (file: File): Promise<Blob> => {
    const arrayBuffer = await file.arrayBuffer();
    const frames = decompressFrames(parseGIF(arrayBuffer), true);

    // Frame reduction logic
    const maxFrames = 20;

    // Select indices
    const indicesToKeep = new Set<number>();
    if (frames.length > maxFrames) {
        const frameStep = Math.floor(frames.length / maxFrames);
        for (let i = 0; i < maxFrames; i++) {
            indicesToKeep.add(i * frameStep);
        }
    } else {
        frames.forEach((_, i) => indicesToKeep.add(i));
    }

    const rawGif = parseGIF(arrayBuffer);
    const gifWidth = rawGif.lsd.width;
    const gifHeight = rawGif.lsd.height;

    // Scale factor - FIT within 128x128
    const scale = Math.min(TARGET_DIM / gifWidth, TARGET_DIM / gifHeight);
    const drawWidth = Math.round(gifWidth * scale);
    const drawHeight = Math.round(gifHeight * scale);

    const gif = new GIF({
        workers: 1,
        quality: 20,
        width: drawWidth, // Canvas size matches image size
        height: drawHeight,
        workerScript: '/gif.worker.js',
        transparent: null,
    });

    const canvas = document.createElement('canvas');
    const tempCanvas = document.createElement('canvas');
    canvas.width = drawWidth;
    canvas.height = drawHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tempCtx = tempCanvas.getContext('2d');

    if (!ctx || !tempCtx) throw new Error('Canvas context missing');

    // Disable smoothing to avoid semi-transparent pixels
    ctx.imageSmoothingEnabled = false;

    const compositionCanvas = document.createElement('canvas');
    compositionCanvas.width = gifWidth;
    compositionCanvas.height = gifHeight;
    const compositionCtx = compositionCanvas.getContext('2d', { willReadFrequently: true });
    if (!compositionCtx) throw new Error('Canvas context missing');

    let previousFrameData: ImageData | null = null;

    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];

        // Save state for Disposal 3 (Restore to Previous)
        if (frame.disposalType === 3) {
            previousFrameData = compositionCtx.getImageData(0, 0, gifWidth, gifHeight);
        }

        if (frame.dims.width > 0 && frame.dims.height > 0) {
            const patchData = new ImageData(frame.patch as any, frame.dims.width, frame.dims.height);

            tempCanvas.width = frame.dims.width;
            tempCanvas.height = frame.dims.height;
            tempCtx.putImageData(patchData, 0, 0);

            compositionCtx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
        }

        if (indicesToKeep.has(i)) {
            // Clear target canvas
            ctx.clearRect(0, 0, drawWidth, drawHeight);

            // Draw composed frame at (0,0) - no centering needed as canvas fits image
            ctx.drawImage(compositionCanvas, 0, 0, drawWidth, drawHeight);

            gif.addFrame(ctx, { copy: true, delay: frame.delay });
        }

        // Handle Disposal
        if (frame.disposalType === 2) {
            // Restore to background (transparent)
            compositionCtx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
        } else if (frame.disposalType === 3 && previousFrameData) {
            // Restore to previous
            compositionCtx.putImageData(previousFrameData, 0, 0);
        }
    }

    return new Promise((resolve, reject) => {
        gif.on('finished', (blob: Blob) => resolve(blob));
        gif.on('abort', () => reject(new Error('GIF encoding aborted')));
        gif.render();
    });
};
