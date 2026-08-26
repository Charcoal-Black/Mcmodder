import { Mcmodder } from "../Mcmodder";
import { McmodderUtils } from "../Utils";

type LinkMarkReplaceRule = {
  regExp: RegExp,
  icon: string,
  parser: (link: string) => string;
}

export class McmodderMainText {
  private readonly parent: Mcmodder;
  private readonly container: JQuery;

  constructor(parent: Mcmodder, container: Node | JQuery) {
    this.parent = parent;
    this.container = $(container);

    if (this.parent.utils.getConfig("linkCheck")) {
      this.linkCheck();
    }

    // 图像本地化检测
    if (this.parent.utils.getConfig("imageLocalizedCheck")) {
      this.imageLocalizedCheck();
    }
  }

  private linkCheck() {
    const linkMap: Map<string, string> = new Map;
    const warnList: string[] = [];
    let clashFlag = false;
    let fandomFlag = false;
    this.container.find('> *:not(.item-data) a:not([href="javascript:void(0);"])')
    .filter((_, c) => !!(c.textContent && (c.parentNode as Element)?.tagName != "LEGEND"))
    .each((_, a) => {
      const key = a.textContent;
      const value = (a as HTMLAnchorElement).href.replaceAll(/https:\/\/www1?\.mcmod\.cn/g, "");
      if (this.parent.utils.getConfig("linkMark")) {
        this.generateLinkMark(value).insertAfter(a);
      }
      if (!linkMap.has(key)) linkMap.set(key, value);
      else if (linkMap.get(key) != value) warnList.push(key);
    })
    .each((_, a) => {
      if (warnList.includes(a.textContent)) {
        a.classList.add("mcmodder-link-warn");
        clashFlag = true;
      } else if ((a as HTMLAnchorElement).href.includes("minecraft.fandom.com")) {
        a.classList.add("mcmodder-link-warn");
        fandomFlag = true;
      }
    });
    if (clashFlag) McmodderUtils.commonMsg("发现疑似的链接冲突问题，请检查~", false);
    if (fandomFlag) McmodderUtils.commonMsg("发现 Minecraft Wiki Fandom 链接，请将其及时更新至 zh.minecraft.wiki ~", false);
  }

  private static readonly linkMarkReplaceRules: LinkMarkReplaceRule[] = [
    {
      regExp: /^\/item\/\d+\.html$/,
      icon: "cube",
      parser: link => McmodderUtils.abstractIDFromURL(link, "item").toString()
    }, {
      regExp: /^\/item\/tab\/\d+\.html$/,
      icon: "table",
      parser: link => McmodderUtils.abstractIDFromURL(link, "item/tab").toString()
    }, {
      regExp: /^\/class\/\d+\.html$/,
      icon: "cubes",
      parser: link => McmodderUtils.abstractIDFromURL(link, "class").toString()
    }, {
      regExp: /^\/modpack\/\d+\.html$/,
      icon: "file-zip-o",
      parser: link => McmodderUtils.abstractIDFromURL(link, "modpack").toString()
    }, {
      regExp: /^\/author\/\d+\.html$/,
      icon: "author",
      parser: link => McmodderUtils.abstractIDFromURL(link, "author").toString()
    }, {
      regExp: /^\/oredict\/[0-9A-Za-z:_\/]+-1.html$/,
      icon: "tag",
      parser: link => link.slice(9, -7)
    }
  ];

  private generateLinkMark(link: string) {
    const container = $('<span class="mcmodder-link-check">');
    for (const { regExp, icon, parser } of McmodderMainText.linkMarkReplaceRules) {
      if (regExp.test(link)) {
        const escaped = McmodderUtils.escapeHTML(parser(link));
        container.html(`<i class="mcmodder-link-icon fa fa-${ icon }"></i>${ escaped }`);
        return container;
      }
    }
    const escaped = McmodderUtils.escapeHTML(link);
    return container.html(escaped);
  }

  private imageLocalizedCheck() {
    this.container.find(".figure img").each((_, e) => {
      const img = e as HTMLImageElement;
      if (img.complete) {
        this.singleImageLocalizedCheck(img);
      } else {
        img.onload = () => this.singleImageLocalizedCheck(img);
      }
    });
  }

  private singleImageLocalizedCheck(img: HTMLImageElement) {
    const src = img.dataset.src ?? img.src;
    fetch(src, { method: "HEAD" }).then(resp => {
      const container = $(img).parent();
      if (resp.status != 200)
        return;
      const size = Number(resp.headers.get("content-length"));
      const contentType = resp.headers.get("content-type") ?? "?";
      if (size > 1024000) container // editor.options.fileMaxSize
        .append(`<span class="badge badge-warning" style="display: inherit;">该图片尚未本地化，但是体积 (${ McmodderUtils.getFormattedSize(size) }) 超过了本地图床最大体积限制</span>`)
        .css("border", "10px solid var(--mcmodder-color-warning)");
      else if (!["image/png", "image/jpg", "image/jpeg", "image/gif"].includes(contentType)) container // editor.options.fileAllowFiles ?
        .append(`<span class="badge badge-warning" style="display: inherit;">该图片尚未本地化，但是使用了本地图床不支持的文件格式 (${ contentType })</span>`)
        .css("border", "10px solid var(--mcmodder-color-warning)");
      else if (!src.includes("mcmod.cn")) container
        .append('<span class="badge badge-danger" style="display: inherit;">该图片尚未本地化！</span>')
        .css("border", "10px solid var(--mcmodder-color-danger)");
    });
  }
}