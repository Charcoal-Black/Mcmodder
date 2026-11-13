import { createApp } from "vue";
import { Utils } from "../Utils";
import SliderInput from "../vue/components/input/SliderInput.vue";
import { Init } from "./Init";

export class ClassEditorInit extends Init {
  private originalModRelationList: Record<
    string,
    {
      id: number;
      type: number;
    }[]
  > = {};

  canRun() {
    return this.parent.href.includes("/class/edit/") || this.isClassAddPage();
  }

  private isClassAddPage() {
    return this.parent.href.includes("/class/add/");
  }

  private hideUnavailableVersion() {
    let flag = false,
      flag2 = false;
    $("#mcversion-frame fieldset").each((_, _e) => {
      const e = $(_e);
      if (e.attr("data-mcmodder-huv")) return;
      e.attr("data-mcmodder-huv", "1");
      const loaderName = e.find("legend").text().split(":")[0];
      const loaderID = e.attr("id").split("-")[2];
      let h = $(),
        c = $();
      if (loaderID === "2") {
        c = $(`<a id="mcmodder-fabric-hidever" class="fold text-muted" style="display: block">
          <i class="fas fa-chevron-down" style="margin-right: 5px;"></i>
          展开仅 Legacy Fabric/Babric/Ornithe 等低版本移植加载器支持的版本
        </a>`)
          .insertAfter($("#class-data-mcversion-2-29").parent())
          .click(() => {
            if (Utils.isNodeHidden(h)) {
              h.show();
              c.html(
                '<i class="fas fa-chevron-up" style="margin-right: 5px;"></i>折叠仅 Legacy Fabric/Babric/Ornithe 支持的版本',
              );
            } else {
              h.hide();
              c.html(
                '<i class="fas fa-chevron-down" style="margin-right: 5px;"></i>展开仅 Legacy Fabric/Babric/Ornithe 支持的版本',
              );
            }
          });
        h = $('<div id="mcmodder-fabric-hiddenver"></div>').hide().insertAfter(c);
      }
      e.find(".checkbox").each((_, _f) => {
        const f = $(_f);
        const version = f.find("label").text().trim();
        if (!Utils.validateVersionForLoaderID(version, loaderID)) {
          if (loaderID != "2") {
            f.show();
            if (f.find("input").prop("checked")) {
              flag = true;
              f.find("label").removeClass("text-muted");
              f.addClass("mcmodder-slim-danger").attr({
                "data-toggle": "tooltip",
                "data-html": "true",
                "data-original-title": `${loaderName} 自身并不支持 ${version}！这可能由先前的编辑者疏忽所致，强烈建议取消勾选此版本。<br>如果你认为这个提示是错误的，请向 Mcmodder 作者反馈！`,
              });
            } else f.hide();
          } else {
            f.appendTo(h);
            if (f.find("input").prop("checked")) flag2 = true;
          }
        }
      });
      if (flag2) c.click();
    });
    if (flag) Utils.commonMsg("支持的 MC 版本存疑，请检查~", false);
    this.parent.updateItemTooltip();
  }

  private sortModRelationList(relationGroup: JQuery) {
    const temp = $("<div>");
    const name = relationGroup.prev().find(".relation-version-value").text();
    this.originalModRelationList[name] = relationGroup
      .children()
      .filter("[data-id]")
      .toArray()
      .map((_li) => {
        const li = $(_li);
        const id = li.attr("data-id");
        const type = li.find(".selectpicker.relation-row-type").val();
        li.appendTo(temp);
        return {
          id: Number(id),
          type: Number(type),
        };
      });
    Array.from(this.originalModRelationList[name])
      .sort((a, b) => {
        if (a.type === b.type) return a.id - b.id;
        return a.type - b.type;
      })
      .forEach((data) => {
        temp.find(`[data-id=${data.id}]`).appendTo(relationGroup);
      });
    temp.remove();
  }

  private resetModRelationList(relationGroup: JQuery) {
    const temp = $("<div>");
    const name = relationGroup.prev().find(".relation-version-value").text();
    relationGroup.children().filter("[data-id]").appendTo(temp);
    const list = this.originalModRelationList[name];
    if (!list) {
      Utils.commonMsg("列表恢复失败，可能是因为关系组名称已经发生变化？", false);
      return;
    }
    list.forEach((data) => {
      temp.find(`[data-id=${data.id}]`).appendTo(relationGroup);
    });
    temp.remove();
    delete this.originalModRelationList[name];
  }

  private requestBlurButton?: JQuery;
  private applyBlurButton?: JQuery;
  private blurRadiusInputContainer?: JQuery;
  private blurRadiusInput?: InstanceType<typeof SliderInput>;

  /** 百科封面固定为 16:10 */
  private static readonly COVER_ASPECT_RATIO = 16 / 10;
  /** 百科封面的体积限制 */
  private static readonly COVER_MAX_SIZE = 3145728;
  /** 最终封面的宽度上限，避免 PNG 过大撞上百科的体积限制 */
  private static readonly COVER_MAX_WIDTH = 1200;
  /** 高斯模糊半径相对宽度的比例，约等于宽度的 2% */
  private static readonly COVER_BLUR_RADIUS_RATIO = 1 / 50;
  /** 高斯模糊的工作分辨率上限：先缩小再卷积，最后放大，兼顾效果与耗时 */
  private static readonly COVER_BLUR_WORK_WIDTH = 480;

  /** 显示高斯模糊选项 */
  private initCoverGaussianBlur() {
    this.applyBlurButton = $(
      '<input type="button" id="mcmodder-cover-gaussian-apply" class="btn" value="应用高斯模糊">',
    )
      .hide()
      .click(() => {
        this.completeCropper();
      });
    this.requestBlurButton = $(
      '<input type="button" id="mcmodder-cover-gaussian-blur" class="btn" value="启用高斯模糊">',
    )
      .insertAfter("#cover-reset-button")
      .hide()
      .click(() => {
        this.setCropper(1); // 常见的封面都是 1:1
        this.applyBlurButton?.show();
        this.blurRadiusInputContainer?.show();
        this.requestBlurButton?.hide();
      });
    this.applyBlurButton.insertAfter(this.requestBlurButton);
    this.blurRadiusInputContainer = $(`
      <div id="mcmodder-cover-gaussian-radius-container">
        模糊半径 (%):
        <div id="mcmodder-cover-gaussian-radius">
      </div>`)
      .insertAfter(this.applyBlurButton)
      .hide();
    this.blurRadiusInput = createApp(SliderInput, {
      title: "模糊半径 (%)",
      value:
        this.parent.configRepository.getSettings("coverGaussianBlurRadiusPercent") ??
        ClassEditorInit.COVER_BLUR_RADIUS_RATIO * 100,
      range: [0, 20],
      precision: 0.1,
    }).mount(this.blurRadiusInputContainer.children().get(0)) as InstanceType<typeof SliderInput>;
    const coverUpdateButton = $("#cover-update-button");
    $("#cover-select-button").change(() => {
      setTimeout(() => {
        // 百科原生取消隐藏不是移除 `hidden` class-name
        if (coverUpdateButton.css("display") === "inline-block") {
          this.requestBlurButton?.show();
        }
      }, 500);
    });
    $("#cover-update-button, #cover-cancel-button, #cover-reset-button").click(() => {
      this.resetCropper();
    });
  }

  /** 生成归一化的一维高斯核，取 `3σ = radius` 以覆盖 99.7% 的权重 */
  private static gaussianKernel(radius: number) {
    const sigma = Math.max(radius / 3, 0.5);
    const half = Math.max(1, Math.ceil(radius));
    const kernel = new Float32Array(half * 2 + 1);
    let sum = 0;
    for (let i = 0; i < kernel.length; i++) {
      const x = i - half;
      const weight = Math.exp(-(x * x) / (2 * sigma * sigma));
      kernel[i] = weight;
      sum += weight;
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
    return { kernel, half };
  }

  /**
   * 可分离高斯模糊（先横向、再纵向），原地修改 `ImageData`。
   *
   * - 颜色先按 alpha 预乘再卷积，避免透明像素的黑色渗进边缘；
   * - 越界像素按边缘钳制处理，防止画面四周变暗。
   */
  private static gaussianBlur(imageData: ImageData, radius: number) {
    if (radius < 0.5) return;
    const { width, height, data } = imageData;
    const { kernel, half } = ClassEditorInit.gaussianKernel(radius);
    const length = width * height * 4;

    for (let i = 0; i < length; i += 4) {
      const alpha = data[i + 3] / 255;
      data[i] *= alpha;
      data[i + 1] *= alpha;
      data[i + 2] *= alpha;
    }

    // 横向卷积：data -> temp
    const temp = new Uint8ClampedArray(length);
    for (let y = 0; y < height; y++) {
      const row = y * width * 4;
      for (let x = 0; x < width; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        for (let k = -half; k <= half; k++) {
          const weight = kernel[k + half];
          const offset = row + Math.min(width - 1, Math.max(0, x + k)) * 4;
          r += data[offset] * weight;
          g += data[offset + 1] * weight;
          b += data[offset + 2] * weight;
          a += data[offset + 3] * weight;
        }
        const offset = row + x * 4;
        temp[offset] = r;
        temp[offset + 1] = g;
        temp[offset + 2] = b;
        temp[offset + 3] = a;
      }
    }

    // 纵向卷积：temp -> data
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        for (let k = -half; k <= half; k++) {
          const weight = kernel[k + half];
          const offset = (Math.min(height - 1, Math.max(0, y + k)) * width + x) * 4;
          r += temp[offset] * weight;
          g += temp[offset + 1] * weight;
          b += temp[offset + 2] * weight;
          a += temp[offset + 3] * weight;
        }
        const offset = (y * width + x) * 4;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = a;
      }
    }

    // 卷积完成，把颜色还原成非预乘形式
    for (let i = 0; i < length; i += 4) {
      const alpha = data[i + 3];
      if (alpha === 0) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        continue;
      }
      const invAlpha = 255 / alpha;
      data[i] *= invAlpha;
      data[i + 1] *= invAlpha;
      data[i + 2] *= invAlpha;
    }
  }

  /**
   * 把 1:1 的裁剪结果合成为 16:10 封面：
   * 底层是铺满宽度并高斯模糊后的封面（上下多余部分舍弃），中间叠放完整的原始封面。
   */
  private composeCoverWithBlur(source: HTMLCanvasElement) {
    const width = Math.min(ClassEditorInit.COVER_MAX_WIDTH, Math.max(1, source.width));
    const height = Math.round(width / ClassEditorInit.COVER_ASPECT_RATIO);

    // 1. 在较小的工作画布上铺满 1:1 封面（等比放大到占满宽度，上下居中裁掉多余高度）
    const scale = Math.min(1, ClassEditorInit.COVER_BLUR_WORK_WIDTH / width);
    const workWidth = Math.max(1, Math.round(width * scale));
    const workHeight = Math.max(1, Math.round(height * scale));
    const workCanvas = document.createElement("canvas");
    workCanvas.width = workWidth;
    workCanvas.height = workHeight;
    const workCtx = workCanvas.getContext("2d");
    if (!workCtx) return null;
    workCtx.imageSmoothingEnabled = true;
    workCtx.imageSmoothingQuality = "high";
    workCtx.drawImage(source, 0, (workHeight - workWidth) / 2, workWidth, workWidth);

    // 2. 高斯模糊，并保存偏好模糊半径
    const imageData = workCtx.getImageData(0, 0, workWidth, workHeight);
    const blurRadiusPercent = this.blurRadiusInput?.getValue();
    if (blurRadiusPercent === undefined) return null;
    ClassEditorInit.gaussianBlur(imageData, (workWidth * blurRadiusPercent) / 100);
    this.parent.configRepository.setSettings("coverGaussianBlurRadiusPercent", blurRadiusPercent);
    workCtx.putImageData(imageData, 0, 0);

    // 3. 模糊结果放大回目标尺寸
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(workCanvas, 0, 0, width, height);

    // 4. 原始 1:1 封面按高度等比缩放，水平居中叠放在模糊背景之上
    ctx.drawImage(source, (width - height) / 2, 0, height, height);

    return canvas;
  }

  /** 获取当前正在裁剪图片（即已上传但还未应用裁剪操作）的 base64 */
  private getCropperContent() {
    return $("#cover-canvas").attr("src");
  }

  /** 以 `base64` 为要编辑的图片，打开编辑页中的模组封面裁剪界面 */
  private setCropper(aspectRatio: number, base64 = this.getCropperContent()) {
    $("#cover-select-label,#cover-reset-button").hide();
    $(".cover-frame,#cover-update-button,#cover-cancel-button").show();
    $("#cover-canvas")
      .cropper("destroy")
      .cropper({
        aspectRatio,
        fillColor: 0,
        autoCropArea: 1,
        viewMode: 1,
      })
      .cropper("replace", base64, false);
  }

  /** 应用高斯模糊 */
  private completeCropper() {
    const cropped = $("#cover-canvas").cropper(
      "getCroppedCanvas",
    ) as unknown as HTMLCanvasElement | null;
    if (!cropped) {
      Utils.commonMsg("封面裁剪似乎失败了，请重试...", false);
      return;
    }

    // 应用高斯模糊，并把原始封面叠放在模糊后的结果之上
    const canvas = this.composeCoverWithBlur(cropped);
    if (!canvas) {
      Utils.commonMsg("封面合成似乎失败了，请重试...", false);
      return;
    }

    // 这一部分是照搬百科的检查逻辑
    const result = canvas.toDataURL("image/png");
    if (result.length > ClassEditorInit.COVER_MAX_SIZE) {
      Utils.commonMsg(PublicLangData.warning.inform[121], false);
      return;
    }
    const id = "#class-cover";
    $(id).val(result);
    $(id + "-preview-img").attr("src", result);
    $(".cover-frame,#cover-update-button,#cover-cancel-button").hide();
    $("#cover-select-label,#cover-reset-button").show();

    this.resetCropper();
  }

  /**
   * 销毁 Cropper，这样下次打开百科原生的封面裁剪器时，依旧能够通过重新初始化来保持 16:10，不会锁定在 1:1。
   * 同时，隐藏所有高斯模糊相关按钮，以完全回到编辑前的状态。
   */
  private resetCropper() {
    $("#cover-canvas").cropper("destroy");
    this.requestBlurButton?.hide();
    this.applyBlurButton?.hide();
    this.blurRadiusInputContainer?.hide();
  }

  run() {
    if (!this.isClassAddPage()) this.parent.editorLoad();
    setTimeout(() => {
      this.hideUnavailableVersion();
      $("#relation-frame .relation-version").each((_, _e) => {
        const e = $(_e);
        const last = e.children().last();
        $(`<i class="fa fa-sort-numeric-asc relation-version-sort-button">`)
          .insertBefore(last)
          .click((e) => {
            const target = $(e.currentTarget);
            const relationGroup = $(e.currentTarget).parents("fieldset").find(".relation-group");
            if (target.hasClass("fa-sort-numeric-asc")) {
              this.sortModRelationList(relationGroup);
              target.removeClass("fa-sort-numeric-asc").addClass("fa-rotate-left");
            } else {
              this.resetModRelationList(relationGroup);
              target.addClass("fa-sort-numeric-asc").removeClass("fa-rotate-left");
            }
          });
      });
    }, 1e3);
    setTimeout(
      () =>
        $(document).on("click", "input[data-multi-id=api]", () => this.hideUnavailableVersion()),
      1e3,
    );

    this.initCoverGaussianBlur();
  }
}
