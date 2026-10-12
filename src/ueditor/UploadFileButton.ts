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
const ICON_SVG = Values.assets.icon.fileUpload;

/**
 * 站点 UEditor 隐藏附件接口的动作名：上传、列出服务端已有的附件。
 */
const UPLOAD_FILE_ACTION = "uploadfile";
const LIST_FILE_ACTION = "listfile";
/** 未登录时服务端直接回这个 state */
const NOT_LOGGED_IN_STATE = "请先登录~";
/** 找回链接时最多比对几个候选文件（每个都要整份下载回来比对，不宜太多） */
const RECOVER_CANDIDATE_LIMIT = 5;
/** 内容比对取文件开头的字节数 */
const SIGNATURE_BYTES = 64;

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
 * 服务端有时只报错、不给地址（文件其实已存下），故失败时会用 `listfile` 的差分找回刚上传的文件，
 * 见 {@link recoverUploadedUrl}；提示统一走 `Utils.commonMsg`，错误原文留在控制台。
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

  // 失败时靠 listfile 的差分找回刚上传的文件（见 recoverUploadedUrl）
  let knownUrls: Set<string> | null = null;

  /** 列出服务端已有的附件（按修改时间倒序）；接口异常返回 null，调用方据此放弃差分 */
  async function listFiles() {
    try {
      const resp = await ueditor.parent.utils.createRequest(
        { url: `${origin}${Values.ueditorActionUrl}${LIST_FILE_ACTION}`, method: "GET" },
        "列出附件",
      );
      const result: { list?: { url?: unknown; mtime?: unknown }[] } = JSON.parse(
        resp.responseText?.trim() ?? "",
      );
      return (Array.isArray(result?.list) ? result.list : [])
        .flatMap((item) =>
          typeof item?.url === "string" && item.url
            ? [{ url: toAbsoluteUrl(item.url), mtime: Number(item?.mtime) || 0 }]
            : [],
        )
        .sort((a, b) => b.mtime - a.mtime);
    } catch (error) {
      console.warn("[Mcmodder] 附件列表获取失败：", error);
      return null;
    }
  }

  /** 记录当前已有的文件，供 {@link recoverUploadedUrl} 差分 */
  async function snapshot() {
    const list = await listFiles();
    knownUrls = list ? new Set(list.map((item) => item.url)) : null;
  }

  /** 文件指纹：开头的若干字节（列表接口不给大小与校验和，只能下载回来自己比） */
  const signature = (bytes: Uint8Array) => Array.from(bytes.slice(0, SIGNATURE_BYTES)).join(",");

  /** 整份取回附件内容用于比对 */
  async function downloadBytes(url: string) {
    const resp = await ueditor.parent.utils.createRequest(
      { url, method: "GET", responseType: "arraybuffer" },
      "比对附件内容",
    );
    return new Uint8Array(resp.response);
  }

  /** 服务端没给地址时，从 `listfile` 的差分里按「大小 + 开头字节」找回刚上传的文件；找不到返回空串 */
  async function recoverUploadedUrl(file: File) {
    const list = await listFiles();
    if (!list) return "";
    const before = knownUrls;
    knownUrls = new Set(list.map((item) => item.url));
    if (!before) return "";
    const fresh = list.filter((item) => !before.has(item.url)).slice(0, RECOVER_CANDIDATE_LIMIT);
    if (!fresh.length) return "";
    const want = signature(new Uint8Array(await file.slice(0, SIGNATURE_BYTES).arrayBuffer()));
    for (const item of fresh) {
      try {
        const bytes = await downloadBytes(item.url);
        if (bytes.length === file.size && signature(bytes) === want) return item.url;
      } catch (error) {
        console.warn("[Mcmodder] 附件内容比对失败：", error);
      }
    }
    return "";
  }

  /** 上传单个文件并把链接插入正文；成功与否都只在这里提示一次 */
  async function upload(file: File) {
    if (file.size > Values.ueditorFileMaxSize) {
      Utils.commonMsg("文件超过站点上限，仍尝试上传。", false, "警告");
    }
    if (!knownUrls) await snapshot();
    let link: string | undefined;
    let rejected = false;
    try {
      const form = new FormData();
      form.append("upfile", file, file.name);
      const resp = await ueditor.parent.utils.createRequest(
        {
          url: `${origin}${Values.ueditorActionUrl}${UPLOAD_FILE_ACTION}`,
          method: "POST",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            Origin: origin,
            Referer: `${origin}/`,
          },
          data: form,
        },
        "上传附件",
      );
      const raw = resp.responseText?.trim() ?? "";
      let result: { state?: string; url?: string } | undefined;
      try {
        result = JSON.parse(raw);
      } catch {
        // 登录失效等异常会返回 HTML 报错页，此时没有 state 可读
      }
      if (result?.state === "SUCCESS" && typeof result.url === "string") {
        link = toAbsoluteUrl(result.url);
      } else {
        rejected = true;
        // 服务端返回的原文只进控制台，不给用户看
        console.warn(
          "[Mcmodder] 附件上传未返回地址：",
          result?.state || raw.slice(0, 300) || "(空响应)",
        );
        if (result?.state === NOT_LOGGED_IN_STATE) {
          Utils.commonMsg("文件上传失败，请先登录。", false);
          return;
        }
        link = await recoverUploadedUrl(file);
      }
    } catch (error) {
      // 请求异常（网络中断、被限速队列丢弃等）会走到这里，原始错误留在控制台
      console.warn("[Mcmodder] 文件上传失败：", error);
      Utils.commonMsg("文件上传失败，请稍后再试。", false);
      return;
    }
    if (!link) {
      Utils.commonMsg("文件上传失败，请稍后再试。", false);
      return;
    }
    if (rejected) Utils.commonMsg("文件上传成功。");
    editor.execCommand(
      "insertHtml",
      `<a href="${Utils.escapeHTML(link)}" target="_blank">${Utils.escapeHTML(link)}</a>&nbsp;`,
    );
  }
}
