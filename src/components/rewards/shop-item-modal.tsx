"use client";

import { useState, type FormEvent } from "react";
import { saveShopItem, uploadShopItemImage } from "@/lib/actions";
import { PackageIcon, PlusIcon } from "@/components/ui/icons";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import type { SaveShopItemInput, ShopItem } from "@/domains/rewards/shop-service";

type ShopItemModalProps = {
  initialForm?: Partial<ShopItemFormState>;
  item: ShopItem | null;
  onClose: () => void;
  onSaved: () => void;
};

type ShopItemFormState = Omit<SaveShopItemInput, "price" | "quantity"> & {
  price: string;
  quantity: string;
};

const emptyShopItemForm: ShopItemFormState = {
  name: "",
  description: "",
  imageUrl: "",
  price: "",
  quantity: "",
  isQuantityUnlimited: false,
};

const imageHelpText = "PNG, JPG, WebP, or GIF. Max 2 MB.";

const modalCopy = {
  close: "Close",
  cancel: "Cancel",
  description: "Set the reward details students will see.",
  editTitle: "Edit Reward",
  errorClassName:
    "rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong",
  newTitle: "New Reward",
  save: "Save Reward",
  saving: "Saving...",
} as const;

const fieldClassNames = {
  input:
    "mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2",
  label: "text-sm font-semibold text-text-control",
  textarea:
    "mt-2 min-h-24 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2",
} as const;

export function ShopItemModal({
  initialForm,
  item,
  onClose,
  onSaved,
}: ShopItemModalProps) {
  const [form, setForm] = useState<ShopItemFormState>(() =>
    getInitialFormState(item, initialForm),
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateFormField<Field extends keyof ShopItemFormState>(
    field: Field,
    value: ShopItemFormState[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    let imageUrl = form.imageUrl;

    if (imageFile) {
      const imageFormData = new FormData();
      imageFormData.append("image", imageFile);

      const uploadResult = await uploadShopItemImage(imageFormData);

      if (!uploadResult.ok) {
        setError(uploadResult.message);
        setIsSaving(false);
        return;
      }

      imageUrl = uploadResult.imageUrl;
    }

    const result = await saveShopItem({
      ...form,
      imageUrl,
      price: Number(form.price),
      quantity: Number(form.quantity),
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setError(null);
    setIsSaving(false);
    onSaved();
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="app-modal theme-panel motion-pop w-full max-w-lg p-5 shadow-lg">
        <ModalHeader item={item} onClose={onClose} />

        <form className="app-modal-body space-y-4" onSubmit={handleSubmit}>
          <TextField
            id="itemName"
            label="Name"
            onChange={(value) => updateFormField("name", value)}
            value={form.name}
          />

          <TextAreaField
            id="itemDescription"
            label="Description"
            onChange={(value) => updateFormField("description", value)}
            value={form.description}
          />

          <ImageUploadField
            currentImageUrl={form.imageUrl}
            fileName={imageFile?.name ?? ""}
            itemName={form.name}
            onChange={setImageFile}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="itemPrice"
              label="Price"
              onChange={(value) => updateFormField("price", value)}
              value={form.price}
            />
            <NumberField
              id="itemQuantity"
              disabled={form.isQuantityUnlimited}
              label="Quantity"
              onChange={(value) => updateFormField("quantity", value)}
              value={form.quantity}
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border border-border-subtle bg-surface px-3 py-3 text-sm text-text-control">
            <label className="flex min-w-0 cursor-pointer items-start gap-3">
              <input
                checked={form.isQuantityUnlimited}
                className="mt-0.5 h-4 w-4 accent-brand"
                onChange={(event) =>
                  updateFormField("isQuantityUnlimited", event.target.checked)
                }
                type="checkbox"
              />
              <span>
                <span className="block font-semibold">Unlimited quantity</span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  Requests for this reward will not reserve or reduce stock.
                </span>
              </span>
            </label>
            <InfoTooltip label="Students still spend the reward price. Unlimited quantity only means there is no stock limit to reserve or reduce." />
          </div>

          {error && <p className={modalCopy.errorClassName}>{error}</p>}

          <ModalActions
            isSaving={isSaving}
            onCancel={onClose}
          />
        </form>
      </div>
    </div>
  );
}

function ModalHeader({
  item,
  onClose,
}: Pick<ShopItemModalProps, "item" | "onClose">) {
  return (
    <div className="app-modal-header flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-2xl font-semibold">
          {item ? modalCopy.editTitle : modalCopy.newTitle}
        </h3>
        <p className="mt-1 text-sm text-text-muted">{modalCopy.description}</p>
      </div>
      <ModalCloseButton label={modalCopy.close} onClick={onClose} />
    </div>
  );
}

function TextField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className={fieldClassNames.label} htmlFor={id}>
        {label}
      </label>
      <input
        className={fieldClassNames.input}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className={fieldClassNames.label} htmlFor={id}>
        {label}
      </label>
      <textarea
        className={fieldClassNames.textarea}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

function NumberField({
  disabled = false,
  id,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className={fieldClassNames.label} htmlFor={id}>
        {label}
      </label>
      <input
        className={fieldClassNames.input}
        disabled={disabled}
        id={id}
        min="0"
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={value}
      />
    </div>
  );
}

function ImageUploadField({
  currentImageUrl,
  fileName,
  itemName,
  onChange,
}: {
  currentImageUrl: string;
  fileName: string;
  itemName: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <span className={fieldClassNames.label}>Reward Image</span>
      <div className="theme-subpanel mt-2 flex items-center gap-3 p-3">
        <ItemImagePreview imageUrl={currentImageUrl} itemName={itemName} />
        <div className="min-w-0 flex-1">
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            id="itemImage"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
            type="file"
          />
          <label
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-button-border bg-surface text-text-control transition hover:bg-panel-soft"
            htmlFor="itemImage"
            title="Upload reward image"
          >
            <PlusIcon />
          </label>
          <p className="mt-2 truncate text-sm text-text-muted">
            {fileName || imageHelpText}
          </p>
        </div>
      </div>
    </div>
  );
}

function ItemImagePreview({
  imageUrl,
  itemName,
}: {
  imageUrl: string;
  itemName: string;
}) {
  if (imageUrl) {
    return (
      <div
        aria-label={`${itemName || "Reward item"} image`}
        className="h-20 w-20 shrink-0 rounded-md border border-border-subtle bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url("${imageUrl}")` }}
      />
    );
  }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-muted">
      <PackageIcon className="h-8 w-8" />
    </div>
  );
}

function ModalActions({
  isSaving,
  onCancel,
}: {
  isSaving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
        onClick={onCancel}
        type="button"
      >
        {modalCopy.cancel}
      </button>
      <button
        className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? modalCopy.saving : modalCopy.save}
      </button>
    </div>
  );
}

function getInitialFormState(
  item: ShopItem | null,
  initialForm?: Partial<ShopItemFormState>,
): ShopItemFormState {
  return {
    id: item?.id,
    name: item?.name ?? emptyShopItemForm.name,
    description: item?.description ?? emptyShopItemForm.description,
    imageUrl: item?.imageUrl ?? emptyShopItemForm.imageUrl,
    price: item ? String(item.price) : emptyShopItemForm.price,
    quantity: item ? String(item.quantity) : emptyShopItemForm.quantity,
    isQuantityUnlimited:
      item?.isQuantityUnlimited ?? emptyShopItemForm.isQuantityUnlimited,
    ...initialForm,
  };
}
