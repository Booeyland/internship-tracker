import { HttpError, handle, readJson } from "@/lib/http";
import { dismissSuggestion, getApplication } from "@/lib/db/repo";
import { requiredString } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    const applicationId = requiredString(body, "applicationId", "Application");
    if (!getApplication(applicationId)) throw new HttpError("Application not found", 404);
    return dismissSuggestion(applicationId, requiredString(body, "reason", "Reason"));
  });
}
