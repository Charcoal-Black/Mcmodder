import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";
import { ItemTabInit } from "./ItemTabInit";

export class OredictPageInit extends McmodderInit{
  canRun() {
    return this.parent.href.includes("/oredict/") &&
      this.parent.utils.getConfig("advancedOredictPage");
  }

  run() {
    $("div.icon-128x img").remove();
    const sortFrame = $(`<div class="mcmodder-mod-sort">`).appendTo(".oredict-frame");
    const sortInput = $(`<input id="mcmodder-mod-search" placeholder="输入模组名称或编号以筛选..." class="form-control">`).appendTo(sortFrame);
    const sortContainer = $(`<div class="mcmodder-mod-container">`).appendTo(sortFrame);
    $(".oredict-item-list li").each((_, _li) => {
      const li = $(_li);
      const modName = li.find("div.sub.class a").text();
      const modID = McmodderUtils.abstractLastFromURL(li.find("div.sub.class a").first().prop("href"), "class");
      if (!sortContainer.find(`fieldset[data-modid=${ modID }]`).length)
        $(`<fieldset data-modid="${ modID }" data-modname="${ modName }">
          <legend>
            <a href="/class/${ modID }.html" target="_blank">${ modName }</a>
          </legend>
          <div class="oredict-item-list">
            <ul></ul>
          </div>
        </fieldset>`).appendTo(sortContainer);
      li.find(".sub.class").remove();
      sortContainer.find(`[data-modid=${ modID }] ul`).append(li);
    });

    sortContainer.children().each((_, _fieldset) => {
      const fieldset = $(_fieldset);
      const list = fieldset.find("ul");
      const count = list.children().length;
      fieldset.css("grid-column", `span min(${ count }, var(--mcmodder-oredict-column))`);
      list.css("grid-template-columns", `repeat(min(${ count }, var(--mcmodder-oredict-column)), 1fr)`);
    });

    $(window).resize(McmodderUtils.throttle((_e: JQueryEventObject) => {
      const width = sortContainer.get(0).getBoundingClientRect().width;
      const column = Math.floor(width / 300);
      document.documentElement.style.setProperty("--mcmodder-oredict-column", column.toString());
    }, 16)).resize();

    sortFrame.insertBefore($(".oredict-item-list").first());

    sortInput.change(e => {
      const value = (e.currentTarget as HTMLInputElement).value.trim();
      const children = sortContainer.children();
      if (value === "") {
        children.show();
        return;
      }
      const values = value.toLowerCase().split(/\s+/);
      children.hide();
      children.each((_, _fieldset) => {
        const fieldset = $(_fieldset);
        const modid = fieldset.attr("data-modid");
        const modname = fieldset.attr("data-modname").toLowerCase();
        values.forEach(value => {
          if (modid.includes(value) || modname.includes(value)) {
            fieldset.show();
          }
        });
      });
    });
    new ItemTabInit(this.parent).run();
  }
}