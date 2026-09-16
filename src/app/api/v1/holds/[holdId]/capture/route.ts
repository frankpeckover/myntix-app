import { ApiFinanceService } from "@/domains/integrations/api-finance-service";
import { apiSuccessResult, handleApiWrite } from "@/lib/api/api-route-helpers";

type Context = { params: Promise<{ holdId: string }> };
const service = new ApiFinanceService();
export const runtime = "nodejs";

export async function POST(request: Request, context: Context) {
  const { holdId } = await context.params;
  return handleApiWrite(request, "holds:write", async (client, body) =>
    apiSuccessResult(await service.captureHold(client, holdId, body)),
  );
}
