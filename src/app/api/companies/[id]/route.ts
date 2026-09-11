import { HttpError, handle, readJson } from "@/lib/http";
import { deleteCompany, updateCompany } from "@/lib/db/repo";
import { parseCompanyPatch } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const updated = updateCompany(id, parseCompanyPatch(await readJson(request)));
    if (!updated) throw new HttpError("Company not found", 404);
    return updated;
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    deleteCompany(id);
    return null;
  });
}
