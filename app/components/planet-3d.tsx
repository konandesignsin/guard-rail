"use client";

import * as THREE from "three";

export interface PlanetInstance {
  group: THREE.Group;
  update: (delta?: number) => void;
  dispose: () => void;
  setShieldState: (active: boolean, color?: number) => void;
  setAtmosphereTint: (color: THREE.Color | number) => void;
  setSunDirection: (dir: THREE.Vector3) => void;
}

const textureCache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

function loadTexture(url: string, colorSpace: string): THREE.Texture {
  const cacheKey = `${url}:${colorSpace}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }
  const tex = loader.load(url);
  tex.colorSpace = colorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 16;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, tex);
  return tex;
}

export interface PlanetOptions {
  radius?: number;
  cloudsRotationMultiplier?: number;
  showClouds?: boolean;
  showNightLights?: boolean;
  showAtmosphere?: boolean;
}

export function createSharedPlanet(options: PlanetOptions = {}): PlanetInstance {
  const radius = options.radius ?? 2.2;
  const cloudsRotationMultiplier = options.cloudsRotationMultiplier ?? 1.35;
  const showClouds = options.showClouds ?? true;
  const showNightLights = options.showNightLights ?? true;
  const showAtmosphere = options.showAtmosphere ?? true;

  const group = new THREE.Group();

  const dayTex = loadTexture("/textures/earth-day.png", THREE.SRGBColorSpace);
  const nightTex = loadTexture("/textures/earth-night.png", THREE.SRGBColorSpace);
  const cloudsTex = loadTexture("/textures/earth-clouds.png", THREE.SRGBColorSpace);
  const bumpTex = loadTexture("/textures/earth-bump.png", THREE.LinearSRGBColorSpace);
  const specTex = loadTexture("/textures/earth-specular.png", THREE.LinearSRGBColorSpace);

  const sunDir = new THREE.Vector3(1, 0.4, 0.8).normalize();

  const planetGeo = new THREE.SphereGeometry(radius, 96, 96);

  const planetShaderMat = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTex },
      nightTexture: { value: nightTex },
      bumpTexture: { value: bumpTex },
      specularTexture: { value: specTex },
      sunDirection: { value: sunDir },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D dayTexture;
      uniform sampler2D nightTexture;
      uniform sampler2D bumpTexture;
      uniform sampler2D specularTexture;
      uniform vec3 sunDirection;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(-vPosition);

        float nDotL = dot(normal, normalize(sunDirection));
        float dayFactor = smoothstep(-0.18, 0.28, nDotL);

        vec4 dayColor = texture2D(dayTexture, vUv);
        vec4 nightColor = texture2D(nightTexture, vUv);
        vec4 specColor = texture2D(specularTexture, vUv);

        vec3 halfVector = normalize(normalize(sunDirection) + viewDir);
        float spec = pow(max(dot(normal, halfVector), 0.0), 48.0) * specColor.r * dayFactor;
        vec3 specular = vec3(1.0, 0.97, 0.92) * spec * 0.6;

        float nightIntensity = (1.0 - dayFactor) * 2.2;
        vec3 baseColor = mix(nightColor.rgb * nightIntensity, dayColor.rgb * 1.05, dayFactor);
        baseColor += specular;

        float diffuseWrap = max(nDotL, 0.0);
        baseColor *= 0.35 + diffuseWrap * 0.65;

        gl_FragColor = vec4(baseColor, 1.0);
      }
    `,
  });

  const planetMesh = new THREE.Mesh(planetGeo, planetShaderMat);
  group.add(planetMesh);

  let cloudsMesh: THREE.Mesh | null = null;
  if (showClouds) {
    const cloudsGeo = new THREE.SphereGeometry(radius + 0.03, 48, 48);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    group.add(cloudsMesh);
  }

  // Inner atmosphere shell — fresnel rim glow
  let atmosphereMesh: THREE.Mesh | null = null;
  let outerHaloMesh: THREE.Mesh | null = null;

  if (showAtmosphere) {
    const atmoGeo = new THREE.SphereGeometry(radius * 1.025, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: sunDir.clone() },
        rimColor: { value: new THREE.Color(0xff8a5c) },
        dayColor: { value: new THREE.Color(0x6eaaff) },
        nightColor: { value: new THREE.Color(0x1a1040) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        uniform vec3 rimColor;
        uniform vec3 dayColor;
        uniform vec3 nightColor;

        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(-vPosition);

          float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 3.5);
          float sunDot = dot(normal, normalize(sunDirection));
          float sunFactor = smoothstep(-0.25, 0.6, sunDot);

          vec3 baseAtmo = mix(nightColor, dayColor, sunFactor);

          float rimStrength = smoothstep(-0.1, 0.9, sunFactor) * sunFactor;
          vec3 finalColor = mix(baseAtmo, rimColor, rimStrength * 0.75);

          float alpha = fresnel * (0.35 + sunFactor * 0.65);
          alpha *= 1.4;

          gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
    group.add(atmosphereMesh);

    // Outer halo — softer, larger glow
    const haloGeo = new THREE.SphereGeometry(radius * 1.12, 48, 48);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: sunDir.clone() },
        haloColor: { value: new THREE.Color(0xff8a5c) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        uniform vec3 haloColor;

        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(-vPosition);

          float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 5.0);
          float sunFactor = smoothstep(-0.3, 0.5, dot(normal, normalize(sunDirection)));

          float alpha = fresnel * sunFactor * 0.35;

          gl_FragColor = vec4(haloColor, clamp(alpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    outerHaloMesh = new THREE.Mesh(haloGeo, haloMat);
    group.add(outerHaloMesh);
  }

  // Energy shield (for Deflect phase in mission sequence)
  const shieldGeo = new THREE.SphereGeometry(radius + 0.22, 48, 48);
  const shieldMat = new THREE.ShaderMaterial({
    uniforms: {
      shieldColor: { value: new THREE.Color(0x3dd68c) },
      opacity: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 shieldColor;
      uniform float opacity;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);
        gl_FragColor = vec4(shieldColor, fresnel * opacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  group.add(shieldMesh);

  return {
    group,
    update: (delta = 0.016) => {
      planetMesh.rotation.y += 0.0015;
      if (cloudsMesh) {
        cloudsMesh.rotation.y += 0.0015 * cloudsRotationMultiplier;
      }
    },
    setShieldState: (active: boolean, color = 0x3dd68c) => {
      shieldMat.uniforms.shieldColor.value.setHex(color);
      shieldMat.uniforms.opacity.value = active ? 0.85 : 0.0;
    },
    setAtmosphereTint: (color) => {
      const c = typeof color === "number" ? new THREE.Color(color) : color;
      if (atmosphereMesh) {
        const mat = atmosphereMesh.material as THREE.ShaderMaterial;
        mat.uniforms.rimColor.value.copy(c);
      }
      if (outerHaloMesh) {
        const mat = outerHaloMesh.material as THREE.ShaderMaterial;
        mat.uniforms.haloColor.value.copy(c);
      }
    },
    setSunDirection: (dir) => {
      const d = dir.clone().normalize();
      planetShaderMat.uniforms.sunDirection.value.copy(d);
      if (atmosphereMesh) {
        (atmosphereMesh.material as THREE.ShaderMaterial).uniforms.sunDirection.value.copy(d);
      }
      if (outerHaloMesh) {
        (outerHaloMesh.material as THREE.ShaderMaterial).uniforms.sunDirection.value.copy(d);
      }
    },
    dispose: () => {
      planetGeo.dispose();
      planetShaderMat.dispose();
      if (cloudsMesh) {
        cloudsMesh.geometry.dispose();
        (cloudsMesh.material as THREE.Material).dispose();
      }
      if (atmosphereMesh) {
        atmosphereMesh.geometry.dispose();
        (atmosphereMesh.material as THREE.Material).dispose();
      }
      if (outerHaloMesh) {
        outerHaloMesh.geometry.dispose();
        (outerHaloMesh.material as THREE.Material).dispose();
      }
      shieldGeo.dispose();
      shieldMat.dispose();
    },
  };
}
