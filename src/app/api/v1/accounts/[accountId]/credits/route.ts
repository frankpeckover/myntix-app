import { ApiFinanceService } from "@/domains/integrations/api-finance-service";
import { apiSuccessResult, handleApiWrite } from "@/lib/api/api-route-helpers";

type Context = { params: Promise<{ accountId: string }> };
const service = new ApiFinanceService();
export const runtime = "nodejs";

export async function POST(request: Request, context: Context) {
  const { accountId } = await context.params;
  return handleApiWrite(request, "ledger:credit", async (client, body) =>
    apiSuccessResult(await service.createCredit(client, accountId, body), 201),
  );
}
