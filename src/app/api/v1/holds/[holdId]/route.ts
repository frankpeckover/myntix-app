import { ApiFinanceService } from "@/domains/integrations/api-finance-service";
import { apiSuccessResult, handleApiRead } from "@/lib/api/api-route-helpers";

type Context = { params: Promise<{ holdId: string }> };
const service = new ApiFinanceService();
export const runtime = "nodejs";

export async function GET(request: Request, context: Context) {
  const { holdId } = await context.params;
  return handleApiRead(request, "holds:read", async (client) =>
    apiSuccessResult(await service.getHold(client, holdId)),
  );
}
