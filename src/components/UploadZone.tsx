import React, { useState, useCallback, useRef } from 'react';

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                onFileSelect(file);
            } else {
                alert('Please upload an image file');
            }
        }
    }, [onFileSelect]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
        }
    }, [onFileSelect]);

    return (
        <div
            className={`
        relative border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
        ${isDragging
                    ? 'border-gray-800 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-400'
                }
      `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileInput}
            />

            <div className="space-y-2">
                <p className="text-gray-800 font-medium">Drop image here</p>
                <p className="text-gray-400 text-sm">or click to browse</p>
            </div>
        </div>
    );
};
