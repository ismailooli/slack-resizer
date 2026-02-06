import { useState, useCallback } from 'react';
import { UploadZone } from './components/UploadZone';
import { PreviewSection } from './components/PreviewSection';
import { processFile } from './utils/imageProcessor';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setResizedBlob(null);
    setError(null);

    try {
      // Small delay to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 100));

      const blob = await processFile(selectedFile);
      setResizedBlob(blob);
    } catch (err) {
      console.error(err);
      setError('Failed to process image. Please try another file.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

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
          {/* Left Column - Upload */}
          <section className="space-y-4">
            <UploadZone onFileSelect={handleFileSelect} />
            {file && (
              <div className="text-xs text-gray-400 font-mono">
                Running: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </section>

          {/* Right Column - Preview */}
          <section>
            <PreviewSection
              processedBlob={resizedBlob}
              isProcessing={isProcessing}
              fileName={file?.name || ''}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
