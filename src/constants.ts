import { UserStatus } from './types';

export const UserStatusIcon: Record<UserStatus, string> = {
  [UserStatus.STAY]: '🏠',
  [UserStatus.MOVE]: '🚗',
}