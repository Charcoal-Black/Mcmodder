import { CenterBaseInit } from "./CenterBaseInit";

export class CenterCardInit extends CenterBaseInit {
  run() {
    $(".center-content.background")
    .contents()
    .filter((_, content) => content.nodeType === Node.COMMENT_NODE)
    .each((_, target) => { 
      $(target).parent().append(target.textContent);
    });
  }
}