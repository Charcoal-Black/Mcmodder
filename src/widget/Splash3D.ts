import { Mcmodder } from "../Mcmodder";
import { McmodderUtils } from "../Utils";

function getFontFromIndexedDB(url: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("McmodderFontDB", 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("fonts")) {
          db.createObjectStore("fonts");
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction("fonts", "readonly");
        const store = tx.objectStore("fonts");
        const getReq = store.get(url);
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

function saveFontToIndexedDB(url: string, buffer: ArrayBuffer): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("McmodderFontDB", 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("fonts")) {
          db.createObjectStore("fonts");
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction("fonts", "readwrite");
        const store = tx.objectStore("fonts");
        store.put(buffer, url);
        tx.oncomplete = () => resolve();
      };
      request.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

let THREE: any;
let Font: any;
let TextGeometry: any;
let TTFLoader: any;

function createPaths(text: string, size: number, data: any, direction: string) {
  const chars = Array.from(text);
  const scale = size / data.resolution;
  const line_height = (data.boundingBox.yMax - data.boundingBox.yMin + data.underlineThickness) * scale;
  const paths: any[] = [];
  let offsetX = 0;
  let offsetY = 0;

  if (direction === "rtl" || direction === "tb") {
    chars.reverse();
  }

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char === "\n") {
      offsetX = 0;
      offsetY -= line_height;
    } else {
      const ret = createPath(char, scale, offsetX, offsetY, data);
      if (ret) {
        if (direction === "tb") {
          offsetX = 0;
          offsetY += data.ascender * scale;
        } else {
          offsetX += ret.offsetX;
        }
        paths.push(ret.path);
      }
    }
  }
  return paths;
}

function createPath(char: string, scale: number, offsetX: number, offsetY: number, data: any) {
  const glyph = data.glyphs[char] || data.glyphs["?"];
  if (!glyph) {
    console.error("THREE.Font: character " + char + " does not exist.");
    return null;
  }

  const path = new THREE.ShapePath();
  let x, y, cpx, cpy, cpx1, cpy1, cpx2, cpy2;

  if (glyph.o) {
    const outline = glyph._cachedOutline || (glyph._cachedOutline = glyph.o.split(" "));
    for (let i = 0, l = outline.length; i < l; ) {
      const action = outline[i++];
      switch (action) {
        case "m":
          x = outline[i++] * scale + offsetX;
          y = outline[i++] * scale + offsetY;
          path.moveTo(x, y);
          break;
        case "l":
          x = outline[i++] * scale + offsetX;
          y = outline[i++] * scale + offsetY;
          path.lineTo(x, y);
          break;
        case "q":
          cpx = outline[i++] * scale + offsetX;
          cpy = outline[i++] * scale + offsetY;
          cpx1 = outline[i++] * scale + offsetX;
          cpy1 = outline[i++] * scale + offsetY;
          path.quadraticCurveTo(cpx1, cpy1, cpx, cpy);
          break;
        case "b":
          cpx = outline[i++] * scale + offsetX;
          cpy = outline[i++] * scale + offsetY;
          cpx1 = outline[i++] * scale + offsetX;
          cpy1 = outline[i++] * scale + offsetY;
          cpx2 = outline[i++] * scale + offsetX;
          cpy2 = outline[i++] * scale + offsetY;
          path.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, cpx, cpy);
          break;
      }
    }
  }
  return { offsetX: glyph.ha * scale, path: path };
}

async function ensureThreeLoaded() {
  if (THREE) return;

  THREE = (window as any).THREE || (globalThis as any).THREE || (globalThis as any).unsafeWindow?.THREE;
  if (!THREE) {
    throw new Error("THREE is not defined");
  }

  Font = class {
    public isFont = true;
    public type = "Font";
    public data: any;

    constructor(data: any) {
      this.data = data;
    }

    public generateShapes(text: string, size = 100, direction = "ltr") {
      const shapes: any[] = [];
      const paths = createPaths(text, size, this.data, direction);
      for (let p = 0, pl = paths.length; p < pl; p++) {
        shapes.push(...paths[p].toShapes());
      }
      return shapes;
    }
  };

  TextGeometry = class extends THREE.ExtrudeGeometry {
    constructor(text: string, parameters: any = {}) {
      const font = parameters.font;
      if (font === undefined) {
        super();
      } else {
        const shapes = font.generateShapes(text, parameters.size, parameters.direction);
        if (parameters.depth === undefined) parameters.depth = 50;
        if (parameters.bevelThickness === undefined) parameters.bevelThickness = 10;
        if (parameters.bevelSize === undefined) parameters.bevelSize = 8;
        if (parameters.bevelEnabled === undefined) parameters.bevelEnabled = false;
        super(shapes, parameters);
      }
    }
  };

  TTFLoader = class extends THREE.Loader {
    public reversed = false;

    constructor(manager?: any) {
      super(manager);
    }

    public load(url: string, onLoad: (data: any) => void, onError?: any) {
      const scope = this;
      const fetchWithCache = async (targetUrl: string): Promise<ArrayBuffer> => {
        try {
          const cachedBuffer = await getFontFromIndexedDB(targetUrl);
          if (cachedBuffer) {
            return cachedBuffer;
          }
        } catch (e) {
        }

        const response = await fetch(targetUrl);
        if (!response.ok) {
          McmodderUtils.commonMsg(`无法从设置的链接 (${targetUrl}) 获取字体数据...`, false);
          throw new Error("Failed to fetch font");
        }
        const buffer = await response.arrayBuffer();
        try {
          await saveFontToIndexedDB(targetUrl, buffer);
        } catch (e) {
        }
        return buffer;
      };

      fetchWithCache(url)
        .then((buffer) => {
          try {
            onLoad(scope.parse(buffer));
          } catch (e) {
            if (onError) {
              onError(e);
            } else {
              console.error(e);
            }
          }
        })
        .catch((err) => {
          if (onError) {
            onError(err);
          } else {
            console.error(err);
          }
        });
    }

    public parse(arraybuffer: any) {
      const scope = this;
      const targetText = (scope as any).displayText || "";
      const opentypeLib = (window as any).opentype || (globalThis as any).opentype || (globalThis as any).unsafeWindow?.opentype;
      if (!opentypeLib) {
        throw new Error("opentype is not defined");
      }

      function convert(font: any, reversed: boolean, text: string) {
        const round = Math.round;
        const glyphs: any = {};
        const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
        const glyphIndexMap = font.encoding.cmap.glyphIndexMap;

        const uniqueChars = Array.from(new Set(text + " ?"));
        for (let i = 0; i < uniqueChars.length; i++) {
          const char = uniqueChars[i];
          const codePoint = char.codePointAt(0);
          if (codePoint === undefined) continue;

          const glyphIndex = glyphIndexMap[codePoint];
          if (glyphIndex === undefined) continue;

          const glyph = font.glyphs.glyphs[glyphIndex];
          if (!glyph) continue;

          const token: any = {
            ha: round(glyph.advanceWidth * scale),
            x_min: round(glyph.xMin * scale),
            x_max: round(glyph.xMax * scale),
            o: ""
          };
          if (reversed) {
            glyph.path.commands = reverseCommands(glyph.path.commands);
          }
          glyph.path.commands.forEach((command: any) => {
            if (command.type.toLowerCase() === "c") {
              command.type = "b";
            }
            token.o += command.type.toLowerCase() + " ";
            if (command.x !== undefined && command.y !== undefined) {
              token.o += round(command.x * scale) + " " + round(command.y * scale) + " ";
            }
            if (command.x1 !== undefined && command.y1 !== undefined) {
              token.o += round(command.x1 * scale) + " " + round(command.y1 * scale) + " ";
            }
            if (command.x2 !== undefined && command.y2 !== undefined) {
              token.o += round(command.x2 * scale) + " " + round(command.y2 * scale) + " ";
            }
          });
          if (Array.isArray(glyph.unicodes) && glyph.unicodes.length > 0) {
            glyph.unicodes.forEach((unicode: number) => {
              glyphs[String.fromCodePoint(unicode)] = token;
            });
          } else {
            glyphs[String.fromCodePoint(glyph.unicode)] = token;
          }
        }

        return {
          glyphs: glyphs,
          familyName: font.getEnglishName("fullName"),
          ascender: round(font.ascender * scale),
          descender: round(font.descender * scale),
          underlinePosition: font.tables.post.underlinePosition,
          underlineThickness: font.tables.post.underlineThickness,
          boundingBox: {
            xMin: font.tables.head.xMin,
            xMax: font.tables.head.xMax,
            yMin: font.tables.head.yMin,
            yMax: font.tables.head.yMax
          },
          resolution: 1000,
          original_font_information: font.tables.name
        };
      }

      function reverseCommands(commands: any[]) {
        const paths: any[] = [];
        let path: any[] = [];
        commands.forEach((c) => {
          if (c.type.toLowerCase() === "m") {
            path = [c];
            paths.push(path);
          } else if (c.type.toLowerCase() !== "z") {
            path.push(c);
          }
        });

        const reversed: any[] = [];
        paths.forEach((p) => {
          const result = {
            type: "m",
            x: p[p.length - 1].x,
            y: p[p.length - 1].y
          };
          reversed.push(result);
          for (let i = p.length - 1; i > 0; i--) {
            const command = p[i];
            const result: any = { type: command.type };
            if (command.x2 !== undefined && command.y2 !== undefined) {
              result.x1 = command.x2;
              result.y1 = command.y2;
              result.x2 = command.x1;
              result.y2 = command.y1;
            } else if (command.x1 !== undefined && command.y1 !== undefined) {
              result.x1 = command.x1;
              result.y1 = command.y1;
            }
            result.x = p[i - 1].x;
            result.y = p[i - 1].y;
            reversed.push(result);
          }
        });
        return reversed;
      }

      return convert(opentypeLib.parse(arraybuffer), this.reversed, targetText);
    }
  };
}

export class Mcmodder3DSplash {
  private parent: Mcmodder;
  private container: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: any = null;
  private scene: any = null;
  private camera: any = null;
  private mesh: any = null;
  private animationFrameId: number | null = null;
  private text: string = "";
  private texture: any = null;

  constructor(parent: Mcmodder) {
    this.parent = parent;
  }

  public init() {
    let targetElement: JQuery;
    let isV4 = false;

    if (this.parent.href === `${this.parent.hostname}/`) {
      targetElement = $(".ooops").first();
    } else if (this.parent.href === `${this.parent.hostname}/v4/`) {
      targetElement = $(".splash").first();
      isV4 = true;
    } else {
      return;
    }

    if (!targetElement.length) {
      return;
    }

    const textElement = isV4 ? targetElement.find("span").first() : targetElement.find(".text").first();
    if (!textElement.length) {
      return;
    }

    this.text = textElement.text().trim();
    if (!this.text) {
      return;
    }

    this.text = this.text.replace(this.parent.currentUsername || "百科酱", "%s");
    const displayFormattedText = this.text.replace("%s", this.parent.currentUsername || "百科酱");

    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.width = "1000px";
    this.container.style.height = "200px";
    this.container.style.left = "50%";
    this.container.style.top = "50%";
    this.container.style.transform = "translate(-50%, -50%)";
    this.container.style.pointerEvents = "none";
    this.container.style.display = "flex";
    this.container.style.justifyContent = "center";
    this.container.style.alignItems = "center";
    this.container.style.opacity = "0";
    this.container.style.transition = "opacity 1s ease-in-out";

    if (targetElement.css("position") === "static") {
      targetElement.css("position", "relative");
    }
    targetElement.css("overflow", "visible");
    targetElement.append(this.container);

    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.container.appendChild(this.canvas);

    this.setupScene(displayFormattedText, targetElement, isV4);
  }

  private async setupScene(displayText: string, targetElement: JQuery, isV4: boolean) {
    if (!this.canvas || !this.container) return;

    try {
      await ensureThreeLoaded();
    } catch (err) {
      console.error("Failed to dynamically load Three.js:", err);
      return;
    }

    const width = this.container.clientWidth || 300;
    const height = this.container.clientHeight || 80;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true
      }) as any;
      this.renderer!.setSize(width, height, false);
      this.renderer!.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer!.setClearColor(0x000000, 0);
    } catch (err) {
      return;
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    const dirLightLeft = new THREE.DirectionalLight(0xff0040, 2.0);
    dirLightLeft.position.set(-10, 0, 0);
    this.scene.add(dirLightLeft);

    const dirLightRight = new THREE.DirectionalLight(0x0080ff, 2.0);
    dirLightRight.position.set(10, 0, 0);
    this.scene.add(dirLightRight);

    const dirLightBottom = new THREE.DirectionalLight(0x80ff80, 2.0);
    dirLightBottom.position.set(0, -10, 0);
    this.scene.add(dirLightBottom);

    const dirLightTop = new THREE.DirectionalLight(0xffff00, 2.0);
    dirLightTop.position.set(0, 10, 0);
    this.scene.add(dirLightTop);

    const fontUrl = this.parent.utils.getConfig("splashFontUrl") || "https://cdn.jsdelivr.net.cn/npm/@electron-fonts/noto-sans-sc/fonts/NotoSansSC-Regular.ttf";

    const ttfLoader = new TTFLoader();
    (ttfLoader as any).displayText = displayText;
    ttfLoader.load(
      fontUrl,
      (json: any) => {
        const font = new Font(json);
        const textGeo = new TextGeometry(displayText, {
          font: font,
          size: 1.6,
          depth: 0.4,
          curveSegments: 6,
          bevelEnabled: true,
          bevelThickness: 0.08,
          bevelSize: 0.04,
          bevelOffset: 0,
          bevelSegments: 3
        });

        textGeo.computeBoundingBox();
        textGeo.center();

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0, 1.0, 0.5),
          emissive: new THREE.Color().setHSL(0, 1.0, 0.5),
          emissiveIntensity: 1.0,
          roughness: 0.2,
          metalness: 0.8
        });

        this.mesh = new THREE.Mesh(textGeo, material);
        this.scene!.add(this.mesh);

        this.updateCameraZ();

        if (isV4) {
          targetElement.find("span").first().css({ opacity: 0, pointerEvents: "none" });
        } else {
          targetElement.find(".text, .shadow").css({ opacity: 0, pointerEvents: "none" });
        }

        this.container!.style.opacity = "1";

        const startTime = Date.now();
        this.animate(startTime, material);

        window.addEventListener("resize", this.onResize);
      },
      undefined,
      (error: any) => {
        console.error("Failed to load TTF font:", error);
      }
    );
  }

  private animate = (startTime: number, material: any) => {
    this.animationFrameId = requestAnimationFrame(() => this.animate(startTime, material));

    const elapsedTime = (Date.now() - startTime) / 1000;

    if (this.mesh) {
      this.mesh.rotation.y = Math.sin(elapsedTime);
      this.mesh.position.y = Math.sin(elapsedTime * 1.5) * 0.25;
    }

    const hue = (elapsedTime * 0.15) % 1.0;
    const color = new THREE.Color().setHSL(hue, 1.0, 0.5);

    if (material) {
      material.color.copy(color);
      material.emissive.copy(color);
      material.emissiveIntensity = 1.0 + Math.sin(elapsedTime * 2.0) * 0.2;
    }

    if (this.container) {
      const hueDeg = Math.round(hue * 360);
      const shadowRadius = 15 + Math.sin(elapsedTime * 2.0) * 5;
      this.container.style.filter = `drop-shadow(0 0 ${shadowRadius}px hsl(${hueDeg}, 100%, 50%))`;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private updateCameraZ() {
    if (!this.camera || !this.mesh || !this.container) return;
    const geom = this.mesh.geometry;
    geom.computeBoundingBox();
    const boundingBox = geom.boundingBox;
    const textWidth = boundingBox.max.x - boundingBox.min.x;
    const textHeight = boundingBox.max.y - boundingBox.min.y;

    const width = this.container.clientWidth || 300;
    const height = this.container.clientHeight || 80;

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const aspect = width / height;

    const zHeight = textHeight / (2 * Math.tan(fovRad / 2));
    const zWidth = textWidth / (2 * aspect * Math.tan(fovRad / 2));

    const paddingFactor = 2.0;
    this.camera.position.z = Math.max(zHeight, zWidth) * paddingFactor;
  }

  private onResize = () => {
    if (!this.container || !this.canvas || !this.camera || !this.renderer) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
    this.updateCameraZ();
  };

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener("resize", this.onResize);

    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }

    if (this.texture) {
      this.texture.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
