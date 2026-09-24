export type DirectorySyncStatus = "failed" | "running" | "succeeded";

export type TassSyncSettings = {
  academicYear: number;
  apiVersion: 2 | 3;
  applicationCode: string;
  archiveMissingRecords: boolean;
  baseUrl: string;
  companyCode: string;
  displayName: string;
  hasTokenKey: boolean;
  isEnabled: boolean;
  lastError: string;
  lastSyncCompletedAt: string | null;
  lastSyncStartedAt: string | null;
  lastSyncStatus: DirectorySyncStatus | null;
  lastSyncSummary: DirectorySyncSummary | null;
  providerType: "tass";
  semester: number;
};

export type UpdateTassSyncSettingsInput = {
  academicYear: number;
  apiVersion: 2 | 3;
  applicationCode: string;
  archiveMissingRecords: boolean;
  baseUrl: string;
  companyCode: string;
  displayName: string;
  isEnabled: boolean;
  semester: number;
  tokenKey: string;
};

export type DirectorySyncSummary = {
  groupsArchived: number;
  groupsCreated: number;
  groupsUpdated: number;
  membershipsAdded: number;
  membershipsRemoved: number;
  timetableArchived: number;
  timetableCreated: number;
  timetableUpdated: number;
  usersArchived: number;
  usersCreated: number;
  usersUpdated: number;
};

export type DirectorySyncResult =
  | { ok: true; summary: DirectorySyncSummary }
  | { ok: false; message: string };

export type TassConnectionTestResult =
  | { ok: true; studentCount: number; teacherCount: number }
  | { ok: false; message: string };

export type NormalisedDirectoryUser = {
  email: string;
  externalId: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  role: "student" | "teacher";
  sourceUsername: string;
};

export type NormalisedDirectoryGroup = {
  description: string;
  externalId: string;
  name: string;
  studentExternalIds: string[];
};

export type NormalisedTimetableEntry = {
  dayOfWeek: number;
  endTime: string;
  externalId: string;
  groupExternalId: string;
  startTime: string;
  teacherExternalId: string;
};

export type DirectorySyncSnapshot = {
  groups: NormalisedDirectoryGroup[];
  timetableEntries: NormalisedTimetableEntry[];
  users: NormalisedDirectoryUser[];
};
