import type { Role } from "@/lib/auth/session";
import type {
  CreateUserInput,
  UserListItem,
} from "@/domains/users/user-service";

export type UserModalMode = "create" | "edit";

export type UserFormState = CreateUserInput & {
  id: string;
  isActive: boolean;
};

export type UserFormFieldChange = <Field extends keyof UserFormState>(
  field: Field,
  value: UserFormState[Field],
) => void;

export type UserModalProps = {
  initialForm?: Partial<UserFormState>;
  mode: UserModalMode;
  onClose: () => void;
  onSaved: () => void;
  user?: UserListItem;
};

export const emptyUserForm: UserFormState = {
  id: "",
  username: "",
  firstName: "",
  preferredName: "",
  lastName: "",
  email: "",
  profileImageUrl: "",
  cardNumber: "",
  role: "student" satisfies Role,
  password: "",
  isActive: true,
};
