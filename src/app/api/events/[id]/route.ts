import { HttpError, handle, readJson } from "@/lib/http";
import { deleteRecruitingEvent, updateRecruitingEvent } from "@/lib/db/repo";
import { parseEventPatch } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const updated = updateRecruitingEvent(id, parseEventPatch(await readJson(request)));
    if (!updated) throw new HttpError("Event not found", 404);
    return updated;
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    deleteRecruitingEvent(id);
    return null;
  });
}
