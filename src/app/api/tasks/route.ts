import { handle, readJson } from "@/lib/http";
import { createTask } from "@/lib/db/repo";
import { parseTaskInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => createTask(parseTaskInput(await readJson(request))));
}
