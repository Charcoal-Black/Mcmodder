import { Utils } from "../Utils";
import { Values } from "../Values";
import type { UEditor } from "./UEditor";

/**
 * 「上传文件」按钮的图标：Font Awesome 5 Free 的 `file-upload`（solid）官方轮廓。
 *
 * 不能直接挂 `fa fa-file-upload`：站点同时引入 FA5 与 FA4，且 FA4 的 `font-awesome.min.css` 在
 * `all.min.css` **之后**加载，FA4 的 `.fa{font:...FontAwesome}` 简写会盖掉 FA5 的字体族，
 * 于是 FA5 专有的码位 `\f574` 会回退成豆腐块。故这里内联官方 SVG 轮廓（viewBox 与路径取自
 * fontawesome 5.15.4 的 `svgs/solid/file-upload.svg`），不依赖站点字体。
 */
const ICON_SVG =
  '<svg viewBox="0 0 384 512" style="width: 1em; height: 1em; fill: currentColor; display: inline-block; vertical-align: middle;" aria-hidden="true"><path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm65.18 216.01H224v80c0 8.84-7.16 16-16 16h-32c-8.84 0-16-7.16-16-16v-80H94.82c-14.28 0-21.41-17.29-11.27-27.36l96.42-95.7c6.65-6.61 17.39-6.61 24.04 0l96.42 95.7c10.15 10.07 3.03 27.36-11.25 27.36zM377 105L279.1 7c-4.5-4.5-10.6-7-17-7H256v128h128v-6.1c0-6.3-2.5-12.4-7-16.9z"/></svg>';

/** 把服务端返回的地址补全成绝对地址：站点可能返回 `//host/...`（协议相对）或 `/upload/...`（根相对） */
function toAbsoluteUrl(url: string) {
  if (url.startsWith("//")) return location.protocol + url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${location.origin}/${url.replace(/^\/+/, "")}`;
}

/**
 * 在编辑器工具栏里注入「上传文件」按钮：点选本地文件后用站点 UEditor 的隐藏 `uploadfile` 接口上传，
 * 再把返回的链接以超链接形式插入正文。
 *
 * 请求体与编辑器自带的上传插件一致（`upfile` 字段 + 站点 cookie，经 {@link Utils.createRequest} 发出），
 * 因此服务端把附件与图床图片一视同仁地存放；站点只给工具栏配了「多图上传」，
 * 附件接口虽有却没有入口，故由脚本补一个按钮。
 *
 * 失败（未登录、体积或类型超限、接口异常）以 `Utils.commonMsg` 提示，错误原文留在控制台。
 *
 * @param ueditor 目标编辑器；短评编辑器与资料编辑器（{@link AdvancedUEditor}）都会注入，见 {@link UEditor.init}。
 */
export function addUploadFileButton(ueditor: UEditor) {
  const toolbar = ueditor.toolbar;
  const editor = ueditor.editor;
  // 工具栏不存在（编辑器尚未铺好）或按钮已注入过时不重复添加
  if (!toolbar?.length || toolbar.find(".edui-for-mcmodderupload").length) return;

  const origin = location.origin;
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = Values.ueditorFileAccept;
  input.hidden = true;

  const button = $(
    `<div class="edui-box edui-button edui-for-mcmodderupload edui-default">
      <div class="edui-default">
        <div class="edui-button-wrap edui-default">
          <div class="edui-button-body edui-default" unselectable="on" title="上传文件">
            <div class="edui-box edui-icon edui-default mcmodder-edui-box mcmodder-edui-upload">${ICON_SVG}</div>
          </div>
        </div>
      </div>
    </div>`,
  ).append(input);
  // 挨着「多图上传」摆（同为上传入口）；工具栏上没有它时退回末尾
  const insertImageButton = toolbar.find(".edui-for-insertimage").last();
  if (insertImageButton.length) button.insertAfter(insertImageButton);
  else toolbar.append(button);

  let uploading = false;
  // 与站点原生工具栏按钮一致：吞掉 mousedown，避免 iframe 失焦后正文里的选区丢失
  button.on("mousedown", (event) => event.preventDefault());
  button.on("click", () => {
    if (!uploading) input.click();
  });

  input.addEventListener("change", async () => {
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    uploading = true;
    button.addClass("mcmodder-edui-uploading");
    try {
      for (const file of files) await upload(file);
    } finally {
      uploading = false;
      button.removeClass("mcmodder-edui-uploading");
      input.value = "";
    }
  });

  /** 上传单个文件并把链接插入正文；成功与否都只在这里提示一次 */
  async function upload(file: File) {
    const form = new FormData();
    form.append("upfile", file, file.name);
    let result: { state?: string; url?: string } | undefined;
    try {
      const resp = await ueditor.parent.utils.createRequest({
        url: `${origin}${Values.ueditorActionUrl}uploadfile`,
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Origin: origin,
          Referer: `${origin}/`,
        },
        data: form,
      });
      result = JSON.parse(resp.responseText?.trim() ?? "");
    } catch (error) {
      // 接口异常响应（登录失效会返回 HTML 报错页）会走到这里，原始错误留在控制台
      console.warn("[Mcmodder] 文件上传失败：", error);
      Utils.commonMsg("文件上传失败，请稍后再试。", false);
      return;
    }
    if (result?.state !== "SUCCESS" || typeof result.url !== "string") {
      Utils.commonMsg(`文件上传失败：${result?.state || "未知错误"}`, false);
      return;
    }
    const url = toAbsoluteUrl(result.url);
    editor.execCommand(
      "insertHtml",
      `<a href="${Utils.escapeHTML(url)}" target="_blank">${Utils.escapeHTML(url)}</a>&nbsp;`,
    );
  }
}
