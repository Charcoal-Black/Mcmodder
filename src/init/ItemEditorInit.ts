import { McmodderItemData } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { McmodderInit } from "./Init";

export class ItemEditorInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/item/edit/") || 
      this.parent.href.includes("/item/add/")
  }

  private imgResize(s: number | string, t: number | string) {
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    let img = new Image();
    if (ctx) img.onload = () => {
      canvas.width = canvas.height = Number(t) * (($(".common-item-mold-list li a[data-category-selected='true']").attr("data-multi-value") === "6") ? 1.125 : 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL("image/png");
      $(`#icon-${t}x`).val(data);
      $(`#icon-${t}x-editor`).val(data);
      $(`#item-icon-${t}x-preview-img`).attr("src", data);
    }
    img.src = $(`#icon-${s}x`).val();
  }

  run() {
    const l = "#edit-page-1 .tab-ul hr:nth-child(6)";
    $('<img id="item-icon-16x-preview-img" /><br><input id="icon-input-16x" type="file" accept="image/*" class="hidden"><label id="icon-input-16x-label" class="btn btn-dark" for="icon-input-16x">上传图标以自动调整尺寸</label><input id="icon-16x" style="display: none;">').insertAfter(l);
    $("#item-icon-16x-preview-img").hide();
    $("#icon-input-16x").bind("change", e => {
      const fileList = (e.currentTarget as HTMLInputElement).files;
      if (!fileList || fileList.length < 1) return;
      const file = fileList[0];
      if (!file.type.includes("image/")) {
        McmodderUtils.commonMsg(McmodderValues.errorMessage[120], false);
        return;
      }
      const reader = new FileReader;
      reader.onload = _ => {
        const a = reader.result;
        if (typeof a != "string") return false;
        const image = new Image;
        image.src = a;
        image.onload = () => {
          $("#icon-16x").val(a);
          $("#item-icon-16x-preview-img").show().attr("src", a);
          this.imgResize(16, 32);
          this.imgResize(16, 128);
        }
      };
      reader.readAsDataURL(file);
    });
    $('<input id="icon-32x-editor" placeholder="输入 Base64 格式小图标...">').insertAfter("#icon-32x");
    $('<input id="icon-128x-editor" placeholder="输入 Base64 格式大图标...">').insertAfter("#icon-128x");
    $('<button class="btn">同步至大图标</button>').insertAfter("#icon-32x-editor").click(() => this.imgResize(32, 128));
    $('<button class="btn">同步至小图标</button>').insertAfter("#icon-128x-editor").click(() => this.imgResize(128, 32));
    $("#icon-32x, #icon-128x").bind("change", e => {
      const target = $(e.currentTarget);
      const id = target.attr("id");
      target.val(McmodderUtils.appendBase64ImgPrefix(target.val().trim()) || "");
      $(`#item-${ id }-preview-img`).attr("src", target.val().trim());
      $(`#${ id }-editor`).val(target.val().trim());
    });
    $("#icon-32x-editor, #icon-128x-editor").attr("class", "form-control").bind("change", e => {
      const input = e.currentTarget as HTMLInputElement;
      $("#" + input.id.replace("-editor", ""))
      .val(input.value.trim())
      .change();
    });
    $("#icon-32x-editor").val($("#icon-32x").val().trim());
    $("#icon-128x-editor").val($("#icon-128x").val().trim());
    this.parent.editorLoad();

    // 采集工具预览更新
    // $(document).on("click", () => this.updateItemTooltip());

    // JSON 快速手导
    const jsonUploader = $('<input id="mcmodder-json-upload mcmodder-monospace" class="form-control" placeholder="粘贴 JSON 物品导出行于此处以快速填充基本信息..">')
    .insertBefore($(".tab-ul").first())
    .change(_ => {
      let data: McmodderItemData;
      try {
        data = JSON.parse(jsonUploader.val());
      } catch (e) {
        if (e instanceof SyntaxError) McmodderUtils.commonMsg("请检查提交的 JSON 语法是否正确~", false, "解析错误");
        return;
      }
      try {
        $("[data-multi-id=name]").val(data.name);
        $("[data-multi-id=ename]").val(data.englishName || "");
        $("#icon-32x").val(data.smallIcon || "").change();
        $("#icon-128x").val(data.largeIcon || "").change();
        if (data.OredictList) data.OredictList.slice(1, data.OredictList.length - 1).split(", ").forEach(e => {
          $("[data-multi-id=oredict]").prev().children().val(e).trigger("focusout");
        });
        if (data.maxDurability) $("#item-damage").val(data.maxDurability);
        $("#item-maxstack").val(data.maxStackSize || "");
        $("#item-regname").val(data.registerName || "");
        if (data.metadata) $("#item-metadata").val(data.metadata);
      } catch (e) {
        if (e instanceof TypeError) McmodderUtils.commonMsg(e.toString(), false);
      }
    });

    // 联动
    const params = new URLSearchParams(window.location.search);
    if (params.has("i")) {
      const interactID = params.get("i");
      const data = this.parent.utils.getInteract(interactID);
      if (data) {
        jsonUploader.val(data).change();
      }
    }
  }
}