import { handle, readJson } from "@/lib/http";
import { createTimelineEvent } from "@/lib/db/repo";
import { parseTimelineInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => createTimelineEvent(parseTimelineInput(await readJson(request))));
}
