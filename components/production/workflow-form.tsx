"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { updateProductionPhase } from "@/app/actions/production";
import { X } from "lucide-react";

const dehuskingSchema = z.object({
  input_groundnuts_kg: z.number().positive(),
  output_peanuts_kg: z.number().min(0),
  notes: z.string().optional(),
});

const pressingSchema = z.object({
  output_oil_liters: z.number().min(0),
  output_oilcake_kg: z.number().min(0),
  output_husk_kg: z.number().min(0),
  notes: z.string().optional(),
});

type DehuskingFormValues = z.infer<typeof dehuskingSchema>;
type PressingFormValues = z.infer<typeof pressingSchema>;

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

interface ProductionWorkflowFormProps {
  batch: ProductionBatch;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductionWorkflowForm({
  batch,
  onClose,
  onSuccess,
}: ProductionWorkflowFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phaseInfo = {
    dehusking: {
      title: "Phase 1: De-husking",
      description: "Convert groundnuts to clean peanuts",
      nextPhase: "pressing" as const,
    },
    pressing: {
      title: "Phase 2: Pressing",
      description: "Extract oil and capture byproducts",
      nextPhase: "completed" as const,
    },
  };

  const currentPhaseInfo = phaseInfo[batch.phase as keyof typeof phaseInfo];

  // Only allow editing for dehusking and pressing phases
  if (batch.phase === "completed") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Batch Completed</h3>
          <p className="mt-2 text-sm text-zinc-500">This batch has been completed and cannot be edited.</p>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Render appropriate form based on current phase
  if (batch.phase === "dehusking") {
    return (
      <DehuskingForm
        batch={batch}
        phaseInfo={currentPhaseInfo}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  } else if (batch.phase === "pressing") {
    return (
      <PressingForm
        batch={batch}
        phaseInfo={currentPhaseInfo}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  return null;
}

function DehuskingForm({
  batch,
  phaseInfo,
  onClose,
  onSuccess,
}: {
  batch: ProductionBatch;
  phaseInfo: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<DehuskingFormValues>({
    resolver: zodResolver(dehuskingSchema),
    defaultValues: {
      input_groundnuts_kg: batch.input_groundnuts_kg || 0,
      output_peanuts_kg: batch.output_peanuts_kg || 0,
      notes: batch.notes || "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    setError(null);

    const result = await updateProductionPhase(
      batch.id,
      {
        phase: "dehusking",
        input_groundnuts_kg: values.input_groundnuts_kg,
        output_peanuts_kg: values.output_peanuts_kg,
        notes: values.notes,
      },
      phaseInfo.nextPhase
    );

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Failed to update batch");
    }
    setLoading(false);
  });

  return (
    <FormModal
      title={phaseInfo.title}
      description={phaseInfo.description}
      batch={batch}
      onClose={onClose}
      error={error}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Input Groundnuts (kg)"
          type="number"
          step="0.1"
          {...form.register("input_groundnuts_kg", { valueAsNumber: true })}
          error={form.formState.errors.input_groundnuts_kg?.message}
        />

        <InputField
          label="Output Peanuts (kg)"
          type="number"
          step="0.1"
          {...form.register("output_peanuts_kg", { valueAsNumber: true })}
          error={form.formState.errors.output_peanuts_kg?.message}
        />

        <div>
          <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Notes
          </label>
          <textarea
            {...form.register("notes")}
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save & Advance to Pressing"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

function PressingForm({
  batch,
  phaseInfo,
  onClose,
  onSuccess,
}: {
  batch: ProductionBatch;
  phaseInfo: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PressingFormValues>({
    resolver: zodResolver(pressingSchema),
    defaultValues: {
      output_oil_liters: batch.output_oil_liters || 0,
      output_oilcake_kg: batch.output_oilcake_kg || 0,
      output_husk_kg: batch.output_husk_kg || 0,
      notes: batch.notes || "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    setError(null);

    const result = await updateProductionPhase(
      batch.id,
      {
        phase: "pressing",
        output_oil_liters: values.output_oil_liters,
        output_oilcake_kg: values.output_oilcake_kg,
        output_husk_kg: values.output_husk_kg,
        output_peanuts_kg: batch.output_peanuts_kg || 0,
        notes: values.notes,
      },
      phaseInfo.nextPhase
    );

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Failed to update batch");
    }
    setLoading(false);
  });

  const estimatedOilYield = batch.output_peanuts_kg
    ? Math.round(batch.output_peanuts_kg * 0.62)
    : 0;

  return (
    <FormModal
      title={phaseInfo.title}
      description={phaseInfo.description}
      batch={batch}
      onClose={onClose}
      error={error}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {estimatedOilYield > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <p className="font-medium text-emerald-800 dark:text-emerald-200">
              Expected Oil Yield
            </p>
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-100">
              {estimatedOilYield} L
            </p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-200/70">
              Based on {batch.output_peanuts_kg} kg peanuts (62% conversion)
            </p>
          </div>
        )}

        <InputField
          label="Oil Collected (L)"
          type="number"
          step="0.1"
          {...form.register("output_oil_liters", { valueAsNumber: true })}
          error={form.formState.errors.output_oil_liters?.message}
        />

        <InputField
          label="Oilcake (kg)"
          type="number"
          step="0.1"
          {...form.register("output_oilcake_kg", { valueAsNumber: true })}
          error={form.formState.errors.output_oilcake_kg?.message}
        />

        <InputField
          label="Husk (kg)"
          type="number"
          step="0.1"
          {...form.register("output_husk_kg", { valueAsNumber: true })}
          error={form.formState.errors.output_husk_kg?.message}
        />

        <div>
          <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Notes
          </label>
          <textarea
            {...form.register("notes")}
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save & Complete Batch"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

function FormModal({
  title,
  description,
  batch,
  onClose,
  error,
  children,
}: {
  title: string;
  description: string;
  batch: ProductionBatch;
  onClose: () => void;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-start justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Badge variant="info">{batch.batch_code.toUpperCase()}</Badge>
              {batch.farmer_name && (
                <span className="text-sm text-zinc-500">
                  Farmer: {batch.farmer_name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const InputField = ({ label, error, ...props }: InputFieldProps) => {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {label}
      </label>
      <input
        {...props}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
      {error && <span className="mt-1 block text-xs text-rose-500">{error}</span>}
    </div>
  );
};