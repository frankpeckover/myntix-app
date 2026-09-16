import { ApiPurchaseService } from "@/domains/integrations/api-purchase-service";
import { apiSuccessResult, handleApiWrite } from "@/lib/api/api-route-helpers";

type Context = { params: Promise<{ purchaseId: string }> };
const service = new ApiPurchaseService();
export const runtime = "nodejs";

export async function POST(request: Request, context: Context) {
  const { purchaseId } = await context.params;
  return handleApiWrite(request, "purchases:write", async (client, body) =>
    apiSuccessResult(await service.denyPurchase(client, purchaseId, body)),
  );
}
