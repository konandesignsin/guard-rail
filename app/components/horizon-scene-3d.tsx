"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface HorizonSceneHandle {
  setHover: (isHovered: boolean) => void;
  triggerWarp: (onComplete?: () => void) => void;
}

interface HorizonSceneProps {
  onLoaded?: () => void;
}

export const HorizonScene3D = forwardRef<HorizonSceneHandle, HorizonSceneProps>(
  function HorizonScene3D({ onLoaded }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasWebGL, setHasWebGL] = useState(true);

    const isHoveredRef = useRef(false);
    const isWarpingRef = useRef(false);
    const warpProgressRef = useRef(0);
    const onWarpCompleteRef = useRef<(() => void) | undefined>(undefined);

    useImperativeHandle(ref, () => ({
      setHover: (hovered: boolean) => {
        isHoveredRef.current = hovered;
      },
      triggerWarp: (onComplete?: () => void) => {
        isWarpingRef.current = true;
        warpProgressRef.current = 0;
        onWarpCompleteRef.current = onComplete;
      },
    }));

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // WebGL detection
      try {
        const testCanvas = document.createElement("canvas");
        const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
        if (!gl) {
          setHasWebGL(false);
          onLoaded?.();
          return;
        }
      } catch {
        setHasWebGL(false);
        onLoaded?.();
        return;
      }

      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isMobile = window.innerWidth < 768;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        42,
        container.clientWidth / container.clientHeight,
        0.1,
        100
      );
      // Pulled back camera so wide curved horizon sits comfortably at the bottom
      camera.position.set(0, 1.2, 11);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setClearColor(0x000000, 0);

      // Color management: sRGB output and ACESFilmicToneMapping with 1.1 exposure
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      container.appendChild(renderer.domElement);

      // Post-processing: bloom for rim glow, city lights, bright stars
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.55,  // strength
        0.4,   // radius
        0.78   // threshold — high so only rim glow, city lights, brightest stars bloom
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());

      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      const textureLoader = new THREE.TextureLoader();

      // Load Day Texture (sRGB, maximum anisotropic filtering, mipmaps on)
      const dayTex = textureLoader.load("/textures/earth-day.png");
      dayTex.colorSpace = THREE.SRGBColorSpace;
      dayTex.anisotropy = maxAnisotropy;
      dayTex.generateMipmaps = true;
      dayTex.minFilter = THREE.LinearMipmapLinearFilter;
      dayTex.magFilter = THREE.LinearFilter;

      // Load Night Texture (sRGB, maximum anisotropic filtering)
      const nightTex = textureLoader.load("/textures/earth-night.png");
      nightTex.colorSpace = THREE.SRGBColorSpace;
      nightTex.anisotropy = maxAnisotropy;
      nightTex.generateMipmaps = true;

      // Load Clouds Texture (sRGB)
      const cloudsTex = textureLoader.load("/textures/earth-clouds.png");
      cloudsTex.colorSpace = THREE.SRGBColorSpace;
      cloudsTex.anisotropy = maxAnisotropy;
      cloudsTex.generateMipmaps = true;

      // Load Specular Texture (Linear color space)
      const specTex = textureLoader.load("/textures/earth-specular.png");
      specTex.colorSpace = THREE.LinearSRGBColorSpace;

      // Load Bump Texture (Linear color space)
      const bumpTex = textureLoader.load("/textures/earth-bump.png");
      bumpTex.colorSpace = THREE.LinearSRGBColorSpace;

      // 1. FAINT NEBULA BACKGROUND FOR DEPTH (dark blue & violet radial gradient)
      const nebulaCanvas = document.createElement("canvas");
      nebulaCanvas.width = 512;
      nebulaCanvas.height = 512;
      const nCtx = nebulaCanvas.getContext("2d");
      if (nCtx) {
        const rad = nCtx.createRadialGradient(256, 180, 20, 256, 256, 260);
        rad.addColorStop(0, "rgba(49, 46, 129, 0.28)"); // Deep violet-indigo
        rad.addColorStop(0.45, "rgba(14, 30, 75, 0.18)"); // Dark blue
        rad.addColorStop(1, "rgba(0, 0, 0, 0)");
        nCtx.fillStyle = rad;
        nCtx.fillRect(0, 0, 512, 512);
      }
      const nebulaTex = new THREE.CanvasTexture(nebulaCanvas);
      const nebulaGeo = new THREE.PlaneGeometry(36, 24);
      const nebulaMat = new THREE.MeshBasicMaterial({
        map: nebulaTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const nebulaMesh = new THREE.Mesh(nebulaGeo, nebulaMat);
      nebulaMesh.position.set(0, 2.5, -12);
      scene.add(nebulaMesh);

      // 2. STARS: IDLE = ROUND POINTS WITH TWINKLE, HOVER/WARP = STREAKS
      // A. Round Stars Points (Active during idle)
      const starCount = isMobile ? 320 : 600;
      const pointGeo = new THREE.BufferGeometry();
      const starPositions = new Float32Array(starCount * 3);
      const starSizes = new Float32Array(starCount);
      const starAlphas = new Float32Array(starCount);
      const starZSpeeds = new Float32Array(starCount);
      const starOrigins: THREE.Vector3[] = [];

      // Canvas for soft circular star sprite
      const starCanvas = document.createElement("canvas");
      starCanvas.width = 32;
      starCanvas.height = 32;
      const sCtx = starCanvas.getContext("2d");
      if (sCtx) {
        const rad = sCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
        rad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
        rad.addColorStop(0.3, "rgba(220, 235, 255, 0.8)");
        rad.addColorStop(0.7, "rgba(160, 200, 255, 0.2)");
        rad.addColorStop(1, "rgba(0, 0, 0, 0)");
        sCtx.fillStyle = rad;
        sCtx.fillRect(0, 0, 32, 32);
      }
      const starSprite = new THREE.CanvasTexture(starCanvas);

      for (let i = 0; i < starCount; i++) {
        const x = (Math.random() - 0.5) * 36;
        const y = Math.random() * 15 - 0.5; // Stays above horizon
        const z = -Math.random() * 25 - 2;

        starOrigins.push(new THREE.Vector3(x, y, z));
        starPositions[i * 3] = x;
        starPositions[i * 3 + 1] = y;
        starPositions[i * 3 + 2] = z;

        starSizes[i] = THREE.MathUtils.randFloat(0.04, 0.12);
        starAlphas[i] = THREE.MathUtils.randFloat(0.4, 0.95);
        starZSpeeds[i] = THREE.MathUtils.randFloat(0.02, 0.06);
      }

      pointGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      pointGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));

      const pointsMat = new THREE.PointsMaterial({
        map: starSprite,
        size: 0.1,
        transparent: true,
        vertexColors: false,
        color: 0xe2e8f0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const starPoints = new THREE.Points(pointGeo, pointsMat);
      scene.add(starPoints);

      // B. Line Segments for streaks (faded in only when hover or warp)
      const streakGeo = new THREE.BufferGeometry();
      const streakPositions = new Float32Array(starCount * 6);
      for (let i = 0; i < starCount; i++) {
        const origin = starOrigins[i];
        streakPositions[i * 6] = origin.x;
        streakPositions[i * 6 + 1] = origin.y;
        streakPositions[i * 6 + 2] = origin.z;
        streakPositions[i * 6 + 3] = origin.x;
        streakPositions[i * 6 + 4] = origin.y;
        streakPositions[i * 6 + 5] = origin.z - 0.05;
      }
      streakGeo.setAttribute("position", new THREE.BufferAttribute(streakPositions, 3));

      const streakMat = new THREE.LineBasicMaterial({
        color: 0xc7d2fe,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const starStreaks = new THREE.LineSegments(streakGeo, streakMat);
      scene.add(starStreaks);

      // 3. PLANET GROUP AS WIDE HORIZON (Positioned down so top 25-30% curves up below text)
      const planetGroup = new THREE.Group();
      // Planet radius 6.8, placed at y = -7.6: highest apex reaches y = -0.8, leaving clear dark gap below text
      const planetRadius = 6.8;
      planetGroup.position.set(0, -7.6, 0);
      scene.add(planetGroup);

      // Strong Sun vector from upper right / behind the planet
      // x: 3.5 (right side lit), y: 1.5 (upper), z: -3.5 (behind, casting strong atmospheric rim)
      const sunDirection = new THREE.Vector3(3.5, 1.5, -3.5).normalize();

      // Custom Planet Surface Shader
      const surfaceGeo = new THREE.SphereGeometry(planetRadius, 64, 64);
      const surfaceMat = new THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: dayTex },
          nightTexture: { value: nightTex },
          specularTexture: { value: specTex },
          bumpTexture: { value: bumpTex },
          sunDirection: { value: sunDirection },
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
          uniform sampler2D specularTexture;
          uniform sampler2D bumpTexture;
          uniform vec3 sunDirection;

          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;

          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(-vPosition);
            
            // Dot product with sun
            float nDotL = dot(normal, normalize(sunDirection));
            
            // Soft terminator transition
            float dayFactor = smoothstep(-0.2, 0.25, nDotL);
            
            vec4 dayCol = texture2D(dayTexture, vUv);
            vec4 nightCol = texture2D(nightTexture, vUv);
            vec4 specCol = texture2D(specularTexture, vUv);

            // Specular ocean reflection
            vec3 halfVec = normalize(sunDirection + viewDir);
            float spec = pow(max(dot(normal, halfVec), 0.0), 32.0) * specCol.r * 0.9 * dayFactor;
            vec3 oceanSpec = vec3(1.0, 0.95, 0.85) * spec;

            // Night city lights: intense only in the dark hemisphere
            float nightFactor = smoothstep(0.15, -0.2, nDotL);
            vec3 nightLights = nightCol.rgb * nightFactor * 2.5;

            // Composite
            vec3 color = mix(vec3(0.02, 0.03, 0.06), dayCol.rgb * 1.1, dayFactor);
            color += nightLights + oceanSpec;

            gl_FragColor = vec4(color, 1.0);
          }
        `,
      });
      const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
      planetGroup.add(surfaceMesh);

      // Clouds Layer (Rotating slightly faster, translucent white)
      const cloudsGeo = new THREE.SphereGeometry(planetRadius + 0.045, 64, 64);
      const cloudsMat = new THREE.ShaderMaterial({
        uniforms: {
          cloudsTexture: { value: cloudsTex },
          sunDirection: { value: sunDirection },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D cloudsTexture;
          uniform vec3 sunDirection;
          varying vec2 vUv;
          varying vec3 vNormal;
          void main() {
            vec3 normal = normalize(vNormal);
            float nDotL = dot(normal, normalize(sunDirection));
            float dayFactor = smoothstep(-0.25, 0.3, nDotL);

            vec4 cloud = texture2D(cloudsTexture, vUv);
            vec3 cloudShaded = cloud.rgb * mix(0.15, 1.15, dayFactor);
            gl_FragColor = vec4(cloudShaded, cloud.r * 0.65);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
      planetGroup.add(cloudsMesh);

      // Atmosphere Fresnel Shell 1 (Warm sunlit orange rim #ff8a5c & blue-white day side)
      const atmoGeo = new THREE.SphereGeometry(planetRadius + 0.16, 64, 64);
      const atmoMat = new THREE.ShaderMaterial({
        uniforms: {
          sunDirection: { value: sunDirection },
          glowPulse: { value: 1.0 },
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
          uniform float glowPulse;
          varying vec3 vNormal;
          varying vec3 vPosition;

          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(-vPosition);
            
            // Fresnel rim intensity
            float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.2);

            // Sun orientation along rim
            float sunDot = dot(normal, normalize(sunDirection));
            float sunlitRim = smoothstep(-0.35, 0.7, sunDot);

            // Orange-gold sunlit rim color (#ff8a5c)
            vec3 orangeRim = vec3(1.0, 0.54, 0.36);
            // Crisp cyan-blue day sky
            vec3 blueAtmosphere = vec3(0.35, 0.72, 1.0);

            vec3 atmoColor = mix(blueAtmosphere, orangeRim, sunlitRim * 0.85);
            float intensity = fresnel * (0.4 + sunlitRim * 1.6) * glowPulse;

            gl_FragColor = vec4(atmoColor, intensity);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
      planetGroup.add(atmoMesh);

      // Atmosphere Shell 2 (Soft outer halo for prominent horizon glow)
      const haloGeo = new THREE.SphereGeometry(planetRadius + 0.38, 64, 64);
      const haloMat = new THREE.ShaderMaterial({
        uniforms: {
          sunDirection: { value: sunDirection },
          glowPulse: { value: 1.0 },
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
          uniform float glowPulse;
          varying vec3 vNormal;
          varying vec3 vPosition;

          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(-vPosition);
            float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.5);
            float sunDot = dot(normal, normalize(sunDirection));
            float sunlit = smoothstep(-0.2, 0.8, sunDot);

            vec3 haloColor = vec3(1.0, 0.58, 0.38);
            gl_FragColor = vec4(haloColor, fresnel * sunlit * 0.85 * glowPulse);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      planetGroup.add(haloMesh);

      // Flash Mesh for Warp jump bloom flash
      const flashGeo = new THREE.PlaneGeometry(60, 40);
      const flashMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const flashMesh = new THREE.Mesh(flashGeo, flashMat);
      flashMesh.position.set(0, 0, 10);
      scene.add(flashMesh);

      // Mouse Parallax
      let mouseX = 0;
      let mouseY = 0;
      let targetMouseX = 0;
      let targetMouseY = 0;

      const handleMouseMove = (e: MouseEvent) => {
        if (prefersReduced) return;
        targetMouseX = ((e.clientX / window.innerWidth) - 0.5) * 0.35;
        targetMouseY = ((e.clientY / window.innerHeight) - 0.5) * -0.2;
      };
      window.addEventListener("mousemove", handleMouseMove, { passive: true });

      // Intersection Observer to run WebGL only when near/in viewport
      let isVisible = true;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            isVisible = e.isIntersecting;
          });
        },
        { rootMargin: "100px" }
      );
      observer.observe(container);

      const handleResize = () => {
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
      };
      window.addEventListener("resize", handleResize);

      onLoaded?.();

      let animId = 0;
      let clock = new THREE.Clock();
      let streakOpacity = 0;
      let currentStreakLength = 0;
      let currentSpeed = 1;
      let hoverPulseTime = 0;

      const animate = () => {
        animId = requestAnimationFrame(animate);
        if (!isVisible) return;

        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        if (!prefersReduced) {
          // Slow realistic rotation
          surfaceMesh.rotation.y += 0.001;
          cloudsMesh.rotation.y += 0.0014;

          // Parallax easing
          mouseX += (targetMouseX - mouseX) * 0.05;
          mouseY += (targetMouseY - mouseY) * 0.05;
          camera.position.x = mouseX;
          camera.position.y = 1.2 + mouseY;

          const isHovered = isHoveredRef.current;
          const isWarping = isWarpingRef.current;

          // HOVER & WARP DYNAMICS
          if (isWarping) {
            streakOpacity = THREE.MathUtils.lerp(streakOpacity, 1.0, 0.15);
            currentStreakLength = THREE.MathUtils.lerp(currentStreakLength, 28, 0.12);
            currentSpeed = THREE.MathUtils.lerp(currentSpeed, 22, 0.12);
            warpProgressRef.current += delta * 1.15;

            // Camera FOV expansion
            camera.fov = 42 + warpProgressRef.current * 44;
            camera.updateProjectionMatrix();

            // Bloom flash
            if (warpProgressRef.current > 0.4 && warpProgressRef.current < 0.85) {
              flashMat.opacity = Math.sin((warpProgressRef.current - 0.4) / 0.45 * Math.PI) * 0.92;
            } else if (warpProgressRef.current >= 0.85) {
              flashMat.opacity = 0;
            }

            if (warpProgressRef.current >= 1.0 && onWarpCompleteRef.current) {
              const cb = onWarpCompleteRef.current;
              onWarpCompleteRef.current = undefined;
              cb();
            }
          } else if (isHovered) {
            streakOpacity = THREE.MathUtils.lerp(streakOpacity, 0.85, 0.08);
            currentStreakLength = THREE.MathUtils.lerp(currentStreakLength, 4.5, 0.08);
            currentSpeed = THREE.MathUtils.lerp(currentSpeed, 4.0, 0.08);
            camera.fov = THREE.MathUtils.lerp(camera.fov, 44, 0.08);
            camera.updateProjectionMatrix();

            // Planet atmosphere pulses once on hover
            hoverPulseTime += delta * 4;
            const pulse = 1.0 + Math.sin(Math.min(hoverPulseTime, Math.PI)) * 0.45;
            atmoMat.uniforms.glowPulse.value = pulse;
            haloMat.uniforms.glowPulse.value = pulse;
          } else {
            // Idle state: streaks disappear completely (opacity 0), stars are round points
            streakOpacity = THREE.MathUtils.lerp(streakOpacity, 0, 0.1);
            currentStreakLength = THREE.MathUtils.lerp(currentStreakLength, 0, 0.1);
            currentSpeed = THREE.MathUtils.lerp(currentSpeed, 1.0, 0.08);
            camera.fov = THREE.MathUtils.lerp(camera.fov, 42, 0.08);
            camera.updateProjectionMatrix();

            hoverPulseTime = 0;
            atmoMat.uniforms.glowPulse.value = 1.0;
            haloMat.uniforms.glowPulse.value = 1.0;
          }

          // Points star opacity decreases when streaks engage
          pointsMat.opacity = Math.max(0.1, 1.0 - streakOpacity);
          streakMat.opacity = streakOpacity;

          // Twinkle effect on round points during idle
          const sizes = pointGeo.attributes.size.array as Float32Array;
          const pos = pointGeo.attributes.position.array as Float32Array;
          const streakPos = streakGeo.attributes.position.array as Float32Array;

          for (let i = 0; i < starCount; i++) {
            const origin = starOrigins[i];
            origin.z += starZSpeeds[i] * currentSpeed;

            if (origin.z > 11) {
              origin.z = -25 - Math.random() * 8;
              origin.x = (Math.random() - 0.5) * 36;
              origin.y = Math.random() * 15 - 0.5;
            }

            // Twinkle size oscillation
            sizes[i] = starSizes[i] * (0.8 + Math.sin(elapsed * 2.5 + i) * 0.25);

            pos[i * 3] = origin.x;
            pos[i * 3 + 1] = origin.y;
            pos[i * 3 + 2] = origin.z;

            // Streak vertices
            const len = (0.08 + starZSpeeds[i] * 1.5) * currentStreakLength;
            streakPos[i * 6] = origin.x;
            streakPos[i * 6 + 1] = origin.y;
            streakPos[i * 6 + 2] = origin.z;
            streakPos[i * 6 + 3] = origin.x;
            streakPos[i * 6 + 4] = origin.y;
            streakPos[i * 6 + 5] = origin.z - len;
          }

          pointGeo.attributes.position.needsUpdate = true;
          pointGeo.attributes.size.needsUpdate = true;
          if (streakOpacity > 0.01) {
            streakGeo.attributes.position.needsUpdate = true;
          }
        }

        composer.render();
      };

      animate();

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("resize", handleResize);
        observer.disconnect();

        renderer.dispose();
        composer.dispose();
        dayTex.dispose();
        nightTex.dispose();
        cloudsTex.dispose();
        specTex.dispose();
        bumpTex.dispose();
        starSprite.dispose();
        nebulaTex.dispose();

        surfaceGeo.dispose();
        surfaceMat.dispose();
        cloudsGeo.dispose();
        cloudsMat.dispose();
        atmoGeo.dispose();
        atmoMat.dispose();
        haloGeo.dispose();
        haloMat.dispose();
        nebulaGeo.dispose();
        nebulaMat.dispose();
        pointGeo.dispose();
        pointsMat.dispose();
        streakGeo.dispose();
        streakMat.dispose();
        flashGeo.dispose();
        flashMat.dispose();

        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }, [onLoaded]);

    if (!hasWebGL) {
      return (
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#ff8a5c]/25 via-[#0d1322] to-[#040508] pointer-events-none"
          aria-hidden="true"
        />
      );
    }

    return (
      <div
        ref={containerRef}
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      />
    );
  }
);
