import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface AnimationCard {
  id: string;
  title: string;
  rarity: Rarity;
  quantity?: number;
  emote?: string;
}

type DisplayCard = AnimationCard & { emote: string };

export interface SupernovaSettings {
  bloomStrength: number;
  particleDensity: number;
  pulseBpmStart: number;
  pulseBpmEnd: number;
  showSkipButton: boolean;
}

export interface PlayOptions {
  cards: AnimationCard[];
  forceRarity?: Rarity;
}

const DEFAULT_SETTINGS: SupernovaSettings = {
  bloomStrength: 1.35,
  particleDensity: 1,
  pulseBpmStart: 70,
  pulseBpmEnd: 160,
  showSkipButton: true,
};

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const RARITY_COLORS: Record<Rarity, number> = {
  common: 0x9ca3af,
  uncommon: 0x10b981,
  rare: 0x3b82f6,
  epic: 0xa855f7,
  legendary: 0xf59e0b,
};

const PRISMATIC_COLORS = [
  0xff6b6b,
  0xff9f43,
  0xfeca57,
  0x26de81,
  0x48dbfb,
  0x54a0ff,
  0xa55eea,
  0xff6b9d,
];

const EMOTES = ['😀', '😎', '🔥', '💜', '⭐', '🎮', '💎', '🌟', '✨', '🚀', '💫', '🎨', '💖', '🌈', '⚡', '🔮', '👑'];

const vertexShader = /* glsl */ `
  attribute float size;
  attribute float opacity;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vColor = color;
    vOpacity = opacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }

`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float glow = 1.0 - (dist * 2.0);
    glow = pow(glow, 2.0);
    vec3 finalColor = mix(vColor, vec3(1.0), glow * 0.7);
    float alpha = glow * vOpacity;
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const rand = (min: number, max: number) => min + Math.random() * (max - min);

function pickEmote() {
  return EMOTES[Math.floor(Math.random() * EMOTES.length)] ?? '✨';
}

function createEmojiTexture(emoji: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create 2D context for emoji sprite');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function toDisplayCard(card: AnimationCard): DisplayCard {
  return {
    id: card.id,
    title: card.title,
    rarity: card.rarity,
    quantity: card.quantity,
    emote: card.emote ?? pickEmote(),
  } as DisplayCard;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function createCardTexture(renderer: THREE.WebGLRenderer, card: DisplayCard, hidden = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create 2D context');

  const palettes: Record<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'hidden', [string, string, string]> = {
    common: ['#3a3a48', '#2a2a35', '#6a6a7a'],
    uncommon: ['#134e4a', '#065f46', '#10b981'],
    rare: ['#1e3a6e', '#152a50', '#3b82f6'],
    epic: ['#4c1d6e', '#351450', '#a855f7'],
    legendary: ['#5c4a1d', '#453810', '#f59e0b'],
    hidden: ['#ffffff', '#eeeeee', '#ffffff'],
  };

  const palette = hidden ? palettes.hidden : palettes[card.rarity] ?? palettes.common;

  const gradient = ctx.createLinearGradient(0, 0, 512, 720);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(1, palette[1]);

  ctx.fillStyle = gradient;
  roundRect(ctx, 12, 12, 488, 696, 40);
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = palette[2];

  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    const cx = (i * 123) % 512;
    const cy = (i * 321) % 720;
    const radius = 120 + i * 26;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = palette[2];
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    const y = 60 + i * 70;
    ctx.moveTo(-80, y);
    ctx.lineTo(600, y + 220);
    ctx.stroke();
  }
  ctx.restore();

  ctx.globalAlpha = 1;
  ctx.lineWidth = 18;
  ctx.strokeStyle = palette[2];
  ctx.shadowColor = palette[2];
  ctx.shadowBlur = hidden ? 60 : 40;
  roundRect(ctx, 12, 12, 488, 696, 40);
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (!hidden) {
    const emote = card.emote ?? pickEmote();
    ctx.fillStyle = '#ffffff';
    ctx.font = '180px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emote, 256, 310);

    ctx.font = 'bold 64px "Fredoka", sans-serif';
    ctx.fillStyle = palette[2];
    const title = card.title.toUpperCase();
    ctx.fillText(title, 256, 555, 440);

    if (card.quantity !== undefined) {
      ctx.font = 'bold 48px "Fredoka", sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(`×${card.quantity}`, 256, 620);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

class ParticleRing {
  mesh: THREE.Points;
  private baseRadius: number[] = [];
  private angles: number[] = [];
  private opacities: number[] = [];

  constructor(scene: THREE.Scene, particleCount: number, radius: number, spread: number, density = 1) {
    const count = Math.floor(particleCount * density);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const baseRadius = radius + rand(-spread, spread);
      const y = rand(-spread * 0.2, spread * 0.2);

      this.angles.push(angle);
      this.baseRadius.push(baseRadius);
      this.opacities.push(0);

      positions[i * 3] = Math.cos(angle) * baseRadius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * baseRadius;

      const color = new THREE.Color(0xfff7e7);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = rand(0.8, 1.6);
      opacities[i] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Points(geometry, material);
    scene.add(this.mesh);
  }

  update(delta: number, speed: number, pull: number) {
    const positions = this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    const opacities = this.mesh.geometry.getAttribute('opacity') as THREE.BufferAttribute | undefined;
    if (!positions || !opacities) return;
    const count = this.angles.length;

    for (let i = 0; i < count; i++) {
      const currentRadius = this.baseRadius[i] ?? 0;
      const currentAngle = this.angles[i] ?? 0;
      const angle = currentAngle + delta * speed * 0.4;
      this.angles[i] = angle;
      const nextRadius = Math.max(2, currentRadius - pull * delta * 30);
      this.baseRadius[i] = nextRadius;

      const posX = Math.cos(angle) * nextRadius;
      const posZ = Math.sin(angle) * nextRadius;
      const posY = positions.getY(i) * 0.98;

      positions.setXYZ(i, posX, posY, posZ);

      const targetOpacity = nextRadius < 3 ? 0 : 0.8;
      const currentOpacity = this.opacities[i] ?? 0;
      const updatedOpacity = THREE.MathUtils.lerp(currentOpacity, targetOpacity, 0.05);
      this.opacities[i] = updatedOpacity;
      opacities.setX(i, updatedOpacity);
    }

    positions.needsUpdate = true;
    opacities.needsUpdate = true;
  }

  destroy(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.ShaderMaterial).dispose();
  }
}

class GlitterSystem {
  mesh: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  particles: Array<{
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    decay: number;
    color: THREE.Color;
  }> = [];

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.85,
    });
    this.mesh = new THREE.Points(geometry, material);
    scene.add(this.mesh);
  }

  emit(position: THREE.Vector3, rarity: Rarity | 'rainbow') {
    const baseColor = rarity === 'rainbow' ? new THREE.Color().setHSL(Math.random(), 1.0, 0.6) : new THREE.Color(RARITY_COLORS[rarity]);
    const count = rarity === 'rainbow' ? 6 : rarity === 'legendary' ? 10 : rarity === 'epic' ? 8 : rarity === 'rare' ? 6 : 4;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: position.x + (Math.random() - 0.5) * 1.2,
        y: position.y + (Math.random() - 0.5) * 1.2,
        z: position.z + (Math.random() - 0.5) * 1.2,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.18,
        vz: (Math.random() - 0.5) * 0.15,
        life: 1.0,
        decay: rand(0.01, 0.03),
        color: baseColor.clone(),
      });
    }
  }

  update() {
    const positions: number[] = [];
    const colors: number[] = [];

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= p.decay;
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      positions.push(p.x, p.y, p.z);
      colors.push(p.color.r, p.color.g, p.color.b);
    }

    this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const posAttr = this.mesh.geometry.getAttribute('position');
    const colorAttr = this.mesh.geometry.getAttribute('color');
    if (posAttr) posAttr.needsUpdate = true;
    if (colorAttr) colorAttr.needsUpdate = true;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.particles = [];
  }
}

class CardBillboard {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  readonly data: DisplayCard;
  private readonly hiddenTexture: THREE.CanvasTexture;
  private readonly faceTexture: THREE.CanvasTexture;
  private revealState: 'hidden' | 'revealing' | 'revealed';
  private revealStart = 0;
  private revealDuration: number;
  private wobbleOffset = Math.random() * 100;
  private glitterBurst = false;
  private overlayElement: HTMLElement | null;
  private readonly basePosition = new THREE.Vector3();

  constructor(renderer: THREE.WebGLRenderer, card: DisplayCard, startHidden = true, overlayElement: HTMLElement | null = null) {
    this.data = card;
    const geo = new THREE.PlaneGeometry(3.2, 4.6, 1, 1);
    this.hiddenTexture = createCardTexture(renderer, card, true);
    this.faceTexture = createCardTexture(renderer, card, false);

    const material = new THREE.MeshStandardMaterial({
      map: startHidden ? this.hiddenTexture : this.faceTexture,
      transparent: true,
      emissive: new THREE.Color(RARITY_COLORS[card.rarity]),
      emissiveIntensity: startHidden ? 0.9 : 0.45,
      roughness: 0.22,
      metalness: 0.68,
    });

    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.scale.setScalar(startHidden ? 0.12 : 1);
    this.mesh.rotation.y = startHidden ? Math.PI : 0;
    this.revealState = startHidden ? 'hidden' : 'revealed';
    this.overlayElement = overlayElement;
    this.basePosition.copy(this.mesh.position);
    this.revealDuration = this.resolveRevealDuration();
    this.updateOverlayState('hidden');
  }

  startReveal(time: number, glitter: GlitterSystem | null) {
    if (this.revealState !== 'hidden') return;
    this.revealState = 'revealing';
    this.revealStart = time;
    this.glitterBurst = false;
    if (glitter) {
      const sparkleTone = this.data.rarity === 'legendary' ? 'rainbow' : this.data.rarity;
      glitter.emit(this.mesh.position, sparkleTone);
      if (this.data.rarity === 'legendary') {
        glitter.emit(this.mesh.position, 'rainbow');
      }
    }
    this.updateOverlayState('revealing');
  }

  update(time: number, camera: THREE.PerspectiveCamera, glitter: GlitterSystem | null) {
    this.mesh.lookAt(camera.position);

    if (this.revealState === 'hidden') {
      this.mesh.scale.setScalar(0.12 + Math.sin(time * 2 + this.wobbleOffset) * 0.02);
      return;
    }

    const wobble = Math.sin(time * 1.2 + this.wobbleOffset) * 0.02;
    this.mesh.rotation.z = wobble;

    if (this.revealState === 'revealing') {
      const elapsed = time - this.revealStart;
      const progress = Math.min(1, elapsed / this.revealDuration);
      const eased = easeOutBack(progress);

      const scale = THREE.MathUtils.lerp(0.18, 1, eased);
      this.mesh.scale.setScalar(scale);

      const flip = Math.PI * (1 - progress);
      this.mesh.rotation.y = flip;

      if (!this.glitterBurst && progress >= 0.45) {
        (this.mesh.material as THREE.MeshStandardMaterial).map = this.faceTexture;
        (this.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.65;
        this.glitterBurst = true;
        if (glitter) {
          glitter.emit(this.mesh.position, this.data.rarity);
          if (this.data.rarity === 'legendary') {
            glitter.emit(this.mesh.position, 'rainbow');
          }
        }
      }

      if (progress >= 1) {
        this.revealState = 'revealed';
        this.mesh.rotation.y = 0;
        this.updateOverlayState('revealed');
      }
    } else {
      const float = Math.sin(time * 0.8 + this.wobbleOffset) * 0.25;
      this.mesh.position.y = this.basePosition.y + float;
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    (material.map as THREE.Texture | undefined)?.dispose();
    material.dispose();
    this.hiddenTexture.dispose();
    this.faceTexture.dispose();
    this.overlayElement = null;
  }

  private updateOverlayState(state: 'hidden' | 'revealing' | 'revealed') {
    if (!this.overlayElement) return;
    this.overlayElement.dataset.state = state;
  }

  private resolveRevealDuration(): number {
    switch (this.data.rarity) {
      case 'legendary':
        return 1.65;
      case 'epic':
        return 1.35;
      case 'rare':
        return 1.15;
      default:
        return 0.95;
    }
  }

  setBasePosition(x: number, y: number, z: number) {
    this.basePosition.set(x, y, z);
    this.mesh.position.set(x, y, z);
  }
}

function createOverlayCard(card: DisplayCard, index: number): HTMLElement {
  const el = document.createElement('div');
  el.className = `card-overlay-card rarity-${card.rarity}`;
  el.dataset.state = 'hidden';
  el.style.setProperty('--card-index', `${index}`);

  const emoji = document.createElement('span');
  emoji.className = 'card-emoji';
  emoji.textContent = card.emote;

  const title = document.createElement('span');
  title.className = 'card-title';
  title.textContent = card.title;

  const footer = document.createElement('span');
  footer.className = 'card-meta';
  footer.textContent = card.quantity && card.quantity > 1 ? `×${card.quantity}` : card.rarity.toUpperCase();

  el.appendChild(emoji);
  el.appendChild(title);
  el.appendChild(footer);
  return el;
}

function clearNode(node: HTMLElement) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

type EmoteSprite = {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  texture: THREE.Texture;
  startTime: number;
  duration: number;
  startAngle: number;
  startDistance: number;
  startY: number;
};

export class SupernovaController {
  private settings: SupernovaSettings;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private animationHandle: number | null = null;

  private rings: ParticleRing[] = [];
  private cards: CardBillboard[] = [];
  private glitter: GlitterSystem | null = null;
  private overlayElements: HTMLElement[] = [];
  private coreGroup: THREE.Group | null = null;
  private blackHoleGroup: THREE.Group | null = null;
  private overlay: HTMLElement;
  private skipRequested = false;
  private runningResolve: (() => void) | null = null;

  private phase: 'idle' | 'build' | 'spin' | 'collapse' | 'burst' | 'reveal' = 'idle';
  private phaseStart = 0;
  private targetColor = new THREE.Color(0xffffff);
  private elapsed = 0;
  private pullIntensity = 0;
  private cameraTarget = { angle: 0, y: 16, dist: 64 };
  private emoteSprites: EmoteSprite[] = [];
  private emoteSpawnCooldown = 0;
  private goldDust: THREE.Mesh[] = [];

  constructor(canvas: HTMLCanvasElement, overlay: HTMLElement, settings?: Partial<SupernovaSettings>) {
    this.overlay = overlay;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.overlay.dataset.state = 'idle';

    this.scene.background = new THREE.Color(0x030306);
    this.camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 2000);
    this.camera.position.set(0, 24, 70);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(canvas.clientWidth, canvas.clientHeight), this.settings.bloomStrength, 1.1, 0.25);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    window.addEventListener('resize', this.handleResize, { passive: true });
  }

  private handleResize = () => {
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(width, height);
  };

  skip() {
    this.skipRequested = true;
  }

  async play(options: PlayOptions): Promise<void> {
    if (this.runningResolve) {
      this.skip();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const cards = [...options.cards];
    const dominatedRarity = cards.reduce<Rarity>((best, current) =>
      RARITY_ORDER.indexOf(current.rarity) > RARITY_ORDER.indexOf(best) ? current.rarity : best,
    'common');

    const forced = options.forceRarity ?? dominatedRarity;
    this.targetColor = new THREE.Color(RARITY_COLORS[forced]);

    this.resetScene();
    this.initCore();
    this.initParticles();
    this.initGlitter();
    this.initGoldDust();
    this.initCamera();

    this.overlay.innerHTML = '';
    this.overlay.dataset.state = 'intro';

    this.phase = 'build';
    this.phaseStart = performance.now();
    this.elapsed = 0;
    this.pullIntensity = 0;
    this.skipRequested = false;
    this.emoteSpawnCooldown = 0;

    const cardsToUse: DisplayCard[] = cards.map(toDisplayCard);

    const promise = new Promise<void>(resolve => {
      this.runningResolve = resolve;
    });

    const animate = (time: number) => {
      if (!this.runningResolve) return;
      if (this.skipRequested) {
        this.finishSequence();
        return;
      }

      const delta = (time - this.phaseStart) / 1000;
      this.elapsed += delta;
      this.phaseStart = time;
      switch (this.phase) {
        case 'build':
          this.updateBuildPhase(delta);
          if (this.elapsed > 2.2) this.transitionTo('spin');
          break;
        case 'spin':
          this.updateSpinPhase(delta);
          if (this.elapsed > 4.8) this.transitionTo('collapse');
          break;
        case 'collapse':
          this.updateCollapsePhase(delta);
          if (this.elapsed > 6.2) this.transitionTo('burst');
          break;
        case 'burst':
          this.updateBurstPhase(delta);
          if (this.elapsed > 7.2) {
            this.transitionTo('reveal');
            this.spawnCards(cardsToUse, time / 1000);
          }
          break;
        case 'reveal':
          this.updateRevealPhase(delta, time / 1000);
          if (this.elapsed > 9.2) {
            this.finishSequence();
            return;
          }
          break;
        default:
          break;
      }

      this.updateCamera(delta);
      this.composer.render();
      this.animationHandle = requestAnimationFrame(animate);
    };

    this.phaseStart = performance.now();
    this.elapsed = 0;
    this.animationHandle = requestAnimationFrame(animate);
    return promise;
  }

  private transitionTo(phase: typeof this.phase) {
    this.phase = phase;
    this.elapsed = 0;
  }

  private updateBuildPhase(delta: number) {
    this.pullIntensity = THREE.MathUtils.lerp(this.pullIntensity, 0.1, delta * 0.8);
    this.rings.forEach(r => r.update(delta, 1.0, this.pullIntensity));
    const chroma = THREE.MathUtils.smootherstep(Math.min(1, this.elapsed / 2.2), 0, 1) * 0.4;
    this.updateCore(delta, chroma);
    this.cameraTarget.angle += delta * 0.2;
    this.cameraTarget.y = THREE.MathUtils.lerp(this.cameraTarget.y, 16, delta * 0.6);
    this.cameraTarget.dist = THREE.MathUtils.lerp(this.cameraTarget.dist, 64, delta * 0.6);
    this.bloomPass.strength = THREE.MathUtils.lerp(this.bloomPass.strength, this.settings.bloomStrength, 0.12);
    this.updateAtmosphere(delta, 'build');
  }

  private updateSpinPhase(delta: number) {
    this.pullIntensity = THREE.MathUtils.lerp(this.pullIntensity, 0.0, delta * 0.5);
    this.rings.forEach(r => r.update(delta, 2.2, this.pullIntensity));
    this.updateCore(delta, 0.75);
    this.cameraTarget.angle += delta * 0.45;
    this.cameraTarget.y = THREE.MathUtils.lerp(this.cameraTarget.y, 12, 0.12);
    this.cameraTarget.dist = THREE.MathUtils.lerp(this.cameraTarget.dist, 58, 0.12);
    this.bloomPass.strength = THREE.MathUtils.lerp(this.bloomPass.strength, this.settings.bloomStrength + 0.25, 0.08);
    this.updateAtmosphere(delta, 'spin');
  }

  private updateCollapsePhase(delta: number) {
    this.pullIntensity = THREE.MathUtils.lerp(this.pullIntensity, 0.6, delta * 1.8);
    this.rings.forEach(r => r.update(delta, 1.8, this.pullIntensity));
    this.updateCore(delta, 1);
    this.cameraTarget.angle += delta * 0.6;
    this.cameraTarget.y = THREE.MathUtils.lerp(this.cameraTarget.y, 5, 0.06);
    this.cameraTarget.dist = THREE.MathUtils.lerp(this.cameraTarget.dist, 48, 0.06);
    if (!this.blackHoleGroup) this.initBlackHole();
    if (this.blackHoleGroup) {
      const scale = THREE.MathUtils.lerp(this.blackHoleGroup.scale.x, 1.2, 0.05);
      this.blackHoleGroup.scale.setScalar(scale);
      (this.blackHoleGroup.userData.transition as (t: number) => void)(easeInOutQuad(Math.min(1, this.elapsed / 1.2)));
    }
    this.updateAtmosphere(delta, 'collapse');
  }

  private updateBurstPhase(delta: number) {
    this.pullIntensity = THREE.MathUtils.lerp(this.pullIntensity, 1.5, delta * 2.5);
    this.rings.forEach(r => r.update(delta, 0.5, this.pullIntensity));
    if (this.blackHoleGroup) {
      const scale = THREE.MathUtils.lerp(this.blackHoleGroup.scale.x, 0.2, 0.1);
      this.blackHoleGroup.scale.setScalar(scale);
    }
    this.cameraTarget.dist = THREE.MathUtils.lerp(this.cameraTarget.dist, 42, 0.1);
    this.cameraTarget.angle += delta * 0.7;
    this.cameraTarget.y = THREE.MathUtils.lerp(this.cameraTarget.y, 3, 0.1);
    this.bloomPass.strength = THREE.MathUtils.lerp(this.bloomPass.strength, this.settings.bloomStrength + 0.9, 0.15);
    this.updateAtmosphere(delta, 'burst');
  }

  private updateRevealPhase(delta: number, timeSeconds: number) {
    this.pullIntensity = THREE.MathUtils.lerp(this.pullIntensity, 0, delta * 3);
    this.rings.forEach(r => r.update(delta, 0.4, this.pullIntensity));
    this.cameraTarget.dist = THREE.MathUtils.lerp(this.cameraTarget.dist, 52, 0.06);
    this.cameraTarget.y = THREE.MathUtils.lerp(this.cameraTarget.y, 6, 0.04);
    this.cameraTarget.angle += delta * 0.3;
    this.bloomPass.strength = THREE.MathUtils.lerp(this.bloomPass.strength, this.settings.bloomStrength, 0.08);
    this.cards.forEach(card => card.update(timeSeconds, this.camera, this.glitter));
    this.updateGlitter();
    this.updateAtmosphere(delta, 'reveal');
  }

  private finishSequence() {
    cancelAnimationFrame(this.animationHandle ?? 0);
    this.animationHandle = null;
    this.phase = 'idle';
    this.cards.forEach(card => card.mesh.scale.setScalar(1));
    this.overlay.dataset.state = 'complete';
    this.runningResolve?.();
    this.runningResolve = null;
  }

  private initCore() {
    const group = new THREE.Group();
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 3.2,
      roughness: 0.15,
      metalness: 0.1,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.4, 48, 48), coreMaterial);
    group.add(core);

    const layers: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfff4d6,
        transparent: true,
        opacity: 0.25 / (i + 1),
        depthWrite: false,
      });
      const layer = new THREE.Mesh(new THREE.SphereGeometry(2 + i * 0.8, 32, 32), mat);
      layers.push(layer);
      group.add(layer);
    }

    const light = new THREE.PointLight(0xffcc88, 2, 120);
    group.add(light);

    group.userData = { core, layers, light };
    this.scene.add(group);
    this.coreGroup = group;
  }

  private initParticles() {
    const density = this.settings.particleDensity;
    this.rings.forEach(r => r.destroy(this.scene));
    this.rings = [];
    this.rings.push(new ParticleRing(this.scene, 240, 6, 3, density));
    this.rings.push(new ParticleRing(this.scene, 320, 12, 5.5, density));
    this.rings.push(new ParticleRing(this.scene, 380, 18, 7.5, density));
    this.rings.push(new ParticleRing(this.scene, 460, 24, 9, density * 0.8));
  }

  private initGlitter() {
    if (this.glitter) {
      this.glitter.dispose(this.scene);
    }
    this.glitter = new GlitterSystem(this.scene);
  }

  private initGoldDust() {
    this.goldDust.forEach(mesh => {
      this.scene.remove(mesh);
      (mesh.material as THREE.Material).dispose();
      mesh.geometry.dispose();
    });
    this.goldDust = [];

    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
    for (let i = 0; i < 28; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: rand(0.35, 0.8),
      });
      const mesh = new THREE.Mesh(geometry, material);
      const angle = rand(0, Math.PI * 2);
      const distance = rand(10, 26);
      const y = rand(-5, 5);
      mesh.position.set(Math.cos(angle) * distance, y, Math.sin(angle) * distance);
      mesh.userData = {
        angle,
        distance,
        twinkle: rand(0, Math.PI * 2),
      };
      this.goldDust.push(mesh);
      this.scene.add(mesh);
    }
  }

  private initBlackHole() {
    const group = new THREE.Group();
    const hole = new THREE.Mesh(new THREE.SphereGeometry(4.2, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    group.add(hole);

    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.2, 16, 64),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        emissive: 0xffffff,
        emissiveIntensity: 2,
        roughness: 0.2,
      }),
    );
    group.add(torus);

    const transition = (t: number) => {
      const color = new THREE.Color(0xffffff).lerp(this.targetColor, t);
      (torus.material as THREE.MeshStandardMaterial).color.copy(color);
      (torus.material as THREE.MeshStandardMaterial).emissive.copy(color);
    };

    group.userData.transition = transition;
    group.scale.setScalar(0.01);
    this.scene.add(group);
    this.blackHoleGroup = group;
  }

  private initCamera() {
    this.cameraTarget = { angle: 0, y: 16, dist: 64 };
  }

  private updateCore(delta: number, chroma: number) {
    if (!this.coreGroup) return;
    const { core, layers, light } = this.coreGroup.userData as {
      core: THREE.Mesh;
      layers: THREE.Mesh[];
      light: THREE.PointLight;
    };

    const pulse = 1 + Math.sin(performance.now() * 0.002) * 0.1;
    this.coreGroup.scale.setScalar(THREE.MathUtils.lerp(this.coreGroup.scale.x, 1.4 * pulse, delta * 4));

    const baseColor = new THREE.Color(0xffffff).lerp(this.targetColor, chroma * 0.9);
    (core.material as THREE.MeshStandardMaterial).color.copy(baseColor);
    (core.material as THREE.MeshStandardMaterial).emissive.copy(baseColor);
    (core.material as THREE.MeshStandardMaterial).emissiveIntensity = 3 + chroma * 4;

    layers.forEach((layer, i) => {
      const material = layer.material as THREE.MeshBasicMaterial;
      if (chroma > 0.2) {
        const t = (performance.now() * 0.001 + i * 0.2) % PRISMATIC_COLORS.length;
        const idx = Math.floor(t);
        const nextIdx = (idx + 1) % PRISMATIC_COLORS.length;
        const mix = t - idx;
        const color = new THREE.Color(PRISMATIC_COLORS[idx]).lerp(new THREE.Color(PRISMATIC_COLORS[nextIdx]), mix);
        material.color.copy(color);
      } else {
        material.color.copy(baseColor);
      }
      material.opacity = 0.25 / (i + 1);
    });

    light.color.copy(baseColor);
    light.intensity = 2 + chroma * 4;
  }

  private updateCamera(delta: number) {
    this.cameraTarget.angle += delta * 0.05;
    const shakeAmount = this.phase === 'burst' ? 0.9 : this.phase === 'collapse' ? 0.4 : 0.1;
    const time = performance.now() * 0.001;
    const shakeX = Math.sin(time * 17.3) * Math.sin(time * 9.1) * shakeAmount;
    const shakeY = Math.sin(time * 14.7) * shakeAmount * 0.5;

    const targetX = Math.sin(this.cameraTarget.angle) * this.cameraTarget.dist + shakeX;
    const targetZ = Math.cos(this.cameraTarget.angle) * this.cameraTarget.dist;
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX, delta * 1.5);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.cameraTarget.y + shakeY, delta * 1.4);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, delta * 1.5);
    this.camera.lookAt(0, 0, 0);
  }

  private spawnCards(cards: DisplayCard[], timeSeconds: number) {
    this.overlayElements = this.buildOverlay(cards);
    this.overlay.dataset.state = 'cards';

    const cols = Math.min(5, cards.length);
    const rows = Math.ceil(cards.length / cols);
    const spacing = 4.4;
    const rowSpacing = 5.2;
    const startX = -((cols - 1) * spacing) / 2;
    const startY = ((rows - 1) * rowSpacing) / 2 + 3;

    cards.forEach((card, index) => {
      const overlayElement = this.overlayElements[index] ?? null;
      const startHidden = true;
      const billboard = new CardBillboard(this.renderer, card, startHidden, overlayElement);
      const row = Math.floor(index / cols);
      const col = index % cols;
      const targetX = startX + col * spacing;
      const targetY = startY - row * rowSpacing;
      const targetZ = rand(-2, 2);
      billboard.setBasePosition(targetX, targetY, targetZ);
      this.scene.add(billboard.mesh);
      billboard.startReveal(timeSeconds + index * 0.08, this.glitter);
      this.cards.push(billboard);
    });
  }

  private updateGlitter() {
    this.glitter?.update();
  }

  private updateAtmosphere(delta: number, phase: typeof this.phase) {
    const spawnInterval =
      phase === 'build' ? 0.4 : phase === 'spin' ? 0.28 : phase === 'collapse' ? 0.6 : Infinity;

    if (spawnInterval !== Infinity) {
      this.emoteSpawnCooldown -= delta;
      if (this.emoteSpawnCooldown <= 0) {
        this.spawnEmoteSprite(phase === 'spin' ? 1.15 : 1);
        this.emoteSpawnCooldown = spawnInterval * rand(0.7, 1.4);
      }
    }

    this.updateEmoteSprites();
    this.updateGoldDust(delta, phase);
  }

  private spawnEmoteSprite(scaleBias = 1) {
    const emoji: string = pickEmote();
    const texture = createEmojiTexture(emoji);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 1,
    });
    const sprite = new THREE.Sprite(material);
    const startDistance = rand(38, 58);
    const startAngle = rand(0, Math.PI * 2);
    const startY = rand(-11, 11);
    sprite.position.set(Math.cos(startAngle) * startDistance, startY, Math.sin(startAngle) * startDistance);
    const size = rand(2.6, 3.4) * scaleBias;
    sprite.scale.set(size, size, size);
    this.scene.add(sprite);
    this.emoteSprites.push({
      sprite,
      material,
      texture,
      startTime: performance.now(),
      duration: rand(1100, 1500),
      startAngle,
      startDistance,
      startY,
    });
  }

  private updateEmoteSprites() {
    const now = performance.now();
    for (let i = this.emoteSprites.length - 1; i >= 0; i--) {
      const data = this.emoteSprites[i];
      if (!data) continue;
      const elapsed = now - data.startTime;
      const progress = THREE.MathUtils.clamp(elapsed / data.duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(progress, 0, 1);
      const radius = THREE.MathUtils.lerp(data.startDistance, 6, eased);
      const angle = data.startAngle + eased * 2.4;
      data.sprite.position.set(
        Math.cos(angle) * radius,
        THREE.MathUtils.lerp(data.startY, 0, eased),
        Math.sin(angle) * radius,
      );
      const scale = THREE.MathUtils.lerp(data.sprite.scale.x, 0.4, eased * 0.9);
      data.sprite.scale.setScalar(scale);
      data.material.opacity = progress < 0.8 ? 1 : THREE.MathUtils.lerp(1, 0, (progress - 0.8) / 0.2);

      if (progress >= 1) {
        this.scene.remove(data.sprite);
        data.texture.dispose();
        data.material.dispose();
        this.emoteSprites.splice(i, 1);
      }
    }
  }

  private updateGoldDust(delta: number, phase: typeof this.phase) {
    const time = performance.now() * 0.0015;
    const spinSpeed = phase === 'collapse' || phase === 'burst' ? 0.45 : 0.25;
    this.goldDust.forEach(mesh => {
      const meta = mesh.userData as { angle: number; distance: number; twinkle: number };
      meta.angle += spinSpeed * delta;
      mesh.position.x = Math.cos(meta.angle) * meta.distance;
      mesh.position.z = Math.sin(meta.angle) * meta.distance;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.35 + 0.5 * Math.sin(time * 3 + meta.twinkle);
    });
  }

  private disposeEmoteSprites() {
    this.emoteSprites.forEach(data => {
      this.scene.remove(data.sprite);
      data.texture.dispose();
      data.material.dispose();
    });
    this.emoteSprites = [];
  }

  private resetScene() {
    cancelAnimationFrame(this.animationHandle ?? 0);
    this.animationHandle = null;
    this.rings.forEach(r => r.destroy(this.scene));
    this.rings = [];
    this.cards.forEach(card => card.dispose(this.scene));
    this.cards = [];
    this.overlayElements = [];
    if (this.glitter) {
      this.glitter.dispose(this.scene);
      this.glitter = null;
    }
    this.disposeEmoteSprites();
    this.goldDust.forEach(mesh => {
      this.scene.remove(mesh);
      (mesh.material as THREE.Material).dispose();
      mesh.geometry.dispose();
    });
    this.goldDust = [];
    if (this.coreGroup) {
      this.scene.remove(this.coreGroup);
      this.coreGroup.traverse(object => {
        if ((object as THREE.Mesh).isMesh) {
          const mesh = object as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      this.coreGroup = null;
    }
    if (this.blackHoleGroup) {
      this.scene.remove(this.blackHoleGroup);
      this.blackHoleGroup.traverse(object => {
        if ((object as THREE.Mesh).isMesh) {
          const mesh = object as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      this.blackHoleGroup = null;
    }
    clearNode(this.overlay);
    this.overlay.dataset.state = 'idle';
  }

  private buildOverlay(cards: DisplayCard[]): HTMLElement[] {
    clearNode(this.overlay);
    const fragment = document.createDocumentFragment();
    const elements: HTMLElement[] = [];
    cards.forEach((card, index) => {
      const el = createOverlayCard(card, index);
      fragment.appendChild(el);
      elements.push(el);
    });
    this.overlay.appendChild(fragment);
    return elements;
  }

  dispose() {
    cancelAnimationFrame(this.animationHandle ?? 0);
    window.removeEventListener('resize', this.handleResize);
    this.resetScene();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
