import React, { useEffect, useState } from 'react';

interface PreviewSectionProps {
    processedBlob: Blob | null;
    isProcessing: boolean;
    fileName: string;
}

export const PreviewSection: React.FC<PreviewSectionProps> = ({
    processedBlob,
    isProcessing,
    fileName
}) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<string>('');
    const [dimensions, setDimensions] = useState<{ width: number, height: number } | null>(null);

    useEffect(() => {
        if (processedBlob) {
            const url = URL.createObjectURL(processedBlob);
            setPreviewUrl(url);
            setFileSize((processedBlob.size / 1024).toFixed(1) + ' KB');

            const img = new Image();
            img.onload = () => {
                setDimensions({ width: img.width, height: img.height });
            };
            img.src = url;

            return () => {
                URL.revokeObjectURL(url);
            };
        } else {
            setPreviewUrl(null);
            setFileSize('');
            setDimensions(null);
        }
    }, [processedBlob]);

    const handleDownload = () => {
        if (previewUrl && fileName) {
            const link = document.createElement('a');
            link.href = previewUrl;

            const nameParts = fileName.split('.');
            const ext = nameParts.pop();
            const baseName = nameParts.join('.');
            link.download = `${baseName}_slack.${ext}`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const isEmpty = !processedBlob && !isProcessing;

    return (
        <div className={`space-y-8 ${isEmpty ? 'opacity-30 pointer-events-none' : ''}`}>
            {/* Full Size Preview */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-400 uppercase tracking-wider">
                    <span>Full Size Preview</span>
                    {dimensions && <span>{dimensions.width}×{dimensions.height} • {fileSize}</span>}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-center justify-center min-h-[200px] relative overflow-hidden">
                    {/* Checkerboard background for transparency */}
                    <div className="absolute inset-0 z-0 opacity-10"
                        style={{
                            backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                            backgroundSize: '10px 10px'
                        }}
                    />

                    <div className="relative z-10 p-4 border border-dashed border-gray-300 rounded bg-gray-50/50 backdrop-blur-sm">
                        {isProcessing ? (
                            <span className="text-gray-400 animate-pulse">Processing...</span>
                        ) : previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="max-h-[200px] object-contain"
                            />
                        ) : (
                            <div className="w-32 h-32 bg-gray-100 rounded" />
                        )}
                    </div>
                </div>
            </div>

            {/* Emoji Preview (Slack Context) */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-400 uppercase tracking-wider">
                    <span>In Slack Message</span>
                    {dimensions && <span>Rendered Size: 22x22px</span>}
                </div>

                {/* Slack Message Mockup */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
                    <div className="flex gap-3">
                        <div className="w-9 h-9 rounded bg-gray-200 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold text-[15px] text-[#1d1c1d]">User</span>
                                <span className="text-xs text-[#616061]">10:42 AM</span>
                            </div>
                            <div className="text-[15px] text-[#1d1c1d] leading-[22px] break-words">
                                <span>Here is the new emoji </span>
                                {isProcessing ? (
                                    <div className="w-[22px] h-[22px] bg-gray-100 rounded animate-pulse inline-block align-text-bottom mx-0.5" />
                                ) : previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="Emoji Preview"
                                        className="w-[22px] h-[22px] object-contain inline-block align-text-bottom mx-0.5"
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                ) : (
                                    <div className="w-[22px] h-[22px] bg-gray-100 rounded inline-block align-text-bottom mx-0.5" />
                                )}
                                <span> looks great!</span>
                            </div>
                        </div>
                    </div>

                    {/* Reaction Bar Mockup */}
                    <div className="pl-12 flex gap-2">
                        <div className="bg-[#f2f2f2] hover:bg-white border border-gray-200 rounded-full px-1.5 py-0.5 flex items-center gap-1 cursor-pointer transition-colors">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Reaction"
                                    className="w-[16px] h-[16px] object-contain"
                                />
                            ) : (
                                <div className="w-4 h-4 bg-gray-300 rounded-sm" />
                            )}
                            <span className="text-xs font-medium text-[#1d1c1d]">1</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Download Button */}
            <button
                onClick={handleDownload}
                disabled={!processedBlob || isProcessing}
                className={`
          w-full py-3.5 px-4 rounded-md font-medium text-sm transition-colors
          ${!processedBlob || isProcessing
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-black'
                    }
        `}
            >
                {isProcessing ? 'Processing GIF...' : 'Download Slack Emoji'}
            </button>
        </div>
    );
};
