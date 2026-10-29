import type { Role } from "@/lib/auth/session";
import { NewPasswordFields } from "@/components/auth/new-password-fields";
import {
  type UserFormFieldChange,
  type UserFormState,
  type UserModalMode,
} from "@/components/admin/users/user-modal-types";
import { userRoles } from "@/components/admin/users/user-management-types";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { UserAvatar } from "@/components/ui/user-avatar";
import { hasSchoolProfilePhoto } from "@/lib/theme/avatar-config";

type UserFormFieldsProps = {
  form: UserFormState;
  imageFileName: string;
  mode: UserModalMode;
  onChange: UserFormFieldChange;
  onProfileImageChange: (file: File | null) => void;
};

const profileImageHelpText = "PNG, JPG, WebP, or GIF. Max 2 MB.";

export function UserFormFields({
  form,
  imageFileName,
  mode,
  onChange,
  onProfileImageChange,
}: UserFormFieldsProps) {
  return (
    <>
      <NameFields form={form} onChange={onChange} />
      <AccountFields
        form={form}
        imageFileName={imageFileName}
        mode={mode}
        onChange={onChange}
        onProfileImageChange={onProfileImageChange}
      />
    </>
  );
}

function NameFields({
  form,
  onChange,
}: {
  form: UserFormState;
  onChange: UserFormFieldChange;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      <TextField
        alignLabel
        id="firstName"
        label="First Name"
        onChange={(value) => onChange("firstName", value)}
        value={form.firstName}
      />
      <TextField
        alignLabel
        id="preferredName"
        label="Preferred Name"
        onChange={(value) => onChange("preferredName", value)}
        optional
        value={form.preferredName}
      />
      <TextField
        alignLabel
        id="lastName"
        label="Last Name"
        onChange={(value) => onChange("lastName", value)}
        value={form.lastName}
      />
    </div>
  );
}

function AccountFields({
  form,
  imageFileName,
  mode,
  onChange,
  onProfileImageChange,
}: {
  form: UserFormState;
  imageFileName: string;
  mode: UserModalMode;
  onChange: UserFormFieldChange;
  onProfileImageChange: (file: File | null) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <TextField
          id="username"
          label="Username"
          onChange={(value) => onChange("username", value)}
          value={form.username}
        />
        <div>
          <label
            className="text-sm font-semibold text-text-control"
            htmlFor="role"
          >
            Role
          </label>
          <select
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none ring-brand transition focus:ring-2 sm:mt-2 sm:py-3"
            id="role"
            onChange={(event) => onChange("role", event.target.value as Role)}
            value={form.role}
          >
            {userRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.role === "student" && (
        <div>
          <label
            className="text-sm font-semibold text-text-control"
            htmlFor="yearLevel"
          >
            Year level{" "}
            <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <select
            id="yearLevel"
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-control outline-none ring-brand focus:ring-2"
            value={form.yearLevel ?? ""}
            onChange={(event) =>
              onChange(
                "yearLevel",
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          >
            <option value="">Not set</option>
            {Array.from({ length: 13 }, (_, year) => (
              <option key={year} value={year}>
                {year === 0 ? "Prep" : `Year ${year}`}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-muted">
            Below Year 7 uses the simpler dashboard. Not set keeps the standard
            dashboard.
          </p>
        </div>
      )}
      <TextField
        id="email"
        label="Email"
        onChange={(value) => onChange("email", value)}
        required
        type="email"
        value={form.email}
      />
      <TextField
        id="cardNumber"
        label="Card Number"
        onChange={(value) => onChange("cardNumber", value)}
        value={form.cardNumber}
      />
      <ProfileImageUploadField
        currentImageUrl={form.profileImageUrl}
        displayName={
          `${form.preferredName || form.firstName} ${form.lastName}`.trim() ||
          form.username
        }
        fileName={imageFileName}
        onChange={onProfileImageChange}
        onRemove={() => { onProfileImageChange(null); onChange("profileImageUrl", ""); }}
      />

      {mode === "create" && (
        <NewPasswordFields
          idPrefix="create-user"
          password={form.password}
          confirmPassword={form.confirmPassword}
          onPasswordChange={(value) => onChange("password", value)}
          onConfirmPasswordChange={(value) =>
            onChange("confirmPassword", value)
          }
        />
      )}
    </>
  );
}

function ProfileImageUploadField({
  currentImageUrl,
  displayName,
  fileName,
  onChange,
  onRemove,
}: {
  currentImageUrl: string;
  displayName: string;
  fileName: string;
  onChange: (file: File | null) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <span className="text-sm font-semibold text-text-control">
        Profile Image <span className="font-normal text-text-muted">(optional)</span>
      </span>
      <div className="theme-subpanel mt-1.5 flex items-center gap-3 p-2.5 sm:mt-2 sm:p-3">
        <UserAvatar
          displayName={displayName || "User"}
          imageUrl={currentImageUrl}
          size="lg"
          tone="neutral"
        />
        <div className="min-w-0 flex-1">
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="peer sr-only"
            id="profileImage"
            key={currentImageUrl || fileName || "empty"}
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
            type="file"
          />
          <label
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border border-button-border bg-surface text-text-control transition hover:bg-panel-soft peer-focus-visible:ring-2 peer-focus-visible:ring-brand"
            htmlFor="profileImage"
            title="Upload profile image"
          >
            <PlusIcon />
          </label>
          {(hasSchoolProfilePhoto(currentImageUrl) || fileName) && <button type="button" onClick={onRemove} aria-label="Remove profile photo" title="Remove profile photo" className="ml-2 inline-flex h-11 w-11 items-center justify-center rounded-md border border-danger-border text-danger-strong transition hover:bg-danger-soft"><TrashIcon /></button>}
          <p className="mt-1 truncate text-xs text-text-muted sm:mt-2 sm:text-sm">
            {fileName || profileImageHelpText}
          </p>
        </div>
      </div>
    </div>
  );
}

function TextField({
  alignLabel = false,
  autoComplete,
  describedBy,
  id,
  label,
  onChange,
  optional = false,
  required = false,
  type = "text",
  value,
}: {
  alignLabel?: boolean;
  autoComplete?: string;
  describedBy?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  optional?: boolean;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <div>
      <label
        className={`block min-h-5 text-sm font-semibold text-text-control ${
          alignLabel ? "sm:h-10" : ""
        }`}
        htmlFor={id}
      >
        <span className="block whitespace-nowrap leading-5">{label}</span>
        {optional && (
          <span className="block text-xs font-normal leading-4 text-text-muted">
            Optional
          </span>
        )}
      </label>
      <input
        aria-describedby={describedBy}
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none ring-brand transition focus:ring-2 sm:mt-2 sm:py-3"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </div>
  );
}
