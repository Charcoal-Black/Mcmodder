/**
 * 模拟百科后端数据库的查询门面。
 *
 * 组件、用例和 mock 都**只**通过这里取数据，不直接 import 种子文件 ——
 * 这样换数据源（手写种子 / 抓包数据 / LowDB）时只需改 `hydrate()` 的调用方。
 *
 * 三条设计约束（都是被渲染管线逼出来的，不是风格选择）：
 *
 * 1. **同步**：组件在 `setup()` 里调用它，而 `renderToString` 是同步的，
 *    返回 Promise 的接口在这里没有意义。
 * 2. **可在浏览器里跑**：这些代码会被打进 fixture 的 IIFE，在干净的 Chromium 页里求值。
 *    因此不能出现 `node:fs` / `process`，LowDB 之类的存储必须留在 Playwright 的 Node 侧。
 * 3. **只读**：默认数据被深冻结，查询返回的数组是副本；需要可变数据时用 `hydrate()` 注入。
 *
 * 查不到记录时**抛错**而不是返回 `undefined`：这类错误基本都来自用例里写错的 ID，
 * 抛错信息会列出该表现有的 ID，比让模板在 `undefined.name` 上崩掉好定位得多。
 */
import type { GUI } from "../admin/verify/tab/schema";
import { arrayToMap } from "../../../src/CollectionUtils";
import { FieldIndex } from "../../../src/fieldindex/FieldIndex";
import { canVerify, type User } from "../users";
import { normalizeOredict } from "./oredict";
import { seed } from "./seed";
import type {
  McmodAuthor,
  McmodClass,
  McmodItem,
  McmodPost,
  McmodTab,
  McmodVerification,
  McmodVersion,
  RepositoryData,
  SuggestionTypeID,
} from "./types";
import { validateRepositoryData } from "./validate";

export type {
  McmodAuthor,
  McmodClass,
  McmodItem,
  McmodTab,
  McmodVerification,
  RepositoryData,
} from "./types";

/** 可以「按数字 ID 取一条」的表（`oredictIndex` 是索引表，不在此列） */
type IdTable = Exclude<keyof RepositoryData, "oredictIndex">;

/** 报错里最多列出多少个可用 ID，避免某个大表把控制台刷屏 */
const AVAILABLE_LIMIT = 20;

export class RepositoryLookupError extends Error {
  constructor(
    readonly table: IdTable,
    readonly id: number,
    readonly available: number[],
  ) {
    super(`[e2e] 数据库 ${table} 中没有 ID 为 ${id} 的记录；` + `现有 ID：${formatIDs(available)}`);
    this.name = "RepositoryLookupError";
  }
}

function formatIDs(ids: number[]): string {
  if (ids.length === 0) return "（空表）";
  const head = ids.slice(0, AVAILABLE_LIMIT).join("、");
  return ids.length > AVAILABLE_LIMIT ? `${head} 等 ${ids.length} 个` : head;
}

/** 取一条记录，取不到就抛出带「现有 ID」的错误 */
function requireRecord<T>(table: IdTable, records: Record<number, T>, id: number): T {
  const record = records[id];
  if (record === undefined) {
    throw new RepositoryLookupError(
      table,
      id,
      Object.keys(records)
        .map(Number)
        .sort((a, b) => a - b),
    );
  }
  return record;
}

/**
 * 判断历史遗留的逗号分隔区域列表是否至少包含一个 ID。
 *
 * {@link User.editorModList} / {@link User.adminModList} 已被 {@link User.editors} /
 * {@link User.managers} 取代，但站点数据里两者仍会同时出现，查询时不能只看新字段。
 */
function hasModList(modList: string | undefined): boolean {
  return !!modList?.split(",").some((id) => id.trim() !== "");
}

/** 用户是否拥有任意编辑员区域（含全域编辑员） */
function hasEditorArea(user: User): boolean {
  return (
    !!user.universalEditor || (user.editors?.length ?? 0) > 0 || hasModList(user.editorModList)
  );
}

/** 用户是否拥有任意管理员区域（含全域管理员） */
function hasManagerArea(user: User): boolean {
  return (
    !!user.universalManager || (user.managers?.length ?? 0) > 0 || hasModList(user.adminModList)
  );
}

/**
 * 反查索引。派生查询（按资料取合成表、按标签取资料、按模组取管理员）如果在调用点
 * 每次遍历全表，模板里一个单元格一次就会退化成 O(n²)，而且「哪份数据是权威」会变得模糊。
 *
 * 单字段分组复用站点的 {@link FieldIndex}；标签索引则来自**独立的索引表**
 * {@link RepositoryData.oredictIndex}，而不是扫描资料上的 `oredict` —— 真实站点上两者
 * 可能不同步，扫描资料会把「索引尚未重建」的延迟掩盖掉。
 */
interface RepositoryIndexes {
  tabsByItem: FieldIndex<McmodTab, "itemID">;
  itemsByGeneral: FieldIndex<McmodItem, "generalTo", number>;
  itemsByOredict: Map<string, McmodItem[]>;
  managersByClass: Map<number, number[]>;
  verificationsByUser: FieldIndex<McmodVerification, "owner">;
  verificationsByClass: FieldIndex<McmodVerification, "classID">;
}

/**
 * 按提交者聚合后的待审信息。
 *
 * 后台主页的「快速审核」需要把同一个人提交的多个待审项合在一起统计：数量、催审总数、
 * 最早提交时间（优先级）与助理意见。聚合放在仓库层，组件就不必自己遍历全表。
 */
export interface VerificationStats {
  /** 提交者 */
  user: User;
  /** 该用户当前的待审项（按 ID 升序） */
  verifications: McmodVerification[];
  /** 待审项数量 */
  count: number;
  /** 总催审次数 */
  urgeCount: number;
  /** 最早一次提交的时间 */
  earliestSubmittedAt: number;
  /** 最近一次提交的时间 */
  latestSubmittedAt: number;
  /** 收到过的助理意见类型（按待审项与意见的插入顺序去重） */
  suggestionTypes: SuggestionTypeID[];
}

function buildIndexes(data: RepositoryData): RepositoryIndexes {
  const tabsByItem = new FieldIndex<McmodTab, "itemID">("itemID");
  tabsByItem.add(Object.values(data.tabs).sort((a, b) => a.id - b.id));

  const itemsByGeneral = new FieldIndex<McmodItem, "generalTo", number>("generalTo");
  itemsByGeneral.add(
    Object.values(data.items)
      .filter((item) => item.generalTo !== undefined)
      .sort((a, b) => a.id - b.id),
  );

  // 索引表按 `tag` 建映射；规范化后的标签才是查询键，大小写不影响命中
  const oredictRows = arrayToMap(
    data.oredictIndex.map((row) => ({ ...row, tag: normalizeOredict(row.tag) })),
    "tag",
  );
  const itemsByOredict = new Map<string, McmodItem[]>();
  Object.entries(oredictRows).forEach(([tag, row]) => {
    itemsByOredict.set(
      tag,
      row.itemIDs
        .map((id) => data.items[id])
        .filter((item): item is McmodItem => item !== undefined),
    );
  });

  // 候选模组 ID 取「库里的模组」与「用户权限里出现过的模组」的并集；
  // 不在候选集里的 ID 由 getUsersByManager 现算（全域管理员对任意模组都成立）。
  const classIDs = new Set(Object.keys(data.classes).map(Number));
  Object.values(data.users).forEach((user) => {
    user.adminModList?.split(",").forEach((id) => {
      const classID = Number(id);
      if (Number.isInteger(classID) && classID > 0) classIDs.add(classID);
    });
    user.verifibleModList?.forEach((classID) => classIDs.add(classID));
  });

  const managersByClass = new Map<number, number[]>();
  classIDs.forEach((classID) => {
    const uids = Object.values(data.users)
      .filter((user) => canVerify(user, classID))
      .map((user) => user.uid)
      .sort((a, b) => a - b);
    managersByClass.set(classID, uids);
  });

  const verificationRows = Object.values(data.verifications).sort((a, b) => a.id - b.id);
  const verificationsByUser = new FieldIndex<McmodVerification, "owner">("owner");
  verificationsByUser.add(verificationRows);
  const verificationsByClass = new FieldIndex<McmodVerification, "classID">("classID");
  verificationsByClass.add(verificationRows);

  return {
    tabsByItem,
    itemsByGeneral,
    itemsByOredict,
    managersByClass,
    verificationsByUser,
    verificationsByClass,
  };
}

// 默认种子在模块加载时校验一次：写错数据要立刻炸，而不是等到某个用例渲染出半张表
validateRepositoryData(seed);

export class McmodRepository {
  private static data: RepositoryData = seed;
  private static indexes: RepositoryIndexes = buildIndexes(seed);

  /**
   * 换一份数据（抓包结果、LowDB 快照、单个用例的临时改动都走这里）。
   *
   * 注入前会做与默认种子相同的引用完整性校验，并重建反查索引。
   */
  static hydrate(data: RepositoryData): void {
    validateRepositoryData(data);
    McmodRepository.data = data;
    McmodRepository.indexes = buildIndexes(data);
  }

  /** 回到默认种子，撤销 {@link hydrate} 的所有改动 */
  static reset(): void {
    McmodRepository.hydrate(seed);
  }

  /** 当前数据的只读快照，用于断言或交给下一个渲染页 */
  static snapshot(): RepositoryData {
    return McmodRepository.data;
  }

  // ---------------------------------------------------------------- 作者

  static findAuthor(id: number): McmodAuthor | undefined {
    return McmodRepository.data.authors[id];
  }

  /** 获取指定百科内 ID 作者的详细信息 */
  static getAuthor(id: number): McmodAuthor {
    return requireRecord("authors", McmodRepository.data.authors, id);
  }

  // ---------------------------------------------------------------- 模组

  static findClass(id: number): McmodClass | undefined {
    return McmodRepository.data.classes[id];
  }

  /** 获取指定百科内 ID 模组的详细信息 */
  static getClass(id: number): McmodClass {
    return requireRecord("classes", McmodRepository.data.classes, id);
  }

  /** 获取全部模组（按百科内 ID 升序） */
  static getClasses(): McmodClass[] {
    return Object.values(McmodRepository.data.classes).sort((a, b) => a.id - b.id);
  }

  /**
   * 获取指定用户**管理员区域**下的模组。
   *
   * 顺序沿用 {@link User.adminModList} 里的顺序（后台按权限授予时间排列），而不是按 ID 排序；
   * 列表里还没进入 `classes` 表的 ID 会被跳过。
   */
  static getClassesByManager(user: User): McmodClass[] {
    return (user.managers ?? [])
      .filter((entry) => Number.isInteger(entry.id) && entry.id > 0)
      .sort((a, b) => b.grantedAt - a.grantedAt)
      .map((entry) => McmodRepository.data.classes[entry.id])
      .filter((clazz): clazz is McmodClass => clazz !== undefined);
  }

  /**
   * 获取最新收录的模组。
   *
   * 优先按 {@link McmodClass.createdAt} 比较，未提供时退回百科内 ID（递增分配），
   * 两者都没有可比性时抛错，而不是返回一个含义不明的 `undefined`。
   */
  static getNewestClass(): McmodClass {
    const classes = Object.values(McmodRepository.data.classes);
    if (classes.length === 0) {
      throw new Error("[e2e] classes 表为空，无法确定最新收录的模组");
    }
    return classes.reduce((newest, current) =>
      (current.createdAt ?? current.id) >= (newest.createdAt ?? newest.id) ? current : newest,
    );
  }

  // ---------------------------------------------------------------- 模组日志

  static getVersion(id: number): McmodVersion {
    return requireRecord("versions", McmodRepository.data.versions, id);
  }

  // ---------------------------------------------------------------- 物品资料

  static findItem(id: number): McmodItem | undefined {
    return McmodRepository.data.items[id];
  }

  /** 获取指定百科内 ID 物品的详细信息 */
  static getItem(id: number): McmodItem {
    return requireRecord("items", McmodRepository.data.items, id);
  }

  /**
   * 查找矿物词典/物品标签中含有指定内容的所有物品资料。
   *
   * 查询的是**独立索引表**，而不是扫描资料上的 `oredict`：真实站点上索引需要站长重建，
   * 新资料即使写了标签，也要等索引更新后才能被找到。
   *
   * 只接受矿辞/标签；传纯数字 ID 会得到空数组 —— 那是调用方把两种语义搞混了，
   * 应由调用点先用 `/^\d+$/` 区分（见 `tab/fields/VerifyTabVisualization.vue`）。
   */
  static getItemsByOredict(tag: string): McmodItem[] {
    return [...(McmodRepository.indexes.itemsByOredict.get(normalizeOredict(tag)) ?? [])];
  }

  /** 查找所有已被综合到指定资料下的所有物品资料 */
  static getItemsByGeneral(id: number): McmodItem[] {
    return [...(McmodRepository.indexes.itemsByGeneral.get(id) ?? [])];
  }

  // ---------------------------------------------------------------- 合成表

  static findTab(id: number): McmodTab | undefined {
    return McmodRepository.data.tabs[id];
  }

  /** 获取指定百科内 ID 合成表的详细信息 */
  static getTab(id: number): McmodTab {
    return requireRecord("tabs", McmodRepository.data.tabs, id);
  }

  /** 查找指定物品资料下的所有合成表（按合成表 ID 升序） */
  static getTabsByItem(id: number): McmodTab[] {
    return [...(McmodRepository.indexes.tabsByItem.get(id) ?? [])];
  }

  /** 获取指定百科内 ID 合成表 GUI 的详细信息 */
  static getGUI(id: number): GUI {
    return requireRecord("guis", McmodRepository.data.guis, id);
  }

  // ---------------------------------------------------------------- 教程

  static getPost(id: number): McmodPost {
    return requireRecord("posts", McmodRepository.data.posts, id);
  }

  // ---------------------------------------------------------------- 待审项

  static findVerification(id: number): McmodVerification | undefined {
    return McmodRepository.data.verifications[id];
  }

  /** 获取指定待审项的详细信息 */
  static getVerification(id: number): McmodVerification {
    return requireRecord("verifications", McmodRepository.data.verifications, id);
  }

  /** 获取全部待审项（按 ID 升序） */
  static getVerifications(): McmodVerification[] {
    return Object.values(McmodRepository.data.verifications).sort((a, b) => a.id - b.id);
  }

  /** 获取指定用户提交的全部待审项（按 ID 升序） */
  static getVerificationsByUser(uid: number): McmodVerification[] {
    return [...(McmodRepository.indexes.verificationsByUser.get(uid) ?? [])];
  }

  /** 获取指定模组区域下的全部待审项（按 ID 升序） */
  static getVerificationsByClass(classID: number): McmodVerification[] {
    return [...(McmodRepository.indexes.verificationsByClass.get(classID) ?? [])];
  }

  /**
   * 按提交者聚合待审信息（按 UID 升序）。
   *
   * 后台主页的优先级、提交数量、催审、助理意见等快捷筛选都基于这份聚合结果，
   * 组件不再直接遍历 `verifications` 表。
   */
  static getVerificationStats(): VerificationStats[] {
    const grouped = new Map<number, McmodVerification[]>();
    McmodRepository.getVerifications().forEach((verification) => {
      const list = grouped.get(verification.owner);
      if (list === undefined) grouped.set(verification.owner, [verification]);
      else list.push(verification);
    });

    return [...grouped.entries()]
      .map(([uid, verifications]) => {
        const suggestionTypes: SuggestionTypeID[] = [];
        let urgeCount = 0;
        let earliestSubmittedAt = Number.POSITIVE_INFINITY;
        let latestSubmittedAt = Number.NEGATIVE_INFINITY;

        verifications.forEach((verification) => {
          urgeCount += verification.urgeCount;
          earliestSubmittedAt = Math.min(earliestSubmittedAt, verification.createdAt);
          latestSubmittedAt = Math.max(latestSubmittedAt, verification.lastSubmittedAt);
          (verification.suggestions ?? []).forEach((suggestion) => {
            if (!suggestionTypes.includes(suggestion.type)) suggestionTypes.push(suggestion.type);
          });
        });

        return {
          user: McmodRepository.getUser(uid),
          verifications,
          count: verifications.length,
          urgeCount,
          earliestSubmittedAt,
          latestSubmittedAt,
          suggestionTypes,
        };
      })
      .sort((a, b) => a.user.uid - b.user.uid);
  }

  /** 获取当前有待审项的全部用户（按 UID 升序） */
  static getVerificationUsers(): User[] {
    return McmodRepository.getVerificationStats().map((stats) => stats.user);
  }

  // ---------------------------------------------------------------- 用户

  static findUser(uid: number): User | undefined {
    return McmodRepository.data.users[uid];
  }

  /** 获取指定 UID 用户的详细信息 */
  static getUser(uid: number): User {
    return requireRecord("users", McmodRepository.data.users, uid);
  }

  /**
   * 获取指定模组区域下的所有管理员用户信息（按 UID 升序，且**排除全域管理员**）。
   */
  static getUsersByManager(classID: number): User[] {
    const cached = McmodRepository.indexes.managersByClass.get(classID);
    const uids = cached ?? Object.keys(McmodRepository.data.users).map(Number);
    return uids
      .map((uid) => McmodRepository.data.users[uid])
      .filter(
        (user): user is User =>
          user !== undefined && !!user.adminModList?.split(",").map(Number).includes(classID),
      );
  }

  /**
   * 获取所有是全域编辑员、全域管理员、拥有任意编辑员区域，或是拥有任意管理员区域的用户列表。
   *
   * 顺序按 UID 升序；后台主页会再按最后登录时间重排。审核助理、普通用户与仅拥有
   * 开发者区域的用户不在结果里。
   */
  static getUsersWithEditorOrHigher(): User[] {
    return Object.values(McmodRepository.data.users)
      .filter((user) => hasEditorArea(user) || hasManagerArea(user))
      .sort((a, b) => a.uid - b.uid);
  }
}
