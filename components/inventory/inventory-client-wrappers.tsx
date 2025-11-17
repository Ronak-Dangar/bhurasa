"use client";

import { useState } from "react";
import { EditItemModal } from "./edit-item-modal";
import { StockMovementModal } from "./stock-movement-modal";

interface InventoryClientWrappersProps {
  children: React.ReactNode;
}

export function InventoryClientWrappers({ children }: InventoryClientWrappersProps) {
  const [stockMovementOpen, setStockMovementOpen] = useState(false);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Inventory Health
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Track stock across raw material, production flow, and finished goods.
            </p>
          </div>
          <button
            onClick={() => setStockMovementOpen(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500"
          >
            + New Stock Movement
          </button>
        </div>

        {children}
      </div>

      {stockMovementOpen && (
        <StockMovementModal onClose={() => setStockMovementOpen(false)} />
      )}
    </>
  );
}

interface InventoryTableActionsProps {
  item: any;
}

export function InventoryTableActions({ item }: InventoryTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setEditOpen(true)}
        className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
      >
        Edit
      </button>

      {editOpen && (
        <EditItemModal item={item} onClose={() => setEditOpen(false)} />
      )}
    </>
  );
}
