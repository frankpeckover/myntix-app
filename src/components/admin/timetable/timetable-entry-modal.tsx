import { weekDays } from "@/components/admin/timetable/timetable-constants";
import {
  SelectField,
  TimeField,
} from "@/components/admin/timetable/timetable-fields";
import { ModalShell } from "@/components/ui/modal-shell";
import { XIcon } from "@/components/ui/icons";
import type { GroupListItem } from "@/domains/groups/group-service";
import type {
  CreateTimetableEntryInput,
  TimetableTeacher,
} from "@/domains/timetable/timetable-service";

export function TimetableEntryModal({
  form,
  groups,
  isSaving,
  mode,
  onCancel,
  onChange,
  onSubmit,
  teachers,
}: {
  form: CreateTimetableEntryInput;
  groups: GroupListItem[];
  isSaving: boolean;
  mode: "create" | "edit";
  onCancel: () => void;
  onChange: (form: CreateTimetableEntryInput) => void;
  onSubmit: () => void;
  teachers: TimetableTeacher[];
}) {
  return (
    <ModalShell
      actions={
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-button-border text-text-control transition hover:bg-surface-hover"
          onClick={onCancel}
          type="button"
        >
          <XIcon />
        </button>
      }
      title={mode === "edit" ? "Edit Timetable Entry" : "New Timetable Entry"}
    >
      <TimetableEntryForm
        form={form}
        groups={groups}
        isSaving={isSaving}
        mode={mode}
        onCancel={onCancel}
        onChange={onChange}
        onSubmit={onSubmit}
        teachers={teachers}
      />
    </ModalShell>
  );
}

function TimetableEntryForm({
  form,
  groups,
  isSaving,
  mode,
  onCancel,
  onChange,
  onSubmit,
  teachers,
}: {
  form: CreateTimetableEntryInput;
  groups: GroupListItem[];
  isSaving: boolean;
  mode: "create" | "edit";
  onCancel: () => void;
  onChange: (form: CreateTimetableEntryInput) => void;
  onSubmit: () => void;
  teachers: TimetableTeacher[];
}) {
  return (
    <form
      className="theme-subpanel mt-4 grid gap-3 p-3 lg:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <SelectField
        label="Teacher"
        onChange={(value) => onChange({ ...form, teacherUserId: value })}
        value={form.teacherUserId}
      >
        <option value="">Select teacher</option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.displayName} ({teacher.username})
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Group"
        onChange={(value) => onChange({ ...form, groupId: value })}
        value={form.groupId}
      >
        <option value="">Select group</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Day"
        onChange={(value) =>
          onChange({ ...form, dayOfWeek: Number(value) })
        }
        value={String(form.dayOfWeek)}
      >
        {weekDays.map((day, index) => (
          <option key={day} value={index}>
            {day}
          </option>
        ))}
      </SelectField>

      <div className="grid grid-cols-2 gap-3">
        <TimeField
          label="Start"
          onChange={(value) => onChange({ ...form, startTime: value })}
          value={form.startTime}
        />
        <TimeField
          label="End"
          onChange={(value) => onChange({ ...form, endTime: value })}
          value={form.endTime}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 lg:col-span-2 sm:flex-row sm:justify-end">
        <button
          className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : mode === "edit" ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
}
