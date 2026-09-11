import { McmodderInit } from "./Init";
import StructureEditor from "../vue/components/StructureEditor.vue";
import { createApp } from "vue";

export class StructureEditorInit extends McmodderInit {
  canRun() {
    return this.parent.href === `${ this.parent.hostname }/mcmodder/structureeditor/` && 
      this.parent.utils.getConfig("enableStructureEditor");
  }

  async run() {
    const pageName = "结构编辑器";
    this.parent.title = pageName;
    $("title, .common-nav .item").html(pageName);
    $(".search-frame, .eat-frame").remove();

    const infoFrame = $(".info-frame").html('<div class="common-text" />');

    createApp(StructureEditor, {
      parent: this.parent
    }).mount(infoFrame.get(0));
  }
}