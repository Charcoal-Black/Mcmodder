export interface InputRecommendation {
  html?: string;
  value: string;
  matchScore?: number;
}

type InputListOnInitRecommendation = () => InputRecommendation[];

export class InputList {
  private readonly container = $();
  private readonly inputNode = $();
  private readonly inputList = $();
  private recommendationList: InputRecommendation[] = [];
  private selected = 0;
  private listLength = 0;
  private readonly onInitRecommendation: InputListOnInitRecommendation = () => [];
  constructor(inputNode: JQuery, onInitRecommendation: InputListOnInitRecommendation) {
    if (inputNode.length != 1) {
      console.error("参数须有且仅有一个元素。");
      return;
    }
    if (inputNode.get(0).tagName != "INPUT") {
      console.error("元素必须是 HTMLInputElement。");
      return;
    }

    this.inputNode = inputNode;
    this.container = $(`<div class="mcmodder-input-container">`).insertBefore(this.inputNode);
    this.inputNode.appendTo(this.container);
    this.inputList = $(`<div class="mcmodder-input-list">`).appendTo(this.container);
    this.onInitRecommendation = onInitRecommendation;

    this.inputNode.focus(_e => {
      this.recommendationList = this.onInitRecommendation();
      this.updateRecommendableList(this.inputNode.val());
    })
    .keyup(e => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        let selected = this.selected - 1;
        if (selected < 0) selected = this.listLength - 1;
        this.updateSelection(selected);
      }
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        let selected = this.selected + 1;
        if (selected >= this.listLength) selected = 0;
        this.updateSelection(selected);
      }
      else if (e.key === "Tab") {
        e.preventDefault();
        this.getSelectedOptionNode().click();
      }
      else {
        this.updateRecommendableList(this.inputNode.val());
      }
    })
    .blur(_e => {
      setTimeout(() => this.inputList.empty(), 100);
    });

    this.inputList.on("click", "a", e => {
      const target = e.currentTarget;
      const val = target.getAttribute("data-value");
      if (val === null) {
        console.warn("候选按钮无对应值。");
        return;
      }
      this.inputNode.val(val).blur();
    })
    .on("mouseenter", "a", e => {
      const target = e.currentTarget;
      target.classList.add("selected");
    })
    .on("mouseleave", "a", e => {
      const target = e.currentTarget;
      if (Number(target.getAttribute("data-index")) != this.selected) {
        target.classList.remove("selected");
      }
    });
  }

  private updateRecommendableList(content: string) {
    // 所以我为什么要在这里再写一遍几乎一样的逻辑...TwT
    const recommendableList: InputRecommendation[] = [];
    this.recommendationList.forEach(entry => {
      const value = entry.value;
      const pos = value.indexOf(content);
      if (pos < 0) entry.matchScore = 0;
      else entry.matchScore = pos === 0 ? 2 : 1;
      recommendableList.push(entry);
    });
    this.selected = 0;
    this.renderRecommendationList(
      recommendableList
      .filter(e => e.matchScore)
      .sort((a, b) => a.matchScore! - b.matchScore!)
    );
  }

  private renderRecommendationList(recommendableList: InputRecommendation[]) {
    this.inputList.empty();
    recommendableList.forEach((entry, index) => {
      $(`<a class="mcmodder-input-option" data-value="${ entry.value }" data-index="${ index }">`)
      .html(entry.html || entry.value)
      .appendTo(this.inputList);
    });
    this.listLength = recommendableList.length;
  }

  private getOptionNode(index: number) {
    return this.inputList.find(`[data-index=${ index }]`);
  }

  private getSelectedOptionNode() {
    return this.getOptionNode(this.selected);
  }

  private updateSelection(index: number) {
    this.getOptionNode(this.selected).removeClass("selected");
    this.getOptionNode(index).addClass("selected");
    this.selected = index;
  }
}