type RequiredByKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * 对用户在百科后端所记录的完整信息的模拟。与脚本侧的 {@link Profile} 互补，
 * 能够提供脚本侧无法直接拿到（或非必需），但复原百科后端逻辑所需要的信息。
 * 同时，将原有的除 {@link Profile.nickname} 外的所有字段都标记为可选，以简化部分条件下的模拟
 * 行为（大多数时候往往只需要 UID ({@link User.uid}) 与用户名 ({@link User.username}) 即可）。
 *
 * @warning 剔除了 {@link Profile.preSubmitList}。此字段的类型疑似无法被无损序列化，
 * 在某些情况下可能存在问题，且预编辑为纯脚本侧功能，后端不参与。
 */
export type User = RequiredByKeys<Partial<Omit<Profile, "preSubmitList">>, "username"> & {
  /** 用户的 UID */
  uid: number;
  /** 用户的个性签名 */
  sign?: string;
  /** 当前用户是否在线。若用户隐藏了自己的在线状态，则恒为 `false` */
  online?: boolean;

  /**
   * 拥有**独立**审核权限的模组列表。
   *
   * 管理员自动获得相应模组区域的审核权限，但是百科确实存在某类特殊情况，使得极少部分非管理员的
   * 编辑员也可以审核某些模组。此特殊权限在用户的个人主页不可见，仅在后台待审列表才会有特殊标识。
   * 现在已几乎用不到此字段。如果以后脚本本体需要支持此情况，则会考虑迁移到 {@link Profile}。
   *
   * 用户实际可审核的模组取此字段与 {@link Profile.adminModList} 的交集。
   */
  verifibleModList?: number[];

  /** 用户是否是**全域编辑员**。为 true 时，覆盖 {@link Profile.editorModList} */
  universalEditor?: boolean;
  /** 用户是否是**全域管理员**。为 true 时，覆盖 {@link Profile.adminModList} */
  universalManager?: boolean;
  /**
   * 用户是否是**全域开发者**。为 true 时，覆盖 {@link Profile.devModList}。
   *
   * 百科目前不存在拥有此权限的用户，从语义上来讲，也不应该出现这样的用户——谁知道呢。
   */
  universalDeveloper?: boolean;
  /**
   * 用户是否是**审核助理**。拥有最低**编辑员**权限的审核助理可在后台查看全站所有模组、日志、
   * 资料、合成表、教程与作者的编辑，并留下助理意见。
   *
   * 审核助理依然可以正常审核拥有审核权限的模组区域下的编辑。
   */
  assistant?: boolean;
  /** 展示在管理员后台主页的联系方式，只有管理员或更高等级才可手动设置此字段。 */
  contact?: string;
  /** 最后登录的时间戳，只会在管理员后台主页展示。 */
  lastLoginAt?: number;
};

export function canVerify(user: User, classID: number) {
  return (
    user.universalManager ||
    user.adminModList?.split(",").map(Number).includes(classID) ||
    user.verifibleModList?.includes(classID)
  );
}

export function canAssist(user: User, classID: number) {
  return user.assistant && !canVerify(user, classID);
}

export const USER_EMPTY: User = {
  uid: 0,
  username: "",
};

export const USER_TESTIFICATE = {
  uid: 1,
  username: "呜喵喵呜呜喵喵机",
  userGroup: "百科编辑员",
  universalEditor: true,
  universalManager: true,
  avatar: "https://i.mcmod.cn/user/avatar/0/1/1_1234567890_aBcD.png",
} as const satisfies User;

export const USER_ASSISTANT: User = {
  uid: 2,
  username: "Assistant",
  assistant: true,
};

/**
 * 同时拥有自己管理员区域的审核助理。
 *
 * 后台「模组区内容审核」会把这名用户管理员区域下的模组排到按模组筛选列表的最前面，
 * 用来复刻站点对不同权限用户的展示差异。
 */
export const USER_ASSISTANT_MANAGER: User = {
  uid: 4,
  username: "助理管理员",
  assistant: true,
  managers: [{ id: 12850, grantedAt: 0 }],
};

export const USER_COMMON_USER: User = {
  uid: 3,
  username: "User",
};
