import { handle, readJson } from "@/lib/http";
import { createInterview } from "@/lib/db/repo";
import { parseInterviewInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => createInterview(parseInterviewInput(await readJson(request))));
}
