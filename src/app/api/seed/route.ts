import { handle, readJson } from "@/lib/http";
import { clearAll, seedDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    clearAll();
    if (body.mode === "empty") return { seeded: false };
    seedDemoData();
    return { seeded: true };
  });
}
