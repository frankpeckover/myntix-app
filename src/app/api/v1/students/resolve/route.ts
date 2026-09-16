import { ApiFinanceService } from "@/domains/integrations/api-finance-service";
import { apiSuccessResult, handleApiRead } from "@/lib/api/api-route-helpers";

const service = new ApiFinanceService();
export const runtime = "nodejs";

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");
  return handleApiRead(request, "accounts:read", async () =>
    apiSuccessResult(await service.resolveStudent(email)),
  );
}
