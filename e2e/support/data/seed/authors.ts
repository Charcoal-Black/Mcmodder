import type { RepositoryData } from "../types";

/**
 * 作者/开发团队。
 *
 * `names` 的第 0 项即主要名称，其余为昵称/别名；编辑载荷里「主要名称必须重复出现在
 * 昵称列表中」的表单约束在后端存储里不存在。
 */
export const authors = {
  1: {
    id: 1,
    names: ["喵呜机", "Meow Machine"],
    content: "<p>MC 百科维护团队。</p>",
    link: [{ site: "mcmod", url: "https://www.mcmod.cn/author/1.html" }],
  },
  21424: {
    id: 21424,
    names: ["GregTechCE 团队", "GregTech Community Edition Team"],
    team: true,
  },
  42025: {
    // @zgxhzhr，我们敬仰你口牙
    id: 42025,
    names: ["逐光星火_执火人", "zgxh_zhr", "zgxhzhr"],
    avatarType: 1,
    avatarValue: "1508241",
    link: [
      { site: "mcmod", url: "https://center.mcmod.cn/1508241/" },
      { site: "github", url: "https://github.com/zgxhzhr" },
      { site: "curseforge", url: "https://www.curseforge.com/members/zgxh_zhr/projects" },
      { site: "modrinth", url: "https://modrinth.com/user/zgxh_zhr" },
    ],
  },
} satisfies RepositoryData["authors"];
