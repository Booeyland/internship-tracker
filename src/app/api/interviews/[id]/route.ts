import { HttpError, handle, readJson } from "@/lib/http";
import { deleteInterview, updateInterview } from "@/lib/db/repo";
import { parseInterviewPatch } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const updated = updateInterview(id, parseInterviewPatch(await readJson(request)));
    if (!updated) throw new HttpError("Interview not found", 404);
    return updated;
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    deleteInterview(id);
    return null;
  });
}
