export const PC_BASH_FIRST_PROFILE = 'pc-bash-first';
export const MOBILE_FILE_TOOLS_PROFILE = 'mobile-file-tools';

export type PlatformProfile =
  | typeof PC_BASH_FIRST_PROFILE
  | typeof MOBILE_FILE_TOOLS_PROFILE;
