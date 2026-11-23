/**
 * 种子数据的外键与形状校验。
 *
 * 模拟数据库最容易出现的错误不是崩溃，而是**渲染出半张表**：某个用例随手写了
 * `class-id: "1172"`，然后深层模板里 `undefined.name` 才炸，堆栈指不到数据源。
 * 所以这里在数据装填时把「引用了不存在的记录」一次性收集起来，直接报出字段路径。
 *
 * 校验只覆盖**库内引用**；用例（`admin/verify/**\/cases.ts`）引用了库里的什么 ID，
 * 属于用例自己的约束，交给用例断言。
 *
 * 注意 `oredictIndex`：它是独立于资料 `oredict` 的索引表，允许暂时滞后，
 * 因此这里**不**要求索引标签与资料自身标签一致，只要求索引指向的资料存在。
 */
import { Values } from "../../../src/Values";
import { normalizeOredict } from "./oredict";
import type { RepositoryData } from "./types";

/** 可以「按数字 ID 取一条」的表；`oredictIndex` 是索引表，不在此列 */
type IdTable = Exclude<keyof RepositoryData, "oredictIndex">;

/** 校验一组文本：不允许空串，避免把「漏填」伪装成合法数据 */
function requireTextList(list: string[] | undefined, path: string, problems: string[]): void {
  list?.forEach((value, index) => {
    if (value.trim() === "") problems.push(`${path}[${index}] 为空`);
  });
}

/**
 * 校验种子数据，不合法时抛出包含全部问题的聚合错误。
 *
 * 调用点有两处：模块加载时校验默认种子（写错立刻炸），以及 {@link McmodRepository.hydrate}
 * 时校验注入的数据（抓包/低代码存储导出的数据同样不可信）。
 */
export function validateRepositoryData(data: RepositoryData): void {
  const problems: string[] = [];

  const exists = (table: IdTable, id: number) => Object.hasOwn(data[table], id);

  /** 校验一个「指向 table 里某条记录」的 ID 字段 */
  const requireRef = (table: IdTable, id: number, path: string, source: number | string) => {
    if (!Number.isInteger(id) || id <= 0) {
      problems.push(`${path} 不是正整数：${source}`);
    } else if (!exists(table, id)) {
      problems.push(`${path} 指向不存在的 ${table} 记录：${id}`);
    }
  };

  /** 键名与实体的 ID 字段必须一致，否则「按 ID 取」会拿到错的那条 */
  const requireKey = (key: string, id: number, path: string) => {
    if (Number(key) !== id) problems.push(`${path}.id 为 ${id}，与键名 ${key} 不一致`);
  };

  Object.entries(data.authors).forEach(([key, author]) => {
    const path = `authors[${key}]`;
    requireKey(key, author.id, path);

    if (author.names.length === 0) {
      problems.push(`${path}.names 为空`);
    } else if (author.names[0].trim() === "") {
      problems.push(`${path}.names[0]（主要名称）为空`);
    }
    requireTextList(author.names, `${path}.names`, problems);
    (author.link ?? []).forEach((link, index) => {
      if (!link.site) problems.push(`${path}.link[${index}].site 为空`);
      if (!link.url) problems.push(`${path}.link[${index}].url 为空`);
    });
    (author.members ?? []).forEach((member, index) =>
      requireRef("authors", member.id, `${path}.members[${index}].id`, member.id),
    );
  });

  Object.entries(data.classes).forEach(([key, clazz]) => {
    const path = `classes[${key}]`;
    requireKey(key, clazz.id, path);

    requireTextList(clazz.modid, `${path}.modid`, problems);
    requireTextList(clazz.mrprojectid, `${path}.mrprojectid`, problems);
    requireTextList(clazz.keys, `${path}.keys`, problems);
    requireTextList(clazz.tag, `${path}.tag`, problems);
    requireTextList(clazz.activity, `${path}.activity`, problems);

    (clazz.cfprojectid ?? []).forEach((id, index) => {
      if (!Number.isInteger(id) || id <= 0) {
        problems.push(`${path}.cfprojectid[${index}] 不是正整数：${id}`);
      }
    });
    (clazz.category ?? []).forEach(([group, id], index) => {
      if (!Number.isInteger(group) || !Number.isInteger(id) || group < 0 || id <= 0) {
        problems.push(`${path}.category[${index}] 不是两个正整数：[${group}, ${id}]`);
      }
    });
    (clazz.platform ?? []).forEach((id, index) => {
      if (!Number.isInteger(id) || id <= 0) {
        problems.push(`${path}.platform[${index}] 不是正整数：${id}`);
      }
    });
    (clazz.api ?? []).forEach((id, index) => {
      if (!Number.isInteger(id) || id <= 0) {
        problems.push(`${path}.api[${index}] 不是正整数：${id}`);
      }
    });
    Object.entries(clazz.mcversion ?? {}).forEach(([loader, versions]) => {
      if (!Number.isInteger(Number(loader)) || Number(loader) <= 0) {
        problems.push(`${path}.mcversion 的加载器键不是正整数：${loader}`);
      }
      versions.forEach((id, index) => {
        if (!Number.isInteger(id) || id <= 0) {
          problems.push(`${path}.mcversion[${loader}][${index}] 不是正整数：${id}`);
        }
      });
    });

    (clazz.link ?? []).forEach((link, index) => {
      if (!link.site) problems.push(`${path}.link[${index}].site 为空`);
      if (!link.url) problems.push(`${path}.link[${index}].url 为空`);
    });

    (clazz.relation ?? []).forEach((group, groupIndex) => {
      (group.list ?? []).forEach((entry, index) => {
        requireRef(
          "classes",
          entry.id,
          `${path}.relation[${groupIndex}].list[${index}].id`,
          entry.id,
        );
      });
    });

    (clazz.author ?? []).forEach((author, index) =>
      requireRef("authors", author.id, `${path}.author[${index}].id`, author.id),
    );
  });

  Object.entries(data.items).forEach(([key, item]) => {
    const path = `items[${key}]`;
    requireKey(key, item.id, path);
    requireRef("classes", item.classID, `${path}.classID`, item.classID);

    (item.quote ?? []).forEach((id, index) =>
      requireRef("items", id, `${path}.quote[${index}]`, id),
    );
    (item.tool ?? []).forEach((id, index) => requireRef("items", id, `${path}.tool[${index}]`, id));
    if (item.generalTo !== undefined) {
      requireRef("items", item.generalTo, `${path}.generalTo`, item.generalTo);
    }
    if (item.jumpTo !== undefined) {
      requireRef("items", item.jumpTo, `${path}.jumpTo`, item.jumpTo);
    }

    // 资料自身可以登记任意标签；这里只检查书写质量，不要求它已进入索引表
    const tags = new Set<string>();
    (item.oredict ?? []).forEach((tag, index) => {
      const normalized = normalizeOredict(tag);
      if (!normalized) problems.push(`${path}.oredict[${index}] 为空`);
      if (tags.has(normalized)) problems.push(`${path}.oredict[${index}] 重复：${tag}`);
      tags.add(normalized);
    });
  });

  Object.entries(data.tabs).forEach(([key, tab]) => {
    const path = `tabs[${key}]`;
    requireKey(key, tab.id, path);
    requireRef("items", tab.itemID, `${path}.itemID`, tab.itemID);

    if (tab.gui !== undefined) {
      requireRef("guis", tab.gui, `${path}.gui`, tab.gui);
    }
    (tab.others ?? []).forEach((id, index) =>
      requireRef("classes", id, `${path}.others[${index}]`, id),
    );

    (
      [
        ["slot-in-item", true],
        ["slot-out-item", false],
      ] as const
    ).forEach(([field, allowTag]) => {
      (tab[field] ?? []).forEach((slot, index) => {
        if (slot === null) return;
        if (typeof slot === "number") {
          requireRef("items", slot, `${path}.${field}[${index}]`, slot);
        } else if (!allowTag) {
          problems.push(`${path}.${field}[${index}] 产物槽位只能是资料 ID：${slot}`);
        } else if (slot.trim() === "") {
          problems.push(`${path}.${field}[${index}] 为空`);
        }
      });
    });
  });

  Object.entries(data.guis).forEach(([key, gui]) => {
    const path = `guis[${key}]`;
    requireKey(key, gui.guiID, path);
    requireRef("classes", gui.classID, `${path}.classID`, gui.classID);
    requireRef("items", gui.itemID, `${path}.itemID`, gui.itemID);

    if (gui.width < 320 || gui.width > 520) {
      problems.push(`${path}.width 必须介于 320 ~ 520 之间：${gui.width}`);
    }
    if (gui.height < 160 || gui.height > 600) {
      problems.push(`${path}.width 必须介于 160 ~ 600 之间：${gui.height}`);
    }

    Object.entries(gui.power)?.forEach(([index, text]) => {
      const slot = text?.matchAll(/%s/g);
      if (slot === undefined) {
        problems.push(`${path}.power[${index}] 缺少 %s 标记：${text}`);
      } else if ([...slot].length > 1) {
        problems.push(`${path}.power[${index}] 存在多个 %s 标记：${text}`);
      }
    });
  });

  Object.entries(data.users).forEach(([key, user]) => {
    requireKey(key, user.uid, `users[${key}]`);
  });

  Object.entries(data.verifications).forEach(([key, verification]) => {
    const path = `verifications[${key}]`;
    requireKey(key, verification.id, path);
    requireRef("users", verification.owner, `${path}.owner`, verification.owner);
    requireRef("classes", verification.classID, `${path}.classID`, verification.classID);

    const action = Values.editActionIDMap[verification.action];
    if (action === undefined) {
      problems.push(`${path}.action 不是合法的编辑动作：${verification.action}`);
    } else if (action.type !== verification.type) {
      problems.push(
        `${path}.type 为 ${verification.type}，但动作 ${verification.action} 属于类型 ${action.type}`,
      );
    }

    if (!Number.isFinite(verification.createdAt)) {
      problems.push(`${path}.createdAt 不是有效时间戳：${verification.createdAt}`);
    }
    if (!Number.isFinite(verification.lastSubmittedAt)) {
      problems.push(`${path}.lastSubmittedAt 不是有效时间戳：${verification.lastSubmittedAt}`);
    }
    if (verification.createdAt > verification.lastSubmittedAt) {
      problems.push(`${path}.createdAt 晚于 lastSubmittedAt`);
    }

    if (!Number.isInteger(verification.urgeCount) || verification.urgeCount < 0) {
      problems.push(`${path}.urgeCount 不是非负整数：${verification.urgeCount}`);
    }
    if (verification.urgeCount > 0 && !verification.urgeAt) {
      problems.push(`${path}.urgeCount 为 ${verification.urgeCount}，但缺少 urgeAt 或为 0`);
    }
    if (verification.urgeCount === 0 && verification.urgeAt) {
      problems.push(`${path}.urgeCount 为 0，但存在 urgeAt 且不为 0`);
    }

    if (!Number.isInteger(verification.refundCount) || verification.refundCount < 0) {
      problems.push(`${path}.refundCount 不是非负整数：${verification.refundCount}`);
    }
    if (verification.refundCount > 0) {
      if (verification.refunder === undefined) {
        problems.push(`${path}.refundCount 为 ${verification.refundCount}，但缺少 refunder`);
      } else {
        requireRef("users", verification.refunder, `${path}.refunder`, verification.refunder);
      }
      if (verification.refundAt === undefined) {
        problems.push(`${path}.refundCount 为 ${verification.refundCount}，但缺少 refundAt`);
      }
    } else if (verification.refunder || verification.refundAt || verification.refundReason) {
      problems.push(`${path}.refundCount 为 0，但仍存在非空的退回记录字段`);
    }

    (verification.suggestions ?? []).forEach((suggestion, index) => {
      const suggestionPath = `${path}.suggestions[${index}]`;
      if (Values.suggestionIDMap[suggestion.type] === undefined) {
        problems.push(`${suggestionPath}.type 不是合法的意见类型：${suggestion.type}`);
      }
      requireRef(
        "users",
        suggestion.assistant,
        `${suggestionPath}.assistant`,
        suggestion.assistant,
      );
      if (!Number.isFinite(suggestion.createdAt)) {
        problems.push(`${suggestionPath}.createdAt 不是有效时间戳：${suggestion.createdAt}`);
      }
    });
  });

  const normalizedTags = new Map<string, string>();
  data.oredictIndex.forEach((row, index) => {
    const normalized = normalizeOredict(row.tag);
    if (!normalized) problems.push(`oredictIndex[${index}].tag 为空`);
    const previous = normalizedTags.get(normalized);
    if (previous !== undefined && previous !== row.tag) {
      problems.push(`oredictIndex 中「${previous}」与「${row.tag}」规范化后重复`);
    }
    normalizedTags.set(normalized, row.tag);

    if (row.itemIDs.length === 0) {
      problems.push(`oredictIndex[${index}]（${row.tag}）没有索引到任何资料`);
    }
    row.itemIDs.forEach((id, itemIndex) =>
      requireRef("items", id, `oredictIndex[${index}].itemIDs[${itemIndex}]`, id),
    );
  });

  if (problems.length > 0) {
    throw new Error(
      ["McmodRepository 种子数据不合法：", ...problems.map((problem) => `  - ${problem}`)].join(
        "\n",
      ),
    );
  }
}
