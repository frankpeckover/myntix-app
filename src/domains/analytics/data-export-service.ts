import { db } from "@/lib/database/db";
import type { SessionUser } from "@/lib/auth/session";
import { AuditService } from "@/domains/audit/audit-service";

type CsvCell = boolean | Date | null | number | object | string | undefined;

type CsvFile = {
  contents: string;
  fileName: string;
  rowCount: number;
};

type ExportTable = {
  fileName: string;
  query: string;
};

export type SchoolDataExportResult = {
  dataBase64: string;
  fileName: string;
  mimeType: string;
};

const auditService = new AuditService();
const exportVersion = 1;
const zipMimeType = "application/zip";
const excludedData = [
  "password_reset_tokens",
  "server_error_log",
  "api_clients.key_hash",
  "api_idempotency_keys",
  "sso_identity_providers.client_secret_encrypted",
  "user_sessions",
  "users.password_hash",
];
const exportTables: ExportTable[] = [
  {
    fileName: "school_info.csv",
    query: `
      select *
      from school_info
      order by id
    `,
  },
  {
    fileName: "users.csv",
    query: `
      select
        id,
        role_id,
        username,
        first_name,
        last_name,
        email,
        profile_image_url,
        card_number,
        is_active,
        created_at,
        updated_at
      from users
      order by last_name, first_name, username
    `,
  },
  {
    fileName: "roles.csv",
    query: `
      select *
      from roles
      order by role_key
    `,
  },
  {
    fileName: "permissions.csv",
    query: `
      select *
      from permissions
      order by category, key
    `,
  },
  {
    fileName: "role_permissions.csv",
    query: `
      select *
      from role_permissions
      order by role_id, permission_key
    `,
  },
  {
    fileName: "accounts.csv",
    query: `
      select
        id,
        user_id,
        case
          when account_name = 'Student account' then 'Primary account'
          else account_name
        end as account_name,
        is_active,
        created_at,
        updated_at
      from accounts
      order by created_at, id
    `,
  },
  {
    fileName: "groups.csv",
    query: `
      select *
      from student_groups
      order by name
    `,
  },
  {
    fileName: "group_memberships.csv",
    query: `
      select *
      from student_group_memberships
      order by group_id, user_id
    `,
  },
  {
    fileName: "timetable.csv",
    query: `
      select *
      from timetable_entries
      order by day_of_week, start_time, teacher_user_id, group_id
    `,
  },
  {
    fileName: "reward_items.csv",
    query: `
      select *
      from shop_items
      order by name
    `,
  },
  {
    fileName: "reward_requests.csv",
    query: `
      select *
      from shop_purchases
      order by purchased_at, id
    `,
  },
  {
    fileName: "ledger_entries.csv",
    query: `
      select *
      from ledger_entries
      order by created_at, id
    `,
  },
  {
    fileName: "student_goals.csv",
    query: `
      select *
      from student_goals
      order by created_at, id
    `,
  },
  {
    fileName: "transaction_presets.csv",
    query: `
      select *
      from transaction_presets
      order by preset_type, sort_order
    `,
  },
  {
    fileName: "api_clients.csv",
    query: `
      select id, name, key_prefix, is_active, created_at, updated_at
      from api_clients
      order by name
    `,
  },
  {
    fileName: "api_client_scopes.csv",
    query: `
      select *
      from api_client_scopes
      order by client_id, scope
    `,
  },
  {
    fileName: "sso_identity_providers.csv",
    query: `
      select
        id,
        provider_type,
        display_name,
        tenant_id,
        client_id,
        issuer_url,
        allowed_domain,
        is_enabled,
        is_jit_enabled,
        created_at,
        updated_at
      from sso_identity_providers
      order by provider_type
    `,
  },
  {
    fileName: "sso_user_identities.csv",
    query: `
      select
        user_id,
        provider_type,
        provider_subject,
        created_at,
        last_login_at
      from sso_user_identities
      order by created_at, id
    `,
  },
  {
    fileName: "audit_log.csv",
    query: `
      select *
      from audit_log
      order by created_at, id
    `,
  },
];

export class DataExportService {
  async exportSchoolData(currentUser: SessionUser): Promise<SchoolDataExportResult> {
    await auditService.log({
      action: "data_export.created",
      actorUserId: currentUser.id,
      details: {
        excludedData,
        exportVersion,
      },
      entityId: null,
      entityType: "data_export",
    });

    const exportedAt = new Date();
    const csvFiles = await Promise.all(exportTables.map(exportTable));
    const manifestFile = buildManifestFile(csvFiles, currentUser, exportedAt);
    const zipBuffer = createZipArchive([...csvFiles, manifestFile]);

    return {
      dataBase64: zipBuffer.toString("base64"),
      fileName: `school-data-${formatExportTimestamp(exportedAt)}.zip`,
      mimeType: zipMimeType,
    };
  }
}

async function exportTable(table: ExportTable): Promise<CsvFile> {
  const result = await db.query<Record<string, CsvCell>>(table.query);

  return {
    contents: buildCsv(
      result.rows,
      result.fields.map((field) => field.name),
    ),
    fileName: table.fileName,
    rowCount: result.rows.length,
  };
}

function buildManifestFile(
  files: CsvFile[],
  currentUser: SessionUser,
  exportedAt: Date,
): CsvFile {
  return {
    contents: JSON.stringify(
      {
        excludedData,
        exportedAt: exportedAt.toISOString(),
        exportedBy: {
          id: currentUser.id,
          username: currentUser.username,
        },
        exportVersion,
        files: files.map((file) => ({
          fileName: file.fileName,
          rowCount: file.rowCount,
        })),
      },
      null,
      2,
    ),
    fileName: "manifest.json",
    rowCount: 1,
  };
}

function buildCsv(rows: Record<string, CsvCell>[], headers: string[]) {
  const csvRows = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvCell(row[header])).join(","),
    ),
  ];

  return `${csvRows.join("\n")}\n`;
}

function escapeCsvCell(value: CsvCell) {
  const text = formatCsvCell(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function formatCsvCell(value: CsvCell) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function createZipArchive(files: CsvFile[]) {
  const localFileParts: Buffer[] = [];
  const centralDirectoryParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const fileName = Buffer.from(file.fileName, "utf8");
    const contents = Buffer.from(file.contents, "utf8");
    const crc = calculateCrc32(contents);
    const { dosDate, dosTime } = getDosDateTime(new Date());
    const localHeader = createLocalFileHeader(
      fileName,
      contents,
      crc,
      dosDate,
      dosTime,
    );
    const centralDirectoryHeader = createCentralDirectoryHeader(
      fileName,
      contents,
      crc,
      dosDate,
      dosTime,
      offset,
    );

    localFileParts.push(localHeader, contents);
    centralDirectoryParts.push(centralDirectoryHeader);
    offset += localHeader.length + contents.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralDirectoryParts);
  const endRecord = createEndOfCentralDirectoryRecord(
    files.length,
    centralDirectory.length,
    centralDirectoryOffset,
  );

  return Buffer.concat([...localFileParts, centralDirectory, endRecord]);
}

function createLocalFileHeader(
  fileName: Buffer,
  contents: Buffer,
  crc: number,
  dosDate: number,
  dosTime: number,
) {
  const header = Buffer.alloc(30);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(dosTime, 10);
  header.writeUInt16LE(dosDate, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(contents.length, 18);
  header.writeUInt32LE(contents.length, 22);
  header.writeUInt16LE(fileName.length, 26);
  header.writeUInt16LE(0, 28);

  return Buffer.concat([header, fileName]);
}

function createCentralDirectoryHeader(
  fileName: Buffer,
  contents: Buffer,
  crc: number,
  dosDate: number,
  dosTime: number,
  offset: number,
) {
  const header = Buffer.alloc(46);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(dosTime, 12);
  header.writeUInt16LE(dosDate, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(contents.length, 20);
  header.writeUInt32LE(contents.length, 24);
  header.writeUInt16LE(fileName.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);

  return Buffer.concat([header, fileName]);
}

function createEndOfCentralDirectoryRecord(
  fileCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number,
) {
  const record = Buffer.alloc(22);

  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(fileCount, 8);
  record.writeUInt16LE(fileCount, 10);
  record.writeUInt32LE(centralDirectorySize, 12);
  record.writeUInt32LE(centralDirectoryOffset, 16);
  record.writeUInt16LE(0, 20);

  return record;
}

function getDosDateTime(date: Date) {
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { dosDate, dosTime };
}

function calculateCrc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let crc = index;

  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }

  return crc >>> 0;
});

function formatExportTimestamp(date: Date) {
  const day = padDatePart(date.getDate());
  const month = padDatePart(date.getMonth() + 1);
  const year = padDatePart(date.getFullYear() % 100);
  const hours = padDatePart(date.getHours());
  const minutes = padDatePart(date.getMinutes());

  return `${day}${month}${year}${hours}${minutes}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}
