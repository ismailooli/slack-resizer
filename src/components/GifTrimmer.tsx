import React, { useState, useEffect, useRef } from 'react';
import { getGifFrames } from '../utils/imageProcessor';

interface GifTrimmerProps {
    file: File;
    onConfirm: (range: { start: number; end: number }) => void;
    onSkip: () => void;
}

export const GifTrimmer: React.FC<GifTrimmerProps> = ({ file, onConfirm, onSkip }) => {
    const [frames, setFrames] = useState<any[]>([]);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [range, setRange] = useState({ start: 0, end: 0 });
    const [previewIndex, setPreviewIndex] = useState(0);


    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const loadFrames = async () => {
            try {
                const parsedFrames = await getGifFrames(file);
                setFrames(parsedFrames);
                setRange({ start: 0, end: parsedFrames.length - 1 });

                // Generate thumbnails
                const step = Math.max(1, Math.floor(parsedFrames.length / 10));
                const thumbs: string[] = [];

                const generateThumb = async (frame: any) => {
                    const canvas = document.createElement('canvas');
                    canvas.width = frame.dims.width;
                    canvas.height = frame.dims.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return '';
                    const imgData = new ImageData(frame.patch, frame.dims.width, frame.dims.height);
                    ctx.putImageData(imgData, 0, 0);
                    return canvas.toDataURL();
                };

                for (let i = 0; i < parsedFrames.length; i += step) {
                    if (parsedFrames[i].dims.width > 0 && parsedFrames[i].dims.height > 0) {
                        thumbs.push(await generateThumb(parsedFrames[i]));
                    }
                }
                setThumbnails(thumbs);

            } catch (error) {
                console.error("Error parsing GIF", error);
                onSkip();
            } finally {
                setIsLoading(false);
            }
        };
        loadFrames();
    }, [file, onSkip]);

    // Preview Loop
    useEffect(() => {
        if (frames.length === 0) return;

        let timeoutId: ReturnType<typeof setTimeout>;
        const animate = () => {
            setPreviewIndex(prev => {
                let next = prev + 1;
                // Loop only within range
                if (next > range.end) return range.start;
                if (next < range.start) return range.start;
                return next;
            });

            const delay = frames[previewIndex]?.delay || 100;
            timeoutId = setTimeout(animate, delay);
        };

        timeoutId = setTimeout(animate, 100);
        return () => clearTimeout(timeoutId);
    }, [range, frames, previewIndex]);

    // Render Frame
    useEffect(() => {
        if (frames.length === 0 || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const frame = frames[previewIndex];
        if (!frame) return;

        canvasRef.current.width = frame.dims.width;
        canvasRef.current.height = frame.dims.height;
        const imgData = new ImageData(frame.patch, frame.dims.width, frame.dims.height);
        ctx.putImageData(imgData, 0, 0);

    }, [previewIndex, frames]);

    const handleRangeChange = (type: 'start' | 'end', value: number) => {
        const val = Math.max(0, Math.min(value, frames.length - 1));

        if (type === 'start') {
            setRange(prev => ({ ...prev, start: Math.min(val, prev.end - 1) }));
        } else {
            setRange(prev => ({ ...prev, end: Math.max(val, prev.start + 1) }));
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-400">Loading frames...</div>;

    const totalFrames = frames.length;
    // Calculate percentages for UI
    const startPercent = (range.start / (totalFrames - 1)) * 100;
    const endPercent = (range.end / (totalFrames - 1)) * 100;

    return (
        <div className="space-y-6">
            {/* Preview Box */}
            <div className="bg-gray-100 rounded-lg p-4 flex justify-center items-center min-h-[200px] border border-gray-200">
                <canvas ref={canvasRef} className="max-h-[200px] max-w-full object-contain bg-white shadow-sm" />
            </div>

            {/* Timeline Area */}
            <div className="space-y-3">
                <div className="flex justify-between text-xs text-gray-500 uppercase tracking-widest font-medium">
                    <span>From: {range.start}</span>
                    <span>Dur: {range.end - range.start} frames</span>
                    <span>To: {range.end}</span>
                </div>

                {/* The Timeline Track Container */}
                <div className="relative h-16 select-none group">

                    {/* 1. Background Thumbnails (Visual Only) */}
                    <div className="absolute inset-x-0 top-2 bottom-2 rounded-md overflow-hidden bg-gray-200 opacity-60 flex">
                        {thumbnails.map((src, i) => (
                            <img key={i} src={src} className="h-full flex-1 object-cover min-w-0" alt="" />
                        ))}
                    </div>

                    {/* 2. Dimming Overlay (Masks out trimmed areas) */}
                    <div className="absolute inset-x-0 top-2 bottom-2 rounded-md pointer-events-none">
                        <div
                            className="absolute inset-y-0 left-0 bg-white/70 border-r border-black/10 transition-all duration-75"
                            style={{ width: `${startPercent}%` }}
                        />
                        <div
                            className="absolute inset-y-0 right-0 bg-white/70 border-l border-black/10 transition-all duration-75"
                            style={{ width: `${100 - endPercent}%` }}
                        />
                    </div>

                    {/* 3. The Active "Cut" Window Border (Visual) */}
                    <div
                        className="absolute top-1 bottom-1 border-2 border-black rounded-sm pointer-events-none shadow-sm transition-all duration-75"
                        style={{
                            left: `${startPercent}%`,
                            right: `${100 - endPercent}%`
                        }}
                    />

                    {/* 4. Invisible Range Inputs (The Interaction Layer) */}
                    {/* We stack two full-width range inputs. 
                        They are transparent. 
                        We use pointer-events trickery so you can grab both thumbs. */}
                    <>
                        <input
                            type="range"
                            min={0}
                            max={totalFrames - 1}
                            value={range.start}
                            onChange={(e) => handleRangeChange('start', Number(e.target.value))}
                            className="absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none z-20 
                                [&::-webkit-slider-thumb]:pointer-events-auto 
                                [&::-webkit-slider-thumb]:w-4 
                                [&::-webkit-slider-thumb]:h-12 
                                [&::-webkit-slider-thumb]:cursor-col-resize 
                                [&::-webkit-slider-thumb]:appearance-none 
                                [&::-webkit-slider-thumb]:bg-transparent"
                        />
                        <input
                            type="range"
                            min={0}
                            max={totalFrames - 1}
                            value={range.end}
                            onChange={(e) => handleRangeChange('end', Number(e.target.value))}
                            className="absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none z-20 
                                [&::-webkit-slider-thumb]:pointer-events-auto 
                                [&::-webkit-slider-thumb]:w-4 
                                [&::-webkit-slider-thumb]:h-12 
                                [&::-webkit-slider-thumb]:cursor-col-resize 
                                [&::-webkit-slider-thumb]:appearance-none 
                                [&::-webkit-slider-thumb]:bg-transparent"
                        />
                    </>

                    {/* 5. Custom Thumbs (Visual) - Positioned based on state because we hid the real ones */}
                    {/* Start Handle */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-8 bg-black rounded-sm shadow-md pointer-events-none z-10 flex items-center justify-center"
                        style={{ left: `${startPercent}%` }}
                    >
                        <div className="w-0.5 h-4 bg-white/50 rounded-full" />
                    </div>

                    {/* End Handle */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-8 bg-black rounded-sm shadow-md pointer-events-none z-10 flex items-center justify-center"
                        style={{ left: `${endPercent}%` }}
                    >
                        <div className="w-0.5 h-4 bg-white/50 rounded-full" />
                    </div>

                </div>
                <p className="text-center text-gray-400 text-[10px]">Drag the black handles to trim</p>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onSkip}
                    className="flex-1 py-3 px-4 rounded-md font-medium text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    Skip (Use All)
                </button>
                <button
                    onClick={() => onConfirm(range)}
                    className="flex-1 py-3 px-4 rounded-md font-medium text-sm text-white bg-black hover:bg-gray-800 transition-colors"
                >
                    Confirm Trim
                </button>
            </div>
        </div>
    );
};
