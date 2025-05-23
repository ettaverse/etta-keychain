import AccountUtils from './account.utils';
import { isPasswordValid } from './password.utils';
import { LocalStorageKeyEnum } from '../../../src/reference-data/local-storage-key.enum';
import LocalStorageUtils from '../../../src/utils/localStorage.utils';

const login = async (password: string): Promise<boolean> => {
  let accounts = await AccountUtils.getAccountsFromLocalStorage(password);
  return accounts ? true : false;
};

/* istanbul ignore next */
const getMkFromLocalStorage = () => {
  return LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
};

/* istanbul ignore next */
const saveMkInLocalStorage = (mk: string): void => {
  LocalStorageUtils.saveValueInSessionStorage(LocalStorageKeyEnum.__MK, mk);
};

const isMK = (value: string): boolean => {
  // Check if the value is a master key (encrypted format)
  return value.startsWith('MK#');
};

const getDecrypted = (encryptedMk: string): string => {
  // This is a placeholder - in production, you'd decrypt the MK
  // For now, just return the value without the MK# prefix
  if (isMK(encryptedMk)) {
    return encryptedMk.substring(3);
  }
  return encryptedMk;
};

const MkUtils = {
  isPasswordValid,
  login,
  getMkFromLocalStorage,
  saveMkInLocalStorage,
  isMK,
  getDecrypted,
};

export default MkUtils;