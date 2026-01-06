/**
 * 翻译资源聚合
 */

import commonEn from './common/en';
import commonZhCN from './common/zh-CN';
import commonJa from './common/ja';
import commonDe from './common/de';
import commonAr from './common/ar';
import authEn from './auth/en';
import authZhCN from './auth/zh-CN';
import authJa from './auth/ja';
import authDe from './auth/de';
import authAr from './auth/ar';
import chatEn from './chat/en';
import chatZhCN from './chat/zh-CN';
import chatJa from './chat/ja';
import chatDe from './chat/de';
import chatAr from './chat/ar';
import noteEn from './note/en';
import noteZhCN from './note/zh-CN';
import noteJa from './note/ja';
import noteDe from './note/de';
import noteAr from './note/ar';
import userEn from './user/en';
import userZhCN from './user/zh-CN';
import userJa from './user/ja';
import userDe from './user/de';
import userAr from './user/ar';
import settingsEn from './settings/en';
import settingsZhCN from './settings/zh-CN';
import settingsJa from './settings/ja';
import settingsDe from './settings/de';
import settingsAr from './settings/ar';
import statusEn from './status/en';
import statusZhCN from './status/zh-CN';
import statusJa from './status/ja';
import statusDe from './status/de';
import statusAr from './status/ar';
import validationEn from './validation/en';
import validationZhCN from './validation/zh-CN';
import validationJa from './validation/ja';
import validationDe from './validation/de';
import validationAr from './validation/ar';
import dateEn from './date/en';
import dateZhCN from './date/zh-CN';
import dateJa from './date/ja';
import dateDe from './date/de';
import dateAr from './date/ar';
import errorEn from './error/en';
import errorZhCN from './error/zh-CN';
import errorJa from './error/ja';
import errorDe from './error/de';
import errorAr from './error/ar';
import audioEn from './audio/en';
import audioZhCN from './audio/zh-CN';
import audioJa from './audio/ja';
import audioDe from './audio/de';
import audioAr from './audio/ar';
import healthEn from './health/en';
import healthZhCN from './health/zh-CN';
import membershipEn from './membership/en';
import membershipZhCN from './membership/zh-CN';
import workspaceEn from './workspace/en';
import workspaceZhCN from './workspace/zh-CN';
import workspaceJa from './workspace/ja';
import workspaceDe from './workspace/de';
import workspaceAr from './workspace/ar';

/**
 * 翻译资源
 */
const translations = {
  en: {
    common: commonEn,
    auth: authEn,
    chat: chatEn,
    note: noteEn,
    user: userEn,
    settings: settingsEn,
    status: statusEn,
    validation: validationEn,
    date: dateEn,
    error: errorEn,
    audio: audioEn,
    health: healthEn,
    membership: membershipEn,
    workspace: workspaceEn,
  },
  'zh-CN': {
    common: commonZhCN,
    auth: authZhCN,
    chat: chatZhCN,
    note: noteZhCN,
    user: userZhCN,
    settings: settingsZhCN,
    status: statusZhCN,
    validation: validationZhCN,
    date: dateZhCN,
    error: errorZhCN,
    audio: audioZhCN,
    health: healthZhCN,
    membership: membershipZhCN,
    workspace: workspaceZhCN,
  },
  'ja': {
    common: commonJa,
    auth: authJa,
    chat: chatJa,
    note: noteJa,
    user: userJa,
    settings: settingsJa,
    status: statusJa,
    validation: validationJa,
    date: dateJa,
    error: errorJa,
    audio: audioJa,
    health: healthEn,
    membership: membershipEn,
    workspace: workspaceJa,
  },
  'de': {
    common: commonDe,
    auth: authDe,
    chat: chatDe,
    note: noteDe,
    user: userDe,
    settings: settingsDe,
    status: statusDe,
    validation: validationDe,
    date: dateDe,
    error: errorDe,
    audio: audioDe,
    health: healthEn,
    membership: membershipEn,
    workspace: workspaceDe,
  },
  'ar': {
    common: commonAr,
    auth: authAr,
    chat: chatAr,
    note: noteAr,
    user: userAr,
    settings: settingsAr,
    status: statusAr,
    validation: validationAr,
    date: dateAr,
    error: errorAr,
    audio: audioAr,
    health: healthEn,
    membership: membershipEn,
    workspace: workspaceAr,
  },
} as const;

export default translations;
