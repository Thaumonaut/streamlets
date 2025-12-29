<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
  import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
  import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

  // Reactive UI state
  let cardCount = 5;
  let forceRarity = 'random';
  let pullBtnDisabled = true;
  let skipBtnVisible = false;
  let loading = true;

  // Container refs
  let containerEl: HTMLDivElement;

  // Mouse tracking for card rotation
  let mouseX = 0;
  let mouseY = 0;
  let currentRevealCard: Card3D | null = null;

  // Expose play method for parent component
  export async function play(cards: any[], rarityOverride?: string) {
    if (!renderer || isAnimating) return;
    await doPullWithCards(cards, rarityOverride);
  }

  // Custom shader for shaped particles (stars, sparkles, confetti)
  const roundParticleVertexShader = `
  attribute float size;
  attribute float opacity;
  attribute float particleType;
  varying vec3 vColor;
  varying float vOpacity;
  varying float vType;
  void main() {
    vColor = color;
    vOpacity = opacity;
    vType = particleType;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

  const roundParticleFragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;
  varying float vType;

  // Hexagon SDF - perfect geometric shape
  float hexagon(vec2 p, float size) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * size, k.z * size), size);
    return length(p) * sign(p.y);
  }

  // Frosted glass hexagon with internal refraction
  float frostedGlass(vec2 p, float time) {
    float d = hexagon(p, 0.35);

    // Glass body - translucent with falloff
    float glass = 1.0 - smoothstep(-0.35, 0.0, d);
    glass = pow(glass, 1.5) * 0.7; // Translucent, not opaque

    // Frosted surface texture
    float frost = fract(sin(dot(p * 30.0, vec2(12.9898, 78.233))) * 43758.5453);
    frost = smoothstep(0.4, 0.6, frost) * 0.3;

    // Sharp edges - like cut glass
    float edgeDist = abs(d);
    float edge = exp(-edgeDist * 50.0) * 1.5;

    // Internal refraction glow with slow pulse (sci-fi effect)
    float pulse = sin(time * 1.5) * 0.5 + 0.5; // 0.0 to 1.0 pulse
    float refract = (1.0 - smoothstep(-0.3, -0.1, d)) * (0.4 + pulse * 0.3);

    return glass + frost * glass + edge + refract;
  }

  // Crystal glass shard with prismatic edge
  float crystalGlass(vec2 p) {
    float d = hexagon(p, 0.38);

    // Clear glass center
    float glass = 1.0 - smoothstep(-0.38, -0.05, d);
    glass = pow(glass, 2.0) * 0.6;

    // Prismatic edge with rainbow refraction
    float edgeDist = abs(d);
    float prism = smoothstep(0.02, 0.0, edgeDist) * 2.0;

    // Internal caustic pattern
    float caustic = sin(p.x * 25.0) * sin(p.y * 25.0);
    caustic = smoothstep(0.3, 0.7, caustic) * 0.2 * glass;

    return glass + prism + caustic;
  }

  // Etched glass with light scatter
  float etchedGlass(vec2 p, float time) {
    float angle = time * 1.5;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    p = rot * p;

    float d = hexagon(p, 0.36);

    // Etched surface
    float etch = 1.0 - smoothstep(-0.36, 0.0, d);
    etch = pow(etch, 1.8) * 0.65;

    // Light scatter lines
    float scatter = abs(sin(p.y * 15.0 + time * 2.0));
    scatter = pow(1.0 - scatter, 3.0) * 0.4 * etch;

    // Glowing edge
    float edge = exp(-abs(d) * 40.0) * 1.2;

    return etch + scatter + edge;
  }

  // Refractive glass with depth
  float refractiveGlass(vec2 p, float time) {
    float d = hexagon(p, 0.34);

    // Glass depth layers
    float layer1 = 1.0 - smoothstep(-0.34, -0.15, d);
    float layer2 = 1.0 - smoothstep(-0.25, -0.05, d);
    float depth = layer1 * 0.4 + layer2 * 0.3;

    // Refraction shimmer
    float shimmer = sin(time * 3.0 + length(p) * 10.0) * 0.5 + 0.5;
    shimmer = smoothstep(0.3, 0.7, shimmer) * 0.3 * depth;

    // Bright refractive edge
    float edge = exp(-abs(d) * 35.0) * 1.8;

    return depth + shimmer + edge;
  }

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float shape = 0.0;
    vec3 finalColor = vColor;
    float brightness = 1.0;
    float time = vType * 10.0; // Use vType as time seed for variation

    if (vType < 0.25) {
      // Frosted glass - translucent with texture and pulsing glow
      shape = frostedGlass(center, time);
      brightness = 1.1;
      finalColor = mix(vColor, vec3(1.0), 0.15); // Slight white for frost
    } else if (vType < 0.50) {
      // Crystal glass - clear with prismatic edges
      shape = crystalGlass(center);
      brightness = 1.4;
      // Rainbow prismatic tint
      finalColor = mix(vColor, vec3(0.9, 1.0, 1.0), 0.2);
    } else if (vType < 0.75) {
      // Etched glass - rotating with light scatter
      shape = etchedGlass(center, time);
      brightness = 1.2;
      finalColor = mix(vColor, vec3(0.95, 0.95, 1.0), 0.15); // Cool tint
    } else {
      // Refractive glass - depth layers with shimmer
      shape = refractiveGlass(center, time);
      brightness = 1.5;
      finalColor = mix(vColor, vec3(1.0, 0.95, 0.9), 0.1); // Warm refraction
    }

    if (shape < 0.02) discard;

    // Glass is translucent - light passes through
    float alpha = min(0.75, shape * vOpacity * brightness * 0.65);
    gl_FragColor = vec4(finalColor * brightness, alpha);
  }
`;

  // Fractured Orb DOF + Chromatic Aberration Shader
  const fracturedOrbShader = {
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2() },
      focusDistance: { value: 0.5 },
      aberrationStrength: { value: 0.002 },
      blurAmount: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform float focusDistance;
      uniform float aberrationStrength;
      uniform float blurAmount;
      varying vec2 vUv;

      const float GOLDEN_ANGLE = 2.39996323;
      const float MAX_BLUR = 8.0;
      const float RAD_SCALE = 0.5;

      vec3 chromaticAberration(vec2 uv, float amount) {
        vec2 offset = (uv - 0.5) * amount;
        float r = texture2D(tDiffuse, uv - offset).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv + offset).b;
        return vec3(r, g, b);
      }

      vec3 bokehBlur(vec2 uv, float blur) {
        vec3 color = texture2D(tDiffuse, uv).rgb;
        if (blur < 0.1) return color;

        float tot = 1.0;
        float radius = RAD_SCALE;
        vec2 pixelSize = 1.0 / resolution;

        for (float ang = 0.0; ang < 40.0; ang += GOLDEN_ANGLE) {
          if (radius >= blur * MAX_BLUR) break;

          vec2 tc = uv + vec2(cos(ang), sin(ang)) * pixelSize * radius;
          vec3 sampleColor = texture2D(tDiffuse, tc).rgb;
          color += sampleColor;
          tot += 1.0;
          radius += RAD_SCALE / radius;
        }
        return color / tot;
      }

      void main() {
        vec2 uv = vUv;

        // Depth from center (cards are in center)
        float depth = length(uv - 0.5) * 2.0;
        float blur = abs(depth - focusDistance) * blurAmount;

        // Bokeh blur
        vec3 color = bokehBlur(uv, blur);

        // Chromatic aberration (stronger when blurred)
        color = mix(color, chromaticAberration(uv, aberrationStrength * (1.0 + blur)), min(blur, 1.0));

        // Subtle vignette (only when blur is active)
        if (blurAmount > 0.1) {
          float vignette = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.3;
          color *= vignette;
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `
  };

  // JJ Abrams Lens Flare Shader
  const lensFlareShader = {
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2() },
      lensPosition: { value: new THREE.Vector2(0.5, 0.5) },
      brightness: { value: 0.0 },
      streakIntensity: { value: 1.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform vec2 lensPosition;
      uniform float brightness;
      uniform float streakIntensity;
      varying vec2 vUv;

      vec3 chromaticFlare(vec2 uv, vec2 pos, float dist, float size) {
        float r = max(0.01 - pow(length(uv + (dist - 0.05) * pos), 2.4) * (1.0 / (size * 2.0)), 0.0) * 6.0;
        float g = max(0.01 - pow(length(uv + dist * pos), 2.4) * (1.0 / (size * 2.0)), 0.0) * 6.0;
        float b = max(0.01 - pow(length(uv + (dist + 0.05) * pos), 2.4) * (1.0 / (size * 2.0)), 0.0) * 6.0;
        return vec3(r, g, b);
      }

      float glare(vec2 uv, vec2 pos, float size) {
        vec2 main = uv - pos;
        float ang = atan(main.y, main.x);
        float dist = length(main);
        dist = pow(dist, 0.1);
        float f0 = 1.0 / (length(uv - pos) * (1.0 / size * 16.0) + 1.0);
        return f0 + f0 * (sin(ang * 8.0) * 0.2 + dist * 0.1 + 0.9);
      }

      vec3 horizontalStreak(vec2 uv, vec2 pos, float intensity) {
        float dist = abs(uv.y - pos.y);
        float streak = exp(-dist * 80.0) * intensity;
        float fade = 1.0 - abs(uv.x - pos.x);
        streak *= max(fade, 0.0);
        return vec3(streak) * vec3(1.2, 1.0, 0.8);
      }

      vec3 lensFlare(vec2 uv, vec2 pos, float bright) {
        vec3 c = vec3(0.0);
        c += vec3(glare(uv, pos, 1.0)) * bright;
        c += chromaticFlare(uv, pos, -3.0, 3.0) * bright;
        c += chromaticFlare(uv, pos, -1.0, 1.0) * 3.0 * bright;
        c += chromaticFlare(uv, pos, 0.5, 0.8) * bright;
        c += chromaticFlare(uv, pos, -0.4, 0.8) * bright;

        for(int i = 0; i < 4; i++) {
          float j = float(i + 1);
          float offset = j / (j + 1.0);
          float colOffset = j / 8.0;
          c += chromaticFlare(uv, pos, offset, 0.5 / (j + 0.1)) *
               vec3(1.0 - colOffset, 1.0, 0.5 + colOffset) * bright;
        }
        return c;
      }

      void main() {
        vec3 color = texture2D(tDiffuse, vUv).rgb;
        vec2 uv = vUv - 0.5;
        uv.x *= resolution.x / resolution.y;
        vec2 pos = lensPosition - 0.5;
        pos.x *= resolution.x / resolution.y;

        vec3 flare = lensFlare(uv, pos, brightness);
        flare += horizontalStreak(uv, pos, streakIntensity * brightness);
        color += flare;

        gl_FragColor = vec4(color, 1.0);
      }
    `
  };

  // God Rays / Edge Glow Shader
  const godRaysShader = {
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2() },
      rayOrigin: { value: new THREE.Vector2(0.5, 0.5) },
      intensity: { value: 0.0 },
      decay: { value: 0.95 },
      density: { value: 0.5 },
      weight: { value: 0.4 },
      samples: { value: 40 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform vec2 rayOrigin;
      uniform float intensity;
      uniform float decay;
      uniform float density;
      uniform float weight;
      uniform int samples;
      varying vec2 vUv;

      void main() {
        vec3 color = texture2D(tDiffuse, vUv).rgb;

        if (intensity < 0.01) {
          gl_FragColor = vec4(color, 1.0);
          return;
        }

        vec2 texCoord = vUv;
        vec2 deltaTexCoord = (texCoord - rayOrigin);
        deltaTexCoord *= 1.0 / float(samples) * density;

        float illuminationDecay = 1.0;
        vec3 rays = vec3(0.0);

        for(int i = 0; i < 40; i++) {
          if (i >= samples) break;
          texCoord -= deltaTexCoord;
          vec3 sampleColor = texture2D(tDiffuse, texCoord).rgb;
          sampleColor *= illuminationDecay * weight;
          rays += sampleColor;
          illuminationDecay *= decay;
        }

        rays *= intensity;

        // Rainbow chromatic god rays
        vec3 rayColor = rays * vec3(1.2, 1.0, 0.9);
        color += rayColor;

        gl_FragColor = vec4(color, 1.0);
      }
    `
  };

  // Cinematic Film Grain Shader
  const filmGrainShader = {
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0.0 },
      intensity: { value: 0.05 },
      vignetteStrength: { value: 0.15 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float time;
      uniform float intensity;
      uniform float vignetteStrength;
      varying vec2 vUv;

      float random(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec3 color = texture2D(tDiffuse, vUv).rgb;

        // Animated film grain
        float grain = random(vUv * time) * intensity;
        color += grain;

        // Subtle vignette
        vec2 uv = vUv - 0.5;
        float vignette = 1.0 - dot(uv, uv) * vignetteStrength;
        color *= vignette;

        gl_FragColor = vec4(color, 1.0);
      }
    `
  };

  // Background torus portal shader
  const torusVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const torusFragmentShader = `
    uniform vec3 glowColor;
    uniform float glowIntensity;
    uniform float time;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      // Fresnel effect for edge glow
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);
      
      // Animated glow pulsing
      float pulse = sin(time * 1.5) * 0.15 + 1.0;
      
      // Radial glow intensity based on UV
      float radial = 1.0 - length(vUv - 0.5) * 1.5;
      radial = max(0.0, radial);
      
      // Combine effects
      vec3 color = glowColor * glowIntensity * pulse * (0.5 + fresnel * 2.0);
      color *= radial * 2.0;
      
      gl_FragColor = vec4(color, opacity * radial * (0.3 + fresnel * 0.7));
    }
  `;

  const EMOTES = ['😀', '😎', '🔥', '💜', '⭐', '🎮', '💎', '🌟', '✨', '🚀', '💫', '🎨', '💖', '🌈', '⚡', '🔮', '👑'];
  const RARITY_COLORS = { common: 0x9ca3af, rare: 0x3b82f6, epic: 0xa855f7, legendary: 0xf59e0b };
  const CHROMATIC = [0xff6b6b, 0xfeca57, 0x48dbfb, 0xff9ff3, 0x54a0ff, 0x5f27cd, 0x00d2d3];
  const PRISMATIC = [0xff6b6b, 0xff9f43, 0xfeca57, 0x26de81, 0x48dbfb, 0x54a0ff, 0xa55eea, 0xff6b9d];

  // Tron Light Cycle Trail - create a ribbon of plasma that follows the card
  function createTronTrail(color: number, scene: THREE.Scene) {
    const trailLength = 40;
    const positions: THREE.Vector3[] = [];
    const geometry = new THREE.BufferGeometry();

    // Create initial trail geometry
    const vertices: number[] = [];
    const distances: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < trailLength; i++) {
      positions.push(new THREE.Vector3(0, 0, 0));
      // Create quad for this segment - match card height (32 units)
      const t = i / (trailLength - 1);
      vertices.push(0, -16, 0, 0, 16, 0); // Two vertices for full card height
      distances.push(t, t);
      uvs.push(t, 0, t, 1);

      if (i < trailLength - 1) {
        const idx = i * 2;
        indices.push(idx, idx + 1, idx + 2, idx + 1, idx + 3, idx + 2);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('distance', new THREE.Float32BufferAttribute(distances, 1));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vDistance;
        attribute float distance;

        void main() {
          vUv = uv;
          vDistance = distance;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        varying float vDistance;

        void main() {
          // Gradient from card (bright) to tail (transparent) - sharper falloff
          float fade = 1.0 - vDistance;
          fade = pow(fade, 2.5); // Sharper trailing edge

          // Tron Legacy style: Bright top and bottom edges with glowing center
          // Sharp horizontal edges at top and bottom (Y = 0 and Y = 1)
          float topEdge = 1.0 - smoothstep(0.90, 1.0, vUv.y);
          float bottomEdge = 1.0 - smoothstep(0.90, 1.0, 1.0 - vUv.y);
          float horizontalEdges = (topEdge + bottomEdge) * 4.0; // Very bright edges

          // Vertical wall glow - brightest in center
          float verticalGlow = 1.0 - abs(vUv.y - 0.5) * 2.0;
          verticalGlow = pow(verticalGlow, 1.5) * 2.0;

          // Combine for Tron Legacy effect
          float brightness = horizontalEdges + verticalGlow;
          float alpha = fade * brightness * opacity * 1.5;

          // Brighten the color more for that neon glow
          vec3 finalColor = color * (1.0 + brightness * 1.5);

          if (alpha < 0.01) discard;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    return {
      mesh,
      positions,
      update(cardPos: THREE.Vector3) {
        // Shift positions back
        for (let i = positions.length - 1; i > 0; i--) {
          positions[i].copy(positions[i - 1]);
        }
        positions[0].copy(cardPos);

        // Update geometry - match card height (32 units)
        const posAttr = geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i++) {
          const p = positions[i];
          posAttr[i * 6] = p.x;
          posAttr[i * 6 + 1] = p.y - 16; // Bottom of vertical wall
          posAttr[i * 6 + 2] = p.z;
          posAttr[i * 6 + 3] = p.x;
          posAttr[i * 6 + 4] = p.y + 16; // Top of vertical wall
          posAttr[i * 6 + 5] = p.z;
        }
        geometry.attributes.position.needsUpdate = true;
      },
      destroy() {
        scene.remove(mesh);
        geometry.dispose();
        material.dispose();
      }
    };
  }

  // Scene variables
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let composer: EffectComposer;
  let bloomPass: UnrealBloomPass;
  let dofPass: ShaderPass;
  let lensFlarePass: ShaderPass;
  let godRaysPass: ShaderPass;
  let filmGrainPass: ShaderPass;
  let cardSpotlight: THREE.PointLight | null = null;

  // State
  let isAnimating = false;
  let shouldSkip = false;
  let coreGroup: any = null;
  let blackHole: any = null;
  let nebulaPoints: any = null;
  let legendaryHint: any = null;
  let rings: any[] = [];
  let emoteSprites: any[] = [];
  let goldDust: any[] = [];

  let pulsePhase = 0;
  let pulseBPM = 90;
  let pulseIntensity = 0;
  let pulseActive = false;

  let state = {
    speed: 1,
    pull: 0,
    coreSize: 0.6,
    chroma: 0,
    colorProgress: 0,
    targetColor: 0xffffff,
    camAngle: 0,
    camY: 25,
    camDist: 70,
    targetCamAngle: 0,
    targetCamY: 25,
    targetCamDist: 70,
    shakeAmount: 0,
    phase: 'idle',
    explodeTime: 0,
    animationStartTime: 0
  };

  let glitterSystem: any = null;
  let backgroundTorus: THREE.Mesh | null = null; // Shared static torus for all cards
  let cardObjects: any[] = [];
  let animationFrameId: number;
  let lastTime = 0;
  let showCarouselExit = false; // Show exit button in carousel
  let carouselExitRequested = false; // Separate flag for carousel exit
  let showBackButton = false; // Show back button when card selected
  let selectedCardGlobal: any = null; // Currently selected card
  let cardsGlobal: any[] = []; // All cards in carousel

  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  function deselectCard() {
    if (!selectedCardGlobal) return;

    const cardScale = 0.5;
    // Animate back to grid positions
    cardsGlobal.forEach(card => {
      card.mesh.position.copy(card.targetPos);
      card.mesh.scale.setScalar(cardScale);
      card.mesh.rotation.set(0, 0, 0);
    });
    selectedCardGlobal = null;
    showBackButton = false;
  }

  const easeOutBack = (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  const easeInBack = (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  };

  const easeOutElastic = (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  };

  const easeOutCubic = (t: number) => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Export skip function for parent component to call
  export function skip() {
    shouldSkip = true;
  }

  const sleep = (s: number) => new Promise(r => setTimeout(r, s * 1000));
  const iSleep = (s: number) => new Promise(r => {
    if (shouldSkip) return r();
    const id = setTimeout(r, s * 1000);
    const c = setInterval(() => { if (shouldSkip) { clearTimeout(id); clearInterval(c); r(); } }, 16);
    setTimeout(() => clearInterval(c), s * 1000 + 20);
  });

  function smoothShake(time: number, amount: number) {
    const x = Math.sin(time * 11.3) * Math.sin(time * 5.7) * amount;
    const y = Math.sin(time * 9.1) * Math.sin(time * 4.3) * amount * 0.5;
    return { x, y };
  }

  // ===== EXACT COPY OF ORIGINAL ANIMATION CODE =====
  // (Legendary hint, nebula, core, black hole, rings, emotes, gold dust - ALL UNCHANGED)

  function createLegendaryHint() {
    const group = new THREE.Group();
    const sparkleCount = 30;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePos = new Float32Array(sparkleCount * 3);
    const sparkleSizes = new Float32Array(sparkleCount);

    for (let i = 0; i < sparkleCount; i++) {
      const angle = rand(0, Math.PI * 2);
      const dist = rand(3, 12);
      sparklePos[i * 3] = Math.cos(angle) * dist;
      sparklePos[i * 3 + 1] = rand(-3, 3);
      sparklePos[i * 3 + 2] = Math.sin(angle) * dist;
      sparkleSizes[i] = rand(0.5, 1.5);
    }

    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
    sparkleGeo.setAttribute('size', new THREE.BufferAttribute(sparkleSizes, 1));

    const sparkleColor = new THREE.Color(0xffd700);
    const sparkleColors = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i++) {
      sparkleColors[i * 3] = sparkleColor.r;
      sparkleColors[i * 3 + 1] = sparkleColor.g;
      sparkleColors[i * 3 + 2] = sparkleColor.b;
    }
    sparkleGeo.setAttribute('color', new THREE.BufferAttribute(sparkleColors, 3));

    const sparkleMat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: roundParticleVertexShader,
      fragmentShader: roundParticleFragmentShader,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    group.add(sparkles);
    (group as any).sparkles = sparkles;

    const ringGeo = new THREE.TorusGeometry(8, 0.15, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    (group as any).ring = ring;

    const ring2 = new THREE.Mesh(ringGeo.clone(), ringMat.clone());
    ring2.rotation.x = Math.PI / 2;
    ring2.rotation.y = Math.PI / 4;
    group.add(ring2);
    (group as any).ring2 = ring2;

    scene.add(group);
    return group;
  }

  async function playLegendaryHint(hint: any) {
    if (!hint || shouldSkip) return;
    const duration = 0.6;
    const steps = Math.floor(duration / 0.02);

    for (let i = 0; i < steps; i++) {
      if (shouldSkip) break;
      await iSleep(0.02);
      const t = i / steps;
      const sparkleOpacity = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
      hint.sparkles.material.opacity = sparkleOpacity * 0.8;
      hint.sparkles.rotation.y += 0.05;
      const ringOpacity = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
      const ringScale = 1 + t * 2;
      hint.ring.material.opacity = ringOpacity * 0.6;
      hint.ring.scale.set(ringScale, ringScale, 1);
      hint.ring2.material.opacity = ringOpacity * 0.4;
      hint.ring2.scale.set(ringScale * 0.8, ringScale * 0.8, 1);
    }
    scene.remove(hint);
  }

  function createNebula(count: number) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const particles: any[] = [];
    const warmColors = [0xffffff, 0xfff8e7, 0xffeecc, 0xffe4b5, 0xffd699];

    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const dist = rand(4, 30);
      const y = rand(-4, 4);
      positions[i * 3] = Math.cos(angle) * dist;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * dist;

      const warmColor = new THREE.Color(warmColors[i % warmColors.length]);
      const brightness = rand(0.8, 1);
      colors[i * 3] = warmColor.r * brightness;
      colors[i * 3 + 1] = warmColor.g * brightness;
      colors[i * 3 + 2] = warmColor.b * brightness;

      particles.push({ angle, dist, baseY: y, speed: rand(0.002, 0.005), wobble: rand(0, Math.PI * 2) });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) sizes[i] = 1.4;
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: roundParticleVertexShader,
      fragmentShader: roundParticleFragmentShader,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    (points as any).userData = { particles };
    scene.add(points);
    return points;
  }

  function updateNebula(nebula: any, speed: number, pull: number) {
    if (!nebula) return;
    const particles = nebula.userData.particles;
    const pos = nebula.geometry.attributes.position.array;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.angle += p.speed * speed;
      p.wobble += 0.012;
      p.dist = Math.max(3, p.dist - pull * 0.1);
      pos[i * 3] = Math.cos(p.angle) * p.dist;
      pos[i * 3 + 1] = p.baseY + Math.sin(p.wobble) * 1;
      pos[i * 3 + 2] = Math.sin(p.angle) * p.dist;
      if (p.dist < 4 && Math.random() < 0.004) { p.dist = rand(15, 30); p.angle = rand(0, Math.PI * 2); }
    }
    nebula.geometry.attributes.position.needsUpdate = true;
  }

  function createCore() {
    const group = new THREE.Group();
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 4,
      roughness: 0,
      metalness: 0
    });
    const coreGeo = new THREE.SphereGeometry(1.2, 64, 64);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);
    (group as any).coreMesh = coreMesh;

    (group as any).glowLayers = [];
    const glowColors = [0xffeecc, 0xffcc88, 0xffaa66, 0xff8844];
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: glowColors[i % glowColors.length],
        transparent: true,
        opacity: 0.25 / (i * 0.5 + 1),
        depthWrite: false
      });
      const geo = new THREE.SphereGeometry(1.8 + i * 0.8, 32, 32);
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      (group as any).glowLayers.push(mesh);
    }

    const light = new THREE.PointLight(0xffaa66, 2, 100);
    group.add(light);
    (group as any).light = light;
    scene.add(group);
    return group;
  }

  function updateCore(size: number, chroma: number, pulseValue: number, colorProgress: number, targetColor: number, prismaticTime?: number) {
    if (!coreGroup) return;
    const pulseScale = 1 + pulseValue * 0.12;
    const finalSize = size * pulseScale;
    coreGroup.scale.setScalar(finalSize);

    const white = new THREE.Color(0xffffff);
    const target = new THREE.Color(targetColor);
    const currentColor = white.clone().lerp(target, colorProgress);

    coreGroup.light.color.copy(currentColor);
    coreGroup.light.intensity = 2 + size + chroma * 1.5 + pulseValue * 1;

    coreGroup.glowLayers.forEach((layer: any, i: number) => {
      if (chroma > 0.3 && prismaticTime !== undefined) {
        const colorSpeed = 2;
        const colorProgress = (prismaticTime * colorSpeed + i * 0.3) % PRISMATIC.length;
        const colorIndex1 = Math.floor(colorProgress);
        const colorIndex2 = (colorIndex1 + 1) % PRISMATIC.length;
        const t = colorProgress - colorIndex1;
        const color1 = new THREE.Color(PRISMATIC[colorIndex1]);
        const color2 = new THREE.Color(PRISMATIC[colorIndex2]);
        const prismaticColor = color1.clone().lerp(color2, t);
        layer.material.color.copy(prismaticColor);
        layer.material.opacity = (0.25 / (i * 0.5 + 1)) * (1 + chroma * 0.3) * (1 + pulseValue * 0.2);
      } else {
        const warmWhite = new THREE.Color(0xffeecc);
        const glowColor = warmWhite.clone().lerp(new THREE.Color(targetColor), colorProgress);
        layer.material.color.copy(glowColor);
        layer.material.opacity = (0.25 / (i * 0.5 + 1)) * (1 + pulseValue * 0.15);
      }
    });

    if (chroma > 0.3 && prismaticTime !== undefined) {
      const colorSpeed = 2;
      const colorProgress = (prismaticTime * colorSpeed) % PRISMATIC.length;
      const colorIndex1 = Math.floor(colorProgress);
      const colorIndex2 = (colorIndex1 + 1) % PRISMATIC.length;
      const t = colorProgress - colorIndex1;
      const color1 = new THREE.Color(PRISMATIC[colorIndex1]);
      const color2 = new THREE.Color(PRISMATIC[colorIndex2]);
      const prismaticColor = color1.clone().lerp(color2, t);
      coreGroup.coreMesh.material.color.set(prismaticColor);
      coreGroup.coreMesh.material.emissive.copy(prismaticColor);
      coreGroup.coreMesh.material.emissiveIntensity = 4 + chroma * 3;
    } else {
      coreGroup.coreMesh.material.color.copy(currentColor);
      coreGroup.coreMesh.material.emissive.copy(currentColor);
      coreGroup.coreMesh.material.emissiveIntensity = 3;
    }
  }

  function createBlackHole() {
    const group = new THREE.Group();
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const holeGeo = new THREE.SphereGeometry(4.2, 32, 32);
    const holeMesh = new THREE.Mesh(holeGeo, holeMat);
    group.add(holeMesh);
    (group as any).holeMesh = holeMesh;

    const discGroup = new THREE.Group();
    discGroup.rotation.x = Math.PI / 9;
    group.add(discGroup);
    (group as any).discGroup = discGroup;

    const photonGeo = new THREE.TorusGeometry(3.5, 0.12, 16, 64);
    const photonMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      emissive: 0xffffff,
      emissiveIntensity: 2,
      roughness: 0.1,
      metalness: 0.1
    });
    const photon = new THREE.Mesh(photonGeo, photonMat);
    photon.rotation.x = Math.PI / 2;
    discGroup.add(photon);
    (group as any).photon = photon;

    (group as any).discLayers = [];
    for (let i = 0; i < 4; i++) {
      const discGeo = new THREE.TorusGeometry(5 + i * 1.5, 0.8 - i * 0.1, 8, 64);
      const discMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8 - i * 0.15,
        side: THREE.DoubleSide,
        emissive: 0xffffff,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.1
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = Math.PI / 2 + rand(-0.02, 0.02);
      discGroup.add(disc);
      (group as any).discLayers.push(disc);
    }

    (group as any).glowRings = [];
    for (let i = 0; i < 2; i++) {
      const glowGeo = new THREE.TorusGeometry(10 + i * 3, 1, 8, 48);
      const glowMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12 / (i + 1),
        side: THREE.DoubleSide,
        emissive: 0xffffff,
        emissiveIntensity: 1,
        roughness: 0.3,
        metalness: 0
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.rotation.x = Math.PI / 2;
      discGroup.add(glow);
      (group as any).glowRings.push(glow);
    }

    const warpGeo = new THREE.TorusGeometry(4.2, 0.2, 16, 64);
    const warpMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      emissive: 0xffffff,
      emissiveIntensity: 2.5,
      roughness: 0.1,
      metalness: 0.1
    });
    const warpRing = new THREE.Mesh(warpGeo, warpMat);
    group.add(warpRing);
    (group as any).warpRing = warpRing;

    const warpGlowGeo = new THREE.TorusGeometry(4.2, 0.5, 16, 64);
    const warpGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      emissive: 0xffffff,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0
    });
    const warpGlow = new THREE.Mesh(warpGlowGeo, warpGlowMat);
    group.add(warpGlow);
    (group as any).warpGlow = warpGlow;

    const light = new THREE.PointLight(0xffffff, 3, 80);
    group.add(light);
    (group as any).light = light;
    group.scale.set(0, 0, 0);
    scene.add(group);
    return group;
  }

  function transitionBlackHoleColor(bh: any, targetColor: number, t: number) {
    if (!bh) return;
    const white = new THREE.Color(0xffffff);
    const color = new THREE.Color(targetColor);
    const current = white.clone().lerp(color, t);

    bh.photon.material.color.copy(current);
    if (bh.photon.material.emissive) bh.photon.material.emissive.copy(current);
    bh.warpRing.material.color.copy(current);
    if (bh.warpRing.material.emissive) bh.warpRing.material.emissive.copy(current);
    if (bh.warpGlow) {
      bh.warpGlow.material.color.copy(current);
      if (bh.warpGlow.material.emissive) bh.warpGlow.material.emissive.copy(current);
    }
    bh.discLayers.forEach((d: any) => {
      d.material.color.copy(current);
      if (d.material.emissive) d.material.emissive.copy(current);
    });
    bh.glowRings.forEach((g: any) => {
      g.material.color.copy(current);
      if (g.material.emissive) g.material.emissive.copy(current);
    });
    bh.light.color.copy(current);
  }

  class Ring {
    particles: any[];
    particleOpacities: number[];
    ringIndex: number;
    speedMultiplier: number;
    mesh: THREE.Points;
    spawnTime: number;
    colorCycleTime: number;

    constructor(count: number, rMin: number, rMax: number, ySpread: number, size: number, speed: number, ringIndex = 0) {
      this.particles = [];
      this.particleOpacities = [];
      this.ringIndex = ringIndex;
      this.speedMultiplier = 1.6 - (ringIndex * 0.3);
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const opacities = new Float32Array(count);
      const warmColors = [0xffffff, 0xfff8e7, 0xffeecc, 0xffe4b5, 0xffd699];
      const ringBaseDelay = ringIndex * 0.8;

      for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2), radius = rand(rMin, rMax);
        const yMult = Math.min(1, (radius - rMin) / (rMax - rMin));
        const y = rand(-ySpread * yMult, ySpread * yMult);
        const spawnDelay = ringBaseDelay + (i * 0.02);

        this.particles.push({
          angle, radius, baseRadius: radius, baseY: y,
          speed: rand(0.8, 1.2) * speed,
          spawnDelay,
          opacity: 0,
          targetOpacity: 1
        });

        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = Math.sin(angle) * radius;

        const warmColor = new THREE.Color(warmColors[i % warmColors.length]);
        colors[i * 3] = warmColor.r;
        colors[i * 3 + 1] = warmColor.g;
        colors[i * 3 + 2] = warmColor.b;
        opacities[i] = 0;
        this.particleOpacities.push(0);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

      const sizes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const isLarge = Math.random() < 0.6;
        sizes[i] = size * (isLarge ? rand(1.2, 2.5) : rand(0.5, 1.2));
      }
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: roundParticleVertexShader,
        fragmentShader: roundParticleFragmentShader,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true
      });
      this.mesh = new THREE.Points(geo, mat);
      this.spawnTime = performance.now();
      this.colorCycleTime = 0;
      scene.add(this.mesh);
    }

    update(speedMult: number, pull: number, elapsedTime?: number) {
      const layeredSpeed = speedMult * this.speedMultiplier;
      const pos = this.mesh.geometry.attributes.position.array;
      const opacityAttr = this.mesh.geometry.attributes.opacity;
      const opacities = opacityAttr ? opacityAttr.array : null;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (elapsedTime !== undefined && p.spawnDelay !== undefined) {
          const timeSinceStart = elapsedTime;
          if (timeSinceStart >= p.spawnDelay) {
            p.opacity = Math.min(p.targetOpacity, p.opacity + 0.05);
          }
          if (opacities) opacities[i] = p.opacity;
        }
        p.angle += p.speed * layeredSpeed;
        p.radius = Math.max(1.5, p.radius - pull);
        pos[i * 3] = Math.cos(p.angle) * p.radius;
        pos[i * 3 + 1] = p.baseY * (p.radius / p.baseRadius);
        pos[i * 3 + 2] = Math.sin(p.angle) * p.radius;
        if (p.radius < 2 && Math.random() < 0.006) { p.radius = p.baseRadius * rand(0.5, 1); p.angle = rand(0, Math.PI * 2); }
      }
      this.mesh.geometry.attributes.position.needsUpdate = true;
      if (opacities) opacityAttr.needsUpdate = true;
    }

    collapseToDisc(t: number) {
      const pos = this.mesh.geometry.attributes.position.array;
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.angle += p.speed * 5;
        p.radius = lerp(p.radius, rand(4, 10), t * 0.05);
        pos[i * 3] = Math.cos(p.angle) * p.radius;
        pos[i * 3 + 1] = lerp(pos[i * 3 + 1], rand(-0.2, 0.2), t * 0.08);
        pos[i * 3 + 2] = Math.sin(p.angle) * p.radius;
      }
      this.mesh.geometry.attributes.position.needsUpdate = true;
    }

    explode(t: number) {
      const pos = this.mesh.geometry.attributes.position.array;
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (!p.explodeSpeed) p.explodeSpeed = rand(1.5, 5);
        pos[i * 3] = Math.cos(p.angle) * p.explodeSpeed * t * 30;
        pos[i * 3 + 1] = p.baseY + rand(-0.2, 0.2) * t * 15;
        pos[i * 3 + 2] = Math.sin(p.angle) * p.explodeSpeed * t * 30;
      }
      this.mesh.geometry.attributes.position.needsUpdate = true;
      (this.mesh.material as any).opacity = Math.max(0, (this.mesh.material as any).opacity - 0.015);
    }

    setColor(c: number) {
      const col = this.mesh.geometry.attributes.color.array;
      const targetColor = new THREE.Color(c);
      for (let i = 0; i < this.particles.length; i++) {
        col[i * 3] = targetColor.r;
        col[i * 3 + 1] = targetColor.g;
        col[i * 3 + 2] = targetColor.b;
      }
      this.mesh.geometry.attributes.color.needsUpdate = true;
    }

    destroy() { scene.remove(this.mesh); }
  }

  function createEmoteSprite(emoji: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d', { alpha: true })!;

    // Explicitly draw transparent background
    ctx.clearRect(0, 0, 128, 128);

    // Draw emoji larger and clearer
    ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(emoji, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.premultiplyAlpha = false;
    tex.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.5, 2.5, 1);
    return sprite;
  }

  let emoteSpawnActive = false;
  let emoteSpawnRate = 220;
  function spawnEmote() {
    if (!emoteSpawnActive || shouldSkip) return;
    const sprite = createEmoteSprite(EMOTES[Math.floor(Math.random() * EMOTES.length)]);
    const angle = rand(0, Math.PI * 2), startDist = 50, startY = rand(-10, 10);
    sprite.position.set(Math.cos(angle) * startDist, startY, Math.sin(angle) * startDist);
    (sprite as any).userData = { angle, startDist, startY, startTime: performance.now(), duration: rand(800, 1100) };
    scene.add(sprite);
    emoteSprites.push(sprite);
    if (emoteSpawnActive && !shouldSkip) setTimeout(spawnEmote, emoteSpawnRate + rand(0, emoteSpawnRate * 0.2));
  }

  function updateEmotes() {
    const toRemove: any[] = [];
    emoteSprites.forEach(sprite => {
      const d = (sprite as any).userData, t = (performance.now() - d.startTime) / d.duration;
      if (t >= 1) { toRemove.push(sprite); state.coreSize = Math.min(1.8, state.coreSize + 0.012); return; }
      const eased = t * t * t;
      sprite.position.set(Math.cos(d.angle) * lerp(d.startDist, 1, eased), lerp(d.startY, 0, eased), Math.sin(d.angle) * lerp(d.startDist, 1, eased));
      sprite.scale.setScalar(2.5 * lerp(1, 0.1, eased));
      (sprite.material as any).opacity = t < 0.85 ? 1 : lerp(1, 0, (t - 0.85) / 0.15);
    });
    toRemove.forEach(s => { scene.remove(s); emoteSprites.splice(emoteSprites.indexOf(s), 1); });
  }

  function createGoldDust() {
    const geo = new THREE.SphereGeometry(0.25, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: rand(0.5, 0.9) });
    const mesh = new THREE.Mesh(geo, mat);
    const angle = rand(0, Math.PI * 2), dist = rand(8, 25);
    mesh.position.set(Math.cos(angle) * dist, rand(-4, 4), Math.sin(angle) * dist);
    (mesh as any).userData = { angle, dist, twinkle: rand(0, Math.PI * 2) };
    scene.add(mesh);
    return mesh;
  }

  function updateGoldDust() {
    const time = performance.now() / 1000;
    goldDust.forEach(g => {
      (g as any).userData.angle += 0.01;
      g.position.x = Math.cos((g as any).userData.angle) * (g as any).userData.dist;
      g.position.z = Math.sin((g as any).userData.angle) * (g as any).userData.dist;
      (g.material as any).opacity = 0.3 + 0.6 * Math.sin(time * 2 + (g as any).userData.twinkle);
    });
  }

  function genCards(n: number, force: string) {
    const cards: any[] = [];
    for (let i = 0; i < n; i++) {
      const r = Math.random() * 100;
      let rarity = r < 3 ? 'legendary' : r < 12 ? 'epic' : r < 34 ? 'rare' : 'common';
      if (force && force !== 'random' && i === n - 1 && !cards.some(c => c.rarity === force)) rarity = force;
      cards.push({ rarity, emote: EMOTES[Math.floor(Math.random() * EMOTES.length)] });
    }
    return cards.sort((a, b) => ['common', 'rare', 'epic', 'legendary'].indexOf(a.rarity) - ['common', 'rare', 'epic', 'legendary'].indexOf(b.rarity));
  }

  function bestRarity(cards: any[]) {
    return cards.reduce((b, c) => ['common', 'rare', 'epic', 'legendary'].indexOf(c.rarity) > ['common', 'rare', 'epic', 'legendary'].indexOf(b) ? c.rarity : b, 'common');
  }

  // ===== NEW CARD REVEAL SYSTEM =====

  // Triangle pyramid (tetrahedron) particle shader
  const pyramidVertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vColor;

    attribute vec3 instanceColor;
    attribute float instanceOpacity;
    attribute float instanceGlow;

    varying float vOpacity;
    varying float vGlow;

    void main() {
      vColor = instanceColor;
      vOpacity = instanceOpacity;
      vGlow = instanceGlow;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const pyramidFragmentShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vColor;
    varying float vOpacity;
    varying float vGlow;

    void main() {
      // Fresnel edge glow for sci-fi effect
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);

      // Softer glowing pyramids - less bright
      vec3 glowColor = vColor * (1.5 + vGlow * 2.0); // Reduced from 3.0 + 4.0
      vec3 finalColor = mix(vColor * 0.8, glowColor, fresnel * 0.6); // Reduced

      // Reduced extra brightness
      finalColor += vColor * vGlow * 1.0; // Reduced from 2.5

      // Softer glow
      float alpha = mix(0.4, 0.8, fresnel) * vOpacity; // Reduced

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  // Shader for connection lines
  const connectionLineVertexShader = `
    attribute float lineOpacity;
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      vColor = color; // Use built-in color from THREE.js vertexColors
      vOpacity = lineOpacity;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const connectionLineFragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      // Very bright glowing lines for prominent triangles
      gl_FragColor = vec4(vColor * 3.5, vOpacity);
    }
  `;

  class GlitterSystem {
    particles: any[];
    instancedMesh: THREE.InstancedMesh;
    connectionLines: THREE.LineSegments | null = null;
    maxInstances: number = 5000; // Can handle many particles
    maxConnections: number = 200; // Very minimal connections
    connectionDistance: number = 25; // Short distance for sparse connections

    constructor() {
      this.particles = [];

      // Create tetrahedron geometry (triangle pyramid) - small for dense network
      const pyramidGeo = new THREE.TetrahedronGeometry(0.5, 0);

      // Shader material for glowing pyramids
      const mat = new THREE.ShaderMaterial({
        vertexShader: pyramidVertexShader,
        fragmentShader: pyramidFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      this.instancedMesh = new THREE.InstancedMesh(pyramidGeo, mat, this.maxInstances);
      this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(this.instancedMesh);

      // Initialize instance attributes
      const instanceColors = new Float32Array(this.maxInstances * 3);
      const instanceOpacities = new Float32Array(this.maxInstances);
      const instanceGlows = new Float32Array(this.maxInstances);

      pyramidGeo.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(instanceColors, 3));
      pyramidGeo.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(instanceOpacities, 1));
      pyramidGeo.setAttribute('instanceGlow', new THREE.InstancedBufferAttribute(instanceGlows, 1));

      // Create line geometry for connections
      const lineGeo = new THREE.BufferGeometry();
      const linePositions = new Float32Array(this.maxConnections * 6); // 2 vertices per line, 3 coords each
      const lineColors = new Float32Array(this.maxConnections * 6); // 2 vertices per line, 3 colors each
      const lineOpacities = new Float32Array(this.maxConnections * 2); // 2 vertices per line

      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
      lineGeo.setAttribute('lineOpacity', new THREE.BufferAttribute(lineOpacities, 1));

      const lineMat = new THREE.ShaderMaterial({
        vertexShader: connectionLineVertexShader,
        fragmentShader: connectionLineFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true
      });

      this.connectionLines = new THREE.LineSegments(lineGeo, lineMat);
      scene.add(this.connectionLines);
    }

    emit(position: THREE.Vector3, rarity: string, count = 350) {
      const baseColor = new THREE.Color();
      const colorHex = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS];
      baseColor.set(colorHex);

      // Card dimensions (accounting for 1.2 scale)
      const cardWidth = 24 * 1.2;  // 28.8
      const cardHeight = 32 * 1.2; // 38.4

      // Emit from card surface edges and create particle field with wave patterns
      for (let i = 0; i < count; i++) {
        const color = baseColor.clone();

        // Spawn from card edges and move outward
        const spawnEdge = Math.random();
        let startX, startY, startZ, dirX, dirY, dirZ;

        if (spawnEdge < 0.25) {
          // Top edge - particles move upward and outward
          startX = rand(-cardWidth / 2, cardWidth / 2);
          startY = cardHeight / 2;
          startZ = rand(-2, 2);
          dirX = rand(-0.4, 0.4);
          dirY = rand(0.8, 1.5); // Mostly upward
          dirZ = rand(-0.3, 0.3);
        } else if (spawnEdge < 0.5) {
          // Bottom edge - particles move downward and outward
          startX = rand(-cardWidth / 2, cardWidth / 2);
          startY = -cardHeight / 2;
          startZ = rand(-2, 2);
          dirX = rand(-0.4, 0.4);
          dirY = rand(-1.5, -0.8); // Mostly downward
          dirZ = rand(-0.3, 0.3);
        } else if (spawnEdge < 0.75) {
          // Left edge - particles move left and outward
          startX = -cardWidth / 2;
          startY = rand(-cardHeight / 2, cardHeight / 2);
          startZ = rand(-2, 2);
          dirX = rand(-1.5, -0.8); // Mostly left
          dirY = rand(-0.4, 0.4);
          dirZ = rand(-0.3, 0.3);
        } else {
          // Right edge - particles move right and outward
          startX = cardWidth / 2;
          startY = rand(-cardHeight / 2, cardHeight / 2);
          startZ = rand(-2, 2);
          dirX = rand(0.8, 1.5); // Mostly right
          dirY = rand(-0.4, 0.4);
          dirZ = rand(-0.3, 0.3);
        }

        // Some randomness - occasionally particles drift toward card
        if (Math.random() < 0.15) {
          dirX *= -0.3;
          dirY *= -0.3;
        }

        const speed = rand(0.05, 0.15); // Much slower movement
        const size = rand(6, 12); // Smaller particles for dense network
        const decay = rand(0.0004, 0.0015); // Much longer lifetime

        // Add random variance to direction for more chaotic movement
        const randomVariance = rand(0.7, 1.3); // ±30% randomness
        const randomAngle = rand(-0.5, 0.5); // Random angular deviation

        // Brighter colors for glow effect - but keep rarity color visible
        color.lerp(new THREE.Color(0xffffff), 0.2); // Less white mixing

        this.particles.push({
          x: position.x + startX,
          y: position.y + startY,
          z: position.z + startZ,
          vx: (dirX + randomAngle) * speed * randomVariance,
          vy: (dirY + randomAngle * 0.5) * speed * randomVariance,
          vz: (dirZ + randomAngle) * speed * randomVariance,
          gravity: rand(-0.003, 0.007),
          spinX: rand(-0.02, 0.02), // Much slower rotation
          spinY: rand(-0.02, 0.02),
          spinZ: rand(-0.02, 0.02),
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          life: 1.0,
          decay: decay,
          size: size,
          color: color
        });
      }
    }

    update() {
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const rotation = new THREE.Euler();
      const scale = new THREE.Vector3();
      const geo = this.instancedMesh.geometry;
      const colorAttr = geo.getAttribute('instanceColor') as THREE.InstancedBufferAttribute;
      const opacityAttr = geo.getAttribute('instanceOpacity') as THREE.InstancedBufferAttribute;
      const glowAttr = geo.getAttribute('instanceGlow') as THREE.InstancedBufferAttribute;

      let instanceIndex = 0;

      // Update particle physics and positions
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= p.decay;

        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        // Apply velocity
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Physics: gravity + strong air resistance for slow drift
        p.vy -= p.gravity;
        p.vx *= 0.96; // Much stronger drag
        p.vy *= 0.96;
        p.vz *= 0.96;

        // Update rotation
        p.rotationX += p.spinX;
        p.rotationY += p.spinY;
        p.rotationZ += p.spinZ;
      }

      // Render particles and build connection network
      for (let i = 0; i < this.particles.length && instanceIndex < this.maxInstances; i++) {
        const p = this.particles[i];

        // Pulsing glow effect
        const time = performance.now() * 0.001;
        const glowPulse = 0.5 + Math.sin(time * 2 + i * 0.5) * 0.5;

        // Set position
        position.set(p.x, p.y, p.z);

        // 3D rotation for pyramids
        rotation.set(p.rotationX, p.rotationY, p.rotationZ);

        // Size based on life - smaller for dense network
        const finalSize = p.size * 0.08 * Math.pow(p.life, 0.6);
        scale.set(finalSize, finalSize, finalSize);

        // Set instance matrix
        matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
        this.instancedMesh.setMatrixAt(instanceIndex, matrix);

        // Set instance attributes
        colorAttr.setXYZ(instanceIndex, p.color.r, p.color.g, p.color.b);
        opacityAttr.setX(instanceIndex, Math.pow(p.life, 0.7));
        glowAttr.setX(instanceIndex, glowPulse);

        instanceIndex++;
      }

      // Hide unused instances
      for (let i = instanceIndex; i < this.maxInstances; i++) {
        scale.set(0, 0, 0);
        matrix.makeScale(0, 0, 0);
        this.instancedMesh.setMatrixAt(i, matrix);
      }

      this.instancedMesh.count = Math.min(instanceIndex, this.maxInstances);
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      colorAttr.needsUpdate = true;
      opacityAttr.needsUpdate = true;
      glowAttr.needsUpdate = true;

      // Update connection lines between nearby particles
      if (this.connectionLines) {
        const lineGeo = this.connectionLines.geometry;
        const posAttr = lineGeo.getAttribute('position') as THREE.BufferAttribute;
        const colorLineAttr = lineGeo.getAttribute('color') as THREE.BufferAttribute;
        const opacityLineAttr = lineGeo.getAttribute('lineOpacity') as THREE.BufferAttribute;

        let lineIndex = 0;

        // Find connections between nearby particles
        for (let i = 0; i < this.particles.length && lineIndex < this.maxConnections; i++) {
          const p1 = this.particles[i];

          for (let j = i + 1; j < this.particles.length && lineIndex < this.maxConnections; j++) {
            const p2 = this.particles[j];

            // Calculate distance
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Skip connections in the center area - keep lines on edges only
            const centerX = 0;
            const centerZone = 25; // Avoid connections within ±25 units of center
            const p1InCenter = Math.abs(p1.x - centerX) < centerZone;
            const p2InCenter = Math.abs(p2.x - centerX) < centerZone;

            // Only connect if within distance AND at least one particle is outside center
            if (dist < this.connectionDistance && !(p1InCenter && p2InCenter)) {
              // Line start point
              posAttr.setXYZ(lineIndex * 2, p1.x, p1.y, p1.z);
              // Line end point
              posAttr.setXYZ(lineIndex * 2 + 1, p2.x, p2.y, p2.z);

              // Average color of connected particles
              const avgR = (p1.color.r + p2.color.r) * 0.5;
              const avgG = (p1.color.g + p2.color.g) * 0.5;
              const avgB = (p1.color.b + p2.color.b) * 0.5;

              colorLineAttr.setXYZ(lineIndex * 2, avgR, avgG, avgB);
              colorLineAttr.setXYZ(lineIndex * 2 + 1, avgR, avgG, avgB);

              // Maximum opacity for very visible triangular connections
              const distFactor = 1.0 - (dist / this.connectionDistance);
              const lifeFactor = Math.min(p1.life, p2.life);
              const lineOpacity = Math.pow(distFactor, 0.5) * lifeFactor; // Full brightness, square root for better falloff

              opacityLineAttr.setX(lineIndex * 2, lineOpacity);
              opacityLineAttr.setX(lineIndex * 2 + 1, lineOpacity);

              lineIndex++;
            }
          }
        }

        // Hide unused lines
        for (let i = lineIndex * 2; i < this.maxConnections * 2; i++) {
          posAttr.setXYZ(i, 0, 0, 0);
          opacityLineAttr.setX(i, 0);
        }

        lineGeo.setDrawRange(0, lineIndex * 2);
        posAttr.needsUpdate = true;
        colorLineAttr.needsUpdate = true;
        opacityLineAttr.needsUpdate = true;
      }
    }
  }

  function createCardTexture(rarity: string, emote: string, title?: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    // Clean, professional color scheme matching your design
    const colors: any = {
      common: {
        border: '#10b981',
        borderGlow: 'rgba(16, 185, 129, 0.8)',
        innerBg: '#ecfdf5'
      },
      rare: {
        border: '#3b82f6',
        borderGlow: 'rgba(59, 130, 246, 0.8)',
        innerBg: '#eff6ff'
      },
      epic: {
        border: '#a855f7',
        borderGlow: 'rgba(168, 85, 247, 0.8)',
        innerBg: '#faf5ff'
      },
      legendary: {
        border: '#f59e0b',
        borderGlow: 'rgba(245, 158, 11, 1.0)',
        innerBg: '#fefce8'
      }
    };

    const c = colors[rarity] || colors.common;

    // Outer colored border with glow
    ctx.fillStyle = c.border;
    ctx.shadowColor = c.borderGlow;
    ctx.shadowBlur = 25;
    roundRect(ctx, 0, 0, 512, 720, 40);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Clean white/cream inner background
    ctx.fillStyle = c.innerBg;
    roundRect(ctx, 20, 20, 472, 680, 30);
    ctx.fill();

    // Header section with title
    if (title) {
      ctx.fillStyle = c.border;
      roundRect(ctx, 40, 40, 432, 60, 15);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Fredoka", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title || 'Card', 256, 70);
    }

    // Main image area with emote
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 3;
    roundRect(ctx, 60, title ? 120 : 60, 392, 340, 20);
    ctx.fill();
    ctx.stroke();

    // Draw emote in image area
    ctx.font = '200px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1f2937';
    ctx.fillText(emote, 256, title ? 290 : 230);

    // Three skill boxes at bottom
    const skillY = title ? 480 : 420;
    const skillBoxes = [
      { x: 60, label: 'Skill 1' },
      { x: 190, label: 'Skill 2' },
      { x: 320, label: 'Ultimate' }
    ];

    skillBoxes.forEach(box => {
      // Skill box background
      ctx.fillStyle = '#f3f4f6';
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 2;
      roundRect(ctx, box.x, skillY, 112, 140, 12);
      ctx.fill();
      ctx.stroke();

      // Skill label
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 16px "Fredoka", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(box.label, box.x + 56, skillY + 20);
    });

    // Rarity indicator at bottom
    ctx.fillStyle = c.border;
    ctx.font = 'bold 20px "Fredoka", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rarity.toUpperCase(), 256, 660);

    // Create texture
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
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

  class Card3D {
    data: any;
    mesh: THREE.Mesh;
    tex: THREE.CanvasTexture;
    targetPos: THREE.Vector3;
    targetRot: THREE.Euler;
    velocity: THREE.Vector3;
    angularVel: THREE.Vector3;
    wobbleOffset: number;
    spawnTime: number;
    floatOffset: number;
    isLegendary: boolean;
    followMouse: boolean;
    slideDirection: number;

    constructor(data: any) {
      this.data = data;
      this.isLegendary = data.rarity === 'legendary';
      this.followMouse = false;
      this.slideDirection = 1; // Will be set during entrance animation

      const geo = new THREE.BoxGeometry(24, 32, 0.3); // BIGGER cards for Michael Bay effect
      this.tex = createCardTexture(data.rarity, data.emote, data.title);

      const edgeColor = RARITY_COLORS[data.rarity as keyof typeof RARITY_COLORS];

      const faceMat = new THREE.MeshStandardMaterial({
        map: this.tex,
        emissive: new THREE.Color(0x000000), // No emissive - preserve card texture
        emissiveIntensity: 0.0,
        roughness: 0.2, // Slightly glossy
        metalness: 0.3, // Subtle metallic sheen
        transparent: false
      });

      const edgeMat = new THREE.MeshStandardMaterial({
        color: edgeColor,
        emissive: new THREE.Color(edgeColor),
        emissiveIntensity: 1.2, // Bright glowing edges
        roughness: 0.2,
        metalness: 0.9 // Very metallic for chromatic reflection
      });

      this.mesh = new THREE.Mesh(geo, [edgeMat, edgeMat, edgeMat, edgeMat, faceMat, faceMat]);
      (this.mesh as any).userData = { card: this };

      // Add rainbow diffraction glow overlay
      const diffractionGeo = new THREE.PlaneGeometry(24, 32);
      const diffractionMat = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          intensity: { value: 0 },
          color: { value: new THREE.Color(edgeColor) }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform float intensity;
          uniform vec3 color;
          varying vec2 vUv;

          float wave(in vec2 uv, float d, float offset) {
            return 1.0 - smoothstep(0.0, d, distance(uv.x, 0.5 + sin(offset + uv.y * 3.0) * 0.3));
          }

          vec4 diffraction(vec2 uv, float offset) {
            float d = 0.05 + abs(sin(offset * 0.2)) * 0.25 * distance(uv.y + 0.5, 0.0);
            return vec4(wave(uv + vec2(d * 0.25, 0.0), d, offset), 0.0, 0.0, 1.0) +
                   vec4(0.0, wave(uv - vec2(0.015, 0.005), d, offset), 0.0, 1.0) +
                   vec4(0.0, 0.0, wave(uv - vec2(d * 0.5, 0.015), d, offset), 1.0);
          }

          void main() {
            vec4 rainbow = diffraction(vUv, time) * 0.5 +
                          diffraction(vUv, time * 2.0) * 0.5 +
                          diffraction(vUv + vec2(0.3, 0.0), time * 3.3) * 0.5;

            // Tint with rarity color and apply intensity
            rainbow.rgb = mix(rainbow.rgb, color, 0.3);
            rainbow.a = rainbow.r * 0.3 + rainbow.g * 0.6 + rainbow.b * 0.1; // Luminance
            rainbow.a *= intensity;

            gl_FragColor = rainbow;
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const diffraction = new THREE.Mesh(diffractionGeo, diffractionMat);
      diffraction.position.z = 0.2; // In front of card
      this.mesh.add(diffraction);
      (this.mesh as any).userData.diffraction = diffraction;

      // No separate halo - use bloom post-processing on the card itself for natural glow
      // The card will glow via the bloom pass, not a separate plane behind it

      // Create shared background torus once if it doesn't exist
      if (!backgroundTorus) {
        const torusGeo = new THREE.TorusGeometry(120, 18, 32, 128); // Massive dramatic portal
        const colorValue = new THREE.Color(edgeColor).multiplyScalar(3.0);
        const torusMat = new THREE.ShaderMaterial({
          uniforms: {
            glowColor: { value: colorValue },
            glowIntensity: { value: 2.5 },
            time: { value: 0.0 },
            cameraPosition: { value: new THREE.Vector3() },
            majorRadius: { value: 120.0 },
            tubeRadius: { value: 18.0 },
            opacity: { value: 0.8 }
          },
          vertexShader: torusVertexShader,
          fragmentShader: torusFragmentShader,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        backgroundTorus = new THREE.Mesh(torusGeo, torusMat);
        backgroundTorus.position.set(0, 0, -120); // Centered behind card, further back
        backgroundTorus.rotation.set(0, 0, 0); // Parallel to camera
        scene.add(backgroundTorus);

        // Dramatic cosmic nebula clouds
        const cloudGeo = new THREE.PlaneGeometry(400, 250);
        const cloudMat = new THREE.ShaderMaterial({
          uniforms: {
            color: { value: new THREE.Color(edgeColor) },
            opacity: { value: 0.7 }, // More visible cosmic clouds
            time: { value: 0.0 }
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 color;
            uniform float opacity;
            uniform float time;
            varying vec2 vUv;

            // Better noise function for nebula
            float noise(vec2 p) {
              return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }

            float fbm(vec2 p) {
              float value = 0.0;
              float amplitude = 0.5;
              for(int i = 0; i < 4; i++) {
                value += amplitude * noise(p);
                p *= 2.0;
                amplitude *= 0.5;
              }
              return value;
            }

            void main() {
              // Slow animated movement
              vec2 animUv = vUv + vec2(time * 0.02, time * 0.01);

              // Gradient from bottom (opaque) to top (transparent)
              float gradient = 1.0 - vUv.y;
              gradient = pow(gradient, 2.0); // Sharper falloff for more definition

              // Multi-layered noise for nebula depth
              float noise1 = fbm(animUv * 3.0);
              float noise2 = fbm(animUv * 5.0 + vec2(time * 0.03, 0.0));
              float combined = mix(noise1, noise2, 0.5);
              gradient *= 0.6 + combined * 0.8;

              // Dramatic cosmic nebula colors - orange, purple, pink, blue
              vec3 orange = vec3(1.0, 0.5, 0.2);
              vec3 purple = vec3(0.6, 0.2, 0.9);
              vec3 pink = vec3(0.9, 0.3, 0.7);
              vec3 blue = vec3(0.3, 0.5, 1.0);

              // Mix colors based on position and noise for cosmic look
              vec3 cloudColor = mix(orange, purple, combined);
              cloudColor = mix(cloudColor, pink, noise1 * 0.6);
              cloudColor = mix(cloudColor, blue, vUv.x * 0.3);
              cloudColor = mix(cloudColor, color * 1.2, 0.3); // Blend with rarity color

              gl_FragColor = vec4(cloudColor * 1.5, gradient * opacity); // Bright cosmic glow
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending, // Additive for dramatic glow
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const clouds = new THREE.Mesh(cloudGeo, cloudMat);
        clouds.position.set(0, -80, -120); // Behind and below torus for cosmic depth
        scene.add(clouds);
        (backgroundTorus as any).userData.clouds = clouds;

        // Add atmospheric glow layer behind torus for depth
        const glowGeo = new THREE.CircleGeometry(150, 64);
        const glowMat = new THREE.ShaderMaterial({
          uniforms: {
            color: { value: new THREE.Color(edgeColor) },
            opacity: { value: 0.3 }
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 color;
            uniform float opacity;
            varying vec2 vUv;
            void main() {
              // Radial gradient from center
              vec2 center = vec2(0.5, 0.5);
              float dist = distance(vUv, center);
              float gradient = 1.0 - smoothstep(0.0, 0.6, dist);
              gradient = pow(gradient, 2.0);

              // Soft atmospheric glow
              vec3 atmosphereColor = color * 1.2;
              gl_FragColor = vec4(atmosphereColor, gradient * opacity);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const atmosphericGlow = new THREE.Mesh(glowGeo, glowMat);
        atmosphericGlow.position.set(0, 0, -125); // Behind torus
        scene.add(atmosphericGlow);
        (backgroundTorus as any).userData.atmosphericGlow = atmosphericGlow;
      }
      // Store reference to shared torus
      (this.mesh as any).userData.torus = backgroundTorus;

      // Add shine plane for legendary
      if (this.isLegendary) {
        const shineGeo = new THREE.PlaneGeometry(24, 32);
        const shineMat = new THREE.MeshBasicMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        });
        const shine = new THREE.Mesh(shineGeo, shineMat);
        shine.position.z = 0.15;
        this.mesh.add(shine);
        (this.mesh as any).userData.shine = shine;
      }

      this.targetPos = new THREE.Vector3();
      this.targetRot = new THREE.Euler();
      this.velocity = new THREE.Vector3();
      this.angularVel = new THREE.Vector3();
      this.wobbleOffset = Math.random() * 100;
      this.spawnTime = performance.now();
      this.floatOffset = Math.random() * Math.PI * 2;
    }

    update(time: number) {
      const age = (performance.now() - this.spawnTime) / 1000;

      // If this is the current reveal card and reveal is finished, follow mouse
      if (currentRevealCard === this && this.followMouse) {
        // Lock position firmly at center - NO JELLO BOUNCE
        this.mesh.position.set(0, 0, 0);

        // Convert mouse position to rotation
        // Mouse at center = no rotation, edges = max rotation
        const maxRotX = 0.3; // radians
        const maxRotY = 0.4;

        const targetRotX = -mouseY * maxRotX; // Negative for intuitive tilt
        const targetRotY = mouseX * maxRotY;

        // Direct rotation - NO LERP to prevent jello oscillation
        this.mesh.rotation.x = targetRotX;
        this.mesh.rotation.y = targetRotY;
        this.mesh.rotation.z = 0;
      } else {
        // In carousel/grid view - keep cards COMPLETELY STATIC
        // NO floating, NO rotation lerp, NO jello bounce
        if (!this.followMouse) {
          // Carousel mode - cards should be firm and static
          this.mesh.position.copy(this.targetPos); // Direct copy, no lerp
          this.mesh.rotation.set(0, 0, 0); // Locked facing camera

          // Dim the edge glow during carousel for better readability
          const edgeMats = this.mesh.material as THREE.Material[];
          for (let i = 0; i < 4; i++) {
            const mat = edgeMats[i] as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 0.3; // Much dimmer edges (was 1.2)
          }
        } else {
          // Grid view with gentle float (when followMouse is explicitly enabled)
          this.mesh.position.lerp(this.targetPos, 0.08);
          // Very subtle floating
          const floatY = Math.sin(time * 1.5 + this.floatOffset) * 0.15;
          const floatX = Math.cos(time * 1.1 + this.floatOffset) * 0.1;
          this.mesh.position.y += floatY * 0.02; // Reduced from 0.05
          this.mesh.position.x += floatX * 0.02;

          // Direct rotation to avoid oscillation
          this.mesh.rotation.x = this.targetRot.x;
          this.mesh.rotation.y = this.targetRot.y;
          this.mesh.rotation.z = this.targetRot.z;
        }
      }

      // Legendary effects - DISABLED in carousel mode
      if (this.isLegendary && this.followMouse) {
        // Pulsing glow only during individual reveal
        const pulse = 0.2 + Math.sin(time * 2) * 0.15;
        (this.mesh.material as any)[4].emissiveIntensity = pulse;
        (this.mesh.material as any)[5].emissiveIntensity = pulse;

        // Animated shine sweep
        const shine = (this.mesh as any).userData.shine;
        if (shine) {
          // Sine wave shine that sweeps across
          const shinePhase = (time * 0.5) % 2;
          let shineIntensity = 0;

          if (shinePhase < 0.3) {
            // Quick flash
            shineIntensity = Math.sin(shinePhase / 0.3 * Math.PI) * 0.4;
          }

          shine.material.opacity = shineIntensity;
          shine.rotation.z = time * 0.2;
        }
      }

      // Update background torus and clouds color to match this card's rarity (only during reveal)
      if (currentRevealCard === this && this.followMouse) {
        const torus = (this.mesh as any).userData.torus;
        if (torus?.material) {
          // Dramatic torus portal
          const rarityColor = RARITY_COLORS[this.card.rarity as keyof typeof RARITY_COLORS];
          const colorValue = new THREE.Color(rarityColor).multiplyScalar(3.0); // Bright dramatic glow
          torus.material.color.copy(colorValue);
          torus.material.opacity = 0.8; // Very visible

          // Cosmic nebula clouds
          const clouds = torus.userData.clouds;
          if (clouds?.material?.uniforms) {
            clouds.material.uniforms.color.value.copy(new THREE.Color(rarityColor));
            clouds.material.uniforms.opacity.value = 0.7; // Dramatic clouds
          }

          // Atmospheric glow behind portal
          const atmosphericGlow = torus.userData.atmosphericGlow;
          if (atmosphericGlow?.material?.uniforms) {
            atmosphericGlow.material.uniforms.color.value.copy(new THREE.Color(rarityColor));
            atmosphericGlow.material.uniforms.opacity.value = 0.3;
          }
        }
      }
    }
  }

  // Wait for click to dismiss card OR skip button press
  function waitForCardClick(): Promise<void> {
    return new Promise(resolve => {
      let resolved = false;

      const handleClick = () => {
        if (resolved) return;
        resolved = true;
        removeListeners();
        resolve();
      };

      // Check for skip button periodically
      const skipCheck = setInterval(() => {
        if (shouldSkip && !resolved) {
          resolved = true;
          removeListeners();
          resolve();
        }
      }, 50);

      const removeListeners = () => {
        clearInterval(skipCheck);
        containerEl?.removeEventListener('click', handleClick);
      };

      containerEl?.addEventListener('click', handleClick);
    });
  }

  async function showCards(cards: any[]) {
    if (!glitterSystem) glitterSystem = new GlitterSystem();

    cardObjects.forEach(c => {
      scene.remove(c.mesh);
      if (c.tex) c.tex.dispose();
    });
    cardObjects = [];

    // Hide nebula completely during card reveal to prevent glow-through
    if (nebulaPoints) {
      scene.remove(nebulaPoints);
      nebulaPoints = null;
    }

    // Make sure all leftover objects are cleaned up
    if (coreGroup) {
      scene.remove(coreGroup);
      coreGroup = null;
    }
    if (blackHole) {
      scene.remove(blackHole);
      blackHole = null;
    }
    if (legendaryHint) {
      scene.remove(legendaryHint);
      legendaryHint = null;
    }

    // Camera setup for reveal - FULLY reset camera to face cards straight on
    state.camY = 0;
    state.targetCamY = 0;
    state.camDist = 70;
    state.targetCamDist = 70;
    state.camAngle = 0;
    state.targetCamAngle = 0;
    camera.position.set(0, 0, 70);
    camera.rotation.set(0, 0, 0); // CRITICAL: Reset rotation from orbit
    camera.lookAt(0, 0, 0);

    // Reduce bloom significantly for card reveals so texture is visible
    bloomPass.strength = 0.2;

    // Add spotlight for card illumination
    if (!cardSpotlight) {
      cardSpotlight = new THREE.PointLight(0xffffff, 3, 100);
      scene.add(cardSpotlight);
    }
    cardSpotlight.position.set(0, 0, 20);

    const revealedCards: Card3D[] = [];

    // If skip pressed, create all cards quickly without individual reveals
    if (shouldSkip) {
      // Create all Card3D objects without animations for carousel
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const card3D = new Card3D(card);
        revealedCards.push(card3D);
        // Don't add to scene yet - carousel will handle it
      }
      // Reset bloom and effects
      bloomPass.strength = 0.4;
      if (dofPass?.uniforms) {
        dofPass.uniforms.blurAmount.value = 0;
        dofPass.uniforms.aberrationStrength.value = 0;
      }
      if (lensFlarePass?.uniforms?.brightness) {
        lensFlarePass.uniforms.brightness!.value = 0;
      }
      if (godRaysPass?.uniforms?.intensity) {
        godRaysPass.uniforms.intensity!.value = 0;
      }
      // Skip directly to carousel
      await showGridView(revealedCards);
      bloomPass.strength = 0.4;
      pullBtnDisabled = false;
      return;
    }

    // Reveal cards one at a time in center (normal flow, not skipped)
    for (let i = 0; i < cards.length; i++) {
      if (shouldSkip) {
        // Skip pressed during reveals - create remaining cards and jump to carousel
        for (let j = i; j < cards.length; j++) {
          const card = cards[j];
          const card3D = new Card3D(card);
          revealedCards.push(card3D);
        }
        break;
      }

      const card = cards[i];
      const isLegendary = card.rarity === 'legendary';

      // Create card
      const card3D = new Card3D(card);
      scene.add(card3D.mesh);
      currentRevealCard = card3D;
      card3D.followMouse = true; // Enable mouse tracking from start

      // ==========================================
      // MICHAEL BAY TITLE CARD SLIDE-IN
      // ==========================================

      const isEpic = card.rarity === 'epic';
      const isRare = card.rarity === 'rare';

      // All cards slide from LEFT to RIGHT
      const direction = -1;
      card3D.slideDirection = direction;

      // Start WAY off screen on the left
      card3D.mesh.position.set(direction * 120, 0, 0);
      card3D.mesh.scale.setScalar(1.2); // Scaled for visibility without cutoff
      card3D.mesh.rotation.set(0, 0.3, 0); // Start with slight Y rotation

      // Subtle bloom on card - portal is the star
      bloomPass.strength = isLegendary ? 0.4 : 0.3;
      state.shakeAmount = isLegendary ? 2.0 : 0.8;

      // DOF effect - consistent for all non-legendary
      const initialBlur = isLegendary ? 2.2 : 1.4;
      if (dofPass?.uniforms) {
        dofPass.uniforms.focusDistance.value = 0.5;
        dofPass.uniforms.blurAmount.value = initialBlur;
        // Chromatic aberration - consistent except legendary
        dofPass.uniforms.aberrationStrength.value = isLegendary ? 0.035 : 0.018;
      }

      // Minimal particle burst - just enough for visual effect
      glitterSystem.emit(new THREE.Vector3(0, 0, 0), card.rarity, isLegendary ? 30 : 20);

      // Create Tron-style light trail
      const rarityColor = RARITY_COLORS[card.rarity as keyof typeof RARITY_COLORS];
      const tronTrail = createTronTrail(rarityColor, scene);

      // FAST slide-in with Tron trail (no particles, just clean light ribbon)
      const slideSteps = 25;
      for (let j = 0; j < slideSteps; j++) {
        await sleep(0.015); // Fast timing
        const t = j / slideSteps;
        const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic for hard stop

        // Slide from off-screen to center
        const x = lerp(direction * 120, 0, eased);
        card3D.mesh.position.set(x, 0, 0);

        // Rotate to face camera during slide-in
        const rotY = lerp(0.3, 0, eased);
        card3D.mesh.rotation.y = rotY;

        // Animate rainbow diffraction glow during slide-in
        const diffraction = (card3D.mesh as any).userData.diffraction;
        if (diffraction?.material) {
          diffraction.material.uniforms.time.value = performance.now() * 0.003;
          // Peak intensity at 70% of slide, then fade out for impact
          const diffractionCurve = t < 0.7 ? t / 0.7 : 1.0 - ((t - 0.7) / 0.3);
          diffraction.material.uniforms.intensity.value = diffractionCurve * 1.2; // Stronger iridescence
        }

        // Bloom will handle the card glow naturally - no separate halo needed

        // Apply mouse tracking during reveal for interactivity
        if (mouseX !== undefined && mouseY !== undefined) {
          const rotX = -mouseY * 0.15; // Subtle tilt based on mouse Y
          const rotZ = mouseX * 0.1; // Slight roll based on mouse X
          card3D.mesh.rotation.x = rotX;
          card3D.mesh.rotation.z = rotZ;
        }

        // Update Tron trail
        tronTrail.update(card3D.mesh.position);

        // Increase shake as it approaches center (building tension)
        const approachShake = isLegendary ? 2.5 : isEpic ? 1.8 : isRare ? 1.2 : 0.8;
        state.shakeAmount = lerp(approachShake * 0.5, approachShake, t);

        // Animate DOF during slide-in (blur decreases as card comes to focus)
        if (dofPass?.uniforms) {
          dofPass.uniforms.blurAmount.value = lerp(initialBlur, 0.3, t);
        }

        // Animate lens flare during slide-in - position at card edges
        if (lensFlarePass?.uniforms?.lensPosition && lensFlarePass?.uniforms?.brightness) {
          // Project card edge to screen space (right edge for left-to-right motion)
          const cardEdgePos = card3D.mesh.position.clone();
          cardEdgePos.x += 12; // Half card width (24/2) - right edge
          const edgeScreenPos = cardEdgePos.project(camera);
          lensFlarePass.uniforms.lensPosition.value.set(
            (edgeScreenPos.x + 1) / 2,
            (edgeScreenPos.y + 1) / 2
          );

          // Fade in then OUT for readability - lens flare behind card, not on it
          const flareIntensity = isLegendary ? 3.5 : isEpic ? 2.5 : isRare ? 1.8 : 1.2;
          // Peak at 50% journey, then fade out for card readability
          const flareCurve = t < 0.5 ? t * 2.0 : (1.0 - t) * 2.0;
          lensFlarePass.uniforms.brightness.value = lerp(0, flareIntensity, flareCurve * flareCurve);
          if (lensFlarePass.uniforms.streakIntensity) {
            lensFlarePass.uniforms.streakIntensity.value = isLegendary ? 2.5 : 1.5;
          }
        }

        // Add subtle god rays trailing the card edge (only during motion)
        if (godRaysPass?.uniforms?.rayOrigin && godRaysPass?.uniforms?.intensity) {
          // Calculate edge position for god rays
          const cardEdgePos = card3D.mesh.position.clone();
          cardEdgePos.x += 12; // Right edge
          const edgeScreenPos = cardEdgePos.project(camera);
          godRaysPass.uniforms.rayOrigin!.value.set(
            (edgeScreenPos.x + 1) / 2,
            (edgeScreenPos.y + 1) / 2
          );
          // Fade in then out - peaks early, fades before card stops
          const raysIntensity = isLegendary ? 0.15 : isEpic ? 0.12 : isRare ? 0.08 : 0.05;
          const raysCurve = t < 0.4 ? t * 2.5 : (1.0 - t) * 1.67;
          godRaysPass.uniforms.intensity!.value = lerp(0, raysIntensity, raysCurve);
        }
      }

      // HARD STOP - IMPACT EXPLOSION
      card3D.mesh.position.set(0, 0, 0);
      card3D.mesh.rotation.set(0, 0, 0); // Face camera perfectly

      // Disable lens flare at impact - card readability is priority
      if (lensFlarePass?.uniforms?.brightness) {
        lensFlarePass.uniforms.brightness!.value = 0.0;
      }

      // Disable god rays at impact - they obscure the card
      if (godRaysPass?.uniforms?.intensity) {
        godRaysPass.uniforms.intensity!.value = 0.0;
      }

      // Disable rainbow diffraction at impact - card readability is priority
      const diffraction = (card3D.mesh as any).userData.diffraction;
      if (diffraction?.material) {
        diffraction.material.uniforms.intensity.value = 0.0;
      }

      // Quick impact shimmy (< 0.1s) then lock
      const shimmySteps = 3;
      for (let j = 0; j < shimmySteps; j++) {
        await sleep(0.025); // 0.075s total
        const shimmyT = j / shimmySteps;
        const shimmyIntensity = (1.0 - shimmyT) * 0.08; // Decay
        const shimmyAngle = Math.sin(shimmyT * Math.PI * 4) * shimmyIntensity;
        card3D.mesh.rotation.z = shimmyAngle;
      }
      card3D.mesh.rotation.set(0, 0, 0); // Lock firmly

      // Minimal particle flow from card - subtle effect
      const impactWaves = isLegendary ? 2 : 1;
      const particlesPerWave = isLegendary ? 10 : 5;

      // Emit in waves from the card itself, not from random points
      for (let wave = 0; wave < impactWaves; wave++) {
        setTimeout(() => {
          const cardPos = new THREE.Vector3(0, 0, 0);
          glitterSystem.emit(cardPos, card.rarity, particlesPerWave);
        }, wave * 150); // Stagger waves
      }

      // Legendary gets subtle accent particles only
      if (isLegendary) {
        setTimeout(() => {
          const cardPos = new THREE.Vector3(0, 0, 0);
          glitterSystem.emit(cardPos, 'legendary', 15);
        }, 300);
      }

      // Fade out and destroy trail
      for (let j = 0; j < 10; j++) {
        await sleep(0.02);
        if (tronTrail.mesh.material instanceof THREE.ShaderMaterial) {
          tronTrail.mesh.material.uniforms.opacity.value = 1.0 - (j / 10);
        }
      }
      tronTrail.destroy();

      // Card is now centered and will follow mouse
      card3D.followMouse = true;
      card3D.targetPos.set(0, 0, 0);

      // Wait for click to dismiss
      await waitForCardClick();

      // MICHAEL BAY EXIT - Slide out to the RIGHT
      currentRevealCard = null;
      const exitSteps = 15;
      const peakFlareIntensity = isLegendary ? 2.5 : isEpic ? 1.8 : isRare ? 1.2 : 0.8;
      for (let j = 0; j < exitSteps; j++) {
        await sleep(0.015);
        const t = j / exitSteps;
        const eased = t * t * t; // Ease in cubic for acceleration

        // Always slide out to the right
        const exitX = lerp(0, 120, eased);
        card3D.mesh.position.set(exitX, 0, 0);

        // Add slight rotation during exit for dynamic motion
        const exitRotY = lerp(0, -0.2, eased);
        card3D.mesh.rotation.y = exitRotY;

        // Fade out lens flare during exit
        if (lensFlarePass?.uniforms?.brightness) {
          lensFlarePass.uniforms.brightness!.value = lerp(peakFlareIntensity, 0, t);
        }
        // Match entrance scale for consistency
        card3D.mesh.scale.setScalar(1.2);

        // Fade out materials
        const opacity = 1 - eased;
        if (card3D.mesh.material instanceof Array) {
          card3D.mesh.material.forEach((mat: any) => {
            mat.opacity = opacity;
            mat.transparent = true;
          });
        }
      }

      scene.remove(card3D.mesh);
      revealedCards.push(card3D);
    }

    // Show grid view of all cards
    await showGridView(revealedCards);

    // Fade bloom back
    bloomPass.strength = 0.4;
    pullBtnDisabled = false;
  }

  async function showGridView(cards: Card3D[]) {
    // Reset DOF, lens flare, and god rays effects for grid view
    if (dofPass?.uniforms) {
      dofPass.uniforms.blurAmount.value = 0.0;
    }
    if (lensFlarePass?.uniforms?.brightness) {
      lensFlarePass.uniforms.brightness!.value = 0.0;
    }
    if (godRaysPass?.uniforms?.intensity) {
      godRaysPass.uniforms.intensity!.value = 0.0;
    }

    // TWO-COLUMN GRID - all cards visible at once
    // FULLY reset camera to view cards straight on
    state.camY = 0;
    state.targetCamY = 0;
    state.camDist = 90; // Further back to see full grid
    state.targetCamDist = 90;
    state.camAngle = 0;
    state.targetCamAngle = 0;
    state.shakeAmount = 0;
    camera.position.set(0, 0, 90);
    camera.rotation.set(0, 0, 0); // CRITICAL: Reset rotation from orbit
    camera.lookAt(0, 0, 0);

    // Reset materials to full opacity before re-adding
    cards.forEach(c => {
      if (c.mesh.material instanceof Array) {
        c.mesh.material.forEach((mat: any) => {
          mat.opacity = 1;
          mat.transparent = false;
        });
      }

      // Reset diffraction glow to prevent grid washout
      const diffraction = c.mesh.userData.diffraction;
      if (diffraction?.material) {
        diffraction.material.uniforms.intensity.value = 0; // No rainbow glow in grid
      }

      // Hide background torus, clouds, and atmospheric glow in grid view
      const torus = c.mesh.userData.torus;
      if (torus?.material) {
        torus.material.opacity = 0; // Invisible in grid
        // Also hide nebula clouds
        const clouds = torus.userData.clouds;
        if (clouds?.material?.uniforms) {
          clouds.material.uniforms.opacity.value = 0;
        }
        // Hide atmospheric glow
        const atmosphericGlow = torus.userData.atmosphericGlow;
        if (atmosphericGlow?.material?.uniforms) {
          atmosphericGlow.material.uniforms.opacity.value = 0;
        }
      }

      scene.add(c.mesh);
      c.mesh.scale.setScalar(0.01);
      c.mesh.position.set(0, -50, 0);
      c.followMouse = false; // Disable mouse follow
    });

    // Layout config for two-column grid
    const cardScale = 0.5; // Smaller cards to fit grid
    const horizontalSpacing = 18; // Space between columns
    const verticalSpacing = 12; // Space between rows
    const cols = 2;
    const rows = Math.ceil(cards.length / cols);
    const totalHeight = (rows - 1) * verticalSpacing;
    const startY = totalHeight / 2; // Center the grid vertically
    const startX = -horizontalSpacing / 2; // Center the grid horizontally

    // Position cards in two-column grid
    cards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * horizontalSpacing;
      const y = startY - row * verticalSpacing;
      card.targetPos.set(x, y, 0);
      card.targetRot.set(0, 0, 0);
    });

    // Animate cards into grid
    const steps = 40;
    for (let i = 0; i < steps; i++) {
      await sleep(0.015);
      const t = i / steps;
      const eased = easeOutBack(t);

      cards.forEach((card) => {
        card.mesh.scale.setScalar(lerp(0.01, cardScale, eased));
        card.mesh.position.x = lerp(0, card.targetPos.x, eased);
        card.mesh.position.y = lerp(-50, card.targetPos.y, eased);
        card.mesh.position.z = lerp(0, card.targetPos.z, eased);
        card.mesh.rotation.set(0, 0, 0);
      });
    }

    // Store cards globally for deselectCard function
    cardsGlobal = cards;

    // Mouse tracking for card rotation and click-to-zoom
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Apply rotation based on mouse position
      if (selectedCardGlobal) {
        // Rotate selected card to see all sides
        const rotY = mouse.x * 1.5; // Large rotation for selected card
        const rotX = -mouse.y * 0.8;
        selectedCardGlobal.mesh.rotation.y = rotY;
        selectedCardGlobal.mesh.rotation.x = rotX;
      } else {
        // Subtle rotation for all cards in grid
        cards.forEach(card => {
          const rotY = mouse.x * 0.3;
          const rotX = -mouse.y * 0.3;
          card.mesh.rotation.y = rotY;
          card.mesh.rotation.x = rotX;
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cards.map(c => c.mesh), true);

      if (intersects.length > 0) {
        // Find which card was clicked
        let clickedCard = cards.find(c => c.mesh === intersects[0].object);
        if (!clickedCard) {
          clickedCard = cards.find(c => c.mesh === intersects[0].object.parent);
        }

        if (clickedCard && !selectedCardGlobal) {
          // Select and animate card to center
          selectedCardGlobal = clickedCard;
          showBackButton = true;

          cards.forEach(card => {
            if (card === clickedCard) {
              // Animate to center of screen
              card.mesh.position.set(0, 0, 30);
              card.mesh.scale.setScalar(cardScale * 2); // Bigger
            } else {
              // Fade out other cards
              card.mesh.position.z = card.targetPos.z - 20;
              card.mesh.scale.setScalar(0.1); // Very small
            }
          });
        }
      } else if (selectedCardGlobal) {
        // Clicked empty space - deselect
        deselectCard();
      }
    };

    containerEl?.addEventListener('mousemove', handleMouseMove);
    containerEl?.addEventListener('click', handleClick);

    // Show exit button and hide skip button now that animation is complete
    showCarouselExit = true;
    skipBtnVisible = false;

    // Wait for final dismissal (ESC, skip button, exit button, or auto-dismiss)
    await new Promise<void>(resolve => {
      let resolved = false;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          if (!resolved) {
            resolved = true;
            cleanupNav();
            resolve();
          }
        }
      };

      // Check for carousel exit request (triggered by Close button)
      const exitCheckInterval = setInterval(() => {
        if (carouselExitRequested && !resolved) {
          resolved = true;
          clearInterval(exitCheckInterval);
          cleanupNav();
          carouselExitRequested = false; // Reset for next pull
          resolve();
        }
      }, 100);

      window.addEventListener('keydown', handleEscape);

      // Auto-cleanup after navigation ends
      const cleanupNav = () => {
        clearInterval(exitCheckInterval);
        window.removeEventListener('keydown', handleEscape);
        containerEl?.removeEventListener('mousemove', handleMouseMove);
        containerEl?.removeEventListener('click', handleClick);
        showCarouselExit = false; // Hide exit button
      };

      // Auto-dismiss after 60s
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanupNav();
          resolve();
        }
      }, 60000);
    });

    // Smooth fade out
    const fadeSteps = 35;
    for (let i = 0; i < fadeSteps; i++) {
      await sleep(0.02);
      const t = i / fadeSteps;
      const eased = t * t;

      cards.forEach(card => {
        card.mesh.scale.setScalar(lerp(0.7, 0, eased));
        card.mesh.position.y += 0.2; // Gentle float up

        // Fade materials
        if (card.mesh.material instanceof Array) {
          card.mesh.material.forEach((mat: any) => {
            mat.opacity = 1 - eased;
            mat.transparent = true;
          });
        }
      });
    }

    // Clean up
    cardObjects = cards;
    cleanup(false);
  }

  function cleanup(keepCards = false) {
    shouldSkip = false;
    pulseActive = false;
    pulsePhase = 0;
    rings.forEach(r => r.destroy());
    rings = [];
    emoteSprites.forEach(e => scene.remove(e));
    emoteSprites = [];
    goldDust.forEach(g => scene.remove(g));
    goldDust = [];
    // Keep nebula for background during card reveal
    if (!keepCards && nebulaPoints) { scene.remove(nebulaPoints); nebulaPoints = null; }
    if (coreGroup) { scene.remove(coreGroup); coreGroup = null; }
    if (blackHole) { scene.remove(blackHole); blackHole = null; }
    if (legendaryHint) { scene.remove(legendaryHint); legendaryHint = null; }
    if (!keepCards) {
      cardObjects.forEach(c => { scene.remove(c.mesh); if (c.tex) c.tex.dispose(); });
      cardObjects = [];
      // Remove card spotlight
      if (cardSpotlight) { scene.remove(cardSpotlight); cardSpotlight = null; }
    }
    bloomPass.strength = 0.8;
    bloomPass.radius = 1.2;
    state = { speed: 1, pull: 0, coreSize: 0.6, chroma: 0, colorProgress: 0, targetColor: 0xffffff, camAngle: 0, camY: 25, camDist: 70, targetCamAngle: 0, targetCamY: 25, targetCamDist: 70, shakeAmount: 0, phase: 'idle', explodeTime: 0, animationStartTime: 0 };
  }

  // Wrapper for button click - generates random cards
  async function doPull() {
    const cards = genCards(cardCount, forceRarity);
    await doPullWithCards(cards);
  }

  // MAIN ANIMATION - EXACT COPY until card reveal
  async function doPullWithCards(cards: any[], rarityOverride?: string) {
    // If animation is already running, force cleanup and reset
    if (isAnimating) {
      cleanup();
      isAnimating = false;
      skipBtnVisible = false;
      pullBtnDisabled = false;
      await sleep(0.1); // Brief pause for cleanup to complete
    }

    isAnimating = true;
    shouldSkip = false;
    pullBtnDisabled = true;
    skipBtnVisible = true;
    cleanup();

    // Transform incoming cards to animation format
    const actualCards = cards.length > 0 ? cards.map((c: any) => ({
      rarity: c.rarity || 'common',
      emote: c.emote || EMOTES[Math.floor(Math.random() * EMOTES.length)],
      title: c.title,
      id: c.id
    })).sort((a: any, b: any) => ['common', 'rare', 'epic', 'legendary'].indexOf(a.rarity) - ['common', 'rare', 'epic', 'legendary'].indexOf(b.rarity)) : genCards(cardCount, forceRarity);

    const best = rarityOverride || bestRarity(actualCards);
    const color = RARITY_COLORS[best as keyof typeof RARITY_COLORS];
    const isLeg = best === 'legendary';

    state.targetColor = color;
    state.colorProgress = 0;

    const cfg = {
      common: { emotes: 2.0, build: 2.0, spin: 1.5, pulses: 4, hold: 1.5 },
      uncommon: { emotes: 2.1, build: 2.1, spin: 1.6, pulses: 4, hold: 1.6 },
      rare: { emotes: 2.2, build: 2.2, spin: 1.8, pulses: 5, hold: 1.8 },
      epic: { emotes: 2.5, build: 2.5, spin: 2.0, pulses: 6, hold: 2.0 },
      legendary: { emotes: 2.8, build: 2.8, spin: 2.2, pulses: 7, hold: 2.5 }
    }[best as keyof typeof cfg];

    coreGroup = createCore();
    state.pull = 0;
    state.speed = 2.0;

    if (blackHole) {
      blackHole.visible = true;
      blackHole.scale.setScalar(0.01);
    }
    if (coreGroup) {
      coreGroup.visible = true;
      coreGroup.rotation.set(0, 0, 0);
    }

    bloomPass.strength = 1.25;
    state.camY = 25;
    state.camDist = 68;
    state.targetCamY = 25;
    state.targetCamDist = 68;
    state.animationStartTime = performance.now();

    // PHASE 1: EMOTES
    state.phase = 'emotes';
    emoteSpawnActive = true;
    emoteSpawnRate = 180;
    for (let i = 0; i < 3; i++) setTimeout(spawnEmote, i * 80);

    nebulaPoints = createNebula(400);
    rings = [
      new Ring(300, 2, 8, 0.4, 0.5, 0.006, 0),
      new Ring(400, 8, 16, 1.5, 0.55, 0.005, 1),
      new Ring(500, 16, 26, 4, 0.6, 0.004, 2),
      new Ring(700, 26, 40, 6, 0.65, 0.003, 3)
    ];

    const emoteSteps = Math.floor(cfg.emotes / 0.15);
    for (let i = 0; i < emoteSteps; i++) {
      if (shouldSkip) break;
      await iSleep(0.15);
      state.coreSize = Math.min(1.0, state.coreSize + 0.015);
      state.colorProgress = Math.min(0.25, state.colorProgress + 0.01);
      state.targetCamAngle += 0.008;
      emoteSpawnRate = Math.max(100, emoteSpawnRate - 5);
      if (nebulaPoints && (nebulaPoints.material as any).opacity < 0.15) {
        (nebulaPoints.material as any).opacity += 0.005;
      }
      bloomPass.strength = Math.min(1.0, bloomPass.strength + 0.008);
    }

    // PHASE 2: BUILD
    state.phase = 'build';
    state.targetCamY = 16;
    state.targetCamDist = 64;

    const buildSteps = Math.floor(cfg.build / 0.12);
    for (let i = 0; i < buildSteps; i++) {
      if (shouldSkip) break;
      await iSleep(0.12);
      const buildT = i / buildSteps;
      state.speed += 0.03 + buildT * 0.09;
      state.coreSize = Math.min(1.3, state.coreSize + 0.01);
      state.colorProgress = Math.min(0.5, state.colorProgress + 0.012);
      state.targetCamAngle += 0.012;
      emoteSpawnRate = Math.max(80, emoteSpawnRate - 3);

      // Rings fade in via per-particle opacity in update loop based on spawn delays
      // No need to manually set mesh material opacity (doesn't work for ShaderMaterial)

      if (nebulaPoints && (nebulaPoints.material as any).opacity < 0.5) {
        (nebulaPoints.material as any).opacity += 0.008;
      }
      if (isLeg && Math.random() < 0.2 && goldDust.length < 12) goldDust.push(createGoldDust());
      bloomPass.strength = Math.min(1.3, bloomPass.strength + 0.01);
    }

    emoteSpawnActive = false;

    // PHASE 3: SPIN
    state.phase = 'spin';
    state.pull = 0;
    state.targetCamY = 8;
    state.targetCamDist = 56;

    if (isLeg && !shouldSkip) {
      legendaryHint = createLegendaryHint();
      playLegendaryHint(legendaryHint);
    }

    const spinSteps = Math.floor(cfg.spin / 0.1);
    for (let i = 0; i < spinSteps; i++) {
      if (shouldSkip) break;
      await iSleep(0.1);
      const t = i / spinSteps;
      const acceleration = 0.15 + t * 0.4;
      state.speed += acceleration;
      state.coreSize = Math.min(1.6, state.coreSize + 0.012);
      state.colorProgress = Math.min(0.85, state.colorProgress + 0.02);
      state.targetCamAngle += 0.012 + t * 0.015;
      if (i > spinSteps * 0.4) state.shakeAmount = Math.min(0.5, state.shakeAmount + 0.025);
      if (i > spinSteps * 0.5) state.chroma = Math.min(1.0, state.chroma + 0.04);
      bloomPass.strength = Math.min(1.8, bloomPass.strength + 0.025);
    }

    if (isLeg && !shouldSkip) {
      state.shakeAmount = 0.8;
      state.coreSize += 0.3;
      state.colorProgress = 1;
      bloomPass.strength = 2.2;
      goldDust.forEach(g => scene.remove(g));
      goldDust = [];
    }

    // PHASE 4: PULSES
    state.phase = 'pulses';
    state.pull = 0;
    state.colorProgress = 1;
    pulseActive = true;
    pulsePhase = 0;

    const startBPM = 70, endBPM = 150;
    for (let i = 0; i < cfg.pulses; i++) {
      if (shouldSkip) break;
      const t = i / (cfg.pulses - 1);
      pulseBPM = startBPM + (endBPM - startBPM) * t;
      pulseIntensity = 0.15 + t * 0.3;
      const beatDuration = 60 / pulseBPM;
      await iSleep(beatDuration);
      state.shakeAmount = Math.min(0.8, 0.3 + i * 0.08);
      const pt = i / cfg.pulses;
      state.speed += 0.2 + pt * 0.5;
      bloomPass.strength = Math.min(2.2, bloomPass.strength + 0.1);
    }

    pulseActive = false;

    // BLACK HOLE TRANSITION
    if (!shouldSkip) {
      state.phase = 'collapse';
      state.chroma = 0;
      blackHole = createBlackHole();
      if (nebulaPoints) (nebulaPoints.material as any).opacity = 0;
      state.targetCamY = 0;
      state.targetCamDist = 50;

      const fadeSteps = 10;
      for (let i = 0; i < fadeSteps; i++) {
        if (shouldSkip) break;
        await iSleep(0.03);
        const t = i / fadeSteps;
        const implosionEase = easeInBack(t);
        if (t > 0.6) {
          state.pull += 0.5;
        } else {
          state.pull = 0;
        }
        if (coreGroup) {
          state.coreSize *= 0.92;
          const scaleDown = 1 - (implosionEase * 0.7);
          coreGroup.scale.setScalar(scaleDown);
          coreGroup.glowLayers.forEach((l: any) => l.material.opacity *= 0.92);
        }
        const explosiveScale = (t < 0.7) ? 0 : 0.95;
        if (blackHole) {
          blackHole.scale.setScalar(explosiveScale);
          transitionBlackHoleColor(blackHole, color, (t < 0.7) ? 0 : 0.5);
        }
      }

      if (blackHole) {
        blackHole.scale.setScalar(1.0);
      }
      bloomPass.strength = 2.5;
      state.shakeAmount = 0.6;
    }

    // PHASE 5: BLACK HOLE COLLAPSE
    if (!shouldSkip) {
      const collapseSteps = 20;
      for (let i = 0; i < collapseSteps; i++) {
        if (shouldSkip) break;
        await iSleep(0.035);
        const t = i / collapseSteps;
        state.coreSize *= 0.92;
        if (coreGroup) coreGroup.glowLayers.forEach((l: any) => l.material.opacity *= 0.9);
        const bhScale = 0.6 + t * 0.5;
        const colorT = 0.5 + t * 0.5;
        if (blackHole) {
          blackHole.scale.setScalar(bhScale);
          transitionBlackHoleColor(blackHole, color, colorT);
        }
        rings.forEach(r => { r.collapseToDisc(t); r.setColor(color); });
        state.shakeAmount = 0.3 + t * 0.6;
        bloomPass.strength = lerp(bloomPass.strength, 1.4, 0.04);
      }

      if (coreGroup) { scene.remove(coreGroup); coreGroup = null; }

      state.shakeAmount = 0.05;
      bloomPass.strength = 1.0;
      if (blackHole) {
        blackHole.scale.setScalar(1.1);
      }

      const holdTime = cfg.hold;
      const holdSteps = Math.floor(holdTime / 0.04);

      for (let i = 0; i < holdSteps; i++) {
        if (shouldSkip) break;
        await iSleep(0.04);
        const breathe = Math.sin(i * 0.1) * 0.02;
        if (blackHole) {
          blackHole.scale.setScalar(1.1 + breathe);
          if (blackHole.light) {
            blackHole.light.intensity = 3 + Math.sin(i * 0.15) * 0.3;
          }
        }
        rings.forEach(r => {
          r.update(2, 0);
          r.mesh.rotation.x = lerp(r.mesh.rotation.x, Math.PI / 9, 0.05);
        });
      }

      state.shakeAmount = 0.2;
      await iSleep(0.25);
      if (blackHole) blackHole.scale.setScalar(1.1);
      bloomPass.strength = 1.5;

      state.shakeAmount = 0.5;
      await iSleep(0.2);
      if (blackHole) blackHole.scale.setScalar(1.2);
      bloomPass.strength = 2.0;

      state.shakeAmount = 1.0;
      await iSleep(0.15);
      if (blackHole) blackHole.scale.setScalar(1.3);
      bloomPass.strength = 2.5;
    }

    // BURST
    // Keep skip button visible - user can skip to carousel during card reveal
    state.phase = 'explode';
    state.explodeTime = 0;
    state.shakeAmount = isLeg ? 1.5 : 1.0;
    bloomPass.strength = 2.8;

    // If skipped during black hole, do quick cleanup and jump to cards
    if (!shouldSkip) {
      if (blackHole) {
        for (let i = 0; i < 8; i++) {
          const t = i / 7;
          const easedScale = easeOutBack(t);
          const targetScale = 1.3 + easedScale * 1.5;
          blackHole.scale.setScalar(targetScale);
          blackHole.discLayers.forEach((d: any) => d.material.opacity *= 0.85);
          if (blackHole.photon) blackHole.photon.material.opacity *= 0.88;
          if (blackHole.warpRing) blackHole.warpRing.material.opacity *= 0.88;
          if (blackHole.warpGlow) blackHole.warpGlow.material.opacity *= 0.88;
          await iSleep(0.04);
        }
        scene.remove(blackHole);
        blackHole = null;
      }
    } else {
      // Quick cleanup when skipping
      if (blackHole) {
        scene.remove(blackHole);
        blackHole = null;
      }
    }

    rings.forEach(r => r.destroy());
    rings = [];

    await sleep(0.05);

    // NEW CARD REVEAL
    state.phase = 'reveal'; // Brighten nebula for card reveal
    state.shakeAmount = 0;
    shouldSkip = false; // Reset skip flag - will be set again if user presses skip during card reveal
    await showCards(actualCards);

    state.phase = 'idle';
    isAnimating = false;
    skipBtnVisible = false;
  }

  // ANIMATION LOOP
  function animate(currentTime: number) {
    animationFrameId = requestAnimationFrame(animate);

    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    const time = currentTime / 1000;

    // Update film grain shader time for animated grain
    if (filmGrainPass?.uniforms?.time) {
      filmGrainPass.uniforms.time.value = time;
    }

    // Update cloud animation
    if (backgroundTorus?.userData?.clouds?.material?.uniforms?.time) {
      backgroundTorus.userData.clouds.material.uniforms.time.value = time;
    }

    // Update beautiful nebula background
    updateNebulaBackground(time);

    state.camAngle = lerp(state.camAngle, state.targetCamAngle, 0.02);
    state.camY = lerp(state.camY, state.targetCamY, 0.025);
    state.camDist = lerp(state.camDist, state.targetCamDist, 0.025);

    const shake = smoothShake(time, state.shakeAmount);
    const camX = Math.sin(state.camAngle) * state.camDist + shake.x;
    const camZ = Math.cos(state.camAngle) * state.camDist;
    const camY = state.camY + shake.y;

    camera.position.set(camX, camY, camZ);
    camera.lookAt(0, 0, 0);

    if (pulseActive) {
      const frequency = pulseBPM / 60;
      pulsePhase += deltaTime * frequency * Math.PI * 2;
      if (pulsePhase > Math.PI * 2) pulsePhase -= Math.PI * 2;
    }

    const pulseValue = pulseActive ? Math.max(0, Math.sin(pulsePhase)) * pulseIntensity : 0;
    const prismaticTime = (state.phase === 'spin' || state.phase === 'pulses') ? performance.now() / 1000 : undefined;

    if (coreGroup && state.phase !== 'explode' && state.phase !== 'collapse') {
      updateCore(state.coreSize, state.chroma, pulseValue, state.colorProgress, state.targetColor, prismaticTime);
    }

    if (glitterSystem) glitterSystem.update();

    cardObjects.forEach(c => c.update(time));

    // Update card spotlight to follow current reveal card
    if (cardSpotlight && currentRevealCard) {
      cardSpotlight.position.copy(currentRevealCard.mesh.position);
      cardSpotlight.position.z += 20;
    }

    if (prismaticTime !== undefined && (state.chroma > 0.3 || state.phase === 'spin' || state.phase === 'pulses')) {
      const bloomColorIndex = Math.floor(prismaticTime * 2) % PRISMATIC.length;
      bloomPass.strength = Math.max(0.8, bloomPass.strength);
    }

    if (pulseActive) {
      const targetBloom = 1.2 + pulseValue * 0.4;
      bloomPass.strength = lerp(bloomPass.strength, targetBloom, 0.08);
    }

    if (nebulaPoints && state.phase !== 'collapse' && state.phase !== 'explode') {
      updateNebula(nebulaPoints, state.speed, state.pull);
    }

    updateEmotes();
    updateGoldDust();

    if (blackHole) {
      blackHole.discLayers.forEach((d: any, i: number) => d.rotation.z += 0.02 - i * 0.002);
      if (blackHole.photon) blackHole.photon.rotation.z += 0.03;
      if (blackHole.warpRing) {
        blackHole.warpRing.lookAt(camera.position);
        blackHole.warpRing.rotateX(Math.PI / 9);
      }
      if (blackHole.warpGlow) {
        blackHole.warpGlow.lookAt(camera.position);
        blackHole.warpGlow.rotateX(Math.PI / 9);
      }
    }

    if (state.phase !== 'explode') {
      const elapsedTime = (currentTime - state.animationStartTime) / 1000;
      rings.forEach(r => r.update(state.speed, state.pull, elapsedTime));

      if (state.phase === 'spin' || state.phase === 'pulses') {
        rings.forEach(r => {
          r.mesh.rotation.x = lerp(r.mesh.rotation.x, Math.PI / 9, 0.003);
        });
        state.speed += 0.025;
      }
    } else if (state.phase === 'explode') {
      state.explodeTime += 0.016;
      rings.forEach(r => r.explode(state.explodeTime));
    }

    // Faster shake decay - settle quickly to stop jello effect
    state.shakeAmount *= 0.90;
    composer.render();
  }

  function onResize() {
    if (!containerEl || !renderer || !camera || !composer) return;
    const width = containerEl.clientWidth || window.innerWidth;
    const height = containerEl.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
    if (dofPass?.uniforms?.resolution) {
      dofPass.uniforms.resolution!.value.set(width, height);
    }
    if (lensFlarePass?.uniforms?.resolution) {
      lensFlarePass.uniforms.resolution!.value.set(width, height);
    }
    if (godRaysPass?.uniforms?.resolution) {
      godRaysPass.uniforms.resolution!.value.set(width, height);
    }
  }

  function handleSkip() {
    shouldSkip = true;
  }

  // Beautiful animated nebula background
  let nebulaBackground: THREE.Mesh | null = null;
  let nebulaOpacity = 1.0;

  function createNebulaBackground() {
    // Create shader for animated nebula clouds
    const nebulaVertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const nebulaFragmentShader = `
      uniform float time;
      uniform float opacity;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      // 3D Simplex noise for truly seamless spherical mapping
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        i = mod289(i);
        vec4 p = permute(permute(permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));

        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        // Use normalized 3D position directly - completely seamless!
        vec3 pos = normalize(vWorldPos) * 0.8;
        float cloudTime = time * 0.05;

        // Multiple octaves of 3D noise for cloud detail
        float noise1 = snoise(pos + vec3(cloudTime, cloudTime * 0.5, 0.0));
        float noise2 = snoise(pos * 2.0 + vec3(cloudTime * 0.7, cloudTime * 0.3, cloudTime)) * 0.5;
        float noise3 = snoise(pos * 4.0 - vec3(cloudTime * 0.5, 0.0, cloudTime * 0.4)) * 0.25;
        float noise4 = snoise(pos * 8.0 + vec3(0.0, cloudTime * 0.3, cloudTime * 0.2)) * 0.125;

        float clouds = noise1 + noise2 + noise3 + noise4;
        clouds = smoothstep(-0.5, 1.5, clouds);

        // Bright, vibrant purple, blue, pink nebula
        vec3 deepPurple = vec3(0.25, 0.15, 0.45);
        vec3 violet = vec3(0.5, 0.25, 0.7);
        vec3 pink = vec3(0.8, 0.35, 0.65);
        vec3 cyan = vec3(0.25, 0.55, 0.85);
        vec3 darkBlue = vec3(0.08, 0.08, 0.25);

        // Mix colors based on cloud density and position
        vec3 color1 = mix(deepPurple, violet, clouds);
        vec3 color2 = mix(cyan, pink, sin(pos.x * 3.0 + cloudTime) * 0.5 + 0.5);
        vec3 finalColor = mix(darkBlue, mix(color1, color2, clouds), clouds * 0.85);

        // Add brighter stars using 3D noise
        float stars = snoise(pos * 40.0 + vec3(time * 0.02));
        stars = smoothstep(0.92, 1.0, stars);
        finalColor += vec3(stars * 0.4);

        gl_FragColor = vec4(finalColor, opacity);
      }
    `;

    const geometry = new THREE.SphereGeometry(500, 64, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 1.0 }
      },
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      side: THREE.BackSide,
      transparent: true
    });

    nebulaBackground = new THREE.Mesh(geometry, material);
    scene.add(nebulaBackground);
  }

  function updateNebulaBackground(time: number) {
    if (nebulaBackground && nebulaBackground.material) {
      const mat = nebulaBackground.material as THREE.ShaderMaterial;
      mat.uniforms.time.value = time;

      // Fade nebula during blackhole phases
      let targetOpacity = 1.0;
      if (state.phase === 'collapse' || state.phase === 'explode') {
        targetOpacity = 0.15;
      } else if (state.phase === 'pulses') {
        targetOpacity = 0.3;
      }

      nebulaOpacity = lerp(nebulaOpacity, targetOpacity, 0.02);
      mat.uniforms.opacity.value = nebulaOpacity;
    }
  }

  onMount(() => {
    const width = containerEl.clientWidth || window.innerWidth;
    const height = containerEl.clientHeight || window.innerHeight;

    scene = new THREE.Scene();
    // Dark background like blackhole phase to reduce overall brightness
    scene.background = new THREE.Color(0x000000);

    // Create beautiful animated nebula background
    createNebulaBackground();

    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(0, 25, 70);

    // Add lighting for card visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.04);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Add strong front light to make card stand out from background glow
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.1);
    frontLight.position.set(0, 5, 50); // From front, slightly above
    frontLight.scale.setScalar(10);
    scene.add(frontLight);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.CineonToneMapping;
    renderer.toneMappingExposure = 0.9;

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer_name = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      console.log('GPU Acceleration:', vendor, renderer_name);
    }

    containerEl.appendChild(renderer.domElement);

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.5, 0.6, 0.35
    );
    composer.addPass(bloomPass);

    // Add Fractured Orb DOF pass
    dofPass = new ShaderPass(fracturedOrbShader);
    if (dofPass?.uniforms?.resolution) {
      dofPass.uniforms.resolution!.value.set(width, height);
    }
    composer.addPass(dofPass);

    // Add JJ Abrams lens flare pass
    lensFlarePass = new ShaderPass(lensFlareShader);
    if (lensFlarePass?.uniforms?.resolution) {
      lensFlarePass.uniforms.resolution!.value.set(width, height);
    }
    composer.addPass(lensFlarePass);

    // Add god rays pass for dramatic edge lighting
    godRaysPass = new ShaderPass(godRaysShader);
    if (godRaysPass?.uniforms?.resolution) {
      godRaysPass.uniforms.resolution!.value.set(width, height);
    }
    composer.addPass(godRaysPass);

    // Add cinematic film grain pass
    filmGrainPass = new ShaderPass(filmGrainShader);
    composer.addPass(filmGrainPass);

    composer.addPass(new OutputPass());

    window.addEventListener('resize', onResize);

    // Handle container resizing
    const resizeObserver = new ResizeObserver(() => {
      onResize();
    });
    resizeObserver.observe(containerEl);

    // Mouse tracking for card rotation
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      // Convert to normalized coordinates (-1 to 1)
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    loading = false;
    pullBtnDisabled = false;
    animate(0);
    console.log('✦ SUPERNOVA 3D ✦ Ready');

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  });

  onDestroy(() => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', onResize);
    cleanup();
    if (renderer) renderer.dispose();
  });
</script>

<div class="supernova-container">
  {#if loading}
    <div class="loading">Loading...</div>
  {/if}
  <div bind:this={containerEl} class="container"></div>
  <div class="vignette"></div>

  {#if skipBtnVisible}
    <button class="skip-btn" on:click={() => shouldSkip = true} type="button">
      Skip animation
    </button>
  {/if}

  {#if showCarouselExit}
    <button class="carousel-exit-btn" on:click={() => carouselExitRequested = true} type="button">
      Close
    </button>
  {/if}

  {#if showBackButton}
    <button class="back-btn" on:click={deselectCard} type="button">
      ← Back
    </button>
  {/if}
</div>

<style>
  .supernova-container {
    font-family: 'Fredoka', sans-serif;
    background: #000;
    overflow: hidden;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 400px;
  }

  .container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 1.2rem;
    z-index: 1000;
  }

  .vignette {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%);
    z-index: 1;
  }

  .carousel-exit-btn {
    position: absolute;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(147, 112, 255, 0.9);
    color: #ffffff;
    border: 1px solid rgba(191, 148, 255, 0.6);
    border-radius: 24px;
    padding: 0.65rem 1.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    cursor: pointer;
    z-index: 100;
    transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 4px 12px rgba(147, 112, 255, 0.3);
  }

  .carousel-exit-btn:hover {
    background: rgba(167, 132, 255, 1);
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 6px 16px rgba(147, 112, 255, 0.5);
  }

  .carousel-exit-btn:active {
    transform: translateX(-50%) translateY(0);
    box-shadow: 0 2px 8px rgba(147, 112, 255, 0.4);
  }

  .skip-btn {
    position: absolute;
    right: 1rem;
    bottom: 1rem;
    background: rgba(12, 17, 33, 0.75);
    color: #dbeafe;
    border: 1px solid rgba(96, 165, 250, 0.4);
    border-radius: 999px;
    padding: 0.4rem 0.9rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    z-index: 100;
    transition: background 0.2s ease, border 0.2s ease, transform 0.2s ease;
  }

  .skip-btn:hover {
    background: rgba(37, 65, 117, 0.85);
    border-color: rgba(147, 197, 253, 0.6);
    transform: translateY(-1px);
  }

  .skip-btn:active {
    transform: translateY(0);
  }

  .back-btn {
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    background: rgba(37, 65, 117, 0.85);
    color: #dbeafe;
    border: 1px solid rgba(96, 165, 250, 0.4);
    border-radius: 8px;
    padding: 0.6rem 1.2rem;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    cursor: pointer;
    z-index: 101;
    transition: background 0.2s ease, border 0.2s ease, transform 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .back-btn:hover {
    background: rgba(59, 130, 246, 0.9);
    border-color: rgba(147, 197, 253, 0.6);
    transform: translateX(-2px);
  }

  .back-btn:active {
    transform: translateX(0);
  }
</style>
