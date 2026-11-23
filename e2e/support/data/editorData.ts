/**
 * 后端实体 → 编辑页表单载荷。
 *
 * {@link ./types.ts} 描述的是「百科后端真正存下来的数据」，而
 * {@link McmodClassEditorInnerData} / {@link McmodItemEditorInnerData} 等描述的是
 * 编辑页 Bootstrap 控件导出的表单形状。两者刻意不同：后端用数组、数字和布尔值，
 * 编辑载荷则用数字索引对象、逗号分隔的字符串和数字字符串。
 *
 * 这个模块只做**单向**转换（后端 → 编辑载荷），供审核页复刻「当前的内容」等场景使用。
 * 后端没有记录的字段（图标、编辑说明等）不会凭空生成，保持缺省；后端独有、
 * 编辑页已经不再维护的统计字段也不会带进来。
 *
 * 所有转换结果都可以直接 `JSON.stringify`，并可在浏览器里求值。
 */
import type { Values } from "../../../src/Values";
import type {
  McmodAuthor,
  McmodAuthorRef,
  McmodClass,
  McmodItem,
  McmodLink,
  McmodPost,
  McmodTab,
  McmodVersion,
} from "./types";

type ClassEditorData = McmodClassEditorInnerData;
type VersionEditorData = McmodVersionEditorInnerData;
type ItemEditorData = McmodItemEditorInnerData;
type TabEditorData = McmodTabEditorInnerData;
type PostEditorData = McmodPostEditorInnerData;
type AuthorEditorData = McmodAuthorEditorInnerData;

/** 作者职位在编辑载荷中的取值 */
type AuthorPosition = keyof typeof Values.authorPositionMap | "";

/** 编辑载荷里的作者引用，和模组作者列表共用一份形状 */
type EditorAuthorRef = NonNullable<NonNullable<ClassEditorData["author"]>["link"]>[number];

/** 模组元素的表单值，例如 `"1,1"` */
type ClassCategory = ElementOf<typeof Values.classCategories>["value"];

/** 开源许可协议在编辑载荷里的形状 */
type ClassLicenseEntry = NonNullable<ClassEditorData["license"]>[number]["list"][number];

/** 把 `["a", "b"]` 转成编辑载荷要求的 `"a,b"` */
function joinList(list: readonly (string | number)[] | undefined): string | undefined {
  return list?.join(",");
}

/**
 * 把数组转成「数字索引 → 值」的对象。
 *
 * 编辑载荷里的 `Record<number, T>` 都只是借用了数组的顺序，并不真的是数组；
 * 这里统一用 `forEach` 生成，稀疏数组的空洞也会被跳过，不会写出 `undefined` 值。
 */
function toIndexedRecord<T, U>(
  list: readonly T[] | undefined,
  map: (value: T, index: number) => U,
): Record<number, U> | undefined {
  if (list === undefined) return undefined;
  const record: Record<number, U> = {};
  list.forEach((value, index) => {
    record[index] = map(value, index);
  });
  return record;
}

/** 把合成表槽位转换成「槽位号 → 字符串」，`null` 表示空槽位，直接跳过 */
function toSlotRecord(
  slots: readonly (string | number | null)[] | undefined,
): Record<number, string> | undefined {
  if (slots === undefined) return undefined;
  const record: Record<number, string> = {};
  slots.forEach((slot, index) => {
    if (slot !== null) record[index] = String(slot);
  });
  return record;
}

/** 把后端链接转换成编辑载荷里的链接记录 */
function toLinkRecords<S extends PropertyKey>(
  links: readonly McmodLink<S>[] | undefined,
): Record<number, { title: S; href: string; text: string; custom: string }> | undefined {
  return toIndexedRecord(links, (link) => ({
    title: link.site,
    href: link.url,
    text: link.text ?? "",
    custom: link.custom ?? "",
  }));
}

/** 把后端作者引用转换成编辑载荷里的作者记录 */
function toAuthorRefRecords(
  authors: readonly McmodAuthorRef[] | undefined,
): Record<number, EditorAuthorRef> | undefined {
  return toIndexedRecord(authors, (author) => {
    const record: EditorAuthorRef = { id: String(author.id) };
    if (author.select !== undefined) record.select = author.select as AuthorPosition[];
    if (author.custom !== undefined) record.custom = author.custom;
    return record;
  });
}

/**
 * 后端 `mcversion` 是「加载器 ID → 版本 ID 数组」，编辑载荷是
 * 「加载器 ID → { 顺序索引 → 版本 ID 字符串 }」。
 */
function toMCVersionRecord(mcversion: McmodClass["mcversion"]): ClassEditorData["mcversion"] {
  if (mcversion === undefined) return undefined;
  const record: Record<string, Record<number, keyof typeof Values.mcVersionMap>> = {};
  Object.entries(mcversion).forEach(([loader, versions]) => {
    record[loader] =
      toIndexedRecord(versions, (id) => String(id) as keyof typeof Values.mcVersionMap) ?? {};
  });
  // 编辑载荷的类型要求每个加载器都有键，但站点实际只读取已选择的加载器
  return record as NonNullable<ClassEditorData["mcversion"]>;
}

/**
 * 模组 → 模组编辑载荷。
 *
 * 只转换编辑页仍会提交的字段：后端独有的统计信息（推荐数、评分、指数走势等）
 * 以及编辑页已弃用的字段不会出现在结果里。
 */
export function toClassEditorInnerData(clazz: McmodClass): ClassEditorData {
  const data: ClassEditorData = { name: clazz.name };

  if (clazz.ename !== undefined) data.ename = clazz.ename;
  if (clazz.sname !== undefined) data.sname = clazz.sname;
  if (clazz.intro !== undefined) data.intro = clazz.intro;
  if (clazz.content !== undefined) data.content = clazz.content;
  if (clazz.cover !== undefined) data["cover-data"] = clazz.cover;
  if (clazz.modid !== undefined) data.modid = joinList(clazz.modid);
  if (clazz.cfprojectid !== undefined) data.cfprojectid = joinList(clazz.cfprojectid);
  if (clazz.mrprojectid !== undefined) data.mrprojectid = joinList(clazz.mrprojectid);
  if (clazz.keys !== undefined) data.keys = joinList(clazz.keys);
  if (clazz.tag !== undefined) data.tag = joinList(clazz.tag);

  if (clazz.activity !== undefined) data.activity = { 0: clazz.activity.join(",") };

  // 后端是 [大类 ID, 元素 ID]，编辑载荷是 "大类ID,元素ID"
  if (clazz.category !== undefined) {
    data.category = toIndexedRecord(
      clazz.category,
      ([group, element]) => `${group},${element}` as ClassCategory,
    );
  }

  if (clazz.mcversion !== undefined) data.mcversion = toMCVersionRecord(clazz.mcversion);

  if (clazz["mode-1"] !== undefined) {
    data["mode-1"] = {
      0: String(clazz["mode-1"]) as keyof typeof Values.modEnvironmentModeMap,
    };
  }
  if (clazz["mode-2"] !== undefined) {
    data["mode-2"] = {
      0: String(clazz["mode-2"]) as keyof typeof Values.modEnvironmentModeMap,
    };
  }

  if (clazz.platform !== undefined) {
    data.platform = toIndexedRecord(
      clazz.platform,
      (id) => String(id) as keyof typeof Values.modPlatformMap,
    );
  }
  if (clazz.api !== undefined) {
    data.api = toIndexedRecord(clazz.api, (id) => String(id) as ValueOf<typeof Values.loaderID>);
  }
  if (clazz.status !== undefined) {
    data.status = { 0: String(clazz.status) as keyof typeof Values.modStatusMap };
  }
  if (clazz.source !== undefined) {
    data.source = { 0: String(clazz.source) as keyof typeof Values.modSourceMap };
  }

  if (clazz.link !== undefined) data.link = toLinkRecords(clazz.link);

  if (clazz.relation !== undefined) {
    data.relation = toIndexedRecord(clazz.relation, (group) => ({
      title: group.title ?? "",
      list:
        toIndexedRecord(group.list, (entry) => ({
          type: String(entry.type) as keyof typeof Values.modRelationTypeMap,
          id: String(entry.id),
        })) ?? {},
    }));
  }

  if (clazz.license !== undefined) {
    data.license = toIndexedRecord(clazz.license, (group) => ({
      title: group.title ?? "",
      list:
        toIndexedRecord(group.list, (entry) => ({
          // 自定义类型在编辑载荷里是字符串，内置类型则是数组；后端统一存成数组
          type: entry.types as unknown as ClassLicenseEntry["type"],
          name: entry.name as keyof typeof Values.licenseName,
          link: entry.link ?? "",
          text: entry.text ?? "",
        })) ?? {},
    }));
  }

  // 后端只保存已收录的作者；编辑载荷里的 `add` 是本次编辑顺带新建的作者，后端不存在
  if (clazz.author !== undefined) {
    data.author = { link: toAuthorRefRecords(clazz.author) ?? {} };
  }

  return data;
}

/**
 * 更新日志 → 日志编辑载荷。
 *
 * 日志的字段本来就与编辑载荷同形（正文、MC 版本、版本号、更新日期），
 * 这里仍然复制一份，避免把仓库里冻结的实体对象直接交给组件改动。
 */
export function toVersionEditorInnerData(version: McmodVersion): VersionEditorData {
  const data: VersionEditorData = { name: version.name };

  if (version.content !== undefined) data.content = version.content;
  if (version.mcversion !== undefined) data.mcversion = version.mcversion;
  if (version.updatetime !== undefined) data.updatetime = version.updatetime;

  return data;
}

/**
 * 资料 → 资料编辑载荷。
 *
 * `quote` / `jumpTo` 属于后台资料关系，编辑页没有对应字段；`generalTo` 仍可映射为
 * 「综合子资料」标记。`is-general-parents` 需要反查整张资料表，不在单条记录的
 * 转换里推断。
 */
export function toItemEditorInnerData(item: McmodItem): ItemEditorData {
  const data: ItemEditorData = { name: item.name };

  if (item.ename !== undefined) data.ename = item.ename;
  if (item.content !== undefined) data.content = item.content;
  if (item.cover !== undefined) data["cover-data"] = item.cover;
  if (item.oredict !== undefined) data.oredict = joinList(item.oredict);
  if (item.regname !== undefined) data.regname = item.regname;
  if (item.damage !== undefined) data.damage = String(item.damage);
  if (item.maxstack !== undefined) data.maxstack = String(item.maxstack);
  if (item.metadata !== undefined) data.metadata = String(item.metadata);

  if (item.tool !== undefined) {
    data.tool = toIndexedRecord(item.tool, (id) => ({ id: String(id) }));
  }
  if (item.generalTo !== undefined) data["is-general-node"] = "1";

  return data;
}

/**
 * 合成表 → 合成表编辑载荷。
 *
 * 后端的槽位数组用 `null` 表示空槽位，编辑载荷则直接省略对应的索引键；
 * 两者在语义上等价，转换时保留槽位号，避免数组被压缩后原料错位。
 */
export function toTabEditorInnerData(tab: McmodTab): TabEditorData {
  const data: TabEditorData = {};

  if (tab.gui !== undefined) data.gui = String(tab.gui);
  // 后端布尔值到编辑载荷是反直觉的映射：有序 = "0"，无序 = "1"
  if (tab.orderly !== undefined) data.orderly = { 0: tab.orderly ? "0" : "1" };

  if (tab.others !== undefined) {
    data.others = toIndexedRecord(tab.others, (id) => String(id));
  }
  if (tab["slot-in-item"] !== undefined) {
    data["slot-in-item"] = toSlotRecord(tab["slot-in-item"]);
  }
  if (tab["slot-in-number"] !== undefined) {
    data["slot-in-number"] = toSlotRecord(tab["slot-in-number"]);
  }
  if (tab["slot-in-chance"] !== undefined) {
    data["slot-in-chance"] = toSlotRecord(tab["slot-in-chance"]);
  }
  if (tab["slot-out-item"] !== undefined) {
    data["slot-out-item"] = toSlotRecord(tab["slot-out-item"]);
  }
  if (tab["slot-out-number"] !== undefined) {
    data["slot-out-number"] = toSlotRecord(tab["slot-out-number"]);
  }
  if (tab["slot-out-chance"] !== undefined) {
    data["slot-out-chance"] = toSlotRecord(tab["slot-out-chance"]);
  }
  if (tab["slot-fuel-number"] !== undefined) {
    data["slot-fuel-number"] = toSlotRecord(tab["slot-fuel-number"]);
  }

  if (tab.startver !== undefined) data.startver = String(tab.startver);
  if (tab.endver !== undefined) data.endver = String(tab.endver);
  if (tab.text !== undefined) data.text = tab.text;

  return data;
}

/**
 * 教程 → 教程编辑载荷。
 *
 * 后端的关联分区是一个有序数组，第 0 项为主要分区；编辑载荷要把主要分区同时放进
 * `relation.main` 和 `relation.list`。`personal` 则映射为 `owned` 的第一个键。
 */
export function toPostEditorInnerData(post: McmodPost): PostEditorData {
  const relationList =
    toIndexedRecord(post.relation, (relation) => ({
      id: relation.id,
      type: relation.type,
      remark: relation.remark,
    })) ?? {};
  const relationMain = relationList[0] ?? { id: "", type: "mod", remark: "" };

  const data: PostEditorData = {
    name: post.name,
    relation: { main: relationMain, list: relationList },
    // 站点只读取第一个键的值：0 = 社区教程，1 = 个人教程
    owned: { 0: post.personal ? "1" : "0" } as Record<0 | 1, "0" | "1">,
  };

  if (post.copyright !== undefined) data.copyright = { ...post.copyright };
  if (post.content !== undefined) data.content = post.content;
  if (post.cover !== undefined) data["cover-data"] = post.cover;

  return data;
}

/**
 * 作者/开发团队 → 作者编辑载荷。
 *
 * 后端 `names` 的第 0 项是主要名称，编辑页还要把主要名称重复放进 `name.list`。
 * 团队成员在编辑载荷里是 `member` 数组，直接沿用后端的顺序。
 */
export function toAuthorEditorInnerData(author: McmodAuthor): AuthorEditorData {
  const names = author.names.length > 0 ? author.names : [""];
  const data: AuthorEditorData = {
    name: {
      main: names[0],
      list: toIndexedRecord(names, (name) => ({ name })) ?? {},
    },
  };

  if (author.content !== undefined) data.content = author.content;
  if (author.link !== undefined) data.link = toLinkRecords(author.link);
  if (author.team !== undefined) data.team = { 0: author.team ? "1" : "0" };

  if (author.avatarType !== undefined) {
    // 站点只用第一个键，但类型上写成了完整的 0 | 1 | 2 | 3 记录
    data["avatar-type"] = { [author.avatarType]: "1" } as Record<0 | 1 | 2 | 3, "1">;
  }
  if (author.avatarValue !== undefined) data["avatar-value"] = author.avatarValue;

  if (author.members !== undefined && author.members.length > 0) {
    data.member = Object.values(toAuthorRefRecords(author.members) ?? {});
  }

  return data;
}
