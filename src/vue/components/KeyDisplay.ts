import { h } from "vue";
import { Utils } from "../../Utils";

const KeyDisplay = (props: { keyData: Key }) => {
  const { keyData: key } = props;
  const list = Utils.keyToRawList(key);
  const isMac = Utils.isMac();
  const nodes = list.map(data => {
    if (isMac) {
      switch (data) {
        case "Ctrl": case "Control": {
          data = "⌃‌";
          break;
        }
        case "Shift": {
          data = "⇧";
          break;
        }
        case "Alt": case "Option": {
          data = "⌥";
          break;
        }
        case "Meta": case "Command": {
          data = "⌘";
        }
      }
    }
    return h("kbd", null, data);
  })
  return nodes;
}

KeyDisplay.props = ["keyData"];

export default KeyDisplay;