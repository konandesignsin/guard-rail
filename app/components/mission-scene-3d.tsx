"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createSharedPlanet, PlanetInstance } from "@/app/components/planet-3d";

interface MissionScene3DProps {
  currentStep: number; // 0: Incoming, 1: Lock-on, 2: Explain, 3: Deflect
  onLoaded?: () => void;
}

export default function MissionScene3D({ currentStep, onLoaded }: MissionScene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  // Store mutable refs for animation loop
  const stepRef = useRef(currentStep);
  stepRef.current = currentStep;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
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

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 1. STARFIELD BACKGROUND (Equirectangular texture + 3D star points)
    const starTexLoader = new THREE.TextureLoader();
    const starTex = starTexLoader.load("/textures/starfield.png");
    starTex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = null;

    // Background sphere for subtle starfield
    const bgSphereGeo = new THREE.SphereGeometry(30, 32, 32);
    const bgSphereMat = new THREE.MeshBasicMaterial({
      map: starTex,
      side: THREE.BackSide,
      opacity: 0.35,
      transparent: true,
    });
    const bgSphere = new THREE.Mesh(bgSphereGeo, bgSphereMat);
    scene.add(bgSphere);

    // 3D Star points with parallax
    const starPointsCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starPointsCount * 3);
    for (let i = 0; i < starPointsCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 25;
      starPos[i + 1] = (Math.random() - 0.5) * 20;
      starPos[i + 2] = -4 - Math.random() * 15;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.04,
      transparent: true,
      opacity: 0.7,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 2. SHARED REALISTIC 3D PLANET
    const planet: PlanetInstance = createSharedPlanet({
      radius: 2.1,
      cloudsRotationMultiplier: 1.3,
    });
    planet.group.position.set(0, 0, 0);
    scene.add(planet.group);

    // Directional Sun Light
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(6, 3, 5);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x090d16, 0.4);
    scene.add(ambientLight);

    // 3. STEP 1 & 2: THREAT ASTEROIDS (Jagged meshes + emissive glow + particle trail)
    const asteroidCount = 3;
    const threatGroup = new THREE.Group();
    scene.add(threatGroup);

    const threatMeshes: THREE.Mesh[] = [];
    const threatTrails: THREE.Points[] = [];
    const trailPositionsArr: Float32Array[] = [];

    const icoGeo = new THREE.IcosahedronGeometry(0.2, 1);
    const icoPos = icoGeo.attributes.position;
    for (let i = 0; i < icoPos.count; i++) {
      const vx = icoPos.getX(i);
      const vy = icoPos.getY(i);
      const vz = icoPos.getZ(i);
      const d = 1 + (Math.sin(vx * 5) * Math.cos(vy * 4)) * 0.28;
      icoPos.setXYZ(i, vx * d, vy * d, vz * d);
    }
    icoGeo.computeVertexNormals();

    const threatMat = new THREE.MeshStandardMaterial({
      color: 0x1a0608,
      emissive: 0xe5484d,
      emissiveIntensity: 1.4,
      roughness: 0.8,
      flatShading: true,
    });

    const threatBasePos = [
      new THREE.Vector3(-2.8, 1.8, 1.8), // Target locked threat
      new THREE.Vector3(2.6, 2.2, 0.8),
      new THREE.Vector3(-1.9, -2.1, 1.2),
    ];

    for (let i = 0; i < asteroidCount; i++) {
      const mesh = new THREE.Mesh(icoGeo, threatMat);
      mesh.position.copy(threatBasePos[i]);
      mesh.scale.setScalar(i === 0 ? 1.1 : 0.8);
      threatGroup.add(mesh);
      threatMeshes.push(mesh);

      // Particle Trail
      const trailCount = 18;
      const trailGeo = new THREE.BufferGeometry();
      const trailPos = new Float32Array(trailCount * 3);
      for (let j = 0; j < trailCount; j++) {
        trailPos[j * 3] = mesh.position.x - j * 0.08;
        trailPos[j * 3 + 1] = mesh.position.y + j * 0.05;
        trailPos[j * 3 + 2] = mesh.position.z + j * 0.04;
      }
      trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
      const trailMat = new THREE.PointsMaterial({
        color: 0xe5484d,
        size: 0.04,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });
      const trailPoints = new THREE.Points(trailGeo, trailMat);
      threatGroup.add(trailPoints);
      threatTrails.push(trailPoints);
      trailPositionsArr.push(trailPos);
    }

    // 4. STEP 2: 3D SCANNING RING & TARGETING RETICLE
    const ringGeo = new THREE.TorusGeometry(2.55, 0.02, 16, 100);
    const ringMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x38bdf8) },
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
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          float sweep = fract(vUv.x * 2.0 - time * 0.8);
          gl_FragColor = vec4(color, pow(sweep, 3.0) * 0.85);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const scanRing = new THREE.Mesh(ringGeo, ringMat);
    scanRing.rotation.x = Math.PI / 3;
    scanRing.visible = false;
    scene.add(scanRing);

    // Targeting Reticle (3D brackets around threat 0)
    const reticleGroup = new THREE.Group();
    const reticleGeo = new THREE.RingGeometry(0.35, 0.38, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    reticleGroup.add(reticleMesh);
    reticleGroup.visible = false;
    scene.add(reticleGroup);

    // 5. STEP 4: DEFLECTION BURST PARTICLES
    const burstCount = 60;
    const burstGeo = new THREE.BufferGeometry();
    const burstPos = new Float32Array(burstCount * 3);
    const burstVel: THREE.Vector3[] = [];
    for (let i = 0; i < burstCount; i++) {
      burstPos[i * 3] = threatBasePos[0].x;
      burstPos[i * 3 + 1] = threatBasePos[0].y;
      burstPos[i * 3 + 2] = threatBasePos[0].z;
      burstVel.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08
        )
      );
    }
    burstGeo.setAttribute("position", new THREE.BufferAttribute(burstPos, 3));
    const burstMat = new THREE.PointsMaterial({
      color: 0x3dd68c,
      size: 0.06,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const burstParticles = new THREE.Points(burstGeo, burstMat);
    scene.add(burstParticles);

    // Easing state targets for camera
    const targetCamPos = new THREE.Vector3(0, 0, 7.5);
    const targetCamLook = new THREE.Vector3(0, 0, 0);

    // Visibility management for performance
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          isVisible = e.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    onLoaded?.();

    // Render loop
    let animId = 0;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update Shared Planet
      if (!prefersReduced) {
        planet.update(delta);
        bgSphere.rotation.y += 0.0003;
      }

      const step = stepRef.current;

      // STEP-SPECIFIC 3D TRANSITIONS
      if (step === 0) {
        // Step 1: Incoming
        targetCamPos.set(0, 0, 7.5);
        targetCamLook.set(0, 0, 0);
        scanRing.visible = false;
        reticleGroup.visible = false;
        planet.setShieldState(false);
        planet.setAtmosphereTint(0x38bdf8);
        threatGroup.visible = true;
        burstMat.opacity = 0;

        // Threat drift toward planet
        if (!prefersReduced) {
          threatMeshes[0].position.x = threatBasePos[0].x + Math.sin(elapsed * 0.8) * 0.15;
          threatMeshes[0].position.y = threatBasePos[0].y + Math.cos(elapsed * 0.8) * 0.15;
          threatMeshes[0].rotation.y += 0.01;
        }
      } else if (step === 1) {
        // Step 2: Lock-on
        targetCamPos.set(-0.8, 0.4, 6.8);
        targetCamLook.set(-1.0, 0.6, 0.8);
        scanRing.visible = true;
        ringMat.uniforms.time.value = elapsed;
        reticleGroup.visible = true;
        reticleGroup.position.copy(threatMeshes[0].position);
        reticleGroup.lookAt(camera.position);
        planet.setShieldState(false);
        planet.setAtmosphereTint(0x38bdf8);
        threatGroup.visible = true;
        burstMat.opacity = 0;
      } else if (step === 2) {
        // Step 3: Explain (Ease camera toward locked threat)
        targetCamPos.set(-1.4, 0.9, 4.2);
        targetCamLook.copy(threatMeshes[0].position);
        scanRing.visible = false;
        reticleGroup.visible = true;
        reticleGroup.position.copy(threatMeshes[0].position);
        reticleGroup.lookAt(camera.position);
        planet.setShieldState(false);
        planet.setAtmosphereTint(0x38bdf8);
        threatGroup.visible = true;
        burstMat.opacity = 0;
      } else if (step === 3) {
        // Step 4: Deflect
        targetCamPos.set(0, 0, 7.2);
        targetCamLook.set(0, 0, 0);
        scanRing.visible = false;
        reticleGroup.visible = false;

        // Energy shield flashes emerald green
        planet.setShieldState(true, 0x3dd68c);
        planet.setAtmosphereTint(0x3dd68c);

        // Threats burst into particles & vanish
        threatGroup.visible = false;
        burstMat.opacity = Math.max(0, 1 - (elapsed % 3));

        const positions = burstGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < burstCount; i++) {
          positions[i * 3] += burstVel[i].x;
          positions[i * 3 + 1] += burstVel[i].y;
          positions[i * 3 + 2] += burstVel[i].z;
        }
        burstGeo.attributes.position.needsUpdate = true;
      }

      // Smooth camera interpolation
      camera.position.lerp(targetCamPos, 0.045);
      const curLook = new THREE.Vector3();
      camera.getWorldDirection(curLook);
      camera.lookAt(targetCamLook);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();

      // Dispose resources
      renderer.dispose();
      planet.dispose();
      bgSphereGeo.dispose();
      bgSphereMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      icoGeo.dispose();
      threatMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      reticleGeo.dispose();
      reticleMat.dispose();
      burstGeo.dispose();
      burstMat.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onLoaded]);

  if (!hasWebGL) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-[#05070d] via-[#0d1322] to-[#1e293b]" aria-hidden="true">
        <div className="h-64 w-64 rounded-full border border-sky-500/30 shadow-[0_0_60px_rgba(56,189,248,0.25)]" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    />
  );
}
