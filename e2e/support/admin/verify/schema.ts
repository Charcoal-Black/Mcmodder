import type { Values } from "../../../../src/Values";
import type { McmodVerification } from "../../data/types";
import type { AuthorEdition } from "./author/schema";
import type { ClassEdition } from "./class/schema";
import type { ItemEdition } from "./item/schema";
import type { PostEdition } from "./post/schema";
import type { TabEdition } from "./tab/schema";
import type { VersionEdition } from "./version/schema";

/**
 * 各类编辑共用的审核数据类型。
 */
export type BaseEdition<
  T extends object,
  K extends keyof typeof Values.editActionTypeMap,
> = McmodVerification & {
  /**
   * 所提交的内容；为简化模拟逻辑，只定义需要测试的键即可，
   * 最终返回的数据里也只会渲染这里定义的键。
   */
  edit: T;
  /**
   * 提交之前的内容。只有在 `edit.action` 以 `_edit` 为后缀（即属于修改类编辑）时才可能会渲染。
   *
   * 默认固定以 `McmodRepository` 里的信息为准。特殊情况（例如，测试需求）
   * 可以重写此字段以覆盖源数据。
   */
  original?: T;
  /** 编辑类型 */
  type: K;
  /** 操作类型 */
  action: (typeof Values.editActionTypeMap)[K]["id"];
};

export type Edition =
  ClassEdition | VersionEdition | ItemEdition | TabEdition | PostEdition | AuthorEdition;

export type ReplaceKey<
  T extends Record<PropertyKey, unknown>,
  U extends Record<PropertyKey, PropertyKey>,
> = {
  [K in Exclude<keyof T, keyof U>]: T[K];
} & {
  [K in ValueOf<U>]: ReverseMap<U>[K] extends keyof T ? T[K] : never;
};

export function replaceKey<
  T extends Record<PropertyKey, unknown>,
  U extends Record<PropertyKey, PropertyKey>,
>(obj: T, replaceWith: U) {
  const result: Record<PropertyKey, unknown> = {};
  Object.entries(obj).forEach(([key, value]) => {
    result[replaceWith[key] ?? key] = value;
  });
  return result as ReplaceKey<T, U>;
}

/**
 * 审核表格单元格的「键 + 值」联合类型。
 *
 * 键和值分成两个 prop 传时，TypeScript 无法在模板里由 `fieldKey === 'content'`
 * 推断出 `fieldValue` 的具体类型；把两者收进同一个对象后，判键即可自动收窄值，
 * 单元格组件里不必再逐处写 `as`。
 *
 * `-?` 不能省：`VerifyTableRows` 沿用了源数据的可选修饰符，映射类型若保留它们，
 * 索引出来的联合类型就会混进 `undefined`，`field` 本身也会变成「可能为 undefined」。
 */
export type VerifyField<T extends object> = {
  [K in keyof T]-?: {
    key: K;
    value: Required<T>[K] | undefined;
  };
}[keyof T];

/**
 * 构造 {@link ClassVerifyField}。
 *
 * `key` 与 `value` 的关联无法由泛型直接证明，因此断言只集中在这里出现一次。
 */
export function verifyField<T extends object, K extends keyof T>(
  key: K,
  value: Required<T>[K] | undefined,
) {
  return { key, value } as VerifyField<T>;
}

/**
 * 审核表格的一行。
 *
 * `type` 用来在模板里区分模组与资料，`current` / `original` 则是已经和键绑定的值，
 * 对应单元格组件可以直接使用，不必再关心字段类型。
 */
export type VerifyRow =
  | {
      type: "class";
      key: keyof typeof Values.classEditVerifyTableFields;
      label: string;
      current: McmodClassEditorInnerData;
      original: McmodClassEditorInnerData;
    }
  | {
      type: "version";
      key: keyof typeof Values.versionEditVerifyTableFields;
      label: string;
      current: McmodVersionEditorInnerData;
      original: McmodVersionEditorInnerData;
    }
  | {
      type: "item";
      key: keyof typeof Values.itemEditVerifyTableFields;
      label: string;
      current: McmodItemEditorInnerData;
      original: McmodItemEditorInnerData;
    }
  | {
      type: "tab";
      key: keyof typeof Values.tabEditVerifyTableFields;
      label: string;
      current: McmodTabEditorInnerData;
      original: McmodTabEditorInnerData;
    }
  | {
      type: "post";
      key: keyof typeof Values.postEditVerifyTableFields;
      label: string;
      current: McmodPostEditorInnerData;
      original: McmodPostEditorInnerData;
    }
  | {
      type: "author";
      key: keyof typeof Values.authorEditVerifyTableFields;
      label: string;
      current: McmodAuthorEditorInnerData;
      original: McmodAuthorEditorInnerData;
    };
