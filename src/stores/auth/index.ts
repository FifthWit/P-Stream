import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export interface Account {
  profile: {
    colorA: string;
    colorB: string;
    icon: string;
  };
}

export type AccountWithToken = Account & {
  sessionId: string;
  userId: string;
  token: string;
  seed: string;
  deviceName: string;
};

interface AuthStore {
  account: null | AccountWithToken;
  backendUrl: null | string;
  proxySet: null | string[];
  febboxToken: null | string;
  removeAccount(): void;
  setAccount(acc: AccountWithToken): void;
  updateDeviceName(deviceName: string): void;
  updateAccount(acc: Account): void;
  setAccountProfile(acc: Account["profile"]): void;
  setBackendUrl(url: null | string): void;
  setProxySet(urls: null | string[]): void;
  setFebboxToken(token: null | string): void;
}

export const useAuthStore = create(
  persist(
    immer<AuthStore>((set) => ({
      account: null,
      backendUrl: null,
      proxySet: null,
      febboxToken: null,
      setAccount(acc) {
        set((s) => {
          s.account = acc;
        });
      },
      removeAccount() {
        set((s) => {
          s.account = null;
        });
      },
      setBackendUrl(v) {
        set((s) => {
          s.backendUrl = v;
        });
      },
      setProxySet(urls) {
        set((s) => {
          s.proxySet = urls;
        });
      },
      setFebboxToken(token) {
        set((s) => {
          s.febboxToken = token;
        });
        try {
          if (token === null) {
            localStorage.removeItem("febbox_ui_token");
          } else {
            localStorage.setItem("febbox_ui_token", token);
          }
        } catch (e) {
          console.warn("Failed to access localStorage:", e);
        }
      },
      setAccountProfile(profile) {
        set((s) => {
          if (s.account) {
            s.account.profile = profile;
          }
        });
      },
      updateAccount(acc) {
        set((s) => {
          if (!s.account) return;
          s.account = {
            ...s.account,
            ...acc,
          };
        });
      },
      updateDeviceName(deviceName) {
        set((s) => {
          if (!s.account) return;
          s.account.deviceName = deviceName;
        });
      },
    })),
    {
      name: "__MW::auth",
      migrate: (persistedState: any) => {
        // Migration from localStorage to Zustand store
        if (!persistedState.febboxToken) {
          try {
            const storedToken = localStorage.getItem("febbox_ui_token");
            if (storedToken) persistedState.febboxToken = storedToken;
          } catch (e) {
            console.warn("LocalStorage access failed during migration:", e);
          }
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        // After store rehydration
        if (state?.febboxToken) {
          try {
            localStorage.setItem("febbox_ui_token", state.febboxToken);
          } catch (e) {
            console.warn("Failed to sync token to localStorage:", e);
          }
        }
      },
    },
  ),
);
