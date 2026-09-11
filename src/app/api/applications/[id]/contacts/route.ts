import { HttpError, handle, readJson } from "@/lib/http";
import { getApplication, linkContact, unlinkContact } from "@/lib/db/repo";
import { nullableString, requiredString } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    if (!getApplication(id)) throw new HttpError("Application not found", 404);
    const body = await readJson(request);
    linkContact(id, requiredString(body, "contactId", "Contact"), nullableString(body, "role"));
    return { ok: true };
  });
}

export async function DELETE(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const contactId = new URL(request.url).searchParams.get("contactId");
    if (!contactId) throw new HttpError("contactId is required");
    unlinkContact(id, contactId);
    return null;
  });
}
