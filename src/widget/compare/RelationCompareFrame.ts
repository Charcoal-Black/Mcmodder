import { Utils } from "../../Utils";
import { Values } from "../../Values";

/**
 * ```
 * [条件组名称]: {
 *   前置: [模组列表],
 *   拓展: [模组列表],
 *   联动: [模组列表],
 * }
 * ```
 */
type RelationMap = Record<string, Record<string, Set<number>>>;

/**
 * ```
 * [模组列表]: {
 *   [模组 ID]: [描述该模组的 DOM 元素]
 * }
 * ```
 */
type NodeMap = WeakMap<Set<number>, Record<number, HTMLElement>>;

/**
 * 为模组关系提供编辑版本对比功能。
 *
 * 原始 HTML 范例：
 * ```html
 * <p><b class="text-primary">通用</b></p>
 * <p>[前置] ID:2021 机械动力 (Create)</p>
 * ```
 */
export class RelationCompareFrame {
  private static parse(node: JQuery): [RelationMap, NodeMap] {
    const relations: RelationMap = {};
    const nodes: NodeMap = new Map();
    let category: Record<string, Set<number>>;
    let title = "";
    node.children("p").each((_, p) => {
      const firstChild = p.firstChild;
      if ((firstChild as HTMLElement)?.classList?.contains("text-primary")) {
        title = (firstChild as HTMLElement).textContent;
        category = {};
        relations[title] = category;
      } else if (firstChild?.nodeType === Node.TEXT_NODE) {
        const type = (firstChild as Text).data.trim();
        const length = type.length;
        if (type.charAt(0) === "[" && type.charAt(length - 1) === "]") {
          const typeName = type.slice(1, length - 1);
          const lastChild = p.lastChild as HTMLElement;
          const linkText = lastChild.textContent;
          const space = linkText.indexOf(" ");
          const id = Number(linkText.slice(3, space));
          let relationSet = category[typeName];
          let nodeMap;
          if (relationSet === undefined) {
            relationSet = new Set();
            nodeMap = {};
            nodes.set(relationSet, nodeMap);
            category[typeName] = relationSet;
          } else {
            nodeMap = nodes.get(relationSet)!;
          }
          relationSet.add(id);
          nodeMap[id] = p as HTMLElement;
        }
      }
    });
    return [relations, nodes];
  }

  private static compare(
    from: RelationMap,
    to: RelationMap,
    nodes: NodeMap,
    className: string | string[],
  ) {
    Object.entries(from).forEach(([fromCategoryName, fromCategory]) => {
      const toCategory = to[fromCategoryName] ?? {};
      Object.entries(fromCategory).forEach(([fromTypeName, fromType]) => {
        const toType = toCategory[fromTypeName] ?? new Set();
        for (const fromID of fromType) {
          if (!toType.has(fromID)) {
            const nodeRecord = nodes.get(fromType);
            if (nodeRecord !== undefined) {
              const node = nodeRecord[fromID];
              if (!(className instanceof Array)) {
                className = [className];
              }
              className.forEach((e) => {
                node.classList.add(e);
              });
            }
          }
        }
      });
    });
  }

  private static convert(data: RelationMap) {
    const result: NonNullable<McmodClassEditorInnerData["relation"]> = {};
    let index = 0;
    Object.entries(data).forEach(([title, relations]) => {
      const list: ValueOf<typeof result> = {
        title,
        list: {},
      };
      let innerIndex = 0;
      Object.entries(relations).forEach(([typeName, ids]) => {
        const typeID = Utils.getKeyValueOfObject(Values.reversedModRelationTypeMap, typeName);
        if (typeID !== undefined) {
          ids.forEach((id) => {
            list.list[innerIndex++] = { type: typeID, id: id.toString() };
          });
        } else {
          console.warn("未知的模组关系类型: " + typeName);
        }
      });
      result[index++] = list;
    });
    return result;
  }

  static parseAndPerformCompare(prev: JQuery, next: JQuery) {
    const [prevData, prevNodes] = this.parse(prev);
    const [nextData, nextNodes] = this.parse(next);
    this.compare(prevData, nextData, prevNodes, [
      "mcmodder-compare-del",
      "mcmodder-compare-diffline",
    ]);
    this.compare(nextData, prevData, nextNodes, [
      "mcmodder-compare-ins",
      "mcmodder-compare-diffline",
    ]);
    return this.convert(nextData);
  }
}
