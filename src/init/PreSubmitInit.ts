import { createApp } from "vue";
import PreSubmitFrame from "../vue/components/PreSubmitFrame.vue";
import { McmodderInit } from "./Init";

export class PreSubmitInit extends McmodderInit {
  scheduleRequestUtils: any;
  canRun() {
    return false;
  }
  run() {
    const container = $('<div>').appendTo(".verify-list-frame").get(0);
    createApp(PreSubmitFrame, {
      parent: this.parent
    }).mount(container);
  }
}