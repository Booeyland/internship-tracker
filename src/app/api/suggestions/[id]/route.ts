import { handle } from "@/lib/http";
import { restoreSuggestion } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    restoreSuggestion(id);
    return null;
  });
}
