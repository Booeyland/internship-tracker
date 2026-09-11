import { handle, readJson } from "@/lib/http";
import { createContact } from "@/lib/db/repo";
import { parseContactInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => createContact(parseContactInput(await readJson(request))));
}
