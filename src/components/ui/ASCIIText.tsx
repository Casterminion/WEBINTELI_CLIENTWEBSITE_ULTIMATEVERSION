"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float mouse;
uniform float uEnableWaves;

void main() {
    vUv = uv;
    float time = uTime * 5.;

    float waveFactor = uEnableWaves;

    vec3 transformed = position;

    transformed.x += sin(time + position.y) * 0.5 * waveFactor;
    transformed.y += cos(time + position.z) * 0.15 * waveFactor;
    transformed.z += sin(time + position.x) * waveFactor;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
uniform float mouse;
uniform float uTime;
uniform sampler2D uTexture;

void main() {
    float time = uTime;
    vec2 pos = vUv;
    
    vec4 tex = texture2D(uTexture, pos);
    gl_FragColor = tex;
}

`;

const mapValue = (n: number, start: number, stop: number, start2: number, stop2: number) => {
  return ((n - start) / (stop - start)) * (stop2 - start2) + start2;
};

const PX_RATIO = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

class AsciiFilter {
  renderer: THREE.WebGLRenderer;
  domElement: HTMLDivElement;
  pre: HTMLPreElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  deg: number;
  invert: boolean;
  fontSize: number;
  fontFamily: string;
  charset: string;
  width: number = 0;
  height: number = 0;
  cols: number = 0;
  rows: number = 0;
  center: { x: number; y: number } = { x: 0, y: 0 };
  mouse: { x: number; y: number } = { x: 0, y: 0 };

  constructor(renderer: THREE.WebGLRenderer, { fontSize, fontFamily, charset, invert }: any = {}) {
    this.renderer = renderer;
    this.domElement = document.createElement('div');
    this.domElement.style.position = 'absolute';
    this.domElement.style.top = '0';
    this.domElement.style.left = '0';
    this.domElement.style.width = '100%';
    this.domElement.style.height = '100%';

    this.pre = document.createElement('pre');
    this.domElement.appendChild(this.pre);

    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d')!;
    this.domElement.appendChild(this.canvas);

    this.deg = 0;
    this.invert = invert ?? true;
    this.fontSize = fontSize ?? 12;
    this.fontFamily = fontFamily ?? "'Courier New', monospace";
    this.charset = charset ?? ' .\'`^",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

    this.context.imageSmoothingEnabled = false;

    this.onMouseMove = this.onMouseMove.bind(this);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.reset();

    this.center = { x: width / 2, y: height / 2 };
    this.mouse = { x: this.center.x, y: this.center.y };
  }

  reset() {
    this.context.font = `${this.fontSize}px ${this.fontFamily}`;
    const charWidth = this.context.measureText('A').width;

    this.cols = Math.floor(this.width / (this.fontSize * (charWidth / this.fontSize)));
    this.rows = Math.floor(this.height / this.fontSize);

    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.pre.style.fontFamily = this.fontFamily;
    this.pre.style.fontSize = `${this.fontSize}px`;
    this.pre.style.margin = '0';
    this.pre.style.padding = '0';
    this.pre.style.lineHeight = '1em';
    this.pre.style.position = 'absolute';
    this.pre.style.left = '0';
    this.pre.style.top = '0';
    this.pre.style.zIndex = '9';
    this.pre.style.backgroundAttachment = 'fixed';
    this.pre.style.mixBlendMode = 'normal';
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer.render(scene, camera);

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.context.clearRect(0, 0, w, h);
    if (this.context && w && h) {
      this.context.drawImage(this.renderer.domElement, 0, 0, w, h);
    }

    // this.hue();
    this.asciify(this.context, w, h);
  }

  onMouseMove(e: MouseEvent) {
    this.mouse = { x: e.clientX * PX_RATIO, y: e.clientY * PX_RATIO };
  }

  get dx() {
    return this.mouse.x - this.center.x;
  }

  get dy() {
    return this.mouse.y - this.center.y;
  }

  hue() {
    // Flashy hue rotation disabled for a more professional look
    // const deg = (Math.atan2(this.dy, this.dx) * 180) / Math.PI;
    // this.deg += (deg - this.deg) * 0.075;
    // this.domElement.style.filter = `hue-rotate(${this.deg.toFixed(1)}deg)`;
  }

  asciify(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (w && h) {
      const imgData = ctx.getImageData(0, 0, w, h).data;
      let str = '';
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = x * 4 + y * 4 * w;
          const [r, g, b, a] = [imgData[i], imgData[i + 1], imgData[i + 2], imgData[i + 3]];

          if (a === 0) {
            str += ' ';
            continue;
          }

          let gray = (0.3 * r + 0.6 * g + 0.1 * b) / 255;
          let idx = Math.floor((1 - gray) * (this.charset.length - 1));
          if (this.invert) idx = this.charset.length - idx - 1;
          str += this.charset[idx];
        }
        str += '\n';
      }
      this.pre.innerHTML = str;
    }
  }

  dispose() {
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}

class CanvasTxt {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  txt: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  font: string;

  constructor(txt: string, { fontSize = 200, fontFamily = 'Arial', color = '#fdf9f3' } = {}) {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d')!;
    this.txt = txt;
    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    this.color = color;

    this.font = `600 ${this.fontSize}px ${this.fontFamily}`;
  }

  resize() {
    this.context.font = this.font;
    const metrics = this.context.measureText(this.txt);

    const textWidth = Math.ceil(metrics.width) + 20;
    const textHeight = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + 20;

    this.canvas.width = textWidth;
    this.canvas.height = textHeight;
  }

  render() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = this.color;
    this.context.font = this.font;

    const metrics = this.context.measureText(this.txt);
    const yPos = 10 + metrics.actualBoundingBoxAscent;

    this.context.fillText(this.txt, 10, yPos);
  }

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.height;
  }

  get texture() {
    return this.canvas;
  }
}

class CanvAscii {
  textString: string;
  asciiFontSize: number;
  textFontSize: number;
  textColor: string;
  planeBaseHeight: number;
  container: HTMLElement;
  width: number;
  height: number;
  enableWaves: boolean;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  mouse: { x: number; y: number };
  renderer?: THREE.WebGLRenderer;
  filter?: AsciiFilter;
  textCanvas?: CanvasTxt;
  texture?: THREE.CanvasTexture;
  geometry?: THREE.PlaneGeometry;
  material?: THREE.ShaderMaterial;
  mesh?: THREE.Mesh;
  animationFrameId?: number;
  center: { x: number; y: number } = { x: 0, y: 0 };

  constructor(
    { text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves }: any,
    containerElem: HTMLElement,
    width: number,
    height: number
  ) {
    this.textString = text;
    this.asciiFontSize = asciiFontSize;
    this.textFontSize = textFontSize;
    this.textColor = textColor;
    this.planeBaseHeight = planeBaseHeight;
    this.container = containerElem;
    this.width = width;
    this.height = height;
    this.enableWaves = enableWaves;

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 1000);
    this.camera.position.z = 30;

    this.scene = new THREE.Scene();
    this.mouse = { x: this.width / 2, y: this.height / 2 };

    this.onMouseMove = this.onMouseMove.bind(this);
  }

  async init() {
    try {
      await (document as any).fonts.load('600 200px "IBM Plex Mono"');
      await (document as any).fonts.load('500 12px "IBM Plex Mono"');
    } catch (e) {
      // Font loading failed, continue with fallback
    }
    await (document as any).fonts.ready;

    this.setMesh();
    this.setRenderer();
  }

  setMesh() {
    this.textCanvas = new CanvasTxt(this.textString, {
      fontSize: this.textFontSize,
      fontFamily: 'IBM Plex Mono',
      color: this.textColor
    });
    this.textCanvas.resize();
    this.textCanvas.render();

    this.texture = new THREE.CanvasTexture(this.textCanvas.texture);
    this.texture.minFilter = THREE.NearestFilter;

    const textAspect = this.textCanvas.width / this.textCanvas.height;
    const baseH = this.planeBaseHeight;
    const planeW = baseH * textAspect;
    const planeH = baseH;

    this.geometry = new THREE.PlaneGeometry(planeW, planeH, 36, 36);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        mouse: { value: 1.0 },
        uTexture: { value: this.texture },
        uEnableWaves: { value: this.enableWaves ? 1.0 : 0.0 }
      }
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  setRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 1.0);

    this.filter = new AsciiFilter(this.renderer, {
      fontFamily: 'IBM Plex Mono',
      fontSize: this.asciiFontSize,
      invert: true
    });

    this.container.appendChild(this.filter.domElement);
    this.setSize(this.width, this.height);

    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('touchmove', this.onMouseMove as any);
  }

  setSize(w: number, h: number) {
    this.width = w;
    this.height = h;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    if (this.filter) this.filter.setSize(w, h);

    this.center = { x: w / 2, y: h / 2 };
  }

  load() {
    this.animate();
  }

  onMouseMove(evt: any) {
    const e = evt.touches ? evt.touches[0] : evt;
    const bounds = this.container.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    this.mouse = { x, y };
  }

  animate() {
    const animateFrame = () => {
      this.animationFrameId = requestAnimationFrame(animateFrame);
      this.render();
    };
    animateFrame();
  }

  render() {
    const time = new Date().getTime() * 0.001;

    if (this.textCanvas) this.textCanvas.render();
    if (this.texture) this.texture.needsUpdate = true;

    if (this.mesh && (this.mesh.material as THREE.ShaderMaterial).uniforms) {
      (this.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = Math.sin(time);
    }

    this.updateRotation();
    if (this.filter) this.filter.render(this.scene, this.camera);
  }

  updateRotation() {
    if (!this.mesh) return;
    const x = mapValue(this.mouse.y, 0, this.height, 0.5, -0.5);
    const y = mapValue(this.mouse.x, 0, this.width, -0.5, 0.5);

    this.mesh.rotation.x += (x - this.mesh.rotation.x) * 0.05;
    this.mesh.rotation.y += (y - this.mesh.rotation.y) * 0.05;
  }

  clear() {
    this.scene.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh && typeof (obj as THREE.Mesh).material === 'object' && (obj as THREE.Mesh).material !== null) {
        const material = (obj as THREE.Mesh).material as any;
        Object.keys(material).forEach(key => {
          const matProp = material[key];
          if (matProp !== null && typeof matProp === 'object' && typeof matProp.dispose === 'function') {
            matProp.dispose();
          }
        });
        material.dispose();
        (obj as THREE.Mesh).geometry.dispose();
      }
    });
    this.scene.clear();
  }

  dispose() {
    if (this.animationFrameId !== undefined) cancelAnimationFrame(this.animationFrameId);
    if (this.filter) {
      this.filter.dispose();
      if (this.filter.domElement.parentNode) {
        this.container.removeChild(this.filter.domElement);
      }
    }
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('touchmove', this.onMouseMove as any);
    this.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }
}

interface ASCIITextProps {
  text?: string;
  asciiFontSize?: number;
  textFontSize?: number;
  textColor?: string;
  planeBaseHeight?: number;
  enableWaves?: boolean;
}

export default function ASCIIText({
  text = 'David!',
  asciiFontSize = 8,
  textFontSize = 200,
  textColor = '#fdf9f3',
  planeBaseHeight = 8,
  enableWaves = true
}: ASCIITextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const asciiRef = useRef<CanvAscii | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;

    const createAndInit = async (container: HTMLDivElement, w: number, h: number) => {
      const instance = new CanvAscii(
        { text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves },
        container,
        w,
        h
      );
      await instance.init();
      return instance;
    };

    const setup = async () => {
      const { width, height } = containerRef.current!.getBoundingClientRect();

      if (width === 0 || height === 0) {
        observer = new IntersectionObserver(
          async ([entry]) => {
            if (cancelled) return;
            if (entry.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0) {
              const { width: w, height: h } = entry.boundingClientRect;
              observer!.disconnect();
              observer = null;

              if (!cancelled) {
                asciiRef.current = await createAndInit(containerRef.current!, w, h);
                if (!cancelled && asciiRef.current) {
                  asciiRef.current.load();
                }
              }
            }
          },
          { threshold: 0.1 }
        );
        observer.observe(containerRef.current!);
        return;
      }

      asciiRef.current = await createAndInit(containerRef.current!, width, height);
      if (!cancelled && asciiRef.current) {
        asciiRef.current.load();

        ro = new ResizeObserver(entries => {
          if (!entries[0] || !asciiRef.current) return;
          const { width: w, height: h } = entries[0].contentRect;
          if (w > 0 && h > 0) {
            asciiRef.current.setSize(w, h);
          }
        });
        ro.observe(containerRef.current!);
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (ro) ro.disconnect();
      if (asciiRef.current) {
        asciiRef.current.dispose();
        asciiRef.current = null;
      }
    };
  }, [text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves]);

  return (
    <div
      ref={containerRef}
      className="ascii-text-container"
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 0
      }}
    >
      <style>{`
        .ascii-text-container canvas {
          display: none;
        }

        .ascii-text-container pre {
          font-family: var(--font-ibm-plex), 'IBM Plex Mono', monospace;
          margin: 0;
          user-select: none;
          padding: 0;
          line-height: 1.02em;
          text-align: left;
          position: absolute;
          left: 0;
          top: 0;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: none;
          z-index: 9;
          mix-blend-mode: normal;
          opacity: 0.8;
          animation: subtle-glitch 4s infinite;
        }

        @keyframes subtle-glitch {
          0%, 90%, 100% { transform: translate(0, 0); opacity: 0.8; }
          92% { transform: translate(1px, -1px); opacity: 0.9; }
          94% { transform: translate(-1px, 1px); opacity: 0.7; }
          96% { transform: translate(0, 0); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
