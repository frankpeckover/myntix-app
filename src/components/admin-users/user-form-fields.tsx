import type { Role } from "@/lib/session";
import {
  type UserFormFieldChange,
  type UserFormState,
  type UserModalMode,
} from "@/components/admin-users/user-modal-types";
import { userRoles } from "@/components/admin-users/user-management-types";
import { PlusIcon } from "@/components/ui/icons";
import { UserAvatar } from "@/components/ui/user-avatar";

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
        id="firstName"
        label="First Name"
        onChange={(value) => onChange("firstName", value)}
        value={form.firstName}
      />
      <TextField
        id="preferredName"
        label="Preferred Name (optional)"
        onChange={(value) => onChange("preferredName", value)}
        value={form.preferredName}
      />
      <TextField
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
          <label className="text-sm font-semibold text-text-control" htmlFor="role">
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

      <TextField
        id="email"
        label="Email (optional)"
        onChange={(value) => onChange("email", value)}
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
        displayName={`${form.preferredName || form.firstName} ${form.lastName}`.trim() || form.username}
        fileName={imageFileName}
        onChange={onProfileImageChange}
      />

      {mode === "create" && (
        <TextField
          autoComplete="new-password"
          id="password"
          label="Password"
          onChange={(value) => onChange("password", value)}
          type="password"
          value={form.password}
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
}: {
  currentImageUrl: string;
  displayName: string;
  fileName: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <span className="text-sm font-semibold text-text-control">
        Profile Image
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
            className="hidden"
            id="profileImage"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
            type="file"
          />
          <label
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-button-border bg-surface text-text-control transition hover:bg-panel-soft sm:h-10 sm:w-10"
            htmlFor="profileImage"
            title="Upload profile image"
          >
            <PlusIcon />
          </label>
          <p className="mt-1 truncate text-xs text-text-muted sm:mt-2 sm:text-sm">
            {fileName || profileImageHelpText}
          </p>
        </div>
      </div>
    </div>
  );
}

function TextField({
  autoComplete,
  id,
  label,
  onChange,
  type = "text",
  value,
}: {
  autoComplete?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none ring-brand transition focus:ring-2 sm:mt-2 sm:py-3"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </div>
  );
}
