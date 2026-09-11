import { HttpError, handle } from "@/lib/http";
import { duplicateApplication } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const copy = duplicateApplication(id);
    if (!copy) throw new HttpError("Application not found", 404);
    return copy;
  });
}
