import type { ImageOperation } from "../../types";
import {
  Maximize2,
  Image as ImageIcon,
  Minimize2,
  RefreshCw,
  RotateCw,
  Palette,
  Eye,
  Info,
} from "lucide-react";

interface OperationSelectorProps {
  selectedOps: ImageOperation[];
  onChange: (ops: ImageOperation[]) => void;
}

interface OperationMeta {
  id: ImageOperation;
  title: string;
  description: string;
  icon: typeof Maximize2;
}

const operationsList: OperationMeta[] = [
  {
    id: "resize",
    title: "Resize",
    description: "Scale to specific width and height dimensions",
    icon: Maximize2,
  },
  {
    id: "thumbnail",
    title: "Thumbnail",
    description: "Create compact previews preserving aspect ratio",
    icon: ImageIcon,
  },
  {
    id: "compress",
    title: "Compress",
    description: "Reduce file size with adjustable quality factor",
    icon: Minimize2,
  },
  {
    id: "convert",
    title: "Convert Format",
    description: "Convert between JPEG, PNG, and WebP",
    icon: RefreshCw,
  },
  {
    id: "rotate",
    title: "Rotate",
    description: "Rotate image by degrees without clipping",
    icon: RotateCw,
  },
  {
    id: "grayscale",
    title: "Grayscale",
    description: "Convert color image to monochrome shades",
    icon: Palette,
  },
  {
    id: "blur",
    title: "Gaussian Blur",
    description: "Smooth details with configurable blur radius",
    icon: Eye,
  },
  {
    id: "metadata",
    title: "Extract Metadata",
    description: "Read dimensions, format, color space, and EXIF",
    icon: Info,
  },
];

export default function OperationSelector({
  selectedOps,
  onChange,
}: OperationSelectorProps) {
  const toggleOp = (op: ImageOperation) => {
    if (selectedOps.includes(op)) {
      onChange(selectedOps.filter((o) => o !== op));
    } else {
      onChange([...selectedOps, op]);
    }
  };

  const selectAll = () => {
    onChange(operationsList.map((o) => o.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Processing Operations
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Select one or more tasks to execute concurrently across distributed workers
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={selectAll}
            className="text-brand-600 hover:text-brand-800 font-medium px-2 py-1 rounded hover:bg-brand-50 transition-colors"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {operationsList.map((op) => {
          const isSelected = selectedOps.includes(op.id);
          const Icon = op.icon;

          return (
            <div
              key={op.id}
              onClick={() => toggleOp(op.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none flex flex-col justify-between ${
                isSelected
                  ? "border-brand-500 bg-brand-50/40 shadow-xs ring-1 ring-brand-500"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}} // Handled by parent div click
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-4 w-4 pointer-events-none mt-1"
                />
              </div>

              <div className="mt-3">
                <h4 className="text-sm font-semibold text-gray-900">{op.title}</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {op.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
