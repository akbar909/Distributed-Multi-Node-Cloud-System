import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { UploadCloud, Image as ImageIcon, AlertCircle } from "lucide-react";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export default function DropZone({
  onFilesSelected,
  maxFiles = 20,
  maxSizeMB = 20,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndAddFiles = (selectedFiles: FileList | null) => {
    setError(null);
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (selectedFiles.length > maxFiles) {
      setError(`You can upload a maximum of ${maxFiles} images at once.`);
      return;
    }

    const validFiles: File[] = [];
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/bmp",
      "image/tiff",
    ];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|bmp|tiff)$/i)) {
        setError(`"${file.name}" has an unsupported format. Please use JPEG, PNG, WebP, BMP, or TIFF.`);
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${maxSizeMB}MB file size limit.`);
        return;
      }
      validFiles.push(file);
    }

    onFilesSelected(validFiles);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
    // Reset file input so re-selecting same file works
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-brand-500 bg-brand-50/50 scale-[1.005]"
            : "border-gray-200 hover:border-brand-400 bg-white hover:bg-gray-50/50 shadow-sm"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
          onChange={handleFileChange}
          className="hidden"
          id="image-dropzone-input"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform ${
              isDragging ? "bg-brand-500 text-white scale-110" : "bg-brand-50 text-brand-600"
            }`}
          >
            {isDragging ? (
              <UploadCloud className="w-8 h-8 animate-bounce" />
            ) : (
              <ImageIcon className="w-8 h-8" />
            )}
          </div>

          <div>
            <p className="text-base font-semibold text-gray-800">
              Drag and drop your images here, or{" "}
              <span className="text-brand-600 underline decoration-2 underline-offset-2">
                browse files
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports JPEG, PNG, WebP, BMP, and TIFF up to {maxSizeMB}MB each
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-danger-50 border border-danger-200 text-danger-600 rounded-xl text-xs sm:text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
