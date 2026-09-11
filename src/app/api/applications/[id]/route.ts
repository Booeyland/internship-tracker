import { HttpError, handle, readJson } from "@/lib/http";
import { deleteApplication, getApplication, updateApplication } from "@/lib/db/repo";
import { parseApplicationPatch } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const application = getApplication(id);
    if (!application) throw new HttpError("Application not found", 404);
    return application;
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const patch = parseApplicationPatch(await readJson(request));
    const updated = updateApplication(id, patch);
    if (!updated) throw new HttpError("Application not found", 404);
    return updated;
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    if (!getApplication(id)) throw new HttpError("Application not found", 404);
    deleteApplication(id);
    return null;
  });
}
