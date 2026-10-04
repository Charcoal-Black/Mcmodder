import { Utils } from "../../Utils";
import { AdminBaseInit } from "./AdminBaseInit";

export class AdminStyleInit extends AdminBaseInit {
  override getTriggerTitle() {
    return "样式管理";
  }
  private readonly styleEditObserver = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      if (
        !(mutation.addedNodes.length > 7 || mutation.removedNodes.length > 7) ||
        $(".item-list-table").length
      )
        return;
      // const preview = $('<table class="table table-bordered item-list-table item-list-table-1"><thead><tr><th colspan="3"><span class="title"><a target="_blank" href="//www.mcmod.cn/class/8.html">[M3]更多喵呜机 (More Meowing Machinery)</a> 的 物品/方块 资料 (预览)</span></th></tr></thead><tbody><tr><th class="item-list-type-left" style="padding: 0px">一级分类</th><th class="item-list-type-left" style="padding: 0px">二级分类</th><td class="item-list-type-right" style="padding: 0px"><ul><li><span><a href="/item/5281.html" target="_blank"><img class="icon" alt="锡矿石" src="//i.mcmod.cn/item/icon/32x32/0/5281.png?v=3" width="15" height="15"></a><a href="/item/5281.html" target="_blank" >锡矿石</a></span></li><li><span><a href="//www.mcmod.cn/item/40226.html" target="_blank"><img class="icon" alt="锇矿石" src="//i.mcmod.cn/item/icon/32x32/4/40226.png?v=5" width="15" height="15"></a><a href="//www.mcmod.cn/item/40226.html" target="_blank" >锇矿石</a></span></li><li><span><a href="/item/40227.html" target="_blank"><img class="icon" alt="铜矿石" src="//i.mcmod.cn/item/icon/32x32/4/40227.png?v=3" width="15" height="15"></a><a href="//www.mcmod.cn/item/40227.html" target="_blank" >铜矿石</a></span></li><li><span><a href="/item/40337.html" target="_blank"><img class="icon alt="盐块" src="//i.mcmod.cn/item/icon/32x32/4/40337.png?v=2" width="15" height="15"></a><a href="//www.mcmod.cn/item/40337.html" target="_blank" >盐块</a></span></li></ul></td></tr></tbody></table>').insertBefore($(".table-condensed").get(1));
      Utils.addStyle("", "mcmodder-style-preview");

      if (this.configs.getSettings("itemListStyleFix")) {
        const h = $("#connect-frame-sub script").html() + "//end";
        $("#itemlist-head-th").val(
          h
            .split('$("#itemlist-head-th").val("')[1]
            .split('");$("#itemlist-body-th").val("')[0]
            .replaceAll("\\n", "\n"),
        );
        $("#itemlist-body-th").val(
          h
            .split('");$("#itemlist-body-th").val("')[1]
            .split('");$("#itemlist-body-td").val("')[0]
            .replaceAll("\\n", "\n"),
        );
        $("#itemlist-body-td").val(
          h
            .split('");$("#itemlist-body-td").val("')[1]
            .split('");//end')[0]
            .replaceAll("\\n", "\n"),
        );
      }
      $("#connect-frame-sub textarea").addClass("mcmodder-monospace");
      if (this.configs.getSettings("itemListStylePreview")) {
        $("textarea.style-box").each(function () {
          $(this).bind("change", function () {
            const t = (c: string) =>
              $(c)
                .val()
                .replace(/<!--[\s\S]*?-->/g, "");
            const titleStyle = t("#itemlist-head-th");
            const categoryStyle = t("#itemlist-body-th");
            const itemListStyle = t("#itemlist-body-td");
            $("#mcmodder-style-preview").html(
              `table.item-list-table.item-list-table-1 {table-layout: auto}.item-list-table.item-list-table-1 thead th {${titleStyle}}.item-list-table.item-list-table-1 thead th * {color:inherit}.item-list-table.item-list-table-1 thead th a:hover {color:inherit; opacity:.75}.item-list-table.item-list-table-1 tbody th {${categoryStyle}}.item-list-table.item-list-table-1 tbody th * {color:inherit}.item-list-table.item-list-table-1 tbody th a:hover {color:inherit; opacity:.75}.item-list-table.item-list-table-1 tbody td {${itemListStyle}}.item-list-table.item-list-table-1 tbody td * {color:inherit}.item-list-table.item-list-table-1 tbody td th {${categoryStyle}}.item-list-table.item-list-table-1 tbody td a:hover {color:inherit; opacity:.75}.item-list-table th,.item-list-table td {border-color:#DADADA}.item-list-table {position:relative; margin-bottom:10px}.item-list-table .title {width:100%; margin:0; line-height:30px; font-size:14px; font-weight:bold; text-align:center; display:block}.item-list-table th {background-color:#f9f9f9; font-size:14px; color:#222}.item-list-table .item-list-type-left {width:100px; text-align:center; vertical-align:middle; font-size:12px}.item-list-table .item-list-type-right ul {width:100%; display:block}.item-list-table .item-list-type-right li {display:inline-block; margin-right:10px; font-size:14px}.item-list-table .item-list-type-right li img {margin-right:5px}.item-list-table .item-list-type-right li .null {color:#F30}.item-list-table .item-list-type-right li .null:hover {color:#222}.item-list-table .empty td {line-height:120px; font-size:14px; text-align:center; color:#777}.item-list-table .item-list-type-right li .more {color:#777}.item-list-table .item-list-type-right li .more:hover {color:#222}.item-list-table .item-list-type-right li .more i {margin-right:5px}.item-list-table .title a {text-decoration:underline; text-transform: none;}.item-list-table td {padding:0}.item-list-type-right ul {padding:.75rem}.item-list-table table {width:100%}.item-list-table table td {border-bottom:0; border-right:0}.item-list-table table th {border-bottom:0; border-left:0}.item-list-table:last-child {margin-bottom:0}.item-list-type-right .loading {position:absolute}.item-list-style-setting {text-align:right; font-size:12px; line-height:30px; position:absolute; bottom:-5px; right:5px}.item-list-style-setting i {margin-right:5px}.item-list-style-setting a {color:#99a2aa}.item-list-style-setting a:hover {color:#222}.item-list-branch-frame {width:100%; margin-bottom:10px}.item-list-branch-frame li {display:inline-block; margin-right:5px}.item-list-switch,.item-list-switch-fold {position:absolute; right:10px; top:8px}.item-list-switch-fold {right:auto; left:10px}.item-list-switch li,.item-list-switch-fold {display:inline-block; margin-left:10px; color:#99a2aa}.item-list-pages {padding:0; margin:0}.item-list-pages ul {margin-bottom:10px}@media(max-width:990px) {.item-list-style-setting { position:inherit;  bottom:0 }}@media(max-width:980px) {.item-list-switch { top:-10px }}@media(max-width:720px) {.item-list-switch-fold { top:25px }}@media(max-width:460px) {.item-list-table .item-list-type-left { width:80px;  padding:5px }}@media(max-width:360px) {.item-list-table .item-list-type-left { width:50px;  padding:5px }}@media(max-width:260px) {.item-list-table .item-list-type-left { width:0;  padding:5px }}`,
            );
          });
        });
      }
      $("textarea.style-box").trigger("change");
    }
  });
  override run() {
    this.styleEditObserver.observe($("div#connect-frame-sub").get(0), {
      childList: true,
    });
  }
}
