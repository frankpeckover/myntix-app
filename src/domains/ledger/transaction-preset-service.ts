import type { PoolClient } from "pg";
import type { ActionResult } from "@/lib/actions/action-results";
import { db } from "@/lib/database/db";
import type { SessionUser } from "@/lib/auth/session";
import {
  defaultTransactionPresets,
  getDefaultQuickAdjustments,
  maxQuickAmounts,
  maxQuickReasons,
  type PersonalTransactionPresets,
  type TransactionPresets,
} from "@/lib/ledger/transaction-presets";
import { AuditService } from "@/domains/audit/audit-service";

export type UpdateTransactionPresetsInput = TransactionPresets;
export type UpdatePersonalTransactionPresetsInput = PersonalTransactionPresets;

type TransactionPresetRow = {
  amount: number | null;
  preset_type: "amount" | "reason";
  reason: string | null;
};

const auditService = new AuditService();

export class TransactionPresetService {
  async getPresets(): Promise<TransactionPresets> {
    try {
      const result = await db.query<TransactionPresetRow>(`
        select preset_type, amount, reason
        from transaction_presets
        where is_active = true
        order by preset_type, sort_order
      `);

      return normalisePresets({
        amounts: result.rows
          .filter((row) => row.preset_type === "amount" && row.amount)
          .map((row) => Number(row.amount)),
        reasons: result.rows
          .filter((row) => row.preset_type === "reason" && row.reason)
          .map((row) => String(row.reason)),
      });
    } catch (error) {
      if (isMissingTableError(error)) {
        return defaultTransactionPresets;
      }

      throw error;
    }
  }

  async updatePresets(
    currentUser: SessionUser,
    input: UpdateTransactionPresetsInput,
  ): Promise<ActionResult> {
    const presets = normalisePresets(input);
    const validation = validatePresets(presets);

    if (!validation.ok) {
      return validation;
    }

    const client = await db.connect();

    try {
      await client.query("begin");
      await replacePresets(client, presets);
      await auditService.logWithClient(client, {
        action: "transaction_presets.updated",
        actorUserId: currentUser.id,
        details: {
          amountCount: presets.amounts.length,
          reasonCount: presets.reasons.length,
        },
        entityId: null,
        entityType: "transaction_presets",
      });
      await client.query("commit");

      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Update transaction presets failed", error);

      return {
        ok: false,
        message: isMissingTableError(error)
          ? "Transaction preset table is missing. Run the latest school database setup script."
          : "Could not save quick amounts and reasons.",
      };
    } finally {
      client.release();
    }
  }

  async getPersonalPresets(
    currentUser: SessionUser,
  ): Promise<PersonalTransactionPresets> {
    try {
      const result = await db.query<PersonalPresetRow>(
        `
          select amounts,
                 reasons,
                 quick_add_amount,
                 quick_add_reason,
                 quick_remove_amount,
                 quick_remove_reason
          from user_transaction_preset_preferences
          where user_id = $1
        `,
        [currentUser.id],
      );

      if (result.rowCount === 0) {
        return getPersonalPresetDefaults(await this.getPresets());
      }

      const presets = normalisePresets({
        amounts: result.rows[0]?.amounts ?? [],
        reasons: result.rows[0]?.reasons ?? [],
      });
      const defaults = getDefaultQuickAdjustments(presets);
      const row = result.rows[0];

      return {
        ...presets,
        quickAdd: normaliseQuickAdjustment(
          row?.quick_add_amount,
          row?.quick_add_reason,
          defaults.quickAdd,
        ),
        quickRemove: normaliseQuickAdjustment(
          row?.quick_remove_amount,
          row?.quick_remove_reason,
          defaults.quickRemove,
        ),
      };
    } catch (error) {
      if (isMissingTableError(error) || isMissingColumnError(error)) {
        return getPersonalPresetDefaults(await this.getPresets());
      }

      throw error;
    }
  }

  async updatePersonalPresets(
    currentUser: SessionUser,
    input: UpdatePersonalTransactionPresetsInput,
  ): Promise<ActionResult> {
    const presets = normalisePresets(input);
    const personalPresets: PersonalTransactionPresets = {
      ...presets,
      quickAdd: {
        amount: Number(input.quickAdd.amount),
        reason: input.quickAdd.reason.trim(),
      },
      quickRemove: {
        amount: Number(input.quickRemove.amount),
        reason: input.quickRemove.reason.trim(),
      },
    };
    const validation = validatePersonalPresets(personalPresets);

    if (!validation.ok) {
      return validation;
    }

    try {
      await db.query(
        `
          insert into user_transaction_preset_preferences (
            user_id,
            amounts,
            reasons,
            quick_add_amount,
            quick_add_reason,
            quick_remove_amount,
            quick_remove_reason
          )
          values ($1, $2::integer[], $3::text[], $4, $5, $6, $7)
          on conflict (user_id) do update
          set amounts = excluded.amounts,
              reasons = excluded.reasons,
              quick_add_amount = excluded.quick_add_amount,
              quick_add_reason = excluded.quick_add_reason,
              quick_remove_amount = excluded.quick_remove_amount,
              quick_remove_reason = excluded.quick_remove_reason,
              updated_at = now()
        `,
        [
          currentUser.id,
          personalPresets.amounts,
          personalPresets.reasons,
          personalPresets.quickAdd.amount,
          personalPresets.quickAdd.reason,
          personalPresets.quickRemove.amount,
          personalPresets.quickRemove.reason,
        ],
      );

      await auditService.log({
        action: "user_transaction_presets.updated",
        actorUserId: currentUser.id,
        details: {
          amountCount: presets.amounts.length,
          quickAddAmount: personalPresets.quickAdd.amount,
          quickRemoveAmount: personalPresets.quickRemove.amount,
          reasonCount: presets.reasons.length,
        },
        entityId: currentUser.id,
        entityType: "user_transaction_preset_preferences",
      });

      return { ok: true };
    } catch (error) {
      console.error("Update personal transaction presets failed", error);

      return {
        ok: false,
        message: isMissingTableError(error) || isMissingColumnError(error)
          ? "Personal quick action settings are unavailable. Run the latest school database setup script."
          : "Could not save your quick actions.",
      };
    }
  }
}

type PersonalPresetRow = {
  amounts: number[];
  quick_add_amount: number | null;
  quick_add_reason: string | null;
  quick_remove_amount: number | null;
  quick_remove_reason: string | null;
  reasons: string[];
};

function getPersonalPresetDefaults(
  presets: TransactionPresets,
): PersonalTransactionPresets {
  return {
    ...presets,
    ...getDefaultQuickAdjustments(presets),
  };
}

function normaliseQuickAdjustment(
  amount: number | null | undefined,
  reason: string | null | undefined,
  fallback: PersonalTransactionPresets["quickAdd"],
) {
  const normalisedAmount = Number(amount);
  const normalisedReason = reason?.trim() ?? "";

  return {
    amount:
      Number.isInteger(normalisedAmount) && normalisedAmount > 0
        ? normalisedAmount
        : fallback.amount,
    reason: normalisedReason || fallback.reason,
  };
}

async function replacePresets(
  client: PoolClient,
  presets: TransactionPresets,
) {
  await client.query("delete from transaction_presets");

  for (const [index, amount] of presets.amounts.entries()) {
    await client.query(
      `
        insert into transaction_presets (
          preset_type,
          amount,
          reason,
          sort_order
        )
        values ('amount', $1, null, $2)
      `,
      [amount, index + 1],
    );
  }

  for (const [index, reason] of presets.reasons.entries()) {
    await client.query(
      `
        insert into transaction_presets (
          preset_type,
          amount,
          reason,
          sort_order
        )
        values ('reason', null, $1, $2)
      `,
      [reason, index + 1],
    );
  }
}

function normalisePresets(input: TransactionPresets): TransactionPresets {
  return {
    amounts: [...new Set(input.amounts)]
      .map((amount) => Number(amount))
      .filter((amount) => Number.isInteger(amount) && amount > 0)
      .slice(0, maxQuickAmounts),
    reasons: [...new Set(input.reasons.map((reason) => reason.trim()))]
      .filter(Boolean)
      .slice(0, maxQuickReasons),
  };
}

function validatePresets(presets: TransactionPresets): ActionResult {
  if (presets.amounts.length === 0) {
    return {
      ok: false,
      message: "Enter at least one quick amount.",
    };
  }

  if (presets.reasons.length === 0) {
    return {
      ok: false,
      message: "Enter at least one quick reason.",
    };
  }

  if (presets.amounts.length > maxQuickAmounts) {
    return {
      ok: false,
      message: `Use ${maxQuickAmounts} quick amounts or fewer.`,
    };
  }

  if (presets.reasons.length > maxQuickReasons) {
    return {
      ok: false,
      message: `Use ${maxQuickReasons} quick reasons or fewer.`,
    };
  }

  return { ok: true };
}

function validatePresetLimits(presets: TransactionPresets): ActionResult {
  if (presets.amounts.length > maxQuickAmounts) {
    return {
      ok: false,
      message: `Use ${maxQuickAmounts} quick amounts or fewer.`,
    };
  }

  if (presets.reasons.length > maxQuickReasons) {
    return {
      ok: false,
      message: `Use ${maxQuickReasons} quick reasons or fewer.`,
    };
  }

  return { ok: true };
}

function validatePersonalPresets(
  presets: PersonalTransactionPresets,
): ActionResult {
  const presetLimitValidation = validatePresetLimits(presets);

  if (!presetLimitValidation.ok) {
    return presetLimitValidation;
  }

  if (
    !Number.isInteger(presets.quickAdd.amount) ||
    presets.quickAdd.amount <= 0 ||
    !presets.quickAdd.reason
  ) {
    return { ok: false, message: "Enter a valid quick-add amount and reason." };
  }

  if (
    !Number.isInteger(presets.quickRemove.amount) ||
    presets.quickRemove.amount <= 0 ||
    !presets.quickRemove.reason
  ) {
    return {
      ok: false,
      message: "Enter a valid quick-remove amount and reason.",
    };
  }

  return { ok: true };
}

function isMissingTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42P01"
  );
}

function isMissingColumnError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42703"
  );
}
