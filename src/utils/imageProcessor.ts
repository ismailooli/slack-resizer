import type { Area } from 'react-easy-crop';
import { processStaticImage } from './staticImageProcessor';
import { processGif, getGifFrames, extractFrameImage } from './gifProcessor';

export type { ProcessedImage, FrameRange } from './types';

export const processFile = async (
    file: File,
    crop?: Area,
    frameRange?: { start: number; end: number }
): Promise<Blob> => {
    if (file.type === 'image/gif') {
        return processGif(file, crop, frameRange);
    }
    return processStaticImage(file, crop);
};

export { getGifFrames, extractFrameImage };
