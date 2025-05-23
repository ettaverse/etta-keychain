import { Keys } from './keys.interface';

export interface RC {
  rc_manabar: {
    current_mana: string;
    last_update_time: number;
  };
  max_rc: string;
  percentage: number;
}

export interface ActiveAccount {
  name?: string;
  keys: Keys;
  rc: RC;
}