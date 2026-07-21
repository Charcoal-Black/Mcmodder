import { McmodderUtils } from "../../Utils";

type PlatformMap = Record<string, Set<string>>;
type NodeMap = WeakMap<Set<string>, Record<string, HTMLElement>>;

export class PlatformCompareFrame {
  private static parse(node: JQuery): [PlatformMap, NodeMap] {
    const platforms: PlatformMap = {};
    const nodes: NodeMap = new Map;
    let category: Set<string>;
    let loaderName = "";
    let nodeRecord: Record<string, HTMLElement>;
    node.contents().each((_, p) => {
      if (p.nodeType === Node.ELEMENT_NODE) {
        loaderName = p.textContent.slice(0, -1);
        category = new Set;
        platforms[loaderName] = category;
        nodeRecord = {};
        nodes.set(category, nodeRecord);
      }
      else if (p.nodeType === Node.TEXT_NODE) {
        const text = (p as any as Text).data;
        const versionList = text.split(" / ");
        const newElement = $("<p>");
        versionList.forEach((version, index) => {
          category.add(version);
          const span = document.createElement("span");
          span.textContent = version;
          if (index > 0) {
            const slash = document.createTextNode(" / ");
            newElement.append(slash);
          }
          newElement.append(span);
          nodeRecord[version] = span;
        });
        p.replaceWith(newElement.get(0));
      }
    });
    return [platforms, nodes];
  }

  private static compare(from: PlatformMap, to: PlatformMap, nodes: NodeMap, className: string | string[]) {
    Object.entries(from).forEach(([loaderName, versions]) => {
      const toType = to[loaderName] ?? new Set;
      for (const version of versions) {
        if (!toType.has(version)) {
          const nodeRecord = nodes.get(versions);
          if (nodeRecord !== undefined) {
            const node = nodeRecord[version];
            if (!(className instanceof Array)) {
              className = [className];
            }
            className.forEach(e => {
              node.classList.add(e);
            });
            if (!McmodderUtils.validateVersionForLoaderName(version, loaderName)) {
              node.classList.add("mcmodder-compare-invalidversion");
            }
          }
        }
      }
    });
  }

  static performCompare(prev: JQuery, next: JQuery) {
    const [prevData, prevNodes] = this.parse(prev);
    const [nextData, nextNodes] = this.parse(next);
    this.compare(prevData, nextData, prevNodes, "mcmodder-compare-del");
    this.compare(nextData, prevData, nextNodes, "mcmodder-compare-ins");
  }
}