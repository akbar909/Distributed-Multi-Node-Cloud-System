import { useState } from "react";
import { usePolling } from "../hooks/usePolling";
import { getBatches } from "../api/client";
import BatchList from "../components/history/BatchList";
import BatchDetail from "../components/history/BatchDetail";
import EmptyState from "../components/common/EmptyState";
import Pagination from "../components/common/Pagination";
import { SkeletonCard } from "../components/common/Skeleton";
import type { Batch } from "../types";
import { History, RefreshCw, FolderArchive } from "lucide-react";

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  const { data, loading, refetch, lastUpdated } = usePolling(
    () => getBatches(page, pageSize),
    { interval: 5000 }
  );

  const batches = data?.items || [];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Processing History & Archives
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Browse previous image batches, inspection logs, and downloadable zip archives
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg border border-gray-200 shadow-2xs transition-colors focus-ring"
            title="Refresh history now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="md:col-span-2">
            <SkeletonCard className="h-96" />
          </div>
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 shadow-xs">
          <EmptyState
            icon={FolderArchive}
            title="No past batches found"
            description="Upload images in the Upload & Process tab to create your first processing batch."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Batches column */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Submitted Batches ({data?.total || 0})
            </h3>
            <BatchList
              batches={batches}
              selectedBatchId={selectedBatch?.batch_id || batches[0]?.batch_id || null}
              onSelectBatch={(b) => setSelectedBatch(b)}
            />

            {data && (
              <Pagination
                page={page}
                totalPages={data.total_pages}
                pageSize={pageSize}
                total={data.total}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
              />
            )}
          </div>

          {/* Batch detail column */}
          <div className="lg:col-span-2">
            <BatchDetail
              batchId={selectedBatch?.batch_id || batches[0]?.batch_id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
