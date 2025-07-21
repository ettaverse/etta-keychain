import { storage } from "@wxt-dev/storage";

import { LocalStorageKeyEnum } from "../reference-data/local-storage-key.enum";

export default class LocalStorageUtils {
  static async saveValueInLocalStorage(
    key: LocalStorageKeyEnum | string,
    value: any,
  ): Promise<void> {
    await storage.setItem(`local:${key}`, value);
  }

  static async getValueFromLocalStorage(
    key: LocalStorageKeyEnum | string,
  ): Promise<any> {
    return await storage.getItem(`local:${key}`);
  }

  static async removeValueFromLocalStorage(
    key: LocalStorageKeyEnum | string,
  ): Promise<void> {
    await storage.removeItem(`local:${key}`);
  }

  static async saveValueInSessionStorage(
    key: LocalStorageKeyEnum | string,
    value: any,
  ): Promise<void> {
    await storage.setItem(`session:${key}`, value);
  }

  static async getValueFromSessionStorage(
    key: LocalStorageKeyEnum | string,
  ): Promise<any> {
    return await storage.getItem(`session:${key}`);
  }

  static async removeValueFromSessionStorage(
    key: LocalStorageKeyEnum | string,
  ): Promise<void> {
    await storage.removeItem(`session:${key}`);
  }
}
