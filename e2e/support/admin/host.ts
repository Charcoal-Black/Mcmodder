import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext } from "@playwright/test";

/**
 * 离线后台的**宿主交互 shim**。
 *
 * 真实后台的行为由站点自己的 `plugins.js` 提供（jQuery + `setPage()` + 一批事件委托）。
 * 离线用例不整包搬运那些 CDN 资源，只复刻用户脚本真正依赖的协议：
 *
 * 1. 点击左侧菜单 / 刷新 / 筛选链接时，`POST /frame/<page>/`，表单字段 `data` 是 JSON 字符串；
 * 2. 响应形状为 `{ state, html }`，`state === 0` 时把 `html` 写进目标容器；
 *    写完后移除加载图 —— 这一步同时触发 `.connect-area` 的 childList 变化，
 *    正是 `AdminInit` 观察页面切换的信号（与站点 `setPage()` 的加载图同款）；
 * 3. bootstrap-select 初始化时会给 `<select>` 加上的 `bs3` 类，这里直接补上，
 *    因为 `AdminVerifyInit` 的「一键查询待审项」按钮依赖 `.selectJump.bs3`。
 *
 * 只保证上述协议；Bootstrap 组件、iziToast、页面样式等一律不加载。
 *
 * `jquery.cookie.js` / `functions.js` 的最小实现放在 {@link installLegacyHelpers} 里单独注册，
 * 这样手动体验（`E2E_MANUAL=1`）时可以让位给外链缓存中的真站脚本。
 */

/** 站点框架页引用的 jQuery 地址（协议相对，实际为 https） */
const JQUERY_URL = "https://www.mcmod.cn/static/public/js/jquery-2.1.0.min.js";

/**
 * 站点框架页里的后台脚本；缓存里已有它时，说明手动体验用的是真站实现
 * （自带 `setPage()` 与事件委托），{@link ADMIN_HOST_SCRIPT} 就不能再注入。
 */
export const SITE_PLUGINS_URL = "https://admin.mcmod.cn/static/admin/js/plugins.js";

/** npm 里与站点同版本的 jQuery，直接作为 `JQUERY_URL` 的响应 */
const JQUERY_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../node_modules/jquery/dist/jquery.min.js",
);

/** 站点 `index.html` 里被我们拦掉的 `jquery.cookie.js` / `functions.js` */
const LEGACY_HELPERS_PATTERN =
  /https:\/\/www\.mcmod\.cn\/static\/public\/js\/(?:jquery\.cookie|functions)\.js(?:\?.*)?$/;

/** `jquery.cookie.js` + `functions.js` 中内联脚本实际用到的最小实现 */
const LEGACY_HELPERS_SCRIPT = `;(function ($) {
  function readCookie(name) {
    const pairs = document.cookie ? document.cookie.split(";") : [];
    for (const pair of pairs) {
      const index = pair.indexOf("=");
      if (index < 0) continue;
      if (pair.slice(0, index).trim() === name) return decodeURIComponent(pair.slice(index + 1));
    }
    return null;
  }
  $.cookie = function (name, value, options) {
    if (value === undefined) return readCookie(name);
    options = options || {};
    let cookie = name + "=" + encodeURIComponent(value);
    if (options.expires) cookie += "; expires=" + new Date(Date.now() + options.expires * 864e5).toUTCString();
    if (options.path) cookie += "; path=" + options.path;
    document.cookie = cookie;
    return value;
  };
  window.in_array = function (needle, haystack) {
    return haystack.indexOf(needle) !== -1;
  };
  // 站点 functions.js 里的通用选择器；审核主页的内联脚本会调用它，离线不需要真实弹层
  window.setCommonSelect = function () {};
})(window.jQuery);`;

/** 站点 `plugins.js#setPage` 的最小复刻 + 事件委托（见文件头注释） */
const ADMIN_HOST_SCRIPT = `(() => {
  "use strict";

  const $ = window.jQuery;
  if (!$) throw new Error("[e2e] admin host shim 需要先加载 jQuery");

  const host = (window.__mcmodderE2EAdminHost = { pages: [], messages: [] });

  function pageData(element) {
    const raw = element.attr("data-data");
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (error) {
      return {};
    }
  }

  function setPage(page, frame, data) {
    if (!page) return;
    const target = frame || "#connect-frame";
    const payload = data || {};
    host.pages.push({ page: page, frame: target, data: payload });

    const loading = $('<img class="e2e-admin-loading" alt="loading" />').insertAfter(target);
    $(target).hide();
    $.ajax({
      url: "/frame/" + page + "/",
      type: "post",
      async: true,
      data: { data: JSON.stringify(payload) },
      timeout: 30000,
      complete(xhr) {
        $(target).show();
        let response;
        try {
          response = JSON.parse(xhr.responseText);
        } catch (error) {
          loading.remove();
          return;
        }
        if (response && response.state === 0) {
          $(target).html(response.html);
          $(".selectpicker").addClass("bs3");
        } else if (response) {
          host.messages.push({ title: "提示", message: "state=" + response.state, type: "err" });
        }
        loading.remove();
      },
      error(xhr, status) {
        $(target).show();
        loading.remove();
        host.messages.push({ title: "错误", message: status, type: "err" });
      },
    });
  }

  // 站点把它定义在全局；脚本目前不直接调用，但保留同名入口方便对照排查
  window.setPage = setPage;

  $(document)
    .on("click", "a[name='menuJump'],#refresh-btn", function () {
      const element = $(this);
      setPage(
        element.attr("data-page"),
        element.attr("data-frame") || "#connect-frame",
        pageData(element),
      );
    })
    .on("click", ".commonJump", function () {
      const element = $(this);
      const data = pageData(element);
      const idSelector = element.attr("data-get-id");
      const name = element.attr("data-get-name");
      if (idSelector && name) data[name] = String($(idSelector).val() || "").trim();
      setPage(
        element.attr("data-page"),
        element.attr("data-frame") || "#connect-frame",
        data,
      );
    })
    .on("click", ".checkboxJump", function () {
      const element = $(this);
      const data = pageData(element);
      const name = element.attr("data-name");
      if (name) data[name] = element.is(":checked") ? 1 : 0;
      setPage(
        element.attr("data-page"),
        element.attr("data-frame") || "#connect-frame",
        data,
      );
    })
    .on("click", ".verify-user-filter", function () {
      const element = $(this);
      const data = pageData(element);
      data.userID = element.attr("data-uid");
      setPage(element.attr("data-page"), "#connect-frame-sub", data);
    })
    .on("change", ".selectJump", function () {
      submitSelect(this);
    })
    .on("changed.bs.select", ".selectJump", function () {
      submitSelect(this);
    });

  function submitSelect(element) {
    const select = $(element);
    const page = select.attr("data-page");
    const frame = select.attr("data-frame");
    if (!page || !frame) return;
    const data = pageData(select);
    const name = select.attr("data-name");
    if (name) data[name] = select.val();
    setPage(page, frame, data);
  }

  /** 站点的消息提示函数；脚本发现存在它时就不会回退到 SweetAlert */
  window.common_msg = function (title, message, type) {
    host.messages.push({ title: title, message: message, type: type });
  };
})();`;

/** 页面里拿到的宿主句柄（`page.evaluate` 用） */
export interface AdminHost {
  /** 把交互 shim 注入整页 HTML（放在 `</body>` 之前） */
  inject(html: string): string;
}

export interface AdminHostOptions {
  /**
   * 是否注入 {@link ADMIN_HOST_SCRIPT}，默认 `true`。
   *
   * 手动体验时若缓存里已有真站 {@link SITE_PLUGINS_URL}，它自己的 `setPage()` 与事件委托
   * 会和 shim 同时生效（一次点击发两次 `/frame/` 请求、`window.setPage` 被覆盖），
   * 此时调用方应传 `false`，直接用站点实现。
   */
  injectShim?: boolean;
}

/**
 * 安装站点 `jquery.cookie.js` / `functions.js` 的**最小实现**。
 *
 * 注册得比外链缓存早（优先级更低）：`E2E_MANUAL=1` 且缓存里有真站文件时，
 * 由缓存提供完整实现；缓存里没有（含 CI）才轮到这里的 shim。
 *
 * **注册顺序**：必须在「所有资源返回空响应」的兜底路由之后调用。
 */
export async function installLegacyHelpers(context: BrowserContext): Promise<void> {
  await context.route(LEGACY_HELPERS_PATTERN, (route) =>
    route.fulfill({
      contentType: "application/javascript; charset=utf-8",
      body: LEGACY_HELPERS_SCRIPT,
    }),
  );
}

/**
 * 安装离线后台宿主：拦截 jQuery 并返回把交互 shim 塞进整页 HTML 的函数。
 *
 * **注册顺序**：必须在「所有资源返回空响应」的兜底路由之后调用 —— Playwright 后注册的路由
 * 先匹配，否则兜底路由会把 jQuery 也吃掉。本函数只处理 `www.mcmod.cn` 上的静态资源，
 * 不会影响后台域名自己的文档/接口路由。
 *
 * `jquery.cookie.js` / `functions.js` 的最小实现由 {@link installLegacyHelpers} 单独安装，
 * 以便手动体验时让缓存里的真站脚本盖过它。
 */
export async function installAdminHost(
  context: BrowserContext,
  { injectShim = true }: AdminHostOptions = {},
): Promise<AdminHost> {
  await context.route(JQUERY_URL, (route) =>
    route.fulfill({ path: JQUERY_PATH, contentType: "application/javascript; charset=utf-8" }),
  );

  return {
    inject(html) {
      if (!injectShim) return html;
      const closeBody = html.lastIndexOf("</body>");
      const script = `<script>${ADMIN_HOST_SCRIPT}</script>`;
      if (closeBody === -1) return html + script;
      return `${html.slice(0, closeBody)}${script}\n${html.slice(closeBody)}`;
    },
  };
}
