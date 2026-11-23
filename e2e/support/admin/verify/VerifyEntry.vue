<template>
  <p style="line-height: 30px"><b>主站通用快捷搜索功能（仅用于便捷查找）</b></p>
  <p>
    <span
      class="btn pointer verify-info-mcmod-select"
      mcmod-type="common-select"
      mcmod-key="post_relation_mod"
      >搜模组</span
    >
    <span
      class="btn pointer verify-info-mcmod-select"
      mcmod-type="common-select"
      mcmod-key="post_relation_modpack"
      >搜整合包</span
    >
    <span
      class="btn pointer verify-info-mcmod-select"
      mcmod-type="common-select"
      mcmod-key="item_tools"
      >搜资料</span
    >
    <span class="btn pointer verify-info-mcmod-select" mcmod-type="common-select" mcmod-key="author"
      >搜作者</span
    >
  </p>
  <hr />
  <p>
    操作类型：{{ Values.editActionIDMap[edition.action].name }}，编辑者：{{
      nickname(McmodRepository.getUser(edition.owner))
    }}，最后提交时间：{{ Utils.getFormattedDateTime(new Date(edition.lastSubmittedAt)) }} ({{
      Utils.getFormattedChineseTime(edition.lastSubmittedAt - Date.now())
    }})。
  </p>
  <p v-if="remark" class="text-danger">改动附言：{{ remark }}</p>
  <p v-if="reason" class="text-info">改动说明：{{ reason }}</p>
  <p
    v-if="edition.refundCount"
    style="
      color: #fff;
      background: indianred;
      font-size: 12px;
      display: inline;
      word-break: break-all;
    "
  >
    此项被退回了{{ edition.refundCount }}次，最后一次由
    {{ nickname(McmodRepository.getUser(edition.refunder ?? 0)) }} 在
    {{ Utils.getFormattedDateTime(new Date(edition.refundAt ?? 0)) }} ({{
      Utils.getFormattedChineseTime(edition.refundAt ?? 0 - Date.now())
    }}) 退回，原因：{{ edition.refundReason }}
  </p>
  <p>当前审核{{ isAssistant ? "助理" : "人" }}：{{ user.username }}</p>
  <div :class="isVerify ? 'verify-action-btns' : 'assistant-action-btns'">
    <button
      v-if="isVerify"
      id="verify-pass-btn"
      class="btn btn-success action-btn edit"
      :data-edit-id="editButtonID"
      :data-data="`{&quot;type&quot;:&quot;pass&quot;,&quot;typeID&quot;:&quot;${editTypeID}&quot;,&quot;verifyID&quot;:&quot;${edition.id}&quot;}`"
      data-loading-text="执行中.."
    >
      通过后打开编辑
    </button>
    <button
      v-if="isVerify"
      id="verify-refund-btn"
      class="btn btn-danger action-btn edit"
      :data-edit-id="editButtonID"
      :data-data="`{&quot;type&quot;:&quot;pass&quot;,&quot;typeID&quot;:&quot;${editTypeID}&quot;,&quot;verifyID&quot;:&quot;${edition.id}&quot;}`"
      data-loading-text="执行中.."
    >
      退回后打开编辑
    </button>
    <br v-if="isVerify" />
    <button
      v-if="isVerify"
      id="verify-pass-btn"
      class="btn btn-success action-btn"
      :data-data="`{&quot;type&quot;:&quot;pass&quot;,&quot;typeID&quot;:&quot;${editTypeID}&quot;,&quot;verifyID&quot;:&quot;${edition.id}&quot;}`"
      data-loading-text="执行中.."
    >
      通过
    </button>
    <button
      v-if="isVerify"
      id="verify-refund-btn"
      class="btn btn-danger action-btn"
      :data-data="`{&quot;type&quot;:&quot;pass&quot;,&quot;typeID&quot;:&quot;${editTypeID}&quot;,&quot;verifyID&quot;:&quot;${edition.id}&quot;}`"
      data-loading-text="执行中.."
    >
      退回
    </button>
    <button
      v-if="isAssistant"
      id="assistant-pass-btn"
      title="标记为：没有问题，可以过审"
      class="btn btn-success action-btn"
      :data-data="`{&quot;type&quot;:&quot;pass&quot;,&quot;typeID&quot;:&quot;${editTypeID}&quot;,&quot;verifyID&quot;:&quot;${edition.id}&quot;}`"
      data-loading-text="执行中.."
    >
      可以通过
    </button>
    <button
      v-if="isAssistant"
      id="assistant-check-btn"
      title="标记为：细节问题，需要协改"
      class="btn btn-warning action-btn"
      :data-data="`{&quot;type&quot;:&quot;check&quot;,&quot;typeID&quot;:&quot;${editTypeID}&quot;,&quot;verifyID&quot;:&quot;${edition.id}&quot;}`"
      data-loading-text="执行中.."
    >
      需要检查
    </button>
    <button
      v-if="isAssistant"
      id="assistant-refund-btn"
      title="标记为：严重问题，需要退回"
      class="btn btn-danger action-btn"
      :data-data="`{&quot;type&quot;:&quot;refund&quot;,&quot;typeID&quot;:&quot;${editTypeID}&quot;,&quot;verifyID&quot;:&quot;${edition.id}&quot;}`"
      data-loading-text="执行中.."
    >
      建议退回
    </button>
    <button
      v-if="isAssistant"
      id="assistant-waiting-btn"
      title="标记为：正在确认，请勿审核"
      class="btn action-btn"
      :data-data="`{&quot;type&quot;:&quot;waiting&quot;,&quot;typeID&quot;:&quot;${editTypeID}&quot;,&quot;verifyID&quot;:&quot;${edition.id}&quot;}`"
      data-loading-text="执行中.."
    >
      正在确认
    </button>
    <p>{{ isVerify ? "审核意见:" : "附言或退回理由(退回时必须认真填写):" }}</p>
    <p>
      <input
        :id="isVerify ? 'verify-reason' : 'assistant-reason'"
        class="form-control inline"
        type="text"
        maxlength="1024"
        value=""
        placeholder="填写附言或退回理由...."
      />
    </p>
    <div v-if="Values.editActionIDMap[edition.action].type === '1'" style="margin-top: -10px">
      <p v-if="cfLink">
        <a title="" target="_blank" :href="cfLink">curseforge/files</a>
      </p>
      <p v-if="mrLink">
        <a title="" target="_blank" :href="mrLink">modrinth/versions</a>
      </p>
      <p v-if="ghLink">
        <a title="" target="_blank" :href="ghLink">github/releases</a>
      </p>
    </div>
  </div>
  <div class="assistant-sug" style="margin-bottom: 20px">
    <ul>
      <li
        v-for="suggestion in edition.suggestions"
        :key="McmodRepository.getUser(suggestion.assistant).uid"
      >
        <p>
          [<b class="text" :class="Values.suggestionIDMap[suggestion.type].className">{{
            Values.suggestionIDMap[suggestion.type].name
          }}</b
          >] {{ nickname(McmodRepository.getUser(suggestion.assistant)) }} 的意见：{{
            suggestion.text
          }}
        </p>
        <p :title="Utils.getFormattedDateTime(new Date(suggestion.createdAt))" class="text-muted">
          {{ Utils.getFormattedDateTime(new Date(suggestion.createdAt)) }} ({{
            Utils.getFormattedChineseTime(suggestion.createdAt - Date.now())
          }})
        </p>
      </li>
    </ul>
  </div>
  <template v-if="edition.action === 'class-add'"
    >下一个模组 ID 为：<span class="text-danger">{{
      McmodRepository.getNewestClass().id + 1
    }}</span></template
  >
  <template v-if="guiNotice"
    ><b>使用此GUI时注意事项:</b><br /><template v-for="(text, index2) in guiNotice"
      ><br v-if="index2" :key="index2" />{{ text }}</template
    ><br /><br
  /></template>
  <table class="table table-bordered verify-info-table common-text">
    <thead>
      <tr>
        <th width="120"></th>
        <th>
          提交的内容
          <div style="position: absolute; top: 0; left: 10px">
            <a
              v-if="isModify"
              :id="`_verifyinfo_left_btn_${clipboardIDs[tableRows.length - 1][0]}`"
              class="verify-copy-btn"
              href="javascript:void(0);"
              :onclick="`setClipboard('#_verifyinfo_left_btn_${
                clipboardIDs[tableRows.length - 1][0]
              }', '_verifyinfo_left_val_${clipboardIDs[tableRows.length - 1][1]}')`"
            >
              <i class="fa fa-copy"></i>
            </a>
          </div>
        </th>
        <th v-if="isModify">
          当前的内容
          <div style="position: absolute; top: 0; left: 40px">
            <a
              :id="`_verifyinfo_right_btn_${clipboardIDs[tableRows.length - 1][2]}`"
              class="verify-copy-btn"
              href="javascript:void(0);"
              :onclick="`setClipboard('#_verifyinfo_right_btn_${
                clipboardIDs[tableRows.length - 1][2]
              }', '_verifyinfo_right_val_${clipboardIDs[tableRows.length - 1][3]}')`"
            >
              <i class="fa fa-copy"></i>
            </a>
            <span>&lt;- 这里的按钮用于按键精灵快速复制到对比工具中查看正文变化</span>
          </div>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="edition.action === 'item-add'">
        <td>来自模组</td>
        <td style="vertical-align: top !important; overflow: hidden">
          <a :href="Utils.getClassURL(edition.classID)" target="_blank">{{
            fullName(McmodRepository.getClass(edition.classID))
          }}</a>
        </td>
      </tr>
      <tr v-for="(row, index) in tableRows" :key="row.key">
        <td>{{ row.label }}</td>
        <td style="vertical-align: top !important; overflow: hidden">
          <a
            v-if="isModify"
            :id="`_verifyinfo_left_btn_${clipboardIDs[index][0]}`"
            class="verify-copy-btn"
            href="javascript:void(0);"
            :onclick="`setClipboard('#_verifyinfo_left_btn_${
              clipboardIDs[index][0]
            }', '_verifyinfo_left_val_${clipboardIDs[index][1]}')`"
          >
            <i class="fa fa-copy"></i>
          </a>
          <span
            v-if="isModify"
            :id="`_verifyinfo_left_val_${clipboardIDs[index][1]}`"
            class="verify-copy-text"
          >
            <VerifyCell :row="row" role="current" />
          </span>
          <template v-else>
            <VerifyCell :row="row" role="current" />
          </template>
        </td>
        <td v-if="isModify" style="vertical-align: top !important; overflow: hidden">
          <a
            :id="`_verifyinfo_right_btn_${clipboardIDs[index][2]}`"
            class="verify-copy-btn"
            href="javascript:void(0);"
            :onclick="`setClipboard('#_verifyinfo_right_btn_${
              clipboardIDs[index][2]
            }', '_verifyinfo_right_val_${clipboardIDs[index][3]}')`"
          >
            <i class="fa fa-copy"></i>
          </a>
          <span :id="`_verifyinfo_right_val_${clipboardIDs[index][3]}`" class="verify-copy-text">
            <VerifyCell :row="row" role="original" />
          </span>
        </td>
      </tr>
    </tbody>
  </table>
  <RawTag tag="style" :content="inlineStyle" />
</template>

<script setup lang="ts">
import { ClassVerifyFieldGroups, type ClassEdition } from "./class/schema.ts";
import { Utils } from "../../../../src/Utils.ts";
import { computed, ref, watchEffect } from "vue";
import { Values } from "../../../../src/Values.ts";
import { canVerify, type User } from "../../users.ts";
import { type Edition, type VerifyRow } from "./schema.ts";
import { McmodRepository, type McmodClass } from "../../data/McmodRepository.ts";
import type { ItemEdition } from "./item/schema.ts";
import {
  TabVerifyAlwaysShowFieldGroups,
  TabVerifyFieldGroups,
  type TabEdition,
} from "./tab/schema.ts";
import { RawTag } from "../../RawTag.ts";
import {
  toAuthorEditorInnerData,
  toClassEditorInnerData,
  toItemEditorInnerData,
  toPostEditorInnerData,
  toTabEditorInnerData,
  toVersionEditorInnerData,
} from "../../data/editorData.ts";
import type { AuthorEdition } from "./author/schema.ts";
import type { VersionEdition } from "./version/schema.ts";
import type { PostEdition } from "./post/schema.ts";
import VerifyCell from "./VerifyCell.vue";

interface Props {
  user: User;
  edition: Edition;
}

const { user, edition } = defineProps<Props>();

/**
 * 类型收窄。
 *
 * 只判断 `edition.edit` 上的键时，`edition.original` 仍是未收窄的联合类型；
 * 用谓词收窄整个 `edition`，表格里两列数据才能同时拿到正确的类型。
 */
function isClassEdition(value: Edition): value is ClassEdition {
  return Values.editActionIDMap[value.action].type === "1";
}
function isVersionEdition(value: Edition): value is VersionEdition {
  return Values.editActionIDMap[value.action].type === "2";
}
function isItemEdition(value: Edition): value is ItemEdition {
  return Values.editActionIDMap[value.action].type === "3";
}
function isTabEdition(value: Edition): value is TabEdition {
  return Values.editActionIDMap[value.action].type === "4";
}
function isPostEdition(value: Edition): value is PostEdition {
  return Values.editActionIDMap[value.action].type === "5";
}
function isAuthorEdition(value: Edition): value is AuthorEdition {
  return Values.editActionIDMap[value.action].type === "8";
}

const isAdd = computed(() => edition.action.endsWith("-add"));
const isModify = computed(() => edition.action.endsWith("-edit"));

function fullName(clazz: McmodClass) {
  const { name, ename, sname } = clazz;
  return Utils.getClassFullName(name, ename ?? "", sname ?? "");
}

const tableRows = computed<VerifyRow[]>(() => {
  const id = isClassEdition(edition) ? edition.classID : edition.editID;
  if (isClassEdition(edition)) {
    const edit = edition.edit;
    const original = isAdd.value
      ? ({} as McmodClassEditorInnerData)
      : (edition.original ?? toClassEditorInnerData(McmodRepository.getClass(id)));
    return Utils.getKeys(Values.classEditVerifyTableFields)
      .filter((key) => diff.value.has(key))
      .map((key): VerifyRow => ({
        type: "class",
        key,
        label: Values.classEditVerifyTableFields[key],
        current: edit,
        original: original,
      }));
  }
  if (isVersionEdition(edition)) {
    const edit = edition.edit;
    const original = isAdd.value
      ? ({} as McmodVersionEditorInnerData)
      : (edition.original ?? toVersionEditorInnerData(McmodRepository.getVersion(id)));
    return Utils.getKeys(Values.itemEditVerifyTableFields)
      .filter((key) => diff.value.has(key))
      .map((key): VerifyRow => ({
        type: "item",
        key,
        label: Values.itemEditVerifyTableFields[key],
        current: edit,
        original: original,
      }));
  }
  if (isItemEdition(edition)) {
    const edit = edition.edit;
    const original = isAdd.value
      ? ({} as McmodItemEditorInnerData)
      : (edition.original ?? toItemEditorInnerData(McmodRepository.getItem(id)));
    return Utils.getKeys(Values.itemEditVerifyTableFields)
      .filter((key) => diff.value.has(key))
      .map((key): VerifyRow => ({
        type: "item",
        key,
        label: Values.itemEditVerifyTableFields[key],
        current: edit,
        original: original,
      }));
  }
  if (isTabEdition(edition)) {
    const edit = edition.edit;
    const original = isAdd.value
      ? ({} as McmodTabEditorInnerData)
      : (edition.original ?? toTabEditorInnerData(McmodRepository.getTab(id)));
    return Utils.getKeys(Values.tabEditVerifyTableFields)
      .filter((key) => diff.value.has(key))
      .map((key): VerifyRow => ({
        type: "tab",
        key,
        label: Values.tabEditVerifyTableFields[key],
        current: edit,
        original: original,
      }));
  }
  if (isPostEdition(edition)) {
    const edit = edition.edit;
    const original = isAdd.value
      ? ({} as McmodPostEditorInnerData)
      : (edition.original ?? toPostEditorInnerData(McmodRepository.getPost(id)));
    return Utils.getKeys(Values.postEditVerifyTableFields)
      .filter((key) => diff.value.has(key))
      .map((key): VerifyRow => ({
        type: "post",
        key,
        label: Values.postEditVerifyTableFields[key],
        current: edit,
        original: original,
      }));
  }
  const edit = edition.edit;
  const original = isAdd.value
    ? ({} as McmodAuthorEditorInnerData)
    : (edition.original ?? toAuthorEditorInnerData(McmodRepository.getAuthor(id)));
  return Utils.getKeys(Values.authorEditVerifyTableFields)
    .filter((key) => diff.value.has(key))
    .map((key): VerifyRow => ({
      type: "author",
      key,
      label: Values.authorEditVerifyTableFields[key],
      current: edit,
      original: original,
    }));
});

const original = computed(() => {
  if (isClassEdition(edition)) {
    return toClassEditorInnerData(McmodRepository.getClass(edition.classID));
  } else if (isItemEdition(edition)) {
    return toItemEditorInnerData(McmodRepository.getItem(Number(edition.editID)));
  } else {
    return toTabEditorInnerData(McmodRepository.getTab(Number(edition.editID)));
  }
});

const diff = computed(() => {
  const result = new Set<string>();
  if (isClassEdition(edition)) {
    Utils.getEntries(edition.edit).forEach(([field, current]) => {
      if (field === "remark" || field === "reason") return;
      if (
        !isAdd.value &&
        Utils.isEqual((original.value as McmodClassEditorInnerData)[field], current)
      )
        return;
      result.add(Utils.getKeyValueOfObject(ClassVerifyFieldGroups, field) ?? field);
    });
  } else if (isVersionEdition(edition)) {
    Utils.getEntries(edition.edit).forEach(([field, current]) => {
      if (field === "remark" || field === "reason") return;
      if (
        !isAdd.value &&
        Utils.isEqual((original.value as McmodVersionEditorInnerData)[field], current)
      )
        return;
      result.add(field); // 模组日志没有特殊分组情况，直接用 `field`，以后涉及到分组时记得改
    });
  } else if (isItemEdition(edition)) {
    Utils.getEntries(edition.edit).forEach(([field, current]) => {
      if (field === "remark" || field === "reason") return;
      if (
        !isAdd.value &&
        Utils.isEqual((original.value as McmodItemEditorInnerData)[field], current)
      )
        return;
      result.add(field); // 物品没有特殊分组情况，直接用 `field`，以后涉及到分组时记得改
    });
  } else if (isTabEdition(edition)) {
    Utils.getEntries(edition.edit).forEach(([field, current]) => {
      if (field === "remark" || field === "reason") return;
      if (
        !isAdd.value &&
        Utils.isEqual((original.value as McmodTabEditorInnerData)[field], current)
      )
        return;
      const groups = Utils.getKeyValueOfObject(TabVerifyFieldGroups, field) ?? field;
      (Array.isArray(groups) ? groups : [groups])?.forEach((group) => {
        result.add(group);
      });
    });
    TabVerifyAlwaysShowFieldGroups.forEach((group) => {
      result.add(group);
    });
  } else if (isPostEdition(edition)) {
    Utils.getEntries(edition.edit).forEach(([field, current]) => {
      if (field === "remark" || field === "reason") return;
      if (
        !isAdd.value &&
        Utils.isEqual((original.value as McmodPostEditorInnerData)[field], current)
      )
        return;
      result.add(field); // 教程没有特殊分组情况，直接用 `field`，以后涉及到分组时记得改
    });
  } else if (isAuthorEdition(edition)) {
    Utils.getEntries(edition.edit).forEach(([field, current]) => {
      if (field === "remark" || field === "reason") return;
      if (
        !isAdd.value &&
        Utils.isEqual((original.value as McmodAuthorEditorInnerData)[field], current)
      )
        return;
      result.add(field); // 作者没有特殊分组情况，直接用 `field`，以后涉及到分组时记得改
    });
  }
  return result;
});

/** 所有编辑类型的数据都带有审核附言 / 说明 */
const remark = computed(() => edition.edit.remark);
const reason = computed(() => edition.edit.reason);

/** 「通过后打开编辑」要打开的编辑 ID：模组用 `class-id`，资料用自身的 `edit-id` */
const editButtonID = computed(() => (isClassEdition(edition) ? edition.classID : edition.editID));

/** 审核类型 ID（模组 / 资料…），按钮的 `data-data` 会原样带给站点 */
const editTypeID = computed(() => Values.editActionIDMap[edition.action].type);

const isVerify = computed(() => canVerify(user, edition.classID));
const isAssistant = computed(() => !isVerify.value);

const guiNotice = computed(
  () =>
    isTabEdition(edition) &&
    McmodRepository.getGUI(Number(edition.edit.gui)).notice.trim().split("\n"),
);

const clipboardIDs = computed(() => {
  if (!isModify.value) return [];
  const length = tableRows.value.length + 1; // 最后一条给表头用
  return Array.from({ length }, () => Array.from({ length: 4 }, () => Utils.randStr(8)));
});

const cfLink = ref<string>();
const mrLink = ref<string>();
const ghLink = ref<string>();

watchEffect(() => {
  cfLink.value = undefined;
  mrLink.value = undefined;
  ghLink.value = undefined;
  // 只有模组类数据才有相关链接；资料类不显示这三个快捷入口
  if (!isClassEdition(edition)) return;
  const links = edition.edit.link ?? {};
  Object.values(links).forEach((link) => {
    let { title, href } = link;
    if (href.at(-1) === "/") {
      href = href.slice(0, -1);
    }
    if (title === "curseforge") {
      cfLink.value = href + "/files";
    } else if (title === "modrinth") {
      mrLink.value = href + "/versions";
    } else if (title === "github") {
      ghLink.value = href + "/releases";
    }
  });
});

function nickname(user: User) {
  return user.nickname || user.username;
}

/** 站点返回的审核详情 HTML 里自带的样式，原样输出给宿主页面 */
const inlineStyle = `.verify-info-mcmod-select {
  margin-right: 10px;
}

.common-tag-ban,
.common-tag-mark {
  background: #434343;
  line-height: 30px;
  color: #fff;
  text-align: center;
  display: block;
}

.common-tag-ban:before {
  content: "🚫 标题目录禁用标记 🚫";
}

.common-tag-mark:before {
  content: "📖 标题目录位置标记 📖";
}`;
</script>
