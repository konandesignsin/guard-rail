"use client";

import {
  useRef,
  useMemo,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

const SVG_CX = 435;
const SVG_CY = 550;
const S = 0.008;

const G_RING_D = "M663.4 425.5A262 262 0 1 0 682.7 646.1L611.3 620.1A186 186 0 1 1 592.5 455.2Z";
const BAR_D = "M617 615L690 560V768.5A36.5 36.5 0 0 1 617 768.5Z";

const WAVE_SEGS: [number, number, number, number, number, number][] = [
  [440, 552, 450, 606, 479, 606],
  [508, 606, 515, 549, 543, 549],
  [572, 549, 578, 612, 607, 612],
  [636, 612, 645, 549, 672, 549],
];
const WAVE_START: [number, number] = [411, 549];
const WAVE_TUBE_R = 17 * S;
const WAVE_COLOR_L = new THREE.Color(0xb82a2a);
const WAVE_COLOR_R = new THREE.Color(0xe57d72);
const BAR_COLOR_L = new THREE.Color(0x4e1820);
const BAR_COLOR_R = new THREE.Color(0xb45f5c);

function to3(x: number, y: number, z = 0): THREE.Vector3 {
  return new THREE.Vector3((x - SVG_CX) * S, -(y - SVG_CY) * S, z);
}

function extrudeSvgPath(d: string, depth: number): THREE.ExtrudeGeometry {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`;
  const shapes = new SVGLoader().parse(svg).paths.flatMap((p) => p.toShapes());
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.18,
    bevelSize: depth * 0.12,
    bevelSegments: 5,
    curveSegments: 48,
  });
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, (pos.getX(i) - SVG_CX) * S, -(pos.getY(i) - SVG_CY) * S, pos.getZ(i) * S);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function applyVertexXColors(geo: THREE.BufferGeometry, colorL: THREE.Color, colorR: THREE.Color) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  let minX = Infinity, maxX = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  const range = maxX - minX || 1;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getX(i) - minX) / range;
    tmp.lerpColors(colorL, colorR, t);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function buildWaveCurve(): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  let prev = to3(WAVE_START[0], WAVE_START[1]);
  for (const [c1x, c1y, c2x, c2y, ex, ey] of WAVE_SEGS) {
    const c1 = to3(c1x, c1y);
    const c2 = to3(c2x, c2y);
    const end = to3(ex, ey);
    path.add(new THREE.CubicBezierCurve3(prev, c1, c2, end));
    prev = end;
  }
  return path;
}

function buildWaveGeo(): THREE.TubeGeometry {
  const geo = new THREE.TubeGeometry(buildWaveCurve(), 128, WAVE_TUBE_R, 16, false);
  applyVertexXColors(geo, WAVE_COLOR_L, WAVE_COLOR_R);
  return geo;
}

export interface BrandLogoHandle {
  setHover: (h: boolean) => void;
  triggerSpin: () => void;
}

function LogoGroup({ logoRef, reducedMotion }: { logoRef: React.RefObject<BrandLogoHandle | null>; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const waveMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const ringMatRef = useRef<THREE.MeshPhysicalMaterial>(null!);
  const isHovered = useRef(false);
  const spinProgress = useRef(-1);
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCurrent = useRef({ x: 0, y: 0 });
  const pulsePhase = useRef(0);

  useImperativeHandle(logoRef, () => ({
    setHover: (h) => (isHovered.current = h),
    triggerSpin: () => (spinProgress.current = 0),
  }));

  const ringGeo = useMemo(() => extrudeSvgPath(G_RING_D, 28), []);
  const barGeo = useMemo(() => {
    const g = extrudeSvgPath(BAR_D, 28);
    applyVertexXColors(g, BAR_COLOR_L, BAR_COLOR_R);
    return g;
  }, []);
  const waveGeo = useMemo(() => buildWaveGeo(), []);
  const waveStartPos = useMemo(() => to3(WAVE_START[0], WAVE_START[1]), []);
  const waveEndPos = useMemo(() => {
    const last = WAVE_SEGS[WAVE_SEGS.length - 1];
    return to3(last[4], last[5]);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 0.3;
      mouseTarget.current.y = (e.clientY / window.innerHeight - 0.5) * -0.2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [reducedMotion]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const t = performance.now() * 0.001;
    if (!reducedMotion) {
      group.current.position.y = Math.sin(t * 0.6) * 0.08;
      group.current.rotation.y = Math.sin(t * 0.3) * 0.06;
    }
    mouseCurrent.current.x += (mouseTarget.current.x - mouseCurrent.current.x) * 0.05;
    mouseCurrent.current.y += (mouseTarget.current.y - mouseCurrent.current.y) * 0.05;
    group.current.rotation.x = mouseCurrent.current.y * 0.4;
    group.current.rotation.y += mouseCurrent.current.x * 0.4;
    if (ringMatRef.current) {
      const targetEnv = isHovered.current ? 3.0 : 1.8;
      ringMatRef.current.envMapIntensity += (targetEnv - ringMatRef.current.envMapIntensity) * 0.08;
    }
    if (waveMatRef.current && !reducedMotion) {
      pulsePhase.current += delta * 1.2;
      const pulse = 0.8 + Math.sin(pulsePhase.current) * 0.4;
      waveMatRef.current.emissiveIntensity = isHovered.current ? pulse * 1.6 : pulse;
    }
    if (spinProgress.current >= 0) {
      spinProgress.current += delta * 2.5;
      group.current.rotation.y = spinProgress.current * Math.PI * 2;
      if (spinProgress.current >= 1) {
        spinProgress.current = -1;
        group.current.rotation.y = 0;
      }
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={ringGeo}>
        <meshPhysicalMaterial ref={ringMatRef} color="#16162a" metalness={0.95} roughness={0.12} clearcoat={1} clearcoatRoughness={0.06} envMapIntensity={1.8} />
      </mesh>
      <mesh geometry={barGeo}>
        <meshPhysicalMaterial vertexColors metalness={0.88} roughness={0.18} clearcoat={0.7} clearcoatRoughness={0.1} envMapIntensity={1.5} />
      </mesh>
      <mesh geometry={waveGeo} position={[0, 0, 0.18]}>
        <meshStandardMaterial ref={waveMatRef} vertexColors emissive="#e5484d" emissiveIntensity={1} toneMapped={false} metalness={0.2} roughness={0.4} />
      </mesh>
      <mesh position={[waveStartPos.x, waveStartPos.y, 0.18]}>
        <sphereGeometry args={[WAVE_TUBE_R, 16, 16]} />
        <meshStandardMaterial color="#b82a2a" emissive="#e5484d" emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      <mesh position={[waveEndPos.x, waveEndPos.y, 0.18]}>
        <sphereGeometry args={[WAVE_TUBE_R, 16, 16]} />
        <meshStandardMaterial color="#e57d72" emissive="#e5484d" emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ShieldShards({ reducedMotion }: { reducedMotion: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const count = 8;
  const shards = useMemo(() => Array.from({ length: count }, () => ({
    pos: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2 - 1),
    vel: new THREE.Vector3((Math.random() - 0.5) * 0.003, (Math.random() - 0.5) * 0.003, 0),
    phase: Math.random() * Math.PI * 2,
    scale: 0.02 + Math.random() * 0.03,
  })), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current || reducedMotion) return;
    const t = performance.now() * 0.001;
    for (let i = 0; i < count; i++) {
      const s = shards[i];
      s.pos.add(s.vel);
      s.pos.x += Math.sin(t + s.phase) * 0.001;
      s.pos.y += Math.cos(t * 0.7 + s.phase) * 0.001;
      if (s.pos.x > 4) s.pos.x = -4;
      if (s.pos.x < -4) s.pos.x = 4;
      if (s.pos.y > 3) s.pos.y = -3;
      if (s.pos.y < -3) s.pos.y = 3;
      dummy.position.copy(s.pos);
      dummy.scale.setScalar(s.scale);
      dummy.rotation.set(t + s.phase, t * 0.5 + s.phase, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#e5484d" emissive="#e5484d" emissiveIntensity={0.6} toneMapped={false} transparent opacity={0.7} />
    </instancedMesh>
  );
}

function Stars({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = -Math.random() * 15 - 3;
    }
    return pos;
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current || reducedMotion) return;
    pointsRef.current.rotation.y = performance.now() * 0.00002;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#c7d2fe" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Scene({ logoRef, reducedMotion, isMobile }: { logoRef: React.RefObject<BrandLogoHandle | null>; reducedMotion: boolean; isMobile: boolean }) {
  return (
    <>
      <ambientLight intensity={0.15} color="#8890b0" />
      <directionalLight position={[5, 4, 3]} intensity={1.2} color="#ffeedd" />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#6eaaff" />
      <pointLight position={[0, 0, 2]} intensity={0.4} color="#e5484d" distance={8} />
      <Stars count={isMobile ? 120 : 280} reducedMotion={reducedMotion} />
      <ShieldShards reducedMotion={reducedMotion} />
      <LogoGroup logoRef={logoRef} reducedMotion={reducedMotion} />
      <Environment resolution={128} background={false}>
        <mesh scale={50}><sphereGeometry /><meshBasicMaterial color="#06070e" side={THREE.BackSide} /></mesh>
        <mesh position={[8, 6, -4]}><sphereGeometry args={[1.5, 16, 16]} /><meshBasicMaterial color="#ff8a5c" /></mesh>
        <mesh position={[-6, 3, 6]}><sphereGeometry args={[1, 16, 16]} /><meshBasicMaterial color="#3b82f6" /></mesh>
        <mesh position={[0, -4, 5]}><sphereGeometry args={[0.6, 16, 16]} /><meshBasicMaterial color="#e5484d" /></mesh>
      </Environment>
      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.65} luminanceSmoothing={0.15} mipmapBlur />
      </EffectComposer>
    </>
  );
}

interface BrandLogoCanvasProps {
  onLoaded?: () => void;
  fallback: ReactNode;
}

export const BrandLogoCanvas = forwardRef<BrandLogoHandle, BrandLogoCanvasProps>(
  function BrandLogoCanvas({ onLoaded, fallback }, ref) {
    const innerRef = useRef<BrandLogoHandle>(null);
    const [ready, setReady] = useState(false);
    const [hasWebGL, setHasWebGL] = useState(true);

    useImperativeHandle(ref, () => ({
      setHover: (h) => innerRef.current?.setHover(h),
      triggerSpin: () => innerRef.current?.triggerSpin(),
    }));

    useEffect(() => {
      try {
        const c = document.createElement("canvas");
        const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
        if (!gl) setHasWebGL(false);
      } catch { setHasWebGL(false); }
    }, []);

    useEffect(() => { if (ready) onLoaded?.(); }, [ready, onLoaded]);

    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;

    if (!hasWebGL || reducedMotion) return <>{fallback}</>;

    return (
      <div className="relative h-full w-full" aria-label="GuardRail logo" role="img">
        {!ready && <>{fallback}</>}
        <Canvas
          dpr={[1, isMobile ? 1.25 : 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, outputColorSpace: THREE.SRGBColorSpace }}
          camera={{ position: [0, 0, 7.5], fov: 40, near: 0.1, far: 100 }}
          onCreated={() => setReady(true)}
          style={{ opacity: ready ? 1 : 0, transition: "opacity 0.6s ease" }}
        >
          <Scene logoRef={innerRef} reducedMotion={reducedMotion} isMobile={isMobile} />
        </Canvas>
      </div>
    );
  }
);
