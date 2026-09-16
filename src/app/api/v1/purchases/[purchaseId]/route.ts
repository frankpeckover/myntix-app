import { ApiPurchaseService } from "@/domains/integrations/api-purchase-service";
import { apiSuccessResult, handleApiRead } from "@/lib/api/api-route-helpers";

type Context = { params: Promise<{ purchaseId: string }> };
const service = new ApiPurchaseService();
export const runtime = "nodejs";

export async function GET(request: Request, context: Context) {
  const { purchaseId } = await context.params;
  return handleApiRead(request, "purchases:read", async (client) =>
    apiSuccessResult(await service.getPurchase(client, purchaseId)),
  );
}
