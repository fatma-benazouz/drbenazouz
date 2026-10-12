import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { normalisePriceItem } from "@/lib/priceList";

export const priceListKey = ["price-list"] as const;

/** Every service, active first, in category and display order. */
export function usePriceList() {
  return useQuery({
    queryKey: priceListKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_list_items")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []).map(normalisePriceItem);
    },
    staleTime: 60_000,
    // A missing table (migration not run yet) won't fix itself: report it at once.
    retry: (failureCount, error) =>
      !(error as { code?: string } | null)?.code?.startsWith("PGRST2") && failureCount < 2,
  });
}

export function useRefreshPriceList() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: priceListKey });
}
