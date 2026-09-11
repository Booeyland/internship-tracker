import { handle, readJson } from "@/lib/http";
import { createCompany, listCompanies } from "@/lib/db/repo";
import { parseCompanyInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(() => listCompanies());
}

export async function POST(request: Request) {
  return handle(async () => createCompany(parseCompanyInput(await readJson(request))));
}
