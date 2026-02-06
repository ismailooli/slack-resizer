import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface CropSectionProps {
    imageUrl: string;
    onConfirm: (croppedAreaPixels: Area) => void;
    onSkip: () => void;
}

export const CropSection: React.FC<CropSectionProps> = ({ imageUrl, onConfirm, onSkip }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [aspect, setAspect] = useState(1); // Default to Square (1:1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = () => {
        if (croppedAreaPixels) {
            onConfirm(croppedAreaPixels);
        } else {
            // Fallback if no interaction? Usually onCropComplete fires on mount.
            // But just in case, onSkip if null
            onSkip();
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative h-[400px] w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <Cropper
                    image={imageUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspect}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    style={{
                        containerStyle: { background: '#f5f5f5' },
                        cropAreaStyle: { border: '2px solid white', boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.5)' }
                    }}
                />
            </div>

            <div className="flex flex-col gap-4">
                {/* Controls */}
                <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-gray-500 uppercase">Zoom</span>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1"
                    />
                </div>

                {/* Aspect Ratio Toggle */}
                <div className="flex gap-2 justify-center">
                    <button
                        onClick={() => setAspect(1)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${aspect === 1 ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                    >
                        Square (1:1)
                    </button>
                    <button
                        onClick={() => setAspect(4 / 3)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${aspect === 4 / 3 ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                    >
                        4:3
                    </button>
                    <button
                        onClick={() => setAspect(16 / 9)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${aspect === 16 / 9 ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                    >
                        16:9
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onSkip}
                        className="flex-1 py-3 px-4 rounded-md font-medium text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        Skip (Use Full Image)
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3 px-4 rounded-md font-medium text-sm text-white bg-black hover:bg-gray-800 transition-colors"
                    >
                        Confirm Crop
                    </button>
                </div>
            </div>
        </div>
    );
};
