export interface RentalRequestDraft {
  roomId: string;
  startDate: string;
  endDate: string;
  pigCount: string;
  note: string;
}

const STORAGE_KEY = "farmrent:rental-request-draft";

export function readRentalRequestDraft(): RentalRequestDraft | null {
  let value: string | null;
  try {
    value = sessionStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("Could not access the saved rental request.", error);
    return null;
  }
  if (!value) return null;

  try {
    const draft: unknown = JSON.parse(value);
    if (
      typeof draft === "object" &&
      draft !== null &&
      "roomId" in draft &&
      "startDate" in draft &&
      "endDate" in draft &&
      "pigCount" in draft &&
      "note" in draft &&
      typeof draft.roomId === "string" &&
      typeof draft.startDate === "string" &&
      typeof draft.endDate === "string" &&
      typeof draft.pigCount === "string" &&
      typeof draft.note === "string"
    ) {
      return {
        roomId: draft.roomId,
        startDate: draft.startDate,
        endDate: draft.endDate,
        pigCount: draft.pigCount,
        note: draft.note,
      };
    }
  } catch (error) {
    console.error("Could not read the saved rental request.", error);
  }

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Could not clear the invalid saved rental request.", error);
  }
  return null;
}

export function saveRentalRequestDraft(draft: RentalRequestDraft) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearRentalRequestDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Could not clear the submitted rental request draft.", error);
  }
}
