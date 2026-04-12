import { JDPayload, JDAnalysis, GapReport } from '@resumetailor/types'

export interface StorageContext {
  activeJD?: JDPayload;
  analysis?: JDAnalysis;
  gapReport?: GapReport;
  lastUpdate?: number;
}

export const chromeStorage = {
  getContext: (): Promise<StorageContext | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['RT_CONTEXT'], (result) => {
        resolve(result['RT_CONTEXT'] || null)
      })
    })
  },
  
  setContext: (context: StorageContext): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ 'RT_CONTEXT': { ...context, lastUpdate: Date.now() } }, () => {
        resolve()
      })
    })
  },

  updateContext: async (update: Partial<StorageContext>): Promise<void> => {
    const current = await chromeStorage.getContext() || {};
    await chromeStorage.setContext({ ...current, ...update });
  },

  clearContext: (): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['RT_CONTEXT'], () => {
        resolve()
      })
    })
  },

  // Standard Storage Interface for Supabase Auth
  getItem: (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null)
      })
    })
  },
  setItem: (key: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve()
      })
    })
  },
  removeItem: (key: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        resolve()
      })
    })
  }
}
