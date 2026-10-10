import { Utils } from "../Utils";
import { Values } from "../Values";
import type { UEditor } from "./UEditor";

const ICON_SVG = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1.6 3.4 6.2h2.7v4.6h3.8V6.2h2.7z"/><rect fill="currentColor" x="2.6" y="12.2" width="10.8" height="1.9" rx=".95"/></svg>`;

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
 * 因此服务端把附件与图床图片一视同仁地存放；站点只给短评工具栏配了「多图上传」，
 * 附件接口虽有却没有入口，故由脚本补一个按钮。
 *
 * 失败（未登录、体积或类型超限、接口异常）以 `Utils.commonMsg` 提示，错误原文留在控制台。
 *
 * @param ueditor 目标编辑器；只有短评编辑器需要，见 {@link UEditor.init}。
 */
export function addUploadFileButton(ueditor: UEditor) {
  const toolbar = ueditor.toolbar;
  const editor = ueditor.editor;
  if (!toolbar?.length) return;

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
            <div class="edui-box edui-icon edui-default mcmodder-edui-upload">${ICON_SVG}</div>
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
