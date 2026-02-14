import { parseGIF, decompressFrames } from 'gifuct-js';
import GIF from 'gif.js';
import type { Area } from 'react-easy-crop';
import type { FrameRange } from './types';
import { TARGET_DIM } from './constants';

export const getGifFrames = async (file: File): Promise<any[]> => {
    const arrayBuffer = await file.arrayBuffer();
    return decompressFrames(parseGIF(arrayBuffer), true);
};

export interface GifFramesAndInfo {
    frames: any[];
    width: number;
    height: number;
    bgRgb: [number, number, number] | null;
}

export const getGifFramesAndInfo = async (file: File): Promise<GifFramesAndInfo> => {
    const arrayBuffer = await file.arrayBuffer();
    const rawGif = parseGIF(arrayBuffer);
    const frames = decompressFrames(rawGif, true);
    const width = rawGif.lsd.width;
    const height = rawGif.lsd.height;
    const bgIndex = rawGif.lsd.backgroundColorIndex ?? 0;
    const gct = rawGif.gct ?? [];
    const bgRgb = (gct[bgIndex] as [number, number, number]) ?? null;
    return { frames, width, height, bgRgb };
};

/** Composes frames 0..frameIndex into a single image; returns data URL. Keeps transparency (no background fill). */
export const composeFrameToDataUrl = (
    frames: any[],
    frameIndex: number,
    width: number,
    height: number,
    _bgRgb: [number, number, number] | null
): string => {
    const frame = frames[frameIndex];
    if (!frame) throw new Error('Frame not found');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context missing');

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('Temp canvas context missing');

    let previousFrameData: ImageData | null = null;

    for (let i = 0; i <= frameIndex; i++) {
        const f = frames[i];

        if (f.disposalType === 3) {
            previousFrameData = ctx.getImageData(0, 0, width, height);
        }

        if (f.dims.width > 0 && f.dims.height > 0) {
            const patchData = new ImageData(f.patch as any, f.dims.width, f.dims.height);
            tempCanvas.width = f.dims.width;
            tempCanvas.height = f.dims.height;
            tempCtx.putImageData(patchData, 0, 0);
            ctx.drawImage(tempCanvas, f.dims.left, f.dims.top);
        }

        if (i < frameIndex) {
            if (f.disposalType === 0 || f.disposalType === 2) {
                ctx.clearRect(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
            } else if (f.disposalType === 3 && previousFrameData) {
                ctx.putImageData(previousFrameData, 0, 0);
            }
        }
    }

    return canvas.toDataURL();
};

export const extractFrameImage = async (file: File, frameIndex: number): Promise<string> => {
    const { frames, width, height, bgRgb } = await getGifFramesAndInfo(file);
    return composeFrameToDataUrl(frames, frameIndex, width, height, bgRgb);
};

export const processGif = async (file: File, crop?: Area, frameRange?: FrameRange): Promise<Blob> => {
    const arrayBuffer = await file.arrayBuffer();
    const allFrames = decompressFrames(parseGIF(arrayBuffer), true);

    let frames = allFrames;
    if (frameRange) {
        frames = allFrames.slice(frameRange.start, frameRange.end + 1);
    }

    if (frames.length === 0) throw new Error('No frames selected');

    const maxFrames = 20;
    const indicesToKeep = new Set<number>();
    if (frames.length > maxFrames) {
        indicesToKeep.add(0);
        indicesToKeep.add(frames.length - 1);
        const step = (frames.length - 1) / (maxFrames - 1);
        for (let i = 1; i < maxFrames - 1; i++) {
            indicesToKeep.add(Math.round(i * step));
        }
    } else {
        frames.forEach((_, i) => indicesToKeep.add(i));
    }

    const rawGif = parseGIF(arrayBuffer);
    const gifWidth = rawGif.lsd.width;
    const gifHeight = rawGif.lsd.height;

    let srcX = 0, srcY = 0, srcW = gifWidth, srcH = gifHeight;
    if (crop) {
        srcX = crop.x;
        srcY = crop.y;
        srcW = crop.width;
        srcH = crop.height;
    }

    const scale = Math.min(TARGET_DIM / srcW, TARGET_DIM / srcH);
    const drawWidth = Math.round(srcW * scale);
    const drawHeight = Math.round(srcH * scale);

    const gif = new GIF({
        workers: 1,
        quality: 10,
        dither: false,
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

    ctx.imageSmoothingEnabled = false;

    const compositionCanvas = document.createElement('canvas');
    compositionCanvas.width = gifWidth;
    compositionCanvas.height = gifHeight;
    const compositionCtx = compositionCanvas.getContext('2d', { willReadFrequently: true });
    if (!compositionCtx) throw new Error('Canvas context missing');

    let previousFrameData: ImageData | null = null;

    const endIndex = frameRange ? frameRange.end : allFrames.length - 1;
    const startIndex = frameRange ? frameRange.start : 0;

    for (let i = 0; i <= endIndex; i++) {
        const frame = allFrames[i];

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

        if (i >= startIndex) {
            const localIndex = i - startIndex;

            if (indicesToKeep.has(localIndex)) {
                ctx.clearRect(0, 0, drawWidth, drawHeight);
                ctx.drawImage(compositionCanvas, srcX, srcY, srcW, srcH, 0, 0, drawWidth, drawHeight);
                const delayMs = Math.max(20, frame.delay || 100);
                gif.addFrame(ctx, { copy: true, delay: delayMs });
            }
        }

        if (frame.disposalType === 0 || frame.disposalType === 2) {
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
