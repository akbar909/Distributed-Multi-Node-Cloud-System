import type { ImageOperation, ProcessingConfig } from "../../types";
import { Sliders } from "lucide-react";

interface ProcessingConfigProps {
  selectedOps: ImageOperation[];
  config: ProcessingConfig;
  onChange: (config: ProcessingConfig) => void;
}

export default function ProcessingConfigPanel({
  selectedOps,
  config,
  onChange,
}: ProcessingConfigProps) {
  const hasResize = selectedOps.includes("resize");
  const hasThumb = selectedOps.includes("thumbnail");
  const hasCompress = selectedOps.includes("compress");
  const hasConvert = selectedOps.includes("convert");
  const hasRotate = selectedOps.includes("rotate");
  const hasBlur = selectedOps.includes("blur");

  const hasAnyConfigurable =
    hasResize || hasThumb || hasCompress || hasConvert || hasRotate || hasBlur;

  if (!hasAnyConfigurable) return null;

  const updateConfig = (key: keyof ProcessingConfig, value: unknown) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <Sliders className="w-4 h-4 text-brand-600" />
        <h3 className="text-base font-semibold text-gray-900">
          Operation Settings
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Resize Settings */}
        {hasResize && (
          <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Resize Dimensions
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  min="16"
                  max="4000"
                  value={config.width || 800}
                  onChange={(e) => updateConfig("width", parseInt(e.target.value) || 800)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Height (px)
                </label>
                <input
                  type="number"
                  min="16"
                  max="4000"
                  value={config.height || 600}
                  onChange={(e) => updateConfig("height", parseInt(e.target.value) || 600)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus-ring"
                />
              </div>
            </div>
          </div>
        )}

        {/* Thumbnail Settings */}
        {hasThumb && (
          <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Thumbnail Size
            </h4>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Max Dimension (px): {config.thumbnail_size || 256}px
              </label>
              <input
                type="range"
                min="64"
                max="512"
                step="32"
                value={config.thumbnail_size || 256}
                onChange={(e) =>
                  updateConfig("thumbnail_size", parseInt(e.target.value))
                }
                className="w-full accent-brand-600"
              />
            </div>
          </div>
        )}

        {/* Compression Quality */}
        {hasCompress && (
          <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Compression Factor
            </h4>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Quality: {config.quality || 80}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={config.quality || 80}
                onChange={(e) =>
                  updateConfig("quality", parseInt(e.target.value))
                }
                className="w-full accent-brand-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Smaller File</span>
                <span>Higher Quality</span>
              </div>
            </div>
          </div>
        )}

        {/* Target Format */}
        {hasConvert && (
          <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Target Image Format
            </h4>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Format
              </label>
              <select
                value={config.format || "webp"}
                onChange={(e) => updateConfig("format", e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus-ring"
              >
                <option value="webp">WebP (Modern, efficient)</option>
                <option value="jpeg">JPEG (Universal photo)</option>
                <option value="png">PNG (Lossless transparency)</option>
              </select>
            </div>
          </div>
        )}

        {/* Rotate Angle */}
        {hasRotate && (
          <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Rotation Degrees
            </h4>
            <div className="flex gap-2">
              {[90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => updateConfig("rotate_angle", deg)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    (config.rotate_angle || 90) === deg
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Blur Radius */}
        {hasBlur && (
          <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Gaussian Blur Radius
            </h4>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Radius: {config.blur_radius || 2.0} px
              </label>
              <input
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                value={config.blur_radius || 2.0}
                onChange={(e) =>
                  updateConfig("blur_radius", parseFloat(e.target.value))
                }
                className="w-full accent-brand-600"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
