import { handle } from "@/lib/http";
import { loadDataset } from "@/lib/db/repo";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(() => {
    // First run gets realistic sample data so the UI is never an empty shell.
    ensureSeeded();
    return loadDataset();
  });
}
