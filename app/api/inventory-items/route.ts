import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  
  // Support filtering by item_type (e.g., ?type=packaging)
  const searchParams = request.nextUrl.searchParams;
  const itemType = searchParams.get("type");

  let query = supabase
    .from("inventory_items")
    .select("id, item_name, stock_level, unit, avg_cost, item_type")
    .order("item_name", { ascending: true });

  // Filter by item_type if provided
  if (itemType) {
    query = query.eq("item_type", itemType);
  }

  const { data: items, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: items ?? [] });
}
