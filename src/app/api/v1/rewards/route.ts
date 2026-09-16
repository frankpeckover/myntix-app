import { ApiPurchaseService } from "@/domains/integrations/api-purchase-service";
import { apiSuccessResult, handleApiRead } from "@/lib/api/api-route-helpers";

const service = new ApiPurchaseService();
export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRead(request, "rewards:read", async () =>
    apiSuccessResult(await service.listRewards()),
  );
}
