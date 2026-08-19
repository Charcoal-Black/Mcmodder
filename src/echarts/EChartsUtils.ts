import { Mcmodder } from "../Mcmodder";
import { McmodderValues } from "../Values";

export class EchartsUtils {

  parent: Mcmodder;
  classRatingChart: any;
  classUserEditChart: any;
  classUserWordChart: any;
  classIndexChart: any;
  centerEditChart: any;
  worldgenCharts: any[] = [];
  font: 0 | 1 | 2 | 3 | undefined;

  constructor(parent: Mcmodder) {
    this.parent = parent;
    // Echarts 图表相关兼容
    if (typeof echarts != "undefined") {
      let t = document.getElementById("class-rating");
      if (t) this.setChartFont(this.classRatingChart = echarts.getInstanceByDom(t));
      t = document.getElementById("center-editchart-obj");
      if (t) this.setChartFont(this.centerEditChart = echarts.getInstanceByDom(t));
      
      $(".common-world-gen-chart").each((_, e) => {
        const chart = echarts.getInstanceByDom(e);
        this.worldgenCharts.push(chart);
        this.setChartFont(chart);
        if (parent.isNightMode) {
          this.setWorldgenChartNightStyle(chart);
        }
      });

      // 获取字体
      this.font = this.parent.utils.getConfig("customFont");

      // 用户贡献饼图
      const classUserChartObserver = new MutationObserver(mutationList => {
        mutationList.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            const element = node as Element;
            const id = element?.id;
            if (id === "chart-edit") {
              this.setChartFont(this.classUserEditChart = echarts.getInstanceById(element.getAttribute("_echarts_instance_")));
              if (parent.isNightMode) {
                this.setClassUserChartNightStyle(this.classUserEditChart);
              }
            }
            else if (id === "chart-word") {
              this.setChartFont(this.classUserWordChart = echarts.getInstanceById(element.getAttribute("_echarts_instance_")));
              if (parent.isNightMode) {
                this.setClassUserChartNightStyle(this.classUserWordChart);
              }
            }
            if (this.classUserEditChart && this.classUserWordChart) {
              classUserChartObserver.disconnect();
            }
          })
        });
      });
      const classUserChartFrame = $("#class-user-chart-frame").get(0);
      if (classUserChartFrame) {
        classUserChartObserver.observe(classUserChartFrame, { subtree: true, childList: true });
      }

      // 指数走势图
      const classIndexChartObserver = new MutationObserver(mutationList => {
        mutationList.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            const element = node as Element;
            const id = element?.id;
            if (id === "chart-index") {
              this.setChartFont(this.classIndexChart = echarts.getInstanceById(element.getAttribute("_echarts_instance_")));
              if (parent.isNightMode) {
                this.setClassIndexChartNightStyle();
              }
            }
          })
        });
      });
      const classIndexChartFrame = $("#class-index-chart-frame").get(0);
      if (classIndexChartFrame) {
        classIndexChartObserver.observe(classIndexChartFrame, { subtree: true, childList: true });
      }
    }
  }

  setChartFont(chart: any) {
    if (!this.font) return;
    let o = chart?.getOption();
    if (o) {
      const fontFamily = McmodderValues.assets.font.fontFamily[this.font];
      const newOption: any = {
        textStyle: { fontFamily }
      };
      if (chart === this.centerEditChart) {
        newOption.calendar = [{
          yearLabel: { fontFamily }
        }];
      }
      chart.setOption(newOption);
    }
  }

  setClassRatingChartBaseStyle() {
    let o = this.classRatingChart?.getOption();
    if (o) {
      o.backgroundColor = "#fff8";
      // o.axisPointer[0].lineStyle.color = "#B9BEC9";
      o.radar[0].splitLine.lineStyle.color = "#E0E6F1";
      o.series[0].color = "#555";
      o.series[0].data[0].areaStyle.color = "rgba(0, 0, 0, 0.25)";
      this.classRatingChart.setOption(o);
    }
  }

  setClassRatingChartNightStyle() {
    let o = this.classRatingChart?.getOption();
    if (o) {
      o.backgroundColor = "#1118";
      // o.axisPointer[0].lineStyle.color = "#444";
      o.radar[0].splitLine.lineStyle.color = "#1f190e";
      o.series[0].color = "#ee6";
      o.series[0].data[0].areaStyle.color = "#fff8";
      this.classRatingChart.setOption(o);
    }
  }

  setClassUserChartBaseStyle(chart: any) {
    let o = chart?.getOption();
    if (o) {
      o.title[0].textStyle.color = "#464646";
      o.title[0].subtextStyle.color = "#6e7079";
      o.tooltip[0].backgroundColor = "#fff";
      o.tooltip[0].textStyle.color = "#666";
      o.series[0].itemStyle.borderColor = "#fff"
      o.legend[0].textStyle.color = "#333";
      chart.setOption(o);
    }
  }

  setClassUserChartNightStyle(chart: any) {
    let o = chart?.getOption();
    if (o) {
      o.title[0].textStyle.color = "#ccc";
      o.title[0].subtextStyle.color = "#aaa";
      o.tooltip[0].backgroundColor = "#333";
      o.tooltip[0].textStyle.color = "#aaa";
      o.series[0].itemStyle.borderColor = "#000";
      o.legend[0].textStyle.color = "#999";
      chart.setOption(o);
    }
  }

  setClassIndexChartBaseStyle() {
    let o = this.classIndexChart?.getOption();
    if (o) {
      o.title[0].textStyle.color = "#464646";
      o.title[0].subtextStyle.color = "#6e7079";
      o.tooltip[0].backgroundColor = "#fff";
      o.tooltip[0].borderColor = "#666";
      o.tooltip[0].textStyle.color = "#666";
      o.series[0].color = "#3c454c";
      o.axisPointer[0].lineStyle.color = "#b9bec9";
      o.yAxis[0].splitLine.lineStyle.color[0] = "#e0e6f1";
      this.classIndexChart.setOption(o);
    }
  }

  setClassIndexChartNightStyle() {
    let o = this.classIndexChart?.getOption();
    if (o) {
      o.title[0].textStyle.color = "#ccc";
      o.title[0].subtextStyle.color = "#aaa";
      o.tooltip[0].backgroundColor = "#333";
      o.tooltip[0].borderColor = "#666";
      o.tooltip[0].textStyle.color = "#aaa";
      o.series[0].color = "#789";
      o.axisPointer[0].lineStyle.color = "#666";
      o.yAxis[0].splitLine.lineStyle.color[0] = "#444";
      this.classIndexChart.setOption(o);
    }
  }

  setCenterEditChartBaseStyle() {
    let o = this.centerEditChart?.getOption();
    if (o) {
      o.tooltip[0].backgroundColor = "#fff";
      o.calendar[0].dayLabel.color = "#000";
      o.calendar[0].yearLabel.color = "#aaa";
      o.calendar[0].monthLabel.color = "#000";
      o.calendar[0].itemStyle = {
        color: "#fff0",
        borderColor: "#bbb"
      };
      this.centerEditChart.setOption(o);
    }
  }

  setCenterEditChartNightStyle() {
    let o = this.centerEditChart?.getOption();
    if (o) {
      o.tooltip[0].backgroundColor = "#222";
      o.calendar[0].dayLabel.color = "#fff";
      o.calendar[0].yearLabel.color = "#ee6";
      o.calendar[0].monthLabel.color = "#fff";
      o.calendar[0].itemStyle = {
        color: "#3330",
        borderColor: "#444"
      };
      this.centerEditChart.setOption(o);
    }
  }

  setWorldgenChartBaseStyle(chart: any) {
    let o = chart.getOption();
    if (o) {
      o.tooltip[0].backgroundColor = "#fff";
      o.tooltip[0].borderColor = "#333";
      o.tooltip[0].textStyle.color = "#666";
      o.series[0].itemStyle.color = "#343434";
      o.axisPointer[0].lineStyle.color = "#b9bec9";
      o.xAxis[0].axisLabel.textStyle = { color: "#343434" };
      o.yAxis[0].axisLabel.textStyle = { color: "#343434" };
      o.yAxis[0].splitLine.lineStyle.color[0] = "#e0e6f1";
      chart.setOption(o);
    }
  }

  setWorldgenChartNightStyle(chart: any) {
    let o = chart?.getOption();
    if (o) {
      o.tooltip[0].backgroundColor = "#333";
      o.tooltip[0].borderColor = "#666";
      o.tooltip[0].textStyle.color = "#aaa";
      o.series[0].itemStyle.color = "#888";
      o.axisPointer[0].lineStyle.color = "#666";
      o.xAxis[0].axisLabel.textStyle = { color: "#888" };
      o.yAxis[0].axisLabel.textStyle = { color: "#888" };
      o.yAxis[0].splitLine.lineStyle.color[0] = "#444";
      chart.setOption(o);
    }
  }

  enableNightStyle() {
    this.setClassRatingChartNightStyle();
    this.setCenterEditChartNightStyle();
    this.setClassUserChartNightStyle(this.classUserEditChart);
    this.setClassUserChartNightStyle(this.classUserWordChart);
    this.setClassIndexChartNightStyle();
    this.worldgenCharts.forEach(this.setWorldgenChartNightStyle);
  }

  disableNightStyle() {
    this.setClassRatingChartBaseStyle();
    this.setCenterEditChartBaseStyle();
    this.setClassUserChartBaseStyle(this.classUserEditChart);
    this.setClassUserChartBaseStyle(this.classUserWordChart);
    this.setClassIndexChartBaseStyle();
    this.worldgenCharts.forEach(this.setWorldgenChartBaseStyle);
  }
}