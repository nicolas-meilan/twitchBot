import tmi from 'tmi.js';

export enum UserRole {
  BASIC = 'BASIC',
  SUBSCRIPTOR = 'SUBSCRIPTOR',
  VIP = 'VIP',
  MOD = 'MOD',
  BROADCASTER = 'BROADCASTER'
}

export const USER_ROLE_ACCESS_CONFIG = {
  [UserRole.BASIC]: [
    UserRole.BASIC,
    UserRole.VIP,
    UserRole.SUBSCRIPTOR,
    UserRole.MOD,
    UserRole.BROADCASTER,
  ],
  [UserRole.SUBSCRIPTOR]: [
    UserRole.SUBSCRIPTOR,
    UserRole.VIP,
    UserRole.MOD,
    UserRole.BROADCASTER,
  ],
  [UserRole.VIP]: [
    UserRole.VIP,
    UserRole.MOD,
    UserRole.BROADCASTER,
  ],
  [UserRole.MOD]: [
    UserRole.MOD,
    UserRole.BROADCASTER,
  ],
  [UserRole.BROADCASTER]: [
    UserRole.BROADCASTER,
  ],
}


export const getUserRole = (userTags: tmi.ChatUserstate) => {
  if (!userTags.badges) return UserRole.BASIC;

  if (userTags.badges.vip) return UserRole.VIP;
  if (userTags.badges.moderator) return UserRole.MOD;
  if (userTags.badges.broadcaster) return UserRole.BROADCASTER;

  // An user can be vip/mod/broadcaster and also subscriptor
  if (userTags.badges.subscriber) return UserRole.SUBSCRIPTOR;

  return UserRole.BASIC;
};

export const userHasAccess = (userTags: tmi.ChatUserstate, roleToCompare: UserRole) => {
  const userRole = getUserRole(userTags);

  return USER_ROLE_ACCESS_CONFIG[roleToCompare].includes(userRole);
};
