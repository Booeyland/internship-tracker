import { HttpError, handle, readJson } from "@/lib/http";
import { deleteTask, updateTask } from "@/lib/db/repo";
import { parseTaskPatch } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const updated = updateTask(id, parseTaskPatch(await readJson(request)));
    if (!updated) throw new HttpError("Task not found", 404);
    return updated;
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    deleteTask(id);
    return null;
  });
}
