import { createTextVNode, h, type VNode } from "vue";
import { Utils } from "../../Utils";

const MatchedText = (props: { text: string; ranges?: ([number, number] | undefined)[] }) => {
  const { text, ranges } = props;

  const length = text.length;
  const sortedRanges = (ranges ?? [])
    .filter(
      (range) =>
        range !== undefined &&
        Utils.isClamp(range[0], 0, length) &&
        Utils.isClamp(range[1], 0, length),
    )
    .sort((a, b) => a![0] - b![0]) as ([number, number] | null)[];
  const rangeCount = sortedRanges.length;
  let j = 0;
  for (let i = 1; i < rangeCount; i++) {
    if (sortedRanges[j]![1] >= sortedRanges[i]![0]) {
      if (sortedRanges[i]![1] <= sortedRanges[j]![1]) {
        sortedRanges[i] = null;
      } else {
        sortedRanges[i]![0] = sortedRanges[j]![0];
        sortedRanges[j] = null;
        j = i;
      }
    } else {
      j = i;
    }
  }
  const normalizedRanges = sortedRanges.filter((range) => range !== null);

  const nodes: VNode[] = [];
  let pos = 0;
  normalizedRanges.forEach(([l, r]) => {
    if (l - pos > 0) {
      nodes.push(createTextVNode(text.slice(pos, l)));
    }
    if (r - l > 0) {
      nodes.push(h("mark", null, text.slice(l, r)));
    }
    pos = r;
  });
  if (length - pos > 0) {
    nodes.push(createTextVNode(text.slice(pos, length)));
  }
  return nodes;
};

MatchedText.props = ["text", "ranges"];

export default MatchedText;
