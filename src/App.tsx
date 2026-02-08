import { useState, useCallback } from 'react';
import { UploadZone } from './components/UploadZone';
import { PreviewSection } from './components/PreviewSection';
import { CropSection } from './components/CropSection';

import { GifTrimmer } from './components/GifTrimmer';
import { processFile, extractFrameImage } from './utils/imageProcessor';
import type { Area } from 'react-easy-crop';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null); // New state for specific frame
  const [step, setStep] = useState<'upload' | 'trim' | 'crop' | 'preview'>('upload');
  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for multi-step data
  const [trimRange, setTrimRange] = useState<{ start: number, end: number } | undefined>();

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setFileUrl(URL.createObjectURL(selectedFile));
    setCropPreviewUrl(null); // Reset
    setResizedBlob(null);
    setError(null);
    setTrimRange(undefined);

    // Determine initial step
    if (selectedFile.type === 'image/gif') {
      setStep('trim');
    } else {
      setStep('crop');
    }
  }, []);

  const handleTrimConfirm = async (range: { start: number; end: number }) => {
    setTrimRange(range);

    // Generate preview for the START frame so cropping is accurate
    if (file) {
      try {
        const frameUrl = await extractFrameImage(file, range.start);
        setCropPreviewUrl(frameUrl);
      } catch (e) {
        console.error("Failed to generate trim preview", e);
      }
    }

    setStep('crop');
  };

  const handleTrimSkip = () => {
    setTrimRange(undefined);
    setStep('crop');
  };

  const handleCropConfirm = async (cropArea: Area) => {
    if (!file) return;
    setStep('preview');
    await processWithParams(file, cropArea, trimRange);
  };

  const handleCropSkip = async () => {
    if (!file) return;
    setStep('preview');
    await processWithParams(file, undefined, trimRange);
  };

  const processWithParams = async (file: File, crop?: Area, range?: { start: number, end: number }) => {
    setIsProcessing(true);
    try {
      // Small delay to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 100));

      const blob = await processFile(file, crop, range);
      setResizedBlob(blob);
    } catch (err) {
      console.error(err);
      setError('Failed to process image. Please try another file.');
      setStep('upload'); // Reset on error
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
          {/* Left Column - Work Area */}
          <section className="space-y-4">
            {step === 'trim' && file ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Trim GIF</h2>
                <p className="text-sm text-gray-500">Shorten the animation to save space.</p>
                <GifTrimmer
                  file={file}
                  onConfirm={handleTrimConfirm}
                  onSkip={handleTrimSkip}
                />
              </div>
            ) : step === 'crop' && fileUrl ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Crop & Frame</h2>
                <p className="text-sm text-gray-500">Zoom and pan to frame your emoji.</p>
                <CropSection
                  imageUrl={cropPreviewUrl || fileUrl}
                  onConfirm={handleCropConfirm}
                  onSkip={handleCropSkip}
                />
              </div>
            ) : step === 'upload' ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <UploadZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
              </div>
            ) : (
              // Preview State (step === 'preview')
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex items-center justify-center min-h-[300px] text-gray-400">
                <div className="text-center space-y-2">
                  <p>Processing complete!</p>
                  <button onClick={() => setStep('upload')} className="text-xs underline hover:text-gray-600">Start Over</button>
                </div>
              </div>
            )}

            {file && step !== 'upload' && (
              <div className="text-xs text-gray-400 font-mono px-2">
                Running: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </section>

          {/* Right Column - Preview (Only show if previewing) */}
          <section>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              {step === 'preview' ? (
                <PreviewSection
                  processedBlob={resizedBlob}
                  isProcessing={isProcessing}
                  fileName={file?.name || ''}
                />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                  {step === 'trim' ? 'Finish trimming...' : step === 'crop' ? 'Finish cropping...' : 'Preview will appear here'}
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
