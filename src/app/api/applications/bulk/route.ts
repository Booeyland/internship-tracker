import { HttpError, handle, readJson } from "@/lib/http";
import { bulkUpdateStatus, deleteApplication } from "@/lib/db/repo";
import { parseIdList } from "@/lib/validate";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    const ids = parseIdList(body);

    if (body.action === "delete") {
      for (const id of ids) deleteApplication(id);
      return { deleted: ids.length };
    }

    const status = body.status;
    if (typeof status !== "string" || !APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
      throw new HttpError("A valid status is required for a bulk update");
    }
    return { updated: bulkUpdateStatus(ids, status as ApplicationStatus).length };
  });
}
