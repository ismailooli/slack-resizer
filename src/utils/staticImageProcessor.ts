import type { Area } from 'react-easy-crop';
import { loadImage } from './loadImage';
import { MAX_SIZE, TARGET_DIM } from './constants';

export const processStaticImage = async (file: File, crop?: Area): Promise<Blob> => {
    const imageUrl = URL.createObjectURL(file);
    const img = await loadImage(imageUrl);
    URL.revokeObjectURL(imageUrl);

    let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
    if (crop) {
        srcX = crop.x;
        srcY = crop.y;
        srcW = crop.width;
        srcH = crop.height;
    }

    const scale = Math.min(TARGET_DIM / srcW, TARGET_DIM / srcH);
    const width = Math.round(srcW * scale);
    const height = Math.round(srcH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, width, height);

    let quality = 0.9;
    let blob: Blob | null = null;
    let type: string = 'image/png';

    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type));

    if (blob && blob.size > MAX_SIZE) {
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
