"use client";

import { ShopRequestsPanel } from "@/components/rewards/shop-requests-panel";

export function StaffRewardRequestsPage({ currencyName }: { currencyName: string }) {
  return (
    <section className="motion-panel mt-2">
      <ShopRequestsPanel className="mt-0" currencyName={currencyName} />
    </section>
  );
}
