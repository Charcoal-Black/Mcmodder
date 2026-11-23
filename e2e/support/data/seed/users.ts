import {
  USER_ASSISTANT,
  USER_ASSISTANT_MANAGER,
  USER_COMMON_USER,
  USER_TESTIFICATE,
} from "../../users";
import type { RepositoryData } from "../types";

/**
 * 用户。
 *
 * 权限一律复用 `users.ts` 里的现成常量与 `canVerify()`，否则「数据库里的权限」
 * 与「模拟的站点权限模型」很快会漂移成两套。
 */
export const users = {
  [USER_TESTIFICATE.uid]: USER_TESTIFICATE,
  [USER_ASSISTANT.uid]: USER_ASSISTANT,
  [USER_ASSISTANT_MANAGER.uid]: USER_ASSISTANT_MANAGER,
  [USER_COMMON_USER.uid]: USER_COMMON_USER,
  /** 用例里的提交者 */
  179043: {
    uid: 179043,
    username: "QQ酱179043",
    nickname: "花海",
    assistant: true,
    managers: [
      { id: 12850, grantedAt: Date.parse("2023-11-22T23:44:51Z") },
      { id: 8, grantedAt: Date.parse("2023-01-09T08:23:32Z") },
      { id: 2524, grantedAt: Date.parse("2022-12-12T14:47:24Z") },
    ],
  },
  /** 可爱的用户 */
  1508241: {
    uid: 1508241,
    username: "zgxh_zhr",
    nickname: "逐光星火_执火人",
    avatar: "https://i.mcmod.cn/user/avatar/150/1508241/1508241_1795003122_uRhX.png",
    sign: "我是猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪猪（",
    regTime: Date.parse("2026-08-24T01:11:22Z"),
  },
} satisfies RepositoryData["users"];
