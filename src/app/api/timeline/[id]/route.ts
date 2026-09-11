import { handle } from "@/lib/http";
import { deleteTimelineEvent } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    deleteTimelineEvent(id);
    return null;
  });
}
