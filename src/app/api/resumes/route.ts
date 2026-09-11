import { handle, readJson } from "@/lib/http";
import { createResumeVersion } from "@/lib/db/repo";
import { parseResumeInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => createResumeVersion(parseResumeInput(await readJson(request))));
}
