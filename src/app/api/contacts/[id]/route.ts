import { HttpError, handle, readJson } from "@/lib/http";
import { deleteContact, updateContact } from "@/lib/db/repo";
import { parseContactPatch } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const updated = updateContact(id, parseContactPatch(await readJson(request)));
    if (!updated) throw new HttpError("Contact not found", 404);
    return updated;
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    deleteContact(id);
    return null;
  });
}
