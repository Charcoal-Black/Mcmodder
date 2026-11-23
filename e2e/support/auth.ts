import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext } from "@playwright/test";

/**
 * 登录态复用。
 *
 * MC 百科**只**依据 HttpOnly cookie `_uuid` 判断当前用户，所以拿到 `_uuid` 等于拿到整套登录态：
 * 把它写进 context 的 cookie 容器（`httpOnly: true`，`domain: .mcmod.cn`，与
 * `Utils.setUuidCookie` 的写法一致），站点就认为已登录。这也正是脚本自带「账号快捷切换」的原理。
 *
 * 判定登录成功的方式同样是站点自身的行为：访问 `center.mcmod.cn` 时，已登录会直接落到
 * `center.mcmod.cn/<uid>/`，未登录则跳 `www.mcmod.cn/login/`。
 *
 * 快照里**没有** GM 存储镜像：`auth` 项目刻意不注入用户脚本（用 `@playwright/test` 原生 `test`），
 * 否则会话里残留的 `mcmodderSettings` 会盖掉各用例自己的 seed。
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** 登录态快照路径（`.gitignore` 已忽略 `/playwright/.auth/`） */
export const AUTH_FILE = resolve(REPO_ROOT, "playwright/.auth/mcmod.cn.json");

/** 个人中心的地址，仅用于「已登录页面的脚本能否正常启动」这类需要真实 v4 页面的用例 */
export const CENTER_URL = "https://center.mcmod.cn/";

/** 站点自己的登录状态接口 —— 与脚本「实时通讯」用的是同一个 */
const COMMON_HEADER_URL = "https://www.mcmod.cn/frame/CommonHeader/";

/** 快照有效期：与站点登录 cookie 的有效期对齐（30 天），过期就重新准备 */
const AUTH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthCredentials {
  username: string;
  password: string;
}

/** `/frame/CommonHeader/` 返回的 `user` 字段（只声明用到的部分） */
interface LoginUser {
  login: number;
  uid: number;
  nickname: string;
  msg_count: number;
}

/** 登录态：uid 与昵称 */
export interface LoginState {
  uid: number;
  nickname: string;
}

/** `MCMOD_UUID`：登录态唯一凭据（HttpOnly `_uuid` 的值），优先于账号密码 */
export function getUuid(): string | null {
  const uuid = process.env.MCMOD_UUID?.trim();
  return uuid ? uuid : null;
}

/** `MCMOD_USERNAME` / `MCMOD_PASSWORD`：没有 `_uuid` 时的兜底，走表单登录 */
export function getCredentials(): AuthCredentials | null {
  const username = process.env.MCMOD_USERNAME;
  const password = process.env.MCMOD_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

/** 快照是否仍可用（存在且未过期） */
export function hasFreshAuthState(): boolean {
  if (!existsSync(AUTH_FILE)) return false;
  return Date.now() - statSync(AUTH_FILE).mtimeMs < AUTH_MAX_AGE_MS;
}

/** 是否启用登录相关项目（`auth` / `logged-in`） */
export function isAuthEnabled(): boolean {
  if (process.env.E2E_ONLINE !== "1") return false;
  return hasFreshAuthState() || getUuid() !== null || getCredentials() !== null;
}

/**
 * 通过站点接口确认登录态，返回 uid 与昵称。
 *
 * 比「访问个人中心、看它跳去哪」轻得多：一次 POST 拿到全部信息，既不加载整页，
 * 也不依赖 v3 主页 / v4 内页的任何 DOM。`context.request` 与浏览器共享 cookie 容器，
 * 所以 HttpOnly 的 `_uuid` 会被正常带上（这正是站点认人的唯一依据）。
 *
 * @throws 未登录（`_uuid` 缺失 / 失效 / 过期）时抛出带指引的错误
 */
export async function checkLogin(context: BrowserContext): Promise<LoginState> {
  const response = await context.request.post(COMMON_HEADER_URL, {
    form: { version: "4.0" },
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      Origin: "https://www.mcmod.cn",
      Referer: "https://www.mcmod.cn/",
    },
    failOnStatusCode: false,
  });

  const body = await response.text();
  let payload: { state?: number; user?: Partial<LoginUser> };
  try {
    payload = JSON.parse(body) as typeof payload;
  } catch (error) {
    throw new Error(
      `登录状态接口返回的不是 JSON（HTTP ${response.status()}）：${body.slice(0, 200)}`,
      {
        cause: error,
      },
    );
  }

  if (!payload.user?.login) {
    throw new Error("当前 context 未登录：`_uuid` 缺失、失效或已过期，请重新准备登录态快照。");
  }
  return { uid: Number(payload.user.uid), nickname: String(payload.user.nickname ?? "") };
}
