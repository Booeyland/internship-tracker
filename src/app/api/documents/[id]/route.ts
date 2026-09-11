import { HttpError, handle, readJson } from "@/lib/http";
import { deleteDocument, updateDocument } from "@/lib/db/repo";
import { parseDocumentPatch } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const updated = updateDocument(id, parseDocumentPatch(await readJson(request)));
    if (!updated) throw new HttpError("Document not found", 404);
    return updated;
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    deleteDocument(id);
    return null;
  });
}
