import { Mcmodder } from "../Mcmodder";

type PaginationCallback = (page: number) => void;

export class Pagination {

  static RENDER_RANGE = 4;

  parent: Mcmodder;
  maxPage: number;
  callback: PaginationCallback;
  $instance: JQuery;

  constructor(parent: Mcmodder, attr: object | null, maxPage = 1, callback: PaginationCallback, currentPage = 1) {
    this.parent = parent;
    this.maxPage = maxPage;
    this.callback = callback;
    this.$instance = $(`<ul class="pagination common-pages">`);
    if (attr) this.$instance.attr(attr);

    this.bindEvents();

    this.render(currentPage);
  }

  regulatePage(page: number) {
    return Math.min(Math.max(page, 1), this.maxPage);
  }

  bindEvents() {
    this.$instance.on("click", ".page-link:not(.active)", e => {
      const page = this.regulatePage(Number(e.currentTarget.getAttribute("data-page")));
      this.callback(page);
      this.render(page);
    })

    this.$instance.on("click", ".page-custom", e => {
      e.stopPropagation();
    }).on("keydown", ".page-custom", e => {
      const target = $(e.currentTarget);
      if (e.key === "Escape") {
        target.blur();
        return;
      }
      if (e.key === "Enter") {
        target.blur();
        target.parent().click();
        return;
      }
      const code = e.key.charCodeAt(0);
      if (code < 48 || code > 57) {
        e.preventDefault();
      }
    }).on("blur", ".page-custom", e => {
      const target = $(e.currentTarget);
      const page = this.regulatePage(Number(target.text()));
      if (isNaN(page)) target.html(page.toString());
      target.parent().attr("data-page", target.text());
    });
  }

  _renderSingle(page: number, text: string) {
    return $(`<li class="page-item"><a class="page-link" data-page="${ page }">${ text }</a></li>`);
  }

  render(page: number) {
    page = this.regulatePage(page);
    this.$instance.empty();

    if (page > 1) {
      this._renderSingle(1, "首页").appendTo(this.$instance);
      this._renderSingle(page - 1, "前页").appendTo(this.$instance);
    }

    for (let i = Math.max(page - Pagination.RENDER_RANGE, 1); i <= Math.min(page + Pagination.RENDER_RANGE, this.maxPage); i++) {
      let entry = $(`<li class="page-item"><a class="page-link" data-page=${ i }>${ i.toLocaleString() }</a></li>`).appendTo(this.$instance);
      if (i === page) entry.addClass("active");
    }

    if (page < this.maxPage) {
      this._renderSingle(page + 1, "后页").appendTo(this.$instance);
      this._renderSingle(this.maxPage, "尾页").appendTo(this.$instance);
    }

    $(`<li class="page-item">
        <a class="page-link" data-page="${ page }">
          跳转至第&nbsp;
          <span class="page-custom" contenteditable="true">${ page }</span>
          &nbsp;页
        </a>
      </li>`).appendTo(this.$instance);
  }
}