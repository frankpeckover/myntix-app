"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  createUser,
  listUserGroups,
  updateUser,
  uploadUserProfileImage,
} from "@/lib/actions";
import { StudentGroupsSection } from "@/components/admin-users/student-groups-section";
import { UserFormFields } from "@/components/admin-users/user-form-fields";
import { UserModalActions } from "@/components/admin-users/user-modal-actions";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import {
  emptyUserForm,
  type UserFormState,
  type UserModalProps,
} from "@/components/admin-users/user-modal-types";
import type {
  UpdateUserInput,
  UserListItem,
} from "@/domains/users/user-service";
import type { UserGroupItem } from "@/domains/groups/group-service";

export function UserModal({
  initialForm,
  mode,
  onClose,
  onSaved,
  user,
}: UserModalProps) {
  const [form, setForm] = useState<UserFormState>(() =>
    getInitialFormState(mode, user, initialForm),
  );
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [userGroups, setUserGroups] = useState<UserGroupItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoadingUserGroups, setIsLoadingUserGroups] = useState(
    mode === "edit" && user?.role === "student",
  );
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useDialogFocus({ onEscape: onClose });

  useEffect(() => {
    let isActive = true;

    if (mode !== "edit" || !user || form.role !== "student") {
      Promise.resolve().then(() => {
        if (isActive) {
          setUserGroups([]);
          setIsLoadingUserGroups(false);
        }
      });
      return () => {
        isActive = false;
      };
    }

    Promise.resolve().then(async () => {
      setIsLoadingUserGroups(true);

      try {
        const groups = await listUserGroups(user.id);

        if (isActive) {
          setUserGroups(groups);
          setError(null);
        }
      } catch {
        if (isActive) {
          setUserGroups([]);
          setError("Could not load student groups.");
        }
      } finally {
        if (isActive) {
          setIsLoadingUserGroups(false);
        }
      }
    });

    return () => {
      isActive = false;
    };
  }, [form.role, mode, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    let profileImageUrl = form.profileImageUrl;

    if (profileImageFile) {
      const imageFormData = new FormData();
      imageFormData.append("image", profileImageFile);

      const uploadResult = await uploadUserProfileImage(imageFormData);

      if (uploadResult.ok === false) {
        setError(uploadResult.message);
        setIsSaving(false);
        return;
      }

      profileImageUrl = uploadResult.imageUrl;
    }

    const formWithImage = {
      ...form,
      profileImageUrl,
    };

    const result =
      mode === "create"
        ? await createUser(formWithImage)
        : await updateUser(getUpdateUserInput(formWithImage));

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onSaved();
  }

  function updateFormField<Field extends keyof UserFormState>(
    field: Field,
    value: UserFormState[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-3 py-2 sm:px-4 sm:py-6">
      <div
        aria-label={mode === "create" ? "New user" : "Edit user"}
        aria-modal="true"
        className="app-modal theme-panel motion-pop max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto p-4 shadow-lg sm:max-h-[90vh] sm:p-5"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="app-modal-header flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold sm:text-2xl">
              {mode === "create" ? "New User" : "Edit User"}
            </h3>
            <p className="mt-1 hidden text-sm text-text-muted sm:block">
              {mode === "create"
                ? "Create a user for this school."
                : "Update user details and access."}
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <form className="app-modal-body space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
          <UserFormFields
            imageFileName={profileImageFile?.name ?? ""}
            form={form}
            mode={mode}
            onChange={updateFormField}
            onProfileImageChange={setProfileImageFile}
          />
          {mode === "edit" && form.role === "student" && (
            <StudentGroupsSection
              groups={userGroups}
              isLoading={isLoadingUserGroups}
            />
          )}

          {error && (
            <p
              className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong"
              role="alert"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success"
              role="status"
            >
              {message}
            </p>
          )}

          <UserModalActions
            isSaving={isSaving}
            mode={mode}
            onCancel={onClose}
          />
        </form>
      </div>
    </div>
  );
}

function getInitialFormState(
  mode: UserModalProps["mode"],
  user?: UserListItem,
  initialForm?: Partial<UserFormState>,
): UserFormState {
  if (mode === "edit" && user) {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      preferredName: user.preferredName,
      lastName: user.lastName,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      cardNumber: user.cardNumber,
      role: user.role,
      password: "",
      isActive: user.isActive,
    };
  }

  return {
    ...emptyUserForm,
    ...initialForm,
  };
}

function getUpdateUserInput(form: UserFormState): UpdateUserInput {
  return {
    id: form.id,
    username: form.username,
    firstName: form.firstName,
    preferredName: form.preferredName,
    lastName: form.lastName,
    email: form.email,
    profileImageUrl: form.profileImageUrl,
    cardNumber: form.cardNumber,
    role: form.role,
    isActive: form.isActive,
  };
}
