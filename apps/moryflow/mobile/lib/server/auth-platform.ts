/**
 * [PROVIDES]: device platform 标识
 * [DEPENDS]: react-native Platform
 * [POS]: Mobile 端 Auth 平台识别
 */

import { Platform } from 'react-native';

export const DEVICE_PLATFORM =
  Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'mobile';
