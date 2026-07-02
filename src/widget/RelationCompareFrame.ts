type RelationMap = Record<string, Record<string, Set<number>>>;
type NodeMap = WeakMap<Set<number>, Record<number, HTMLElement>>;

export class RelationCompareFrame {
  private static parse(node: JQuery): [RelationMap, NodeMap] {
    const relations: RelationMap = {};
    const nodes: NodeMap = new Map;
    let category: Record<string, Set<number>>;
    let title = "";
    node.children("p").each((_, p) => {
      const firstChild = p.firstChild;
      if ((firstChild as HTMLElement)?.classList?.contains("text-primary")) {
        title = (firstChild as HTMLElement).textContent;
        category = {};
        relations[title] = category;
      }
      else if (firstChild?.nodeType === Node.TEXT_NODE) {
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
            relationSet = new Set;
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

  private static compare(from: RelationMap, to: RelationMap, nodes: NodeMap, className: string) {
    Object.entries(from).forEach(([fromCategoryName, fromCategory]) => {
      const toCategory = to[fromCategoryName] ?? {};
      Object.entries(fromCategory).forEach(([fromTypeName, fromType]) => {
        const toType = toCategory[fromTypeName] ?? new Set;
        for (const fromID of fromType) {
          if (!toType.has(fromID)) {
            const nodeRecord = nodes.get(fromType);
            if (nodeRecord !== undefined) {
              const node = nodeRecord[fromID];
              node.classList.add(className);
            }
          }
        }
      })
    });
  }

  static performCompare(prev: JQuery, next: JQuery) {
    const [prevData, prevNodes] = this.parse(prev);
    const [nextData, nextNodes] = this.parse(next);
    this.compare(prevData, nextData, prevNodes, "mcmodder-compare-del");
    this.compare(nextData, prevData, nextNodes, "mcmodder-compare-ins");
  }
}