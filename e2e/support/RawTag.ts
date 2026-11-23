import { defineComponent, h, type PropType } from "vue";

/**
 * 在 SSR fixture 中原样输出 `<script>` / `<style>` 等「带副作用」的标签。
 *
 * Vue 模板编译器会直接忽略模板里的 `<script>` / `<style>`，但百科后端返回的 HTML
 * 本来就包含这两个标签。这里用渲染函数 + `innerHTML` 绕过编译期检查，既保留站点的
 * 响应结构，也避免内容被当成文本转义（例如脚本里的引号变成 `&quot;`）。
 *
 * 只用于 fixture 内的静态可信内容；不要把用户数据传进来。
 */
export const RawTag = defineComponent({
  name: "RawTag",
  props: {
    tag: {
      type: String as PropType<"script" | "style">,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  render() {
    return h(this.tag, { innerHTML: this.content });
  },
});
