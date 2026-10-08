"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getMyUserPreferences,
  updateMyUserPreferences,
} from "@/lib/actions/user-preference-actions";
import { applyUserPreferences } from "@/lib/theme/apply-user-preferences";
import {
  defaultUserPreferences,
  normaliseUserPreferences,
  type UserPreferences,
} from "@/lib/theme/user-preferences";
import { showToast } from "@/components/ui/toast-viewport";

type PreferencesContextValue = {
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
};

const UserPreferencesContext = createContext<PreferencesContextValue | null>(null);

export function UserPreferencesProvider({
  children,
  initialPreferences,
  userId,
}: {
  children: ReactNode;
  initialPreferences: UserPreferences | null;
  userId: string;
}) {
  const [preferences, setPreferences] = useState<UserPreferences>(
    () => initialPreferences ?? defaultUserPreferences,
  );
  const pendingPatch = useRef<Partial<UserPreferences>>({});
  const changedKeys = useRef(new Set<keyof UserPreferences>());
  const cacheReady = useRef(initialPreferences !== null);
  const saveTimer = useRef<number | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useLayoutEffect(() => {
    applyUserPreferences(preferences);
    if (cacheReady.current) {
      try {
        window.localStorage.setItem(cacheKey(userId), JSON.stringify(preferences));
      } catch {
        // The database remains the source of truth when browser storage is unavailable.
      }
    }
  }, [preferences, userId]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (initialPreferences) return;

      try {
        const cached = window.localStorage.getItem(cacheKey(userId));
        if (cached && !cancelled) {
          setPreferences(normaliseUserPreferences(JSON.parse(cached)));
        }
      } catch {
        // Ignore invalid or unavailable cache and load from the account.
      }

      try {
        const saved = await getMyUserPreferences();
        if (!cancelled) {
          const databasePreferences = normaliseUserPreferences(saved);
          setPreferences((current) => {
            const merged = { ...databasePreferences };
            for (const key of changedKeys.current) merged[key] = current[key] as never;
            return merged;
          });
          cacheReady.current = true;
        }
      } catch {
        if (!cancelled) {
          cacheReady.current = true;
          showToast({
            text: "Could not load account preferences. Your saved browser copy is being used.",
            tone: "warning",
          });
        }
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [initialPreferences, userId]);

  const updatePreferences = useCallback(
    (patch: Partial<UserPreferences>) => {
      for (const key of Object.keys(patch) as Array<keyof UserPreferences>) {
        changedKeys.current.add(key);
      }
      setPreferences((current) => ({ ...current, ...patch }));
      pendingPatch.current = { ...pendingPatch.current, ...patch };

      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        const patchToSave = pendingPatch.current;
        pendingPatch.current = {};
        saveQueue.current = saveQueue.current.then(async () => {
          const result = await updateMyUserPreferences(patchToSave);
          if (!result.ok) {
            showToast({ text: result.message, tone: "error" });
          }
        }).catch(() => {
          showToast({
            text: "Could not sync preferences to your account. Check your connection and try again.",
            tone: "error",
          });
        });
      }, 450);
    },
    [],
  );

  const value = useMemo(
    () => ({ preferences, updatePreferences }),
    [preferences, updatePreferences],
  );

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const value = useContext(UserPreferencesContext);
  if (!value) throw new Error("UserPreferencesProvider is missing.");
  return value;
}

function cacheKey(userId: string) {
  return `myntix:user-preferences:${userId}`;
}
