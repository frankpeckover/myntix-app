import { ApiPurchaseService } from "@/domains/integrations/api-purchase-service";
import { apiSuccessResult, handleApiWrite } from "@/lib/api/api-route-helpers";

const service = new ApiPurchaseService();
export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleApiWrite(request, "purchases:write", async (client, body) =>
    apiSuccessResult(await service.createPurchase(client, body), 201),
  );
}
