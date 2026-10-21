"use client";

import * as THREE from "three";

export interface PlanetInstance {
  group: THREE.Group;
  update: (delta?: number) => void;
  dispose: () => void;
  setShieldState: (active: boolean, color?: number) => void;
  setAtmosphereTint: (color: THREE.Color | number) => void;
}

// Global texture cache so textures are loaded only once across instances
const textureCache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

function loadTexture(url: string): THREE.Texture {
  if (textureCache.has(url)) {
    return textureCache.get(url)!;
  }
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(url, tex);
  return tex;
}

export interface PlanetOptions {
  radius?: number;
  cloudsRotationMultiplier?: number;
  showClouds?: boolean;
  showNightLights?: boolean;
}

/**
 * Creates a shared realistic 3D Planet instance
 * - Day map, night city lights, clouds layer rotating faster, normal/bump map, specular map
 * - True day/night directional sun terminator
 * - Fresnel atmosphere rim glow
 * - Energy shield mesh
 */
export function createSharedPlanet(options: PlanetOptions = {}): PlanetInstance {
  const radius = options.radius ?? 2.2;
  const cloudsRotationMultiplier = options.cloudsRotationMultiplier ?? 1.35;
  const showClouds = options.showClouds ?? true;
  const showNightLights = options.showNightLights ?? true;

  const group = new THREE.Group();

  // Load textures
  const dayTex = loadTexture("/textures/earth-day.png");
  const nightTex = loadTexture("/textures/earth-night.png");
  const cloudsTex = loadTexture("/textures/earth-clouds.png");
  const bumpTex = loadTexture("/textures/earth-bump.png");
  const specTex = loadTexture("/textures/earth-specular.png");

  // Custom Shader Material for Day/Night blending with specular and bump
  const planetGeo = new THREE.SphereGeometry(radius, 64, 64);

  const planetShaderMat = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTex },
      nightTexture: { value: nightTex },
      bumpTexture: { value: bumpTex },
      specularTexture: { value: specTex },
      sunDirection: { value: new THREE.Vector3(5, 3, 5).normalize() },
      atmosphereTint: { value: new THREE.Color(0x38bdf8) },
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
      uniform vec3 atmosphereTint;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        // Sun alignment in world space
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(-vPosition);
        
        // Dot product with sun
        float nDotL = dot(normal, normalize(sunDirection));
        
        // Smooth transition at day/night terminator
        float dayFactor = smoothstep(-0.15, 0.25, nDotL);
        
        vec4 dayColor = texture2D(dayTexture, vUv);
        vec4 nightColor = texture2D(nightTexture, vUv);
        vec4 specColor = texture2D(specularTexture, vUv);
        
        // Specular highlight on oceans during daytime
        vec3 halfVector = normalize(sunDirection + viewDir);
        float specStrength = pow(max(dot(normal, halfVector), 0.0), 32.0) * specColor.r * 0.8;
        vec3 specular = vec3(1.0, 0.95, 0.85) * specStrength * dayFactor;
        
        // Blend day and night
        vec3 baseColor = mix(nightColor.rgb * 1.6, dayColor.rgb, dayFactor) + specular;
        
        // Fresnel limb glow
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
        baseColor += atmosphereTint * fresnel * 0.45 * max(dayFactor, 0.2);

        gl_FragColor = vec4(baseColor, 1.0);
      }
    `,
  });

  const planetMesh = new THREE.Mesh(planetGeo, planetShaderMat);
  group.add(planetMesh);

  // Clouds layer
  let cloudsMesh: THREE.Mesh | null = null;
  if (showClouds) {
    const cloudsGeo = new THREE.SphereGeometry(radius + 0.035, 48, 48);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTex,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    group.add(cloudsMesh);
  }

  // Energy shield (fresnel sphere for Deflect phase)
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
      if (typeof color === "number") {
        planetShaderMat.uniforms.atmosphereTint.value.setHex(color);
      } else {
        planetShaderMat.uniforms.atmosphereTint.value.copy(color);
      }
    },
    dispose: () => {
      planetGeo.dispose();
      planetShaderMat.dispose();
      if (cloudsMesh) {
        cloudsMesh.geometry.dispose();
        (cloudsMesh.material as THREE.Material).dispose();
      }
      shieldGeo.dispose();
      shieldMat.dispose();
    },
  };
}
