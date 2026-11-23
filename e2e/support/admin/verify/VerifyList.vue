<template>
  <div
    id="verify-window"
    class="modal"
    role="dialog"
    aria-labelledby="verify-window-label"
    aria-hidden="true"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-hidden="true">
            &times;
          </button>
          <h4 id="verify-window-label" class="modal-title">编辑版本对比</h4>
        </div>
        <div id="verify-window-frame" class="modal-body"></div>
      </div>
    </div>
  </div>
  <div class="select-row">
    <span>类型:</span>
    <select
      id="verify-type-list"
      data-name="typeID"
      class="selectpicker selectJump"
      data-frame="#connect-frame-sub"
      data-page="pageVerifyMod-list"
      :data-data="JSON.stringify(payload)"
      data-live-search="true"
      data-defaultValue="0"
    >
      <option value="0">请选择</option>
      <template v-for="(count, type) in filteredTypeCounts" :key="type">
        <option
          v-if="count > 0"
          :value="type"
          :data-subtext="`${count}个`"
          :selected="type === (payload.typeID ?? '0')"
        >
          {{ Values.editTypes[type] }}
        </option>
      </template>
    </select>
    <span v-if="payload.userID"
      ><template v-if="users?.size === 1"
        >用户“<a :href="Utils.getCenterURL(Number(payload.userID))" target="_blank"
          >{{ McmodRepository.getUser(Number(payload.userID)).nickname }}”</a
        ></template
      ><template v-else-if="users && users.size > 1">多位用户</template>的总待审：{{
        filtered.length
      }}个。<a
        href="javascript:void(0);"
        class="commonJump"
        data-frame="#connect-frame-sub"
        data-page="pageVerifyMod-list"
        :data-data="
          JSON.stringify({
            classID: '-1',
            typeID: payload.typeID,
          })
        "
        >取消筛选</a
      ></span
    >
    <span v-else>总待审：{{ filtered.length }}个。</span>
  </div>
  <div class="select-row">
    <fieldset v-if="isClassSelected" id="verify-select-checkbox-area">
      <legend>批量操作选中项</legend>
      <select id="verify-select-type" class="selectpicker" data-defaultValue="0">
        <option value="0">请选择</option>
        <option value="1">通过</option>
        <option value="2">退回</option>
      </select>
      <input
        id="verify-select-reason"
        class="form-control inline"
        type="text"
        maxlength="255"
        value=""
        placeholder="退回理由或通过后附言.."
      />
      <button
        id="verify-select-action-btn"
        class="btn btn-success action-btn"
        data-loading-text="执行中.."
      >
        提交
      </button>
      <p>
        <button id="verify-select-all-btn" class="btn select-all-btn" data-for="verify-list-table">
          全选
        </button>
        <button
          id="verify-select-inverse-btn"
          class="btn select-inverse-btn"
          data-for="verify-list-table"
        >
          反选
        </button>
      </p>
    </fieldset>
  </div>
  <table
    id="verify-list-table"
    class="table table-striped table-hover table-bordered table-select-usekey"
  >
    <thead>
      <tr>
        <th width="150">编号</th>
        <th>名称</th>
        <th>编辑者</th>
        <th>创建时间</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="!isClassSelected">
        <td colspan="4">请选择一个模组。</td>
      </tr>
      <tr v-else-if="!selectedTypeID">
        <td colspan="4">请选择一个审核类型（若无可选则暂无审核项）。</td>
      </tr>
      <tr v-else-if="typeFiltered.length === 0">
        <td colspan="4">没有需要审核的信息。</td>
      </tr>
      <tr
        v-for="(entry, index) in typeFiltered"
        :id="`verify-row-${entry.id}-tr`"
        :key="entry.id"
        class="verify-contrast-btn commonJump"
        data-toggle="modal"
        data-target="#verify-window"
        data-frame="#verify-window-frame"
        data-page="pageVerify-info"
        data-error-fuc="1"
        :data-data="
          JSON.stringify({
            typeID: payload.typeID,
            verifyID: entry.id.toString(),
          })
        "
      >
        <td>
          <span class="checkbox">
            <input
              :id="`verify-row-${entry.id}`"
              class="ignore-parent"
              name="verify-row"
              type="checkbox"
              :value="entry.id"
            />
            <label class="ignore-parent" :for="`verify-row-${entry.id}`">{{ entry.id }}</label>
          </span>
        </td>
        <td>
          <i
            class="fa big"
            :class="iconClassName(entry.action)"
            data-toggle="tooltip"
            :data-original-title="iconTitle(entry.action)"
          ></i>
          <template v-if="entry.action === 'class-add'">
            <img :src="entry.edit['cover-data']" height="60" />
            {{ Utils.getClassFullName(entry.edit, true) }}
          </template>
          <a
            v-else-if="entry.action === 'class-edit'"
            class="ignore-parent"
            :href="Utils.getClassURL(entry.classID)"
            target="_blank"
            >{{ Utils.getClassFullName(entry.edit, false) }}</a
          >
          <template v-else-if="entry.action === 'item-add'">
            {{ McmodRepository.getItem(entry.editID).name }}
          </template>
          <a
            v-else-if="entry.action === 'item-edit'"
            class="ignore-parent"
            :href="Utils.getItemURL(entry.editID)"
            >{{ Utils.getItemFullName(McmodRepository.getItem(entry.editID)) }}</a
          >
          <template
            v-else-if="
              entry.action === 'tab-add' ||
              entry.action === 'tab-edit' ||
              entry.action === 'tab-delete'
            "
          >
            {{ McmodRepository.getItem(entry.editID).name }}
            <i
              v-if="McmodRepository.getTabsByItem(entry.editID).length > 0"
              class="fa fa-lightbulb-o"
              data-toggle="tooltip"
              data-original-title="添加合成表的物品中存在其他合成表"
            >
            </i></template
          >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <template v-if="entry.urgeCount > 0">
            <br />[🔥已催审{{ entry.urgeCount }}次，最后催审时间：<span
              :title="Utils.getFormattedDateTime(entry.urgeAt)"
              >{{ Utils.getFormattedChineseTime(entry.urgeAt ?? 0 - Date.now()) }}</span
            >]&nbsp;&nbsp;&nbsp;
          </template>
          <template v-if="McmodRepository.getUsersByManager(entry.classID).length > 0">
            <br />[🌟<template v-if="NOW - entry.createdAt >= 7 * DAY">[七天未审]</template
            >有其他管理员 (<template
              v-for="(manager, index2) in McmodRepository.getUsersByManager(entry.classID)"
              :key="index2"
              ><template v-if="index2 > 0"> / </template
              ><a :href="Utils.getCenterURL(manager.uid)" target="_blank">{{
                manager.nickname
              }}</a></template
            >)]&nbsp;&nbsp;&nbsp;
          </template>
          <template v-if="Object.keys(suggestionCounts[index]).length > 0">
            <br />[📚 助理意见：<template
              v-for="(count, type, i) in suggestionCounts[index]"
              :key="type"
              ><template v-if="i > 0">、</template>
              <b class="text" :class="Values.suggestionIDMap[type].className"
                >{{ count }}{{ Values.suggestionIDMap[type].abbr }}</b
              ></template
            >]&nbsp;&nbsp;&nbsp;
          </template>
          <template v-if="entry.refundCount > 0"
            ><br />[🔍被退回{{ entry.refundCount }}次]</template
          >
          <template v-if="(McmodRepository.findItem(entry.editID)?.quote ?? []).length > 0"
            ><br />[📑资料含引用项]{{ "\u00a0" }}</template
          >
          <template v-if="McmodRepository.getItemsByGeneral(entry.editID).length > 0"
            ><br />[🔶资料已被综合]{{ "\u00a0" }}</template
          >
        </td>
        <td>
          <span
            class="user-lv common-user-lv"
            :class="`lv-${McmodRepository.getUser(entry.owner).lv ?? 1}`"
            >Lv.{{ McmodRepository.getUser(entry.owner).lv ?? 1 }}</span
          >&nbsp;
          <a
            class="verify-user-filter ignore-parent"
            :data-uid="McmodRepository.getUser(entry.owner).uid"
            data-page="pageVerifyMod-list"
            :data-data="
              JSON.stringify({
                classID: payload.classID ?? -1,
                typeID: selectedTypeID ?? 1,
                userID: payload.userID ?? 0,
              })
            "
            href="javascript:void(0);"
            >{{ McmodRepository.getUser(entry.owner).nickname }}</a
          >
          <span
            :title="McmodRepository.getUser(entry.owner).online ? '当前在线' : '当前离线'"
            class="user-online-state"
            :class="McmodRepository.getUser(entry.owner).online ? 'online' : 'offline'"
          ></span>
          <span class="ignore-parent" style="display: inline-block">
            <a
              :href="`//www.mcmod.cn/history.html?userid=${McmodRepository.getUser(entry.owner).uid}`"
              target="_blank"
            >
              <i title="查看编辑记录" class="fa fa-external-link"></i>
            </a>
          </span>
          <span class="ignore-parent" style="display: inline-block">
            <a
              :href="`//www.mcmod.cn/verify.html?order=verifytime&userid=${McmodRepository.getUser(entry.owner).uid}`"
              target="_blank"
            >
              <i title="查看审核记录" class="fa fa-share-square-o"></i>
            </a>
          </span>
        </td>
        <td>
          {{ Utils.getFormattedDateTime(new Date(entry.createdAt)) }} ({{
            Utils.getFormattedChineseTime(entry.createdAt - Date.now())
          }})
        </td>
      </tr>
    </tbody>
  </table>
  <RawTag tag="script" :content="frameScript"></RawTag>
  <RawTag tag="style" :content="frameStyle"></RawTag>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { VerifyListPayload } from "./mock";
import { Utils } from "../../../../src/Utils";
import { Values } from "../../../../src/Values";
import type { Edition } from "./schema";
import { McmodRepository } from "../../data/McmodRepository";
import { RawTag } from "../../RawTag";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

interface Props {
  payload: VerifyListPayload;
  allEditions: Edition[];
}

const { payload, allEditions } = defineProps<Props>();

const users = computed(() => {
  if (payload.userID === undefined) return null;
  return new Set(
    payload.userID
      .split(",")
      .map(Number)
      .filter((uid) => Number.isInteger(uid) && uid > 0),
  );
});

const isClassSelected = computed(() => {
  return !((payload.classID ?? "0") === "0" && (users.value === null || users.value.size === 0));
});

/** 站点把空串与 `"0"` 都当作「未选择类型」 */
const selectedTypeID = computed(() => {
  const typeID = payload.typeID;
  return typeID && typeID !== "0" ? typeID : undefined;
});

/** 未按编辑类型筛选的待审列表，用于在类型选择菜单统计数量 */
const filtered = computed(() => {
  return allEditions.filter((entry) => {
    if (users.value && !users.value.has(McmodRepository.getUser(entry.owner).uid)) return false;

    const classID = Number(payload.classID || 0);
    if (classID === 0) return false;
    if (classID > 0 && classID !== Number(entry.classID)) return false;

    if (
      payload.ignoreManager === "1" &&
      NOW - entry.createdAt >= 7 * DAY &&
      McmodRepository.getUsersByManager(Number(entry.classID)).length > 0
    )
      return false;

    return true;
  });
});

/** 在基础的 {@link filtered} 的基础之上，进一步根据编辑类型筛选，作为最终展示列表 */
const typeFiltered = computed(() => {
  return filtered.value.filter((entry) => {
    const typeID = Number(selectedTypeID.value ?? 0);
    if (typeID === 0) return false;
    if (typeID !== Number(Values.editActionIDMap[entry.action].type)) return false;
    if (typeID === 1 && payload.classAddOnly === "1" && entry.action !== "class-add") return false;

    return true;
  });
});

const filteredTypeCounts = computed(() =>
  filtered.value.reduce(
    (count, entry) => {
      count[Values.editActionIDMap[entry.action].type]++;
      return count;
    },
    {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      8: 0,
    } satisfies Record<ElementOf<typeof Values.editActionTypes>["type"], number>,
  ),
);

const suggestionCounts = computed(() =>
  typeFiltered.value.map((entry) =>
    (entry.suggestions ?? []).reduce(
      (count, entry) => {
        count[entry.type] ??= 0;
        count[entry.type]!++;
        return count;
      },
      {} as Partial<Record<ElementOf<typeof Values.suggestionTypes>["id"], number>>,
    ),
  ),
);

function iconTitle(action: McmodEditorMetaData["action"]) {
  if (action.endsWith("-add")) {
    return "添加";
  }
  if (action.endsWith("-edit")) {
    return "编辑";
  }
  if (action.endsWith("-delete")) {
    return "删除";
  }
  throw new Error("这操作类型有力气");
}

function iconClassName(action: McmodEditorMetaData["action"]) {
  if (action.endsWith("-add")) {
    return ["fa-plus-square", "text-success"] as const;
  }
  if (action.endsWith("-edit")) {
    return ["fa-edit", "text-info"] as const;
  }
  if (action.endsWith("-delete")) {
    return ["fa-eraser", "text-danger"] as const;
  }
  throw new Error("这操作类型有力气");
}

const frameScript = `var data = {};
data['classID'] = ${payload.classID};
data['typeID'] = ${payload.typeID};
data['userID'] = ${payload.userID};
data['ignoreManager'] = ${payload.ignoreManager};
data['classAddOnly'] = ${payload.classAddOnly};
data = JSON.stringify(data);
$("#refresh-btn")
  .attr("data-page", "pageVerifyMod-list")
  .attr("data-frame", "#connect-frame-sub")
  .attr("data-data", data);
function setItemTableVlaue() {
  $(".item-tab-value-json").each(function () {
    $(this).text(JSON.stringify(JSON.parse($(this).text()), null, 2));
  });
}
$(document).on("click", ".verify-contrast-btn", function () {
  if (!$(this).hasClass("viewed")) $(this).addClass("viewed")
    .children("td:eq(1)")
    .append(' <span class="text-danger">(已查看)</span>');
});`;

const frameStyle = `
  .item-tab-value-json {
    background-color: initial;
  }
`;
</script>
