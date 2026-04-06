import { Mcmodder } from "../Mcmodder";
import { AutoLinkAuthorEntry, AutoLinkClassEntry, AutoLinkEntries, AutoLinkItemEntry, AutoLinkOredictEntry, AutoLinkSearchTag, McmodderAuthorData, McmodderClassData, McmodderItemData, McmodderItemList, McmodderOredictData } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";

export class McmodderAutoLink { 

  private editor: any;
  private parent: Mcmodder;
  private itemSourceList: McmodderItemList;
  private searchResultEntries?: AutoLinkEntries;
  private frame?: JQuery;
  private search?: JQuery;
  private resultFrame?: JQuery;
  private resultList?: JQuery;
  private input?: JQuery;
  private linkStyleTitle?: JQuery;
  private linkStyleFrame?: JQuery;
  private searchSourceSetting?: JQuery;
  private searchText?: string;
  private searchKeywords?: string[];
  private resultListItems?: JQuery[];

  static readonly AUTOLINK_KEYWORD_MAXLENGTH = 10;

  constructor(editor: any, itemSourceList: McmodderItemList) {
    this.editor = editor;
    this.parent = this.editor.parent;
    this.itemSourceList = itemSourceList;
  }

  init() {
    swal.fire({ // 初始化
      title: PublicLangData.editor.autolink.title,
      showConfirmButton: false,
      cancelButtonText: PublicLangData.close,
      preConfirm: () => { },
      allowOutsideClick: () => !swal.isLoading(),
      allowEscapeKey: () => !swal.isLoading(),
      showCancelButton: () => !swal.isLoading()
    });
    this.frame = $('<div class="edit-autolink-frame" />').appendTo(".swal2-content");
    this.search = $(`
      <form>
        <div class="input-group edit-autolink-search">
          <input class="form-control" name="key" value="" placeholder="搜索模组与资料.." maxlength="255">
          <button class="btn btn-dark" type="submit">搜索</button>
        </div>
      </form>`).appendTo(this.frame);
    this.frame.append(`<p class="tips">可用空格分割多个关键词，如“工业 电路”、“原版 甘蔗”等，最多${ McmodderAutoLink.AUTOLINK_KEYWORD_MAXLENGTH.toLocaleString() }个关键词。</p></div>`);
    this.resultFrame = $('<div class="edit-autolink-list" style="max-height:400px; overflow:auto;"><ul></ul></div>').appendTo(this.frame);
    this.resultList = this.resultFrame.find("ul").first();
    this.input = this.search.find("input");
    this.linkStyleTitle = $('<div class="title">链接文本:</div>').appendTo(this.frame).hide();
    this.linkStyleFrame = $(`
    <div class="edit-autolink-style">
      <div class="radio">
        <input id="edit-autolink-style-text-0" name="edit-autolink-style-text" value="0" type="radio">
        <label for="edit-autolink-style-text-0">选中的文本</label>
      </div>
      <div class="radio">
        <input id="edit-autolink-style-text-1" name="edit-autolink-style-text" value="1" type="radio">
        <label for="edit-autolink-style-text-1">一半名称 (仅主要名称)</label>
      </div>
      <div class="radio">
        <input id="edit-autolink-style-text-2" name="edit-autolink-style-text" value="2" type="radio">
        <label for="edit-autolink-style-text-2">完整名称 (主要名称+次要名称)</label>
      </div>
      <br>
      <div class="checkbox">
        <input id="edit-autolink-style-space" name="edit-autolink-style-space" value="1" type="checkbox">
        <label for="edit-autolink-style-space">在链接前后加空格</label>
      </div>
    </div>`).appendTo(this.frame).hide();
    this.searchSourceSetting = $(`
    <div class="edit-autolink-source">
      <div class="checkbox">
        <input id="edit-autolink-source-local" name="edit-autolink-source" type="checkbox">
        <label for="edit-autolink-source-local">本地搜索</label>
      </div>
      <div class="checkbox">
        <input id="edit-autolink-source-online" name="edit-autolink-source" type="checkbox">
        <label for="edit-autolink-source-online">联网搜索</label>
      </div>
    </div>`).appendTo(this.frame);

    if (!this.itemSourceList.length) this.searchSourceSetting.hide();
    else this.searchSourceSetting.show();

    $(".edit-autolink-search button").click(e => {
      e.preventDefault();
      this.onSearch();
    });

    this.input.focus().keyup(e => this.onKeydown(e));
    this.resultList.on("click", "li:not(.empty)", e => this.onClick(e));

    const content = this.getEditorSelectedContent();
    if (content) {
      this.input.val(content.textContent);
      this.search.find("button").click();
    }
  }

  private getEditorSelectedContent() {
    return this.editor.editor.selection.getRange().cloneContents();
  }

  private shouldHideSelectedContentStyle() {
    return !this.getEditorSelectedContent();
  }

  protected onClick(e: JQueryEventObject) {
    const target = e.currentTarget;
    const type = target.getAttribute("data-type");
    const style = Number(this.linkStyleFrame!.find("[name=edit-autolink-style-text]:checked").val());
    const appendSpace = Number(this.linkStyleFrame!.find("[name=edit-autolink-style-space]:checked").length);
    const id = target.getAttribute("data-id");
    let content;
    switch (style) {
      case 0: content = this.getEditorSelectedContent().textContent; break;
      case 1: content = target.getAttribute("data-text-half"); break;
      case 2: content = target.getAttribute("data-text-full"); break;
    }
    swal.close();

    let link;
    if (type === "item" || type === "class") link = `https://www.mcmod.cn/${ type }/${ id }.html`;
    else if (type === "oredict") link = `https://www.mcmod.cn/${ type }/${ id }-1.html`;

    let res = `<a href="${ link }" target="_blank" title="${ content }">${ content }</a>`;
    if (appendSpace) res = `&nbsp;${ res }&nbsp;`;
    this.editor.editor.execCommand("insertHtml", res);
  }

  protected onKeydown(e: JQueryKeyEventObject) {
    if (!e.altKey || !this.resultFrame) return;
    const num = e.which;
    if (num < 48 || num > 57) return;
    e.preventDefault();
    const target = this.resultFrame.find(`[data-shortcut-num=${ num - 48 }]`);
    McmodderUtils.highlight(target, "greenyellow");
    setTimeout(() => target.click(), 200);
  }

  onSearch() {
    this.searchText = this.search?.find("input[name=key]").val().trim();
    this.searchKeywords = this.searchText?.split(/\s+/).slice(0, McmodderAutoLink.AUTOLINK_KEYWORD_MAXLENGTH); // 原生最大长度为4
    this.performSearch();
  }

  renderSingleItem(item: McmodderItemData) {
    const fullName = McmodderUtils.getItemFullName(item.name, item.englishName);

    const classID = item.classID;
    let classFullName = this.parent.utils.getClassNameByClassID(classID);
    let {className, classEname, classAbbr} = McmodderUtils.parseClassFullName(classFullName);

    if (!classFullName) {
      className ||= item.className || "";
      classEname ||= item.classEname || "";
      classAbbr ||= item.classAbbr || "";
      classFullName = McmodderUtils.getClassFullName(className, classEname, classAbbr);
    }

    const itemLi = $(`<li
      data-type="item" 
      data-id="${ item.id }" 
      data-text-full="${ fullName }" 
      data-text-half="${ item.name }" 
      href="javascript:void(0);" 
      data-toggle="tooltip"> 
    </li>`);
    itemLi.append(`<img class="item-img" src="${
      item.smallIcon || McmodderUtils.getImageURLByItemID(item.id)
    }" onerror="this.src='${
      McmodderValues.assets.mcmod.emptyItemIcon32x
    }'; this.onerror=null;" width="32" height="32">`);
    const itemA = $(`<a>`).appendTo(itemLi);

    const matchedType = this.parent.utils.getItemTypeData(item.classID, item.itemType);
    this.parent.utils.getItemTypeHTML(matchedType).appendTo(itemA);
    const typename = matchedType?.text ? matchedType.text + " - " : "";
    itemLi.attr("data-original-title", `${ typename }ID:${ item.id } ${ fullName } - ${ classFullName }`);

    itemA.append(` <span class="item-id mcmodder-slim-dark">${ item.id }</span> `);
    if (classFullName) itemA.append(`<span class="item-modabbr">[${ classAbbr || classEname || className }]</span> `);
    itemA.append(`<span class="item-name">${ item.name }</span> `)
    if (item.englishName) itemA.append(`<span class="item-ename">${ item.englishName }</span>`);

    return itemLi;
  }

  renderSingleClass(entry: AutoLinkClassEntry) {
    const data = entry.data;
    const typeData = McmodderValues.nonItemTypeList[entry.type];
    const fullName = McmodderUtils.getClassFullName(data.name, data.englishName, data.abbr);
    const itemLi = $(`<li
      data-type="item" 
      data-id="${ data.id }" 
      data-text-full="${ fullName }" 
      data-text-half="${ data.name }" 
      href="javascript:void(0);" 
      data-toggle="tooltip" 
      data-original-title="${ typeData.text } - ID:${ data.id } ${ fullName }">
    </li>`);
    const itemA = $(`<a>`).appendTo(itemLi);
    itemA.append(`<i class="fas ${ typeData.icon } mcmodder-chroma"></i> <span class="item-id mcmodder-slim-dark">${ data.id }</span> `);
    if (data.abbr) itemA.append(`<span class="item-modabbr">[${ data.abbr }]</span> `);
    itemA.append(`<span class="item-name">${ data.name }</span> `);
    if (data.englishName) itemA.append(`<span class="item-ename">${ data.englishName }</span>`);
    return itemLi;
  }

  renderSingleAuthor(entry: AutoLinkAuthorEntry) {
    const data = entry.data;
    const typeData = McmodderValues.nonItemTypeList[data.isTeam ? "authors" : "author"];
    let fullName = data.name;
    if (data.alias) fullName += " - " + data.alias;
    const itemLi = $(`<li
      data-type="item" 
      data-id="${ data.id }" 
      data-text-full="${ fullName }" 
      data-text-half="${ data.name }" 
      href="javascript:void(0);" 
      data-toggle="tooltip" 
      data-original-title="${ fullName }">
    </li>`);
    const itemA = $(`<a>`).appendTo(itemLi);
    itemA.append(`<i class="fas ${ typeData.icon } mcmodder-chroma"></i> <span class="item-id mcmodder-slim-dark">${ data.id }</span> `);
    itemA.append(`<span class="item-name">${ data.name }</span> `);
    if (data.alias) itemA.append(`<span class="item-ename">${ data.alias }</span>`);
    return itemLi;
  }

  renderSingleOredict(item: McmodderOredictData) {
    return $(`
      <li data-type="oredict" data-id="${item.id}" data-text-full="#${item.id}" data-text-half="${item.id}">
        <i class="fas fa-cubes mcmodder-chroma"></i>
        #${item.id}
      </li>`);
  }

  displaySearchResult(entries = this.searchResultEntries) {
    if (!entries || !this.resultList || !this.resultFrame || !this.linkStyleFrame || !this.linkStyleTitle) return;
    this.resultList.empty();
    let itemCount = entries.length;

    if (!itemCount) {
      if (!this.searchText) { // 未发起搜索
        this.resultFrame.hide();
        this.linkStyleTitle.hide();
        this.linkStyleFrame.hide();
        return;
      }
    }

    if (!itemCount) {
      this.resultList.append(`<li class="empty">没有找到与“ ${ this.searchText } ”有关的内容。</li>`);
      this.linkStyleTitle.hide();
      this.linkStyleFrame.hide();
      return;
    }

    this.resultFrame.show();
    this.resultList.append('<div class="title">搜索结果:</div>');
    this.linkStyleTitle.show();
    this.linkStyleFrame.show();

    const style0 = this.linkStyleFrame.find("#edit-autolink-style-text-0").parent();
    if (this.shouldHideSelectedContentStyle()) style0.hide();
    else style0.show();

    this.resultListItems = [];
    entries.forEach(entry => { // 预处理
      let node: JQuery;
      switch (entry.type) {
        case "class": case "modpack": node = this.renderSingleClass(entry as AutoLinkClassEntry); break;
        case "author": node = this.renderSingleAuthor(entry as AutoLinkAuthorEntry); break;
        case "oredict": node = this.renderSingleOredict((entry as AutoLinkOredictEntry).data); break;
        case "item": node = this.renderSingleItem((entry as AutoLinkItemEntry).data); break;
      }
      this.resultListItems!.push(node);
    });
    this.resultListItems.forEach((item, index) => { // 修饰处理
      if (index < 10) $(item)
      .append(`<span class="item-shortcut">${ McmodderUtils.keyToHTML({ altKey: true, key: index.toString() }) }</span>`)
      .attr("data-shortcut-num", index);
      this.resultList!.append(item);
    });

    let preferredStyle: number;
    if (!this.shouldHideSelectedContentStyle()) preferredStyle = 0;
    else {
      preferredStyle = this.parent.utils.getConfig("preferredAutolinkStyle");
      if (preferredStyle === undefined) preferredStyle = 1;
    }
    this.linkStyleFrame.find(`#edit-autolink-style-text-${ preferredStyle }`).click();
    if (preferredStyle) this.linkStyleFrame.on("click", "[name=edit-autolink-style-text]", _ => {
      this.parent.utils.setConfig("preferredAutolinkStyle", Number(this.linkStyleFrame!.find("[name=edit-autolink-style-text]:checked").val()));
    });

    McmodderUtils.updateAllTooltip();
  }

  async performOnlineSearch() {
    let resp = await this.parent.utils.createAsyncRequest({
      url: "https://www.mcmod.cn/object/UEAutolink/",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://www.mcmod.cn",
        "Referer": this.parent.href,
        "Priority": "u=0",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
      },
      data: $.param({
        classID: nClassID,
        key: this.searchText
      })
    });
    let data = JSON.parse(resp.responseText);
    if (data.state) {
      McmodderUtils.commonMsg(McmodderValues.errorMessage[data.state], false);
      return;
    }
    return this.parseOnlineSearchResult(data.html);
  }

  private parseOnlineSearchItemResult(index: number, element: Element): AutoLinkItemEntry | undefined {
    const img = element.childNodes.item(0);
    const link = element.childNodes.item(1) as HTMLLinkElement;
    if (!(img && link)) return;

    const dataType = link.getAttribute("data-type");
    if (dataType != "item") return; // TODO: 支持其他类型的搜索结果

    const id = Number(link.getAttribute("data-id"));
    const name = link.getAttribute("data-text-half") || "";
    const ename = name ? link.getAttribute("data-text-full")?.slice(name.length + 2, -1) : undefined;

    let splitIndexOf = link.textContent.indexOf(" - ");
    const creativeTabName = link.textContent.slice(0, splitIndexOf);

    splitIndexOf = 0;
    const nameIndexOf = link.title.indexOf(name);
    const classTextFull = link.title.slice(nameIndexOf + name.length).split(" - ")[1];
    let className, classEname, classAbbr;
    if (classTextFull.charAt(0) === '[') {
      splitIndexOf = classTextFull.indexOf("]");
      classAbbr = classTextFull.slice(1, splitIndexOf);
      className = classTextFull.slice(splitIndexOf + 2);
    }
    else className = classTextFull;
    splitIndexOf = className.lastIndexOf(" (");
    if (splitIndexOf != -1) {
      classEname = className.slice(splitIndexOf + 2, -1);
      className = className.slice(0, splitIndexOf);
    }

    const classID = Number(this.parent.utils.getClassIDByClassName(classTextFull));
    const typeName = link.title.split(" - ")[0];
    let typeID = 0;
    const matchedTypeList = this.parent.itemTypeList?.filter(entry => 
      (entry.classID === classID || entry.classID === 0) &&
      entry.text === typeName
    );
    if (matchedTypeList && matchedTypeList.length) {
      typeID = matchedTypeList[0].typeID;
    }

    const itemData: McmodderItemData = {
      id: id,
      itemType: typeID,
      name: name,
      englishName: ename,
      classID: classID,
      classAbbr: classAbbr,
      className: className,
      classEname: classEname,
      creativeTabName: creativeTabName
    };

    return this.evaluateItemMatchRate(itemData, this.searchKeywords || [], (30 - index) / 3);
  }

  private parseOnlineSearchClassResult(index: number, link: HTMLLinkElement, type: "class" | "modpack"): AutoLinkClassEntry {
    const text = link.getAttribute("data-text-full");
    const classID = Number(link.getAttribute("data-id"));
    const {className, classEname, classAbbr} = McmodderUtils.parseClassFullName(text || "");
    const classData: McmodderClassData = {
      id: classID,
      name: className,
      englishName: classEname,
      abbr: classAbbr
    };
    return {
      type: type,
      data: classData,
      searchTag: {
        matchScore: (30 - index) / 3
      }
    };
  }

  private parseOnlineSearchAuthorResult(index: number, link: HTMLLinkElement, type: "author"): AutoLinkAuthorEntry | undefined {
    const text = link.textContent;
    const textHalf = link.getAttribute("data-text-half");
    const textFull = link.getAttribute("data-text-full");
    const id = Number(link.getAttribute("data-id"));
    if (!textHalf || !textFull) return;
    const alias = textHalf === textFull ? textHalf : textFull.slice(textHalf.length + 3);
    let isTeam: boolean;
    if (text.startsWith("个人作者")) isTeam = false;
    else if (text.startsWith("开发团队")) isTeam = true;
    else return;
    const authorData: McmodderAuthorData = {
      id: id,
      name: textHalf,
      alias: alias,
      isTeam: isTeam
    };
    return {
      type: type,
      data: authorData,
      searchTag: {
        matchScore: (30 - index) / 3
      }
    }
  }

  private parseOnlineSearchNonItemResult(index: number, element: Element): AutoLinkClassEntry | AutoLinkAuthorEntry | undefined {
    const link = element.childNodes.item(0) as HTMLLinkElement;
    if (!link || link.nodeType != Node.ELEMENT_NODE) return;
    const type = link.getAttribute("data-type");
    if (type === "class" || type === "modpack") return this.parseOnlineSearchClassResult(index, link, type);
    else if (type === "author") return this.parseOnlineSearchAuthorResult(index, link, type);
  }

  parseOnlineSearchResult(raw: string) {
    const html = $("<div>").html(raw).find(".edit-autolink-list li");
    const searchResult: AutoLinkEntries = [];
    if (html.attr("class") === "empty") return [];
    html.each((index, element) => {
      const childNodes = element.childNodes;
      let result;
      if (childNodes.length === 1) result = this.parseOnlineSearchNonItemResult(index, element);
      else result = this.parseOnlineSearchItemResult(index, element);
      if (result) searchResult.push(result);
    });

    return searchResult;
  }

  async performSearch() {

    if (!this.searchSourceSetting) return;
    
    let searchLocal: boolean, searchOnline: boolean;
    if (!this.itemSourceList.length) {
      searchLocal = false;
      searchOnline = true;
    }
    else {
      searchLocal = this.searchSourceSetting.find("#edit-autolink-source-local").prop("checked");
      searchOnline = this.searchSourceSetting.find("#edit-autolink-source-online").prop("checked");
    }
    
    if (!this.searchText || !this.searchText.length) {
      this.displaySearchResult([]);
      return;
    }

    this.searchResultEntries = [];

    // 本地搜索
    if (searchLocal && this.searchKeywords) {
      this.itemSourceList.forEach(item => {
        if (item.id) this.searchResultEntries!.push(this.evaluateItemMatchRate(item, this.searchKeywords!)); // 只有已被导入百科的物品才会被搜索
      });
    }

    // 联网搜索
    if (searchOnline) {
      // ID去重，替代concat
      const localResultIDs: (string | number)[] = this.searchResultEntries.map(item => {
        return (item as (AutoLinkItemEntry | AutoLinkOredictEntry)).data.id;
      });
      const onlineResult = await this.performOnlineSearch();
      if (onlineResult) {
        for (const item of onlineResult) {
          if (!(localResultIDs.includes((item as (AutoLinkItemEntry | AutoLinkOredictEntry)).data.id))) {
            this.searchResultEntries.push(item);
          }
        }
      }
    }

    // 矿物词典/物品标签附加
    if (this.searchText.charAt(0) === "#") {
      this.searchResultEntries.push({
        type: "oredict",
        data: {
          id: this.searchText.slice(1)
        },
        searchTag: {
          matchScore: 100
        }
      } as AutoLinkOredictEntry);
    }

    // 整合搜索结果
    this.searchResultEntries = this.searchResultEntries
    .filter(e => e.searchTag.matchScore > 0)
    .sort((a, b) => {
      return b.searchTag.matchScore - a.searchTag.matchScore;
    });
    this.displaySearchResult();
  }

  evaluateItemMatchRate(item: McmodderItemData, keywords: string[], baseMatchScore = 0): AutoLinkItemEntry {
    let totalScore = 0;
    const tag: AutoLinkSearchTag = {
      matchScore: /* item.searchTag?.matchScore || */ baseMatchScore,
      isAbsoluteMatches: false,
      isModMatches: false,
      isModVanilla: true,
      isModExpansionMatches: false,
      isModDependenceMatches: false
    };

    // 关键词匹配
    keywords.forEach(keyword => {
      if (Number(keyword) === item.id) {
        totalScore += 50;
        tag.isAbsoluteMatches = true;
        return Object.assign(item, tag);
      }
      let pos: number;
      pos = item.name?.indexOf(keyword) || -1;
      if (pos >= 0) totalScore += (pos === 0 ? 4 : 2) * (1 + 2 * keyword.length / item.name.length);
      pos = item.englishName?.indexOf(keyword) || -1;
      if (pos >= 0) totalScore += (pos === 0 ? 2 : 1) * (1 + 2 * keyword.length / item.englishName!.length);
    });

    // 至少匹配到一个关键词才会出现在检索结果
    if (totalScore) {
      // 提升原版物品权重
      if (item.classID === 1) {
        totalScore += 5;
        tag.isModVanilla = true;
      }

      if (typeof nClassID) {
        const classID = Number(nClassID);
        // 提升本模组物品权重
        if (item.classID === classID) {
          totalScore += 10;
          tag.isModMatches = true;
        }

        // 提升前置与附属模组物品权重
        if (this.parent.utils.getConfigAsNumberList(item.classID, "modDependences_v2").includes(classID)) {
          totalScore += 7;
          tag.isModDependenceMatches = true;
        }
        else if (this.parent.utils.getConfigAsNumberList(item.classID, "modExpansions_v2").includes(classID)) {
          totalScore += 7;
          tag.isModExpansionMatches = true;
        }
      }
    }

    tag.matchScore += totalScore;
    return {
      type: "item",
      data: item,
      searchTag: tag
    } as AutoLinkItemEntry;
  }
};