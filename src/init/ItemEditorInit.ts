import { createApp, type App } from "vue";
import { Utils } from "../Utils";
import { Values } from "../Values";
import { Init } from "./Init";
import GIFViewer from "../vue/components/GIFViewer.vue";
import CheckboxInput from "../vue/components/input/CheckboxInput.vue";
import { GIFUtils } from "../gif/GIFUtils.ts";

export class ItemEditorInit extends Init {
  canRun() {
    return this.parent.href.includes("/item/edit/") || this.parent.href.includes("/item/add/");
  }

  private get sizeFactor() {
    return $(".common-item-mold-list li a[data-category-selected='true']").attr(
      "data-multi-value",
    ) === "6"
      ? 1.125
      : 1;
  }

  private async imgResize(s: number, t: number, byViewer = false) {
    const src = $(`#icon-${s}x`).val();
    if (
      byViewer &&
      (await GIFUtils.isGIFBlob(Utils.base642Blob(src))) &&
      [s, t].every((sz) => [32, 128].includes(sz))
    ) {
      // 创建一个临时 GIFViewer 来中转，既暴力又优雅（x）
      // 未来可能会考虑将 GIFViewer 给整体拆分成功能层和视觉交互层，消除组件挂载开销
      const fromViewer = s === 32 ? this.smallGifViewerInstance : this.largeGifViewerInstance;
      const toViewer = t === 32 ? this.smallGifViewerInstance : this.largeGifViewerInstance;
      if (!fromViewer || !toViewer) {
        Utils.commonMsg("GIF 编辑器的初始化似乎失败了...？", false);
        return;
      }
      const gifSource = fromViewer.get();
      if (gifSource) {
        const tempContainer = $("<div>");
        this.tempGifViewer ??= createApp(GIFViewer, {
          parent: this.parent,
          editable: true,
          validate: this.validateGIFViewer(32),
          onChange: (blob: Blob) => void this.applyGifIcon(blob, 32),
        });
        this.tempGifViewerInstance ??= this.tempGifViewer.mount(
          tempContainer.get(0),
        ) as InstanceType<typeof GIFViewer> as InstanceType<typeof GIFViewer>;
        await this.tempGifViewerInstance.set(gifSource);
        await this.tempGifViewerInstance.resize(false, t, t);
        toViewer.set(this.tempGifViewerInstance.get()!);
        this.tempGifViewer.unmount();
        Utils.commonMsg("动图已自动缩放且成功同步~");
        return;
      }
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    if (ctx)
      img.onload = () => {
        canvas.width = canvas.height = Number(t) * this.sizeFactor;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/png");
        $(`#icon-${t}x`).val(data);
        $(`#icon-${t}x-editor`).val(data);
        $(`#item-icon-${t}x-preview-img`).attr("src", data);
      };
    img.src = $(`#icon-${s}x`).val();
  }

  /** 每个尺寸各自最近一次回填的序号，用来丢弃「转换比后一次慢」的过期结果 */
  private gifIconTokens: Record<32 | 128, number> = { 32: 0, 128: 0 };

  /**
   * 把 GIF 编辑器产出的动图写回对应尺寸的图标。
   *
   * 走图标输入框自己的 `change`，站点的预览图与 `#icon-<尺寸>x-editor` 会一起更新。
   */
  private async applyGifIcon(blob: Blob, size: 32 | 128) {
    const token = ++this.gifIconTokens[size];
    const dataUrl = await Utils.blob2Base64(blob);
    // 转换期间又编辑了一次，这次的结果已经过期
    if (token !== this.gifIconTokens[size] || !dataUrl) return;
    $(`#icon-${size}x`).val(dataUrl).change();
  }

  private validateGIFViewer(baseSize: 32 | 128) {
    return (ctx: { width: number; height: number }) => {
      const size = baseSize * this.sizeFactor;
      if (ctx.width === size && ctx.height === size) {
        Utils.commonMsg("已应用更改~");
        return true;
      }
      Utils.commonMsg(
        `新的动图尺寸 (${ctx.width}×${ctx.height}) 与所期望的尺寸 (${size}×${size}) 不符...`,
        false,
      );
      return false;
    };
  }

  private smallGifViewerInstance: InstanceType<typeof GIFViewer> | undefined;
  private largeGifViewerInstance: InstanceType<typeof GIFViewer> | undefined;
  private tempGifViewer: App | undefined;
  private tempGifViewerInstance: InstanceType<typeof GIFViewer> | undefined;

  run() {
    const l = "#edit-page-1 .tab-ul hr:nth-child(6)";
    $(
      '<img id="item-icon-16x-preview-img" /><br><input id="icon-input-16x" type="file" accept="image/*" class="hidden"><label id="icon-input-16x-label" class="btn btn-dark" for="icon-input-16x">上传图标以自动调整尺寸</label><input id="icon-16x" style="display: none;">',
    ).insertAfter(l);
    $("#item-icon-16x-preview-img").hide();
    $("#icon-input-16x").bind("change", (e) => {
      const fileList = (e.currentTarget as HTMLInputElement).files;
      if (!fileList || fileList.length < 1) return;
      const file = fileList[0];
      if (!file.type.includes("image/")) {
        Utils.commonMsg(Values.errorMessage[120], false);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const a = reader.result;
        if (typeof a != "string") return false;
        const image = new Image();
        image.src = a;
        image.onload = () => {
          $("#icon-16x").val(a);
          $("#item-icon-16x-preview-img").show().attr("src", a);
          this.imgResize(16, 32);
          this.imgResize(16, 128);
        };
      };
      reader.readAsDataURL(file);
    });
    const icon32xTextInput = $(
      '<input id="icon-32x-editor" placeholder="输入 Base64 格式小图标...">',
    ).insertAfter("#icon-32x");
    const icon128xTextInput = $(
      '<input id="icon-128x-editor" placeholder="输入 Base64 格式大图标...">',
    ).insertAfter("#icon-128x");
    const syncToLargeIcon = $('<button class="btn">同步至大图标</button>')
      .insertAfter("#icon-32x-editor")
      .click(() => this.imgResize(32, 128, true));
    const syncToSmallIcon = $('<button class="btn">同步至小图标</button>')
      .insertAfter("#icon-128x-editor")
      .click(() => this.imgResize(128, 32, true));
    $("#icon-32x, #icon-128x").bind("change", (e) => {
      const target = $(e.currentTarget);
      const id = target.attr("id");
      target.val(Utils.appendBase64ImgPrefix(target.val().trim()) || "");
      $(`#item-${id}-preview-img`).attr("src", target.val().trim());
      $(`#${id}-editor`).val(target.val().trim());
    });
    $("#icon-32x-editor, #icon-128x-editor")
      .addClass("form-control")
      .addClass("mcmodder-monospace")
      .change((e) => {
        const input = e.currentTarget as HTMLInputElement;
        const value = input.value.trim();
        $("#" + input.id.replace("-editor", ""))
          .val(value)
          .change();
        if (input.id.includes("32")) {
          this.smallGifViewerInstance?.set(Utils.base642Blob(value));
        } else {
          this.largeGifViewerInstance?.set(Utils.base642Blob(value));
        }
      });
    const image32px = $("#icon-32x").val().trim();
    const image128px = $("#icon-128x").val().trim();
    $("#icon-32x-editor").val(image32px);
    $("#icon-128x-editor").val(image128px);
    this.parent.editorLoad();

    // GIF 编辑器
    const smallGifContainer = $('<div class="mcmodder-gifviewer-frame">').insertAfter(
      syncToLargeIcon,
    );
    const smallIconBlob = Utils.base642Blob(image32px);
    GIFUtils.isGIFBlob(smallIconBlob).then((value) => {
      createApp(CheckboxInput, {
        title: "GIF 编辑器",
        value,
        onSuccessfulChange: (info: InputValidInfo<boolean>) => {
          if (info.isok) {
            if (info.final) smallGifContainer.show();
            else smallGifContainer.hide();
          }
        },
      }).mount($("<div>").css("display", "inline-block").insertBefore(icon32xTextInput).get(0));
      if (!value) smallGifContainer.hide();
    });

    this.smallGifViewerInstance = createApp(GIFViewer, {
      parent: this.parent,
      editable: true,
      validate: this.validateGIFViewer(32),
      onChange: (blob: Blob) => void this.applyGifIcon(blob, 32),
    }).mount(smallGifContainer.get(0)) as InstanceType<typeof GIFViewer>;
    this.smallGifViewerInstance.set(smallIconBlob);

    const largeGifContainer = $('<div class="mcmodder-gifviewer-frame">').insertAfter(
      syncToSmallIcon,
    );
    const largeIconBlob = Utils.base642Blob(image128px);
    GIFUtils.isGIFBlob(largeIconBlob).then((value) => {
      createApp(CheckboxInput, {
        title: "GIF 编辑器",
        value,
        onSuccessfulChange: (info: InputValidInfo<boolean>) => {
          if (info.isok) {
            if (info.final) largeGifContainer.show();
            else largeGifContainer.hide();
          }
        },
      }).mount($("<div>").css("display", "inline-block").insertBefore(icon128xTextInput).get(0));
      if (!value) largeGifContainer.hide();
    });

    this.largeGifViewerInstance = createApp(GIFViewer, {
      parent: this.parent,
      editable: true,
      validate: this.validateGIFViewer(128),
      onChange: (blob: Blob) => void this.applyGifIcon(blob, 128),
    }).mount(largeGifContainer.get(0)) as InstanceType<typeof GIFViewer>;
    this.largeGifViewerInstance.set(largeIconBlob);

    // 采集工具预览更新
    // $(document).on("click", () => this.updateItemTooltip());

    // JSON 快速手导
    const jsonUploader = $(
      '<input id="mcmodder-json-upload" class="mcmodder-monospace form-control" placeholder="粘贴 JSON 物品导出行于此处以快速填充基本信息..">',
    )
      .insertBefore($(".tab-ul").first())
      .change(() => {
        let data: Item & { maxStacksSize?: number };
        try {
          data = JSON.parse(jsonUploader.val());
        } catch (e) {
          if (e instanceof SyntaxError)
            Utils.commonMsg("请检查提交的 JSON 语法是否正确~", false, "解析错误");
          return;
        }
        try {
          $("[data-multi-id=name]").val(data.name);
          if (data.englishName != data.name) {
            $("[data-multi-id=ename]").val(data.englishName || "");
          }
          $("#icon-32x")
            .val(data.smallIcon || "")
            .change();
          $("#icon-128x")
            .val(data.largeIcon || "")
            .change();
          if (data.OredictList)
            data.OredictList.slice(1, data.OredictList.length - 1)
              .split(", ")
              .forEach((e) => {
                $("[data-multi-id=oredict]").prev().children().val(e).focusout();
              });
          if (data.maxDurability) $("#item-damage").val(data.maxDurability);
          $("#item-maxstack").val(data.maxStackSize || data.maxStacksSize || "");
          let regName = data.registerName || "";
          if (data.type == "Entity") {
            regName = regName.replace(":entities/", ":");
          }
          $("#item-regname").val(regName);
          if (data.metadata) $("#item-metadata").val(data.metadata);
        } catch (e) {
          if (e instanceof TypeError) Utils.commonMsg(e.toString(), false);
        }
      });

    // 联动
    const params = new URLSearchParams(window.location.search);
    if (params.has("i")) {
      const interactID = params.get("i");
      const data = this.parent.utils.getInteract(interactID) as string;
      if (data) {
        jsonUploader.val(data).change();
      }
    }
  }
}
