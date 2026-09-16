import { ApiFinanceService } from "@/domains/integrations/api-finance-service";
import { apiSuccessResult, handleApiWrite } from "@/lib/api/api-route-helpers";

type Context = { params: Promise<{ entryId: string }> };
const service = new ApiFinanceService();
export const runtime = "nodejs";

export async function POST(request: Request, context: Context) {
  const { entryId } = await context.params;
  return handleApiWrite(request, "ledger:debit", async (client, body) =>
    apiSuccessResult(await service.reverseEntry(client, entryId, body), 201),
  );
}
