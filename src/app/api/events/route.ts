import { handle, readJson } from "@/lib/http";
import { createRecruitingEvent } from "@/lib/db/repo";
import { parseEventInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => createRecruitingEvent(parseEventInput(await readJson(request))));
}
