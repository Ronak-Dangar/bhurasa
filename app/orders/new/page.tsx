import { CreateOrderForm } from "@/components/orders/create-order-form";

export default function NewOrderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Sales Entry</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Convert nurtured leads into orders and allocate delivery capacity.
        </p>
      </div>
      <CreateOrderForm />
    </div>
  );
}
