"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductionWorkflowForm } from "@/components/production/workflow-form";
import { StartBatchDialog } from "@/components/production/start-batch-dialog";
import { Plus } from "lucide-react";

type ProductionBatch = {
  id: string;
  batch_code: string;
  phase: "dehusking" | "pressing" | "completed";
  farmer_name: string | null;
  batch_date: string;
  input_groundnuts_kg: number | null;
  output_peanuts_kg: number | null;
  output_oil_liters: number | null;
  output_oilcake_kg: number | null;
  output_husk_kg: number | null;
  notes: string | null;
};

export default function ProductionPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const supabase = createSupabaseClient();

  const fetchBatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("production_batches")
      .select("*")
      .order("batch_date", { ascending: false });

    if (!error && data) {
      setBatches(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBatches();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("production-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_batches" },
        () => {
          fetchBatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dehuskingBatches = batches.filter((b) => b.phase === "dehusking");
  const pressingBatches = batches.filter((b) => b.phase === "pressing");
  const completedBatches = batches.filter((b) => b.phase === "completed");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Production Workflow
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Kanban-style workflow for phased production tracking.
          </p>
        </div>
        <button
          onClick={() => setShowStartDialog(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500"
        >
          <Plus size={18} />
          Start New Batch
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-500">Loading batches...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Phase 1: De-husking */}
          <Card
            title="Phase 1: De-husking"
            description={`${dehuskingBatches.length} batch${dehuskingBatches.length !== 1 ? "es" : ""}`}
            actions={<Badge variant="info">Active</Badge>}
          >
            <div className="space-y-3">
              {dehuskingBatches.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">No batches in this phase</p>
              ) : (
                dehuskingBatches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    onClick={() => setSelectedBatch(batch)}
                  />
                ))
              )}
            </div>
          </Card>

          {/* Phase 2: Pressing */}
          <Card
            title="Phase 2: Pressing"
            description={`${pressingBatches.length} batch${pressingBatches.length !== 1 ? "es" : ""}`}
            actions={<Badge variant="warning">Active</Badge>}
          >
            <div className="space-y-3">
              {pressingBatches.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">No batches in this phase</p>
              ) : (
                pressingBatches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    onClick={() => setSelectedBatch(batch)}
                  />
                ))
              )}
            </div>
          </Card>

          {/* Completed */}
          <Card
            title="Completed"
            description={`${completedBatches.length} batch${completedBatches.length !== 1 ? "es" : ""}`}
            actions={<Badge variant="success">Done</Badge>}
          >
            <div className="space-y-3">
              {completedBatches.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">No completed batches</p>
              ) : (
                completedBatches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    onClick={() => setSelectedBatch(batch)}
                  />
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Start Batch Dialog */}
      {showStartDialog && (
        <StartBatchDialog
          onClose={() => setShowStartDialog(false)}
          onSuccess={() => {
            setShowStartDialog(false);
            fetchBatches();
          }}
        />
      )}

      {/* Workflow Form Modal */}
      {selectedBatch && (
        <ProductionWorkflowForm
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
          onSuccess={() => {
            setSelectedBatch(null);
            fetchBatches();
          }}
        />
      )}
    </div>
  );
}

function BatchCard({
  batch,
  onClick,
}: {
  batch: ProductionBatch;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            {batch.batch_code.toUpperCase()}
          </p>
          {batch.farmer_name && (
            <p className="mt-1 text-xs text-zinc-500">Farmer: {batch.farmer_name}</p>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            {new Date(batch.batch_date).toLocaleDateString()}
          </p>
        </div>
        <div className="ml-2">
          <Badge variant="neutral" className="text-xs">
            {getPhaseProgress(batch)}
          </Badge>
        </div>
      </div>
    </button>
  );
}

function getPhaseProgress(batch: ProductionBatch): string {
  switch (batch.phase) {
    case "dehusking":
      return batch.output_peanuts_kg ? "Ready" : "Pending";
    case "pressing":
      return batch.output_oil_liters ? "Ready" : "Pending";
    case "completed":
      return "Complete";
    default:
      return "Pending";
  }
}

