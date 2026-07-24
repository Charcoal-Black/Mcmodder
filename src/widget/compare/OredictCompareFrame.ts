import { McmodderUtils } from "../../Utils";

type OredictSet = Set<string>;
type NodeMap = Record<string, HTMLElement>;

export class OredictCompareFrame {
  private static parse(node: JQuery): [OredictSet, NodeMap] {
    const oredictSet: OredictSet = new Set;
    const nodes: NodeMap = {};
    node.contents().each((_, p) => {
      const text = (node.contents().get(0) as any as Text).data;
      if (text === "-") {
        return;
      }
      const oredictList = text.split(" / ");
      const newElement = $("<p>");
      oredictList.forEach((oredict, index) => {
        oredictSet.add(oredict);
        const anchor = McmodderUtils.URLToAnchor(McmodderUtils.getOredictURL(oredict), oredict);
        if (index > 0) {
          const slash = document.createTextNode(" / ");
          newElement.append(slash);
        }
        newElement.append(anchor);
        nodes[oredict] = anchor.get(0) as HTMLElement;
      });
      p.replaceWith(newElement.get(0));
    });
    return [oredictSet, nodes];
  }

  private static compare(from: OredictSet, to: OredictSet, nodes: NodeMap, className: string | string[]) {
    for (const oredict of from) {
      if (to.size && !to.has(oredict)) {
        const node = nodes[oredict];
        if (!(className instanceof Array)) {
          className = [className];
        }
        className.forEach(e => {
          node.classList.add(e);
        });
      }
    }
  }

  static performCompare(prev: JQuery, next: JQuery) {
    const [prevData, prevNodes] = this.parse(prev);
    const [nextData, nextNodes] = this.parse(next);
    this.compare(prevData, nextData, prevNodes, "mcmodder-compare-del");
    this.compare(nextData, prevData, nextNodes, "mcmodder-compare-ins");
  }
}