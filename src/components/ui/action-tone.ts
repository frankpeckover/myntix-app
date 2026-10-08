export type ActionTone = "default" | "danger" | "primary" | "success";

const destructiveActionPattern = /\b(archive|delete|remove|revoke|void)\b/i;

export function resolveActionTone(
  label: string,
  tone: ActionTone = "default",
): ActionTone {
  return destructiveActionPattern.test(label) ? "danger" : tone;
}
