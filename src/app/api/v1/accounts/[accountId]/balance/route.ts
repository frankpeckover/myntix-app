import { ApiFinanceService } from "@/domains/integrations/api-finance-service";
import { apiSuccessResult, handleApiRead } from "@/lib/api/api-route-helpers";

type Context = { params: Promise<{ accountId: string }> };
const service = new ApiFinanceService();
export const runtime = "nodejs";

export async function GET(request: Request, context: Context) {
  const { accountId } = await context.params;
  return handleApiRead(request, "accounts:read", async () =>
    apiSuccessResult(await service.getBalance(accountId)),
  );
}
