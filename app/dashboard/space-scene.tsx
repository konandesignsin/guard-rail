"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const earthFragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D specularMap;
  uniform sampler2D bumpMap;
  uniform vec3 sunDirection;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vec3 normal = normalize(vNormal);
    float sunDot = dot(normal, sunDirection);
    float dayFactor = smoothstep(-0.15, 0.25, sunDot);
    
    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);
    vec4 specColor = texture2D(specularMap, vUv);
    
    vec4 finalColor = mix(nightColor, dayColor, dayFactor);
    
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(sunDirection + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
    finalColor.rgb += specColor.rgb * spec * 0.4 * dayFactor;
    
    finalColor.rgb += nightColor.rgb * 0.1;
    
    gl_FragColor = finalColor;
  }
`;

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 sunDirection;
  
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 normal = normalize(vNormal);
    
    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    float sunDot = dot(normal, sunDirection);
    
    vec3 darkSideColor = vec3(0.3, 0.4, 0.9);
    vec3 litSideColor = vec3(1.0, 0.54, 0.36);
    vec3 atmosphereColor = mix(darkSideColor, litSideColor, smoothstep(-0.2, 0.5, sunDot));
    
    float alpha = fresnel * 0.8;
    
    gl_FragColor = vec4(atmosphereColor, alpha);
  }
`;

function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  
  const [dayTexture, nightTexture, specularMap, bumpMap, cloudsTexture] = useLoader(
    THREE.TextureLoader,
    ["/textures/earth-day.png", "/textures/earth-night.png", "/textures/earth-specular.png", "/textures/earth-bump.png", "/textures/earth-clouds.png"]
  );
  
  const sunDirection = useMemo(() => new THREE.Vector3(1, 0.3, 0.5).normalize(), []);
  
  const earthUniforms = useMemo(
    () => ({
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      specularMap: { value: specularMap },
      bumpMap: { value: bumpMap },
      sunDirection: { value: sunDirection },
    }),
    [dayTexture, nightTexture, specularMap, bumpMap, sunDirection]
  );
  
  const atmosphereUniforms = useMemo(
    () => ({
      sunDirection: { value: sunDirection },
    }),
    [sunDirection]
  );
  
  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.02;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.025;
    }
  });
  
  return (
    <group position={[0, -1.8, 0]}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[2.2, 64, 64]} />
        <shaderMaterial
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={earthUniforms}
        />
      </mesh>
      
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.23, 64, 64]} />
        <meshStandardMaterial
          map={cloudsTexture}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
      
      <mesh>
        <sphereGeometry args={[2.35, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={atmosphereUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function ShootingStar() {
  const ref = useRef<THREE.Mesh>(null);
  const velocity = useRef(new THREE.Vector3(-0.5, -0.3, 0));
  const nextSpawn = useRef(Math.random() * 10 + 5);
  const time = useRef(0);
  
  useFrame((_, delta) => {
    if (!ref.current) return;
    
    time.current += delta;
    
    if (time.current > nextSpawn.current) {
      ref.current.position.set(
        Math.random() * 20 - 10,
        Math.random() * 5 + 5,
        Math.random() * -10 - 5
      );
      velocity.current.set(-0.5 - Math.random() * 0.3, -0.3 - Math.random() * 0.2, 0);
      time.current = 0;
      nextSpawn.current = Math.random() * 15 + 10;
    }
    
    ref.current.position.x += velocity.current.x * delta * 2;
    ref.current.position.y += velocity.current.y * delta * 2;
    
    if (ref.current.position.y < -10) {
      ref.current.position.y = 100;
    }
  });
  
  return (
    <mesh ref={ref} position={[10, 10, -10]}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
}

function CameraController() {
  const controlsRef = useRef<any>(null);
  
  useFrame(({ mouse }) => {
    if (!controlsRef.current) return;
    
    const isTouchDevice = 'ontouchstart' in window;
    
    if (!isTouchDevice) {
      const targetX = mouse.x * 0.5;
      const targetY = mouse.y * 0.3;
      
      controlsRef.current.object.position.x += (targetX - controlsRef.current.object.position.x) * 0.02;
      controlsRef.current.object.position.y += (targetY - controlsRef.current.object.position.y) * 0.02;
      controlsRef.current.object.lookAt(0, 0, 0);
    }
  });
  
  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enablePan={false}
      enableRotate={false}
      autoRotate
      autoRotateSpeed={0.3}
    />
  );
}

export default function SpaceScene() {
  const isWebGLAvailable = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }, []);
  
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  
  if (!isWebGLAvailable || prefersReducedMotion) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#1a1a3a] to-[#0a0a1a]">
        <div className="absolute inset-0 opacity-30">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      style={{ background: '#000000' }}
    >
      <color attach="background" args={['#000000']} />
      
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 3, 5]} intensity={1.5} color="#ffffff" />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <Earth />
      <ShootingStar />
      
      <CameraController />
    </Canvas>
  );
}
