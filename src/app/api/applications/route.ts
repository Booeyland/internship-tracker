import { handle, readJson } from "@/lib/http";
import { createApplication, listApplications } from "@/lib/db/repo";
import { parseApplicationInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(() => listApplications());
}

export async function POST(request: Request) {
  return handle(async () => createApplication(parseApplicationInput(await readJson(request))));
}
