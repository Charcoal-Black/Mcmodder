interface Task {
  readonly priority: number;
  readonly callback: () => void;
}

export class AnimationFrameScheduler {
  private static running = false;
  private static readonly tasks: Task[] = [];

  static add(callback: () => void, priority = 0) {
    this.tasks.push({
      priority,
      callback,
    });
    if (!this.running) {
      this.running = true;
      requestAnimationFrame(() => this.loop());
    }
  }

  private static loop() {
    const taskList = [...this.tasks].sort((a, b) => a.priority - b.priority);
    this.tasks.length = 0;
    taskList.forEach((task) => {
      task.callback();
    });
    if (this.tasks.length === 0) {
      this.running = false;
    } else {
      requestAnimationFrame(() => this.loop());
    }
  }
}
