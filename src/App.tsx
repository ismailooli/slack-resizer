import { useState, useCallback } from 'react';
import { UploadZone } from './components/UploadZone';
import { PreviewSection } from './components/PreviewSection';
import { CropSection } from './components/CropSection';
import { processFile } from './utils/imageProcessor';
import type { Area } from 'react-easy-crop';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setFileUrl(URL.createObjectURL(selectedFile));
    setIsCropping(true); // Start cropping flow immediately
    setResizedBlob(null);
    setError(null);
  }, []);

  const handleCropConfirm = async (cropArea: Area) => {
    if (!file) return;
    setIsCropping(false);
    await processWithCrop(file, cropArea);
  };

  const handleSkipCrop = async () => {
    if (!file) return;
    setIsCropping(false);
    await processWithCrop(file);
  };

  const processWithCrop = async (file: File, crop?: Area) => {
    setIsProcessing(true);
    try {
      // Small delay to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 100));

      const blob = await processFile(file, crop);
      setResizedBlob(blob);
    } catch (err) {
      console.error(err);
      setError('Failed to process image. Please try another file.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6 md:p-12 font-sans selection:bg-black selection:text-white">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <header className="space-y-2 border-b border-gray-100 pb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Slack Resizer</h1>
          <p className="text-gray-500 text-sm">
            Resize images for Slack emojis (under 128KB, square)
          </p>
        </header>

        {/* Main Content */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left Column - Upload or Crop */}
          <section className="space-y-4">
            {isCropping && fileUrl ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Crop & Frame</h2>
                <p className="text-sm text-gray-500">Zoom and pan to frame your emoji.</p>
                <CropSection
                  imageUrl={fileUrl}
                  onConfirm={handleCropConfirm}
                  onSkip={handleSkipCrop}
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <UploadZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
              </div>
            )}

            {file && !isCropping && (
              <div className="text-xs text-gray-400 font-mono px-2">
                Running: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </section>

          {/* Right Column - Preview (Only show if not cropping) */}
          <section>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              {!isCropping ? (
                <PreviewSection
                  processedBlob={resizedBlob}
                  isProcessing={isProcessing}
                  fileName={file?.name || ''}
                />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                  Finish cropping to see preview
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
