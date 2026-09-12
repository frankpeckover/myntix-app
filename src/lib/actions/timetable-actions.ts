"use server";

import { requireAdmin, requireLedgerAdjuster } from "@/lib/actions/action-auth";
import type { ImportTimetableEntriesInput } from "@/domains/timetable/timetable-import-service";
import { TimetableImportService } from "@/domains/timetable/timetable-import-service";
import type {
  CreateTimetableEntryInput,
  UpdateTimetableEntryInput,
} from "@/domains/timetable/timetable-service";
import { TimetableService } from "@/domains/timetable/timetable-service";

const timetableImportService = new TimetableImportService();
const timetableService = new TimetableService();

export async function listTimetableEntries(includeInactive = false) {
  await requireAdmin();
  return timetableService.listEntries(includeInactive);
}

export async function listTimetableTeachers() {
  await requireAdmin();
  return timetableService.listTeachers();
}

export async function createTimetableEntry(input: CreateTimetableEntryInput) {
  const currentUser = await requireAdmin();
  return timetableService.createEntry(input, currentUser);
}

export async function importTimetableEntries(
  input: ImportTimetableEntriesInput,
) {
  const currentUser = await requireAdmin();
  return timetableImportService.importEntries(input, currentUser);
}

export async function updateTimetableEntry(input: UpdateTimetableEntryInput) {
  const currentUser = await requireAdmin();
  return timetableService.updateEntry(input, currentUser);
}

export async function deleteTimetableEntry(entryId: string) {
  const currentUser = await requireAdmin();
  return timetableService.deleteEntry(entryId, currentUser);
}

export async function getCurrentTeacherClass() {
  const currentUser = await requireLedgerAdjuster();
  return timetableService.getCurrentClass(currentUser);
}

export async function listMyTimetableEntries() {
  const currentUser = await requireLedgerAdjuster();
  return timetableService.listTeacherEntries(currentUser);
}
