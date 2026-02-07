import { parseGIF, decompressFrames } from 'gifuct-js';
import GIF from 'gif.js';
import type { Area } from 'react-easy-crop';

export interface ProcessedImage {
    blob: Blob;
    width: number;
    height: number;
    isGif: boolean;
}

const MAX_SIZE = 128 * 1024; // 128KB
const TARGET_DIM = 128;

export const processFile = async (file: File, crop?: Area, frameRange?: { start: number, end: number }): Promise<Blob> => {
    if (file.type === 'image/gif') {
        return processGif(file, crop, frameRange);
    } else {
        return processStaticImage(file, crop);
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

export const getGifFrames = async (file: File): Promise<any[]> => {
    const arrayBuffer = await file.arrayBuffer();
    return decompressFrames(parseGIF(arrayBuffer), true);
};

export const processStaticImage = async (file: File, crop?: Area): Promise<Blob> => {
    const imageUrl = URL.createObjectURL(file);
    const img = await loadImage(imageUrl);
    URL.revokeObjectURL(imageUrl);

    // Determine Logic: Crop vs Full
    let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
    if (crop) {
        srcX = crop.x;
        srcY = crop.y;
        srcW = crop.width;
        srcH = crop.height;
    }

    // Calculate scaling to FIT the source content within 128x128
    const scale = Math.min(TARGET_DIM / srcW, TARGET_DIM / srcH);
    const width = Math.round(srcW * scale);
    const height = Math.round(srcH * scale);

    // Create canvas EXACTLY the size of the resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.clearRect(0, 0, width, height);

    // Draw only the cropped region
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, width, height);

    // Compression loop
    let quality = 0.9;
    let blob: Blob | null = null;
    let type = 'image/png'; // Default to PNG

    // Try PNG first
    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type));

    if (blob && blob.size > MAX_SIZE) {
        // Fallback to JPEG if PNG is too large
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

export const processGif = async (file: File, crop?: Area, frameRange?: { start: number, end: number }): Promise<Blob> => {
    const arrayBuffer = await file.arrayBuffer();
    const allFrames = decompressFrames(parseGIF(arrayBuffer), true);

    // Apply Trim/Range Selection
    let frames = allFrames;
    if (frameRange) {
        frames = allFrames.slice(frameRange.start, frameRange.end + 1);
    }

    if (frames.length === 0) throw new Error('No frames selected');

    // Frame reduction logic (applied to the TRIMMED selection)
    const maxFrames = 20;

    // Select indices within the trimmed set
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

    // Determine Source Dimensions (Full vs Cropped)
    let srcX = 0, srcY = 0, srcW = gifWidth, srcH = gifHeight;
    if (crop) {
        srcX = crop.x;
        srcY = crop.y;
        srcW = crop.width;
        srcH = crop.height;
    }

    // Scale factor - FIT within 128x128 based on SOURCE dimensions
    const scale = Math.min(TARGET_DIM / srcW, TARGET_DIM / srcH);
    const drawWidth = Math.round(srcW * scale);
    const drawHeight = Math.round(srcH * scale);

    const gif = new GIF({
        workers: 1,
        quality: 20,
        width: drawWidth,
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

    // Disable smoothing
    ctx.imageSmoothingEnabled = false;

    const compositionCanvas = document.createElement('canvas');
    compositionCanvas.width = gifWidth;
    compositionCanvas.height = gifHeight;
    const compositionCtx = compositionCanvas.getContext('2d', { willReadFrequently: true });
    if (!compositionCtx) throw new Error('Canvas context missing');

    let previousFrameData: ImageData | null = null;

    // Iterate through ALL frames to build state, but only ADD trimmed frames
    // Wait, trim logic slice method breaks disposal chain if we just start from middle.
    // If we start from frame 10 (Disposal 3), we need state from frame 9.
    // So we must iterate from 0 to end of range, but only draw/add frames within range.

    // Correction: We iterate through full `allFrames` up to `frameRange.end`
    const endIndex = frameRange ? frameRange.end : allFrames.length - 1;
    const startIndex = frameRange ? frameRange.start : 0;

    // We need to map the "trimmed index" to the "kept index"
    // `indicesToKeep` refers to indices within the `frames` (sliced) array.
    // So if trimmed is 10-20. The 0th frame of trimmed is index 10 of original.

    for (let i = 0; i <= endIndex; i++) {
        const frame = allFrames[i];

        // Save state for Disposal 3
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

        // Only add frame if it is within the range AND it is selected by reduction logic
        if (i >= startIndex) {
            // Local index within the trimmed slice
            const localIndex = i - startIndex;

            if (indicesToKeep.has(localIndex)) {
                // Clear target canvas
                ctx.clearRect(0, 0, drawWidth, drawHeight);

                // Draw composed frame
                ctx.drawImage(compositionCanvas, srcX, srcY, srcW, srcH, 0, 0, drawWidth, drawHeight);

                gif.addFrame(ctx, { copy: true, delay: frame.delay });
            }
        }

        // Handle Disposal
        if (frame.disposalType === 2) {
            compositionCtx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
        } else if (frame.disposalType === 3 && previousFrameData) {
            compositionCtx.putImageData(previousFrameData, 0, 0);
        }
    }

    return new Promise((resolve, reject) => {
        gif.on('finished', (blob: Blob) => resolve(blob));
        gif.on('abort', () => reject(new Error('GIF encoding aborted')));
        gif.render();
    });
};
