import { AdminInit } from "../init/AdminInit";
import { CenterInit } from "../init/CenterInit";
import { ClassAddInit } from "../init/ClassAddInit";
import { ClassEditorInit } from "../init/ClassEditorInit";
import { ClassPageInit } from "../init/ClassPageInit";
import { CommentInit } from "../init/CommentInit";
import { DiffListInit } from "../init/DiffListInit";
import { DiffPageInit } from "../init/DiffPageInit";
import { DownloadPageInit } from "../init/DownloadPageInit";
import { EditHistoryPageInit } from "../init/EditHistoryPageInit";
import { HomePageInit } from "../init/HomePageInit";
import { McmodderInit } from "../init/Init";
import { ItemEditorInit } from "../init/ItemEditorInit";
import { ItemListInit } from "../init/ItemListInit";
import { ItemPageInit } from "../init/ItemPageInit";
import { JsonHelperInit } from "../init/JsonHelperInit";
import { MessageInit } from "../init/MessagePageInit";
import { OredictPageInit } from "../init/OredictPageInit";
import { PostPageInit } from "../init/PostPageInit";
import { QueuePageInit } from "../init/QueuePageInit";
import { RankInit } from "../init/RankInit";
import { SandboxInit } from "../init/SandboxInit";
import { StructureEditorInit } from "../init/StructureEditorInit";
import { TabEditInit } from "../init/TabEditInit";
import { VerifyHistoryInit } from "../init/VerifyHistoryInit";
import { VersionEditInit } from "../init/VersionEditInit";
import { VersionListInit } from "../init/VersionListInit";
import { Mcmodder } from "../Mcmodder";

export class InitLoader {
  static run(parent: Mcmodder, list: McmodderInit[]) {
    list.push(
      new HomePageInit(parent),
      new TabEditInit(parent),
      new ItemEditorInit(parent),
      new ClassEditorInit(parent),
      new ItemPageInit(parent),
      new PostPageInit(parent),
      new ItemListInit(parent),
      new OredictPageInit(parent),
      new MessageInit(parent),
      new DownloadPageInit(parent),
      new EditHistoryPageInit(parent),
      new VerifyHistoryInit(parent),
      new QueuePageInit(parent),
      new ClassAddInit(parent),
      new VersionEditInit(parent),
      new VersionListInit(parent),
      new ClassPageInit(parent),
      new DiffPageInit(parent),
      new DiffListInit(parent),
      new RankInit(parent),
      new SandboxInit(parent),
      new CenterInit(parent),
      new AdminInit(parent),
      new StructureEditorInit(parent),
      new JsonHelperInit(parent),
      new CommentInit(parent)
    );
  }
}