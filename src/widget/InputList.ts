import { InputRatedRecommendation, InputRecommendation, InputSimplifiedRecommendation } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";

type InputListOnInitRecommendation = () => InputSimplifiedRecommendation[];
type InputListOnModifyRecommendation = (list: InputRecommendation[]) => boolean;

export class InputList {
  private readonly container: JQuery;
  private readonly inputNode: JQuery;
  private readonly inputList: JQuery;
  private readonly input: HTMLInputElement | HTMLTextAreaElement;
  private recommendationList: InputRecommendation[] = [];
  private selected = 0;
  private listLength = 0;
  private isFocused = false;
  private canCreateNew = false;
  private selectable = false;
  private readonly onInitRecommendation: InputListOnInitRecommendation;
  private readonly onModifyRecommendation?: InputListOnModifyRecommendation;
  private readonly delimiter?: string;
  private readonly hideBeforeInput: boolean;

  private static readonly intlCollator = new Intl.Collator("zh");
  static readonly loadRecommendationFromConfig = (utils: McmodderUtils, key: string, defaultValue = McmodderValues.defaultInputRecommendation[key] ?? [], item: string = "inputList") => () => {
    return utils.getConfig(key, item, defaultValue);
  };
  static readonly saveRecommendationToConfig = (utils: McmodderUtils, key: string, item: string = "inputList") => (list: InputRecommendation[]) => {
    const simplified = list.map(e => typeof e === "string" ? e : { value: e.value, alias: e.alias });
    utils.setConfig(key, simplified, item);
    return true;
  }

  constructor(inputNode: JQuery, onInitRecommendation: InputListOnInitRecommendation, onModifyRecommendation?: InputListOnModifyRecommendation, delimiter?: string, hideBeforeInput?: boolean);
  constructor(inputNode: JQuery, utils: McmodderUtils, configKey: string, delimiter?: string, hideBeforeInput?: boolean);
  constructor(...args: [inputNode: JQuery, onInitRecommendation: InputListOnInitRecommendation, onModifyRecommendation?: InputListOnModifyRecommendation, delimiter?: string, hideBeforeInput?: boolean] |
                       [inputNode: JQuery, utils: McmodderUtils, configKey: string, delimiter?: string, hideBeforeInput?: boolean]
  ) {
    const inputNode = args[0];
    const onInitRecommendation = typeof args[2] === "string" ? InputList.loadRecommendationFromConfig(args[1] as McmodderUtils, args[2]) : args[1] as InputListOnInitRecommendation;
    const onModifyRecommendation = typeof args[2] === "string" ? InputList.saveRecommendationToConfig(args[1] as McmodderUtils, args[2]) : args[2] as InputListOnModifyRecommendation;
    const delimiter = args[3];
    const hideBeforeInput = args[4];

    if (inputNode.length != 1) {
      throw new Error("参数须有且仅有一个元素。");
    }
    this.input = inputNode.get(0) as HTMLInputElement | HTMLTextAreaElement;
    if (this.input.tagName !== "INPUT" && this.input.tagName !== "TEXTAREA") {
      throw new Error("元素必须是 HTMLInputElement 或 HTMLTextAreaElement。");
    }

    this.inputNode = inputNode;
    this.container = $(`<div class="mcmodder-input-container">`).insertBefore(this.inputNode);
    this.inputNode.appendTo(this.container);
    this.inputList = $(`<div class="mcmodder-input-list">`).hide().appendTo(this.container);
    this.onInitRecommendation = onInitRecommendation;
    this.onModifyRecommendation = onModifyRecommendation;
    this.delimiter = delimiter;
    this.hideBeforeInput = hideBeforeInput ?? false;

    this.inputNode
    .click(_e => {
      if (this.isFocused) {
        this.updateRecommendableList(this.getSelectionValue());
      }
    })
    .focus(_e => {
      this.recommendationList = this.onInitRecommendation()
      .map(e => {
        if (typeof e === "string") {
          e = { value: e };
        }
        return e;
      });
      this.updateRecommendableList(this.getSelectionValue());
      this.isFocused = true;
    })
    .keydown(e => {
      if (this.selectable && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Tab" || e.key === "Enter")) {
        e.preventDefault();
      }
    })
    .keyup(e => {
      if (this.selectable && e.key === "ArrowUp") {
        let selected = this.selected - 1;
        if (selected < 0) selected = this.listLength - (this.canCreateNew ? 0 : 1);
        this.updateSelection(selected);
      }
      else if (this.selectable && e.key === "ArrowDown") {
        let selected = this.selected + 1;
        if (selected >= this.listLength + (this.canCreateNew ? 1 : 0)) selected = 0;
        this.updateSelection(selected);
      }
      else if (this.selectable && (e.key === "Tab" || e.key === "Enter")) {
        const node = this.getSelectedOptionNode();
        if (node.length) {
          e.preventDefault();
          node.click();
        }
      }
      else {
        this.updateRecommendableList(this.getSelectionValue());
      }
    })
    .blur(_e => {
      this.isFocused = false;
      setTimeout(() => {
        this.inputList.hide().empty();
        this.selectable = false;
      }, 100);
    });

    this.inputList
    .on("click", "a.mcmodder-input-option", e => {
      const target = e.currentTarget;

      if (target.classList.contains("mcmodder-input-new")) {
        const value = this.getSelectionValue(true);
        if (!value) {
          return;
        }
        if (this.recommendationList.filter(e => e.value === value).length) {
          McmodderUtils.commonMsg("当前输入的内容已经存在于候选列表~", false);
          return;
        }
        this.recommendationList.push({ value });
        this.recommendationList.sort((a, b) => InputList.intlCollator.compare(a.value, b.value));
        if (this.onModifyRecommendation!(this.recommendationList)) {
          McmodderUtils.commonMsg("已将当前输入的内容保存于候选列表~");
        } else {
          McmodderUtils.commonMsg("保存失败...", false);
        }
        return;
      }

      const val = target.getAttribute("data-value");
      if (val === null) {
        console.warn("候选按钮无对应值。");
        return;
      }
      this.setSelectionValue(val, !!this.delimiter);
    })
    .on("click", "a.mcmodder-input-delete", e => {
      const target = e.currentTarget;
      const val = target.parentElement!.parentElement!.getAttribute("data-value");
      this.recommendationList = this.recommendationList.filter(e => e.value != val);
      if (this.onModifyRecommendation!(this.recommendationList)) {
        McmodderUtils.commonMsg("成功从候选列表中移除选中项~");
      } else {
        McmodderUtils.commonMsg("移除失败...", false);
      }
      e.stopPropagation();
    })
    .on("click", "a.mcmodder-input-editalias", e => {
      const target = e.currentTarget;
      const val = target.parentElement!.parentElement!.getAttribute("data-value");
      const entry = this.recommendationList.filter(e => McmodderUtils.escapeHTML(e.value) === val)[0];
      const alias = entry.alias ? entry.alias.join("; ") : "";
      swal.fire({
        html: `
          <p>在此处修改选中项的快捷名称...（使用 ';' 分隔多个名称）</p>
          <p class="mcmodder-monospace">${ val }</p>
          <input class="form-control" id="mcmodder-input-alias" value="${ McmodderUtils.escapeHTML(alias) }"/>
        `,
        showCancelButton: true,
        confirmButtonText: "保存",
        cancelButtonText: "取消",
        preConfirm: () => {
          const newAlias = $("#mcmodder-input-alias").val() as string;
          if (!newAlias) {
            delete entry.alias;
          } else {
            entry.alias = newAlias.split(";").map(e => e.trim()).filter(e => e);
          }
          if (this.onModifyRecommendation!(this.recommendationList)) {
            McmodderUtils.commonMsg("成功更新选中项的快捷名称~");
          } else {
            McmodderUtils.commonMsg("更新失败...", false);
          }
        }
      });
      e.stopPropagation();
    })
    .on("mouseenter", "a.mcmodder-input-option", e => {
      const target = e.currentTarget;
      target.classList.add("selected");
    })
    .on("mouseleave", "a.mcmodder-input-option", e => {
      const target = e.currentTarget;
      if (Number(target.getAttribute("data-index")) != this.selected) {
        target.classList.remove("selected");
      }
    });
  }

  private getSectionIndex(vals: string[], pos: number, delimiter: string): [idx: number, innerPos: number] {
    for (let i = 0, j = 0; i < vals.length; j += vals[i++].length + delimiter.length) {
      if (pos >= j && pos < j + vals[i].length + delimiter.length) {
        return [i, pos - j];
      }
    }
    return [-1, -1];
  }

  private getSelectionValue(isCompletely = false) {
    const val = this.input.value;
    if (this.delimiter === undefined) {
      return val;
    }
    const pos = this.input.selectionStart;
    if (pos === null) {
      return "";
    }
    const vals = val.split(this.delimiter);
    const [idx, innerPos] = this.getSectionIndex(vals, pos, this.delimiter);
    return idx >= 0 ? isCompletely ? vals[idx] : vals[idx].slice(0, innerPos) : "";
  }

  private setSelectionValue(content: string, isContinuously = false) {
    let val = this.input.value;
    let newPos: number | null = null;
    let isLast = false;
    const pos = this.input.selectionStart;
    if (this.delimiter != undefined) {
      if (pos != null) {
        const vals = val.split(this.delimiter);
        const [idx, innerPos] = this.getSectionIndex(vals, pos, this.delimiter);
        if (idx >= 0) {
          const suffix = vals[idx].slice(innerPos);
          vals[idx] = content + suffix;
          newPos = pos - innerPos + content.length;
        }
        val = vals.join(this.delimiter);
        if (idx === vals.length - 1) {
          isLast = true;
        }
      }
      if (isContinuously && isLast) {
        val += this.delimiter;
      }
    }
    else {
      if (pos != null) {
        const suffix = content.slice(pos);
        val = content + suffix;
      }
      else {
        val = content;
      }
    }

    this.inputNode.val(val).change();
    if (newPos != null) {
      this.input.setSelectionRange(newPos, newPos);
    }
    if (isContinuously) {
      this.inputNode.focus();
    } else {
      this.inputNode.blur();
    }
  }

  getInstance() {
    return this.container;
  }

  private updateRecommendableList(content: string) {
    // 所以我为什么要在这里再写一遍几乎一样的逻辑...TwT
    content = content.toLowerCase();
    if (!content && this.hideBeforeInput) {
      this.selectable = false;
      this.inputList.hide();
      return;
    }
    const recommendableList: InputRatedRecommendation[] = [];
    this.recommendationList.forEach(entry => {
      let matchScore = 0;
      [entry.value, ...(entry.alias ?? [])].map(e => e.toLowerCase()).forEach(value => {
        const pos = value.indexOf(content);
        if (pos >= 0) {
          matchScore += (pos === 0 ? 2 : 1) * content.length / value.length;
        }
      });
      recommendableList.push(Object.assign(entry, { matchScore }));
    });
    this.selected = 0;
    this.renderRecommendationList(
      recommendableList
      .filter(e => e.matchScore)
      .sort((a, b) => b.matchScore! - a.matchScore!)
    );
  }

  private renderRecommendationList(recommendableList: InputRecommendation[]) {
    this.inputList.empty();
    recommendableList.forEach((entry, index) => {
      const escapedValue = McmodderUtils.escapeHTML(entry.value);
      let html = entry.html ?? escapedValue;
      let title = escapedValue;
      let alias = "";
      if (entry.html !== undefined && entry.showValue) {
        html += `&nbsp;<span class="item-ename">${ entry.value }</span>`;
      }
      if (entry.alias !== undefined) {
        alias = `<span class="alias">${ entry.alias.map(e => McmodderUtils.escapeHTML(e)).join(";&nbsp;") }</span>`;
        title += ` (${ entry.alias.join("; ") })`;
      }
      $(`<a class="mcmodder-input-option" title="${ title }" data-value="${ entry.value }" data-index="${ index }">`)
      .html(`<span class="text">${ html }${ alias }</span>`)
      .appendTo(this.inputList);
    });
    this.listLength = recommendableList.length;

    if (this.onModifyRecommendation) {
      this.inputList.children(".mcmodder-input-option").each((_, e) => {
        $(`<span class="mcmodder-input-extraoptions">
          <a class="mcmodder-input-editalias" tabindex="-1"><i class="fa fa-flash" />
          <a class="mcmodder-input-delete" tabindex="-1"><i class="fa fa-close" />
        </span>`).appendTo(e);
      });
      if (this.getSelectionValue()) {
        $(`<a class="mcmodder-input-option mcmodder-input-new" data-index=${ this.listLength }>`)
        .html(`<span class="mcmodder-slim-dark">+ 保存为快捷输入项</span>`)
        .appendTo(this.inputList);
        this.canCreateNew = true;
      } else {
        this.canCreateNew = false;
      }
    }

    if (this.inputList.children().length) {
      this.inputList.show();
      this.selectable = true;
      this.updateSelection(0);
    } else {
      this.inputList.hide();
      this.selectable = false;
    }
  }

  private getOptionNode(index: number) {
    return this.inputList.find(`[data-index=${ index }]`);
  }

  private getSelectedOptionNode() {
    return this.getOptionNode(this.selected);
  }

  private updateSelection(index: number) {
    this.getOptionNode(this.selected).removeClass("selected");
    this.getOptionNode(index).addClass("selected").get(0).scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
    this.selected = index;
  }
}