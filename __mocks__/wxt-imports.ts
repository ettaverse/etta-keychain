// Mock for WXT's #imports
export const storage = {
  getItem: async (key: string) => undefined,
  setItem: async (key: string, value: any) => undefined,
  removeItem: async (key: string) => undefined,
  getItems: async (keys: string[]) => ({}),
  setItems: async (items: Record<string, any>) => undefined,
  removeItems: async (keys: string[]) => undefined,
  watch: (key: string, callback: Function) => () => {},
};