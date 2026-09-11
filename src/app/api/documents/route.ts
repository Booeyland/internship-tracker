import { handle, readJson } from "@/lib/http";
import { createDocument } from "@/lib/db/repo";
import { parseDocumentInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => createDocument(parseDocumentInput(await readJson(request))));
}
