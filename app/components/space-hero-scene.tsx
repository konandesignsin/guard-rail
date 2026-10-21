"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface SpaceHeroSceneProps {
  onLoaded?: () => void;
}

export default function SpaceHeroScene({ onLoaded }: SpaceHeroSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

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

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2.0);

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040508, 0.035);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({
      powerPreference: "high-performance",
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 1. PROCEDURAL PLANET GROUP
    const planetGroup = new THREE.Group();
    // Position planet slightly offset right and down for aesthetic composition behind copy
    planetGroup.position.set(isMobile ? 0 : 2.4, isMobile ? -1.8 : -0.6, 0);
    scene.add(planetGroup);

    // A. Dark Core Sphere
    const coreGeo = new THREE.SphereGeometry(2.3, 48, 48);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x05070d,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    planetGroup.add(coreMesh);

    // B. Code Lights (Glowing points shell on planet surface)
    const pointCount = 900;
    const pointGeo = new THREE.BufferGeometry();
    const pointPositions = new Float32Array(pointCount * 3);
    const pointColors = new Float32Array(pointCount * 3);

    const cyanBlue = new THREE.Color(0x38bdf8);
    const softGreen = new THREE.Color(0x3dd68c);
    const dimWhite = new THREE.Color(0x94a3b8);

    for (let i = 0; i < pointCount; i++) {
      // Golden spiral distribution on sphere surface (r ~ 2.34)
      const phi = Math.acos(1 - (2 * (i + 0.5)) / pointCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 2.33 + Math.random() * 0.05;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pointPositions[i * 3] = x;
      pointPositions[i * 3 + 1] = y;
      pointPositions[i * 3 + 2] = z;

      // Color choice: predominantly calm cyan-blue/dim white, occasional green logic pulse
      const rnd = Math.random();
      const col = rnd > 0.85 ? softGreen : rnd > 0.35 ? cyanBlue : dimWhite;
      pointColors[i * 3] = col.r;
      pointColors[i * 3 + 1] = col.g;
      pointColors[i * 3 + 2] = col.b;
    }

    pointGeo.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
    pointGeo.setAttribute("color", new THREE.BufferAttribute(pointColors, 3));

    const pointMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const codeLights = new THREE.Points(pointGeo, pointMat);
    planetGroup.add(codeLights);

    // C. Atmosphere Rim Glow (Shader-free additive sprite halo)
    const haloCanvas = document.createElement("canvas");
    haloCanvas.width = 128;
    haloCanvas.height = 128;
    const ctx = haloCanvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 25, 64, 64, 64);
      grad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
      grad.addColorStop(0.4, "rgba(30, 58, 138, 0.2)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const haloTex = new THREE.CanvasTexture(haloCanvas);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.75,
    });
    const haloSprite = new THREE.Sprite(haloMat);
    haloSprite.scale.set(6.2, 6.2, 1);
    planetGroup.add(haloSprite);

    // 2. LAYERED STARDUST BACKGROUND
    const dustCount = 450;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 35;
      dustPos[i + 1] = (Math.random() - 0.5) * 25;
      dustPos[i + 2] = -5 - Math.random() * 20;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x64748b,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // 3. ASTEROIDS VIA INSTANCED MESH (3 depth layers: 40-60 on desktop, 20 on mobile)
    const asteroidCount = isMobile ? 22 : 48;
    const baseIco = new THREE.IcosahedronGeometry(1, 1);
    // Deform vertices with deterministic noise to create irregular rocks
    const posAttr = baseIco.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const displacement = 1 + (Math.sin(vx * 4.2) * Math.cos(vy * 3.7) * Math.sin(vz * 2.8)) * 0.22;
      posAttr.setXYZ(i, vx * displacement, vy * displacement, vz * displacement);
    }
    baseIco.computeVertexNormals();

    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x1a2130,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true,
    });

    const instancedAsteroids = new THREE.InstancedMesh(baseIco, asteroidMat, asteroidCount);
    scene.add(instancedAsteroids);

    // Directional and rim lighting for asteroids
    const keyLight = new THREE.DirectionalLight(0x93c5fd, 1.4);
    keyLight.position.set(5, 6, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe5484d, 0.9);
    rimLight.position.set(-6, -4, -2);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x0c111d, 0.8);
    scene.add(ambientLight);

    // Setup asteroid positions, rotations, drift velocities
    interface AsteroidData {
      matrix: THREE.Matrix4;
      pos: THREE.Vector3;
      rot: THREE.Euler;
      rotSpeed: THREE.Vector3;
      driftSpeed: THREE.Vector3;
      scale: number;
    }
    const asteroidData: AsteroidData[] = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < asteroidCount; i++) {
      // 3 depth layers: foreground (z: 1..3), midground (z: -2..1), background (z: -8..-2)
      const layer = i % 3;
      let z = 0;
      let scale = 0.25;

      if (layer === 0) {
        // Foreground
        z = THREE.MathUtils.randFloat(1.5, 3.2);
        scale = THREE.MathUtils.randFloat(0.22, 0.42);
      } else if (layer === 1) {
        // Midground
        z = THREE.MathUtils.randFloat(-1.5, 1.0);
        scale = THREE.MathUtils.randFloat(0.18, 0.32);
      } else {
        // Background
        z = THREE.MathUtils.randFloat(-7.0, -2.0);
        scale = THREE.MathUtils.randFloat(0.35, 0.7);
      }

      // Spread asteroids across viewport
      const x = THREE.MathUtils.randFloatSpread(18);
      const y = THREE.MathUtils.randFloatSpread(12);

      const pos = new THREE.Vector3(x, y, z);
      const rot = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      const rotSpeed = new THREE.Vector3(
        THREE.MathUtils.randFloat(-0.004, 0.004),
        THREE.MathUtils.randFloat(-0.004, 0.004),
        THREE.MathUtils.randFloat(-0.004, 0.004)
      );
      const driftSpeed = new THREE.Vector3(
        THREE.MathUtils.randFloat(-0.002, 0.002),
        THREE.MathUtils.randFloat(-0.0015, 0.0015),
        THREE.MathUtils.randFloat(-0.001, 0.001)
      );

      dummy.position.copy(pos);
      dummy.rotation.copy(rot);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      instancedAsteroids.setMatrixAt(i, dummy.matrix);
      asteroidData.push({
        matrix: dummy.matrix.clone(),
        pos,
        rot,
        rotSpeed,
        driftSpeed,
        scale,
      });
    }
    instancedAsteroids.instanceMatrix.needsUpdate = true;

    // Red risk asteroid indicators: a couple of special glowing rocks
    const riskGeo = baseIco.clone();
    const riskMat = new THREE.MeshStandardMaterial({
      color: 0x3a0d10,
      emissive: 0xe5484d,
      emissiveIntensity: 0.65,
      roughness: 0.7,
      flatShading: true,
    });

    const riskMesh1 = new THREE.Mesh(riskGeo, riskMat);
    riskMesh1.scale.setScalar(0.32);
    riskMesh1.position.set(-2.8, 1.2, 2.0);
    scene.add(riskMesh1);

    const riskMesh2 = new THREE.Mesh(riskGeo, riskMat);
    riskMesh2.scale.setScalar(0.24);
    riskMesh2.position.set(3.4, 2.1, 0.5);
    scene.add(riskMesh2);

    // Cinematic Intro animation (fade and settle)
    let introProgress = prefersReducedMotion ? 1 : 0;

    // Cursor Parallax
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      targetMouseX = x * 0.45;
      targetMouseY = y * 0.35;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Scroll drift
    let scrollY = 0;
    const handleScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Visibility / Viewport intersection pause
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Resize Handler
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
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isVisible) return;

      if (introProgress < 1 && !prefersReducedMotion) {
        introProgress += 0.015;
      }

      // Parallax easing
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      const scrollDrift = scrollY * 0.0018;

      camera.position.x = currentMouseX;
      camera.position.y = currentMouseY - scrollDrift;
      camera.lookAt(0, -scrollDrift * 0.6, 0);

      // Rotate planet
      if (!prefersReducedMotion) {
        planetGroup.rotation.y += 0.0012;
        codeLights.rotation.y -= 0.0008;

        // Animate risk asteroids
        riskMesh1.rotation.x += 0.005;
        riskMesh1.rotation.y += 0.006;
        riskMesh2.rotation.x -= 0.004;
        riskMesh2.rotation.y += 0.005;

        // Animate instanced asteroids
        for (let i = 0; i < asteroidCount; i++) {
          const data = asteroidData[i];
          data.rot.x += data.rotSpeed.x;
          data.rot.y += data.rotSpeed.y;
          data.rot.z += data.rotSpeed.z;

          data.pos.add(data.driftSpeed);

          // Soft boundary wrap
          if (data.pos.x > 12) data.pos.x = -12;
          if (data.pos.x < -12) data.pos.x = 12;
          if (data.pos.y > 8) data.pos.y = -8;
          if (data.pos.y < -8) data.pos.y = 8;

          dummy.position.copy(data.pos);
          dummy.rotation.copy(data.rot);
          dummy.scale.setScalar(data.scale * Math.min(1, introProgress));
          dummy.updateMatrix();

          instancedAsteroids.setMatrixAt(i, dummy.matrix);
        }
        instancedAsteroids.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();

      baseIco.dispose();
      asteroidMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      pointGeo.dispose();
      pointMat.dispose();
      haloTex.dispose();
      haloMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      riskGeo.dispose();
      riskMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onLoaded]);

  if (!hasWebGL) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Tasteful CSS planet fallback */}
        <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-[#05070d] via-[#0d1322] to-[#1e293b] shadow-[0_0_100px_rgba(56,189,248,0.25)] border border-sky-950/40" />
        <div className="absolute top-[25%] left-[15%] w-8 h-8 rounded-full bg-[#1a2130] border border-red-500/30 shadow-[0_0_18px_rgba(229,72,77,0.3)] animate-pulse" />
        <div className="absolute bottom-[30%] left-[28%] w-12 h-12 rounded-full bg-[#1a2130] border border-slate-700/40" />
      </div>
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
