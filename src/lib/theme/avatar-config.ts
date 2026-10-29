const presetNames = [
  "mint",
  "sky",
  "coral",
  "sunny",
  "lilac",
  "ocean",
  "peach",
  "forest",
  "rose",
  "stone",
  "aqua",
] as const;

export type AvatarChoice = "initials" | (typeof presetNames)[number];

export const avatarOptions: {
  value: AvatarChoice;
  label: string;
  imageUrl: string;
}[] = [
  { value: "initials", label: "Initials", imageUrl: "" },
  ...presetNames.map((name) => ({
    value: name,
    label: name[0].toUpperCase() + name.slice(1),
    imageUrl: `/avatars/${name}.svg`,
  })),
];

export const presetAvatarUrls = avatarOptions
  .map((option) => option.imageUrl)
  .filter(Boolean);

export function getPresetAvatarUrl(choice: unknown) {
  return (
    avatarOptions.find((option) => option.value === choice)?.imageUrl ?? ""
  );
}

export function hasSchoolProfilePhoto(imageUrl: string | null | undefined) {
  return Boolean(
    imageUrl?.trim() && !presetAvatarUrls.includes(imageUrl.trim()),
  );
}

export function getAccountAvatarUrl(
  imageUrl: string | null | undefined,
  choice: AvatarChoice,
) {
  return hasSchoolProfilePhoto(imageUrl)
    ? imageUrl!.trim()
    : getPresetAvatarUrl(choice);
}
