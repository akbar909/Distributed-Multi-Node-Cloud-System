import { X } from "lucide-react";

export interface PreviewFile {
  file: File;
  previewUrl: string;
}

interface ImagePreviewProps {
  files: PreviewFile[];
  onRemove: (index: number) => void;
}

export default function ImagePreview({ files, onRemove }: ImagePreviewProps) {
  if (files.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Selected Images ({files.length})
        </h3>
        <span className="text-xs text-gray-400">
          Total: {formatFileSize(files.reduce((acc, f) => acc + f.file.size, 0))}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {files.map((item, idx) => (
          <div
            key={`${item.file.name}-${idx}`}
            className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
          >
            <div className="aspect-square w-full bg-gray-100 flex items-center justify-center overflow-hidden">
              <img
                src={item.previewUrl}
                alt={item.file.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>

            <div className="p-2">
              <p className="text-xs font-medium text-gray-800 truncate" title={item.file.name}>
                {item.file.name}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {formatFileSize(item.file.size)}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(idx);
              }}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-danger-600 text-white flex items-center justify-center transition-colors shadow-xs"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
