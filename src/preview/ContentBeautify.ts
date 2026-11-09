import { Utils } from "../Utils";

function onClickMenuStyleButton(ev: JQueryEventObject) {
  if ($(ev.currentTarget).hasClass("fa-chevron-circle-right")) {
    $(".common-text-menu-style-button")
      .removeClass("fa-chevron-circle-right")
      .addClass("fa-chevron-circle-down");
    $(".common-text-menu").addClass("style-vertical");
    setCustomSetting("text-menu-style", "V");
  } else {
    $(".common-text-menu-style-button")
      .removeClass("fa-chevron-circle-down")
      .addClass("fa-chevron-circle-right");
    $(".common-text-menu").removeClass("style-vertical");
    setCustomSetting("text-menu-style", "H");
  }
}

function onClickMenuAnchor(ev: JQueryEventObject) {
  const id = $(ev.currentTarget).attr("data-for");
  $("html,body").animate(
    {
      scrollTop: $(`#${id}`).offset()!.top - 80,
    },
    300,
  );
}

/**
 * https://www.mcmod.cn/static/public/js/main.js
 */
export function contentBeautify(content: JQuery) {
  content.addClass("common-text");

  // 图片懒加载
  content.find("img.lazy").each(function () {
    const width = $(this).attr("width");
    const height = $(this).attr("height");
    if (width) $(this).removeAttr("width").attr("data-width", width);
    if (height) $(this).removeAttr("height").attr("data-height", height);
    $(this)
      .lazyload({
        effect: "fadeIn",
      })
      .load(function () {
        if (width) $(this).attr("width", width);
        if (height) $(this).attr("height", height);
      });
  });

  // 图片查看
  common_imgview(content);

  function buildMenu(_this: JQuery, isQuote: boolean) {
    let e: string | undefined;

    // 检查是否出现标题目录禁用标记，没有才建标题
    if (!(
      (isQuote && _this.find(".common-tag-ban[data-type='title-menu']").length > 0) ||
      (!isQuote &&
        _this.find(".common-tag-ban[data-type='title-menu']:not(.quote_text .common-tag-ban)")
          .length > 0)
    )) {
      let menuHtml = "";
      let h5 = 1,
        h4 = 1,
        h3 = 1,
        h2 = 1,
        h1 = 1;
      let l = "0";
      _this.find(".common-text-title").each(function () {
        if (!isQuote && jQuery(this).parents().hasClass("quote_text")) {
          return true;
        }
        const id = "ctm-title-" + Utils.randStr(8);
        $(this).attr("id", id);
        let classname = "";
        if ($(this).hasClass("common-text-title-1")) {
          classname = "l1";
          l = `${h1}`;
          h1++;
          h5 = h4 = h3 = h2 = 1;
        } else if ($(this).hasClass("common-text-title-2")) {
          classname = "l2";
          l = `${h1 - 1}.${h2}`;
          h2++;
          h5 = h4 = h3 = 1;
        } else if ($(this).hasClass("common-text-title-3")) {
          classname = "l3";
          l = `${h1 - 1}.${h2 - 1}.${h3}`;
          h3++;
          h5 = h4 = 1;
        } else if ($(this).hasClass("common-text-title-4")) {
          classname = "l4";
          l = `${h1 - 1}.${h2 - 1}.${h3 - 1}.${h4}`;
          h4++;
          h5 = 1;
        } else if ($(this).hasClass("common-text-title-5")) {
          classname = "l5";
          l = `${h1 - 1}.${h2 - 1}.${h3 - 1}.${h4 - 1}.${h5}`;
          h5++;
        }
        if (classname) {
          menuHtml += `<li class="${classname}"><a href="javascript:void(0);" data-for="${id}"><span>${l} </span>${$(this).text()}</a></li>`;
        }
      });
      if (menuHtml.length > 0) {
        let t = "H";
        if (getCustomSetting("text-menu-style") === "V") {
          t = "V";
        }
        e = `ctm-${Utils.randStr(8)}`;
        _this.prepend(
          `<div data-id="${e}" class="common-text-menu${"V" === t ? " style-vertical" : ""}"><ul><li class="title"><i class="fa fa-chevron-circle-${"H" === t ? "right" : "down"} common-text-menu-style-button pointer"></i> ${PublicLangData.catalog}:</li>${menuHtml}</ul></div>`,
        );
      }
      const marks = _this.find('.common-tag-mark[data-type="title-menu"]');
      if (marks.length > 0)
        marks.each(function () {
          if (!isQuote && $(this).parents().hasClass("quote_text")) return true;
          const t = $(`.common-text-menu[data-id='${e}']`).clone();
          $(`.common-text-menu[data-id='${e}']`).remove();
          $(this).empty().append(t); // 原来是 `$(this).html(t);`
        });
      $(`.common-text-menu[data-id='${e}']`)
        .find("a")
        .off("click", onClickMenuAnchor)
        .on("click", onClickMenuAnchor);
    }
  }
  function buildCollapsibleTable(container: HTMLElement, size = 20) {
    if (container && typeof container.querySelectorAll === "function")
      container.querySelectorAll("table").forEach(function (table) {
        if (table.dataset.folded !== "true") {
          let tbody = table.querySelector("tbody") as HTMLElement | null;
          if (tbody) {
            const rowCount = tbody.querySelectorAll("tr").length;
            const a = rowCount - size;
            if (rowCount <= size) {
              table.dataset.folded = "true";
              table.classList.remove("table-fold");
              tbody = table.nextElementSibling as HTMLElement | null;
              if (tbody !== null && tbody.classList.contains("tablefold-toggle-btn")) {
                tbody.remove();
              }
            } else {
              table.classList.add("table-fold");
              const button = document.createElement("button");
              button.className = "btn btn-link tablefold-toggle-btn";
              button.type = "button";
              button.innerHTML = `<span class="btn-text"><i class="fas fa-chevron-down"></i> ${PublicLangData.table_fold.open}（${sprintf(PublicLangData.table_fold.show, a)}）</span>`;
              button.dataset.tableId = table.id || "";
              table.parentNode!.insertBefore(button, table.nextSibling);
              // 复用同一函数引用，避免重复调用时重复绑定
              const onClickTableFold = function (this: HTMLButtonElement, ev: MouseEvent) {
                ev.preventDefault();
                const isFold = table.classList.contains("table-fold");
                const text = this.querySelector(".btn-text");
                if (isFold) {
                  table.classList.remove("table-fold");
                  text!.innerHTML = `<i class="fas fa-chevron-up"></i> ${PublicLangData.table_fold.close}（${sprintf(PublicLangData.table_fold.hide, rowCount)}）`;
                  this.classList.add("folded");
                } else {
                  table.classList.add("table-fold");
                  text!.innerHTML = `<i class="fas fa-chevron-down"></i> ${PublicLangData.table_fold.open}（${sprintf(PublicLangData.table_fold.show, a)}）`;
                  this.classList.remove("folded");
                }
                if (
                  typeof (this as HTMLButtonElement & { _updateFold?: () => void })._updateFold ===
                  "function"
                ) {
                  (this as HTMLButtonElement & { _updateFold: () => void })._updateFold();
                }
              };
              button.removeEventListener("click", onClickTableFold);
              button.addEventListener("click", onClickTableFold);
              ((table: HTMLElement, btn: HTMLButtonElement & { _updateFold?: () => void }) => {
                const span = document.createElement("span");
                span.style.display = "none";
                btn.parentNode!.insertBefore(span, btn.nextSibling);
                let flag = false;
                function updateButton() {
                  const t = table.getBoundingClientRect();
                  const e = window.innerHeight || document.documentElement.clientHeight;
                  if (t.top < e && t.bottom > 0 && t.bottom > e) {
                    btn.classList.add("is-focus");
                    const parent = table.parentElement;
                    if (parent !== null) {
                      const parentRect = parent.getBoundingClientRect();
                      const width = parent.offsetWidth - parent.clientWidth;
                      const space = parentRect.width - width;
                      const center = parentRect.left + space / 2;
                      const buttonWidth = btn.getBoundingClientRect().width;
                      btn.style.left = center - buttonWidth / 2 + "px";
                    } else {
                      btn.style.left = "";
                    }
                  } else {
                    btn.classList.remove("is-focus");
                    btn.style.left = "";
                  }
                  flag = false;
                }
                function requestUpdate() {
                  if (!flag) {
                    window.requestAnimationFrame(updateButton);
                    flag = true;
                  }
                }
                (["scroll", "resize"] as const).forEach((eventName) => {
                  window.removeEventListener(eventName, requestUpdate);
                  window.addEventListener(eventName, requestUpdate, {
                    passive: true,
                  });
                });
                updateButton();
                btn._updateFold = updateButton;
              })(table, button);
              table.dataset.folded = "true";
            }
          }
        }
      });
  }
  $(".common-text").each(function () {
    buildMenu($(this), false);
  });
  $(".quote_text").each(function () {
    buildMenu($(this), true);
  });

  content.off("click", ".common-text-menu-style-button", onClickMenuStyleButton);
  content.on("click", ".common-text-menu-style-button", onClickMenuStyleButton);

  if ($(content).parents(".right").length > 0) {
    buildCollapsibleTable(content.get(0) as HTMLElement);
  }

  if ($("pre").length > 0) {
    $("pre").each(function () {
      $(this).html($(this).html().replace(RegExp("<br>", "g"), "\n"));
    });
    // 原始是 `SyntaxHighlighter.all();`，但是它只在 `window` 监听 `load` 事件
    SyntaxHighlighter.highlight();
  }

  setTimeout(function () {
    $(".syntaxhighlighter").each(function () {
      if ($(this).hasClass("cb")) {
        ((_this: JQuery) => {
          const gutters = _this.find(".gutter .line");
          const codes = _this.find(".code .line");
          for (let i = 0; i < gutters.length; i++) {
            gutters.eq(i).css("height", codes.eq(i).css("height"));
          }
        })($(this));
      }
    });
  }, 500);

  Utils.updateAllTooltip();

  // 这一步不属于 `main.js`，但是会内联在 /preview/ 中
  uknowtoomuch();
}
