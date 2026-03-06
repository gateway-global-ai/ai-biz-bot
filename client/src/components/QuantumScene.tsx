/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, Stars, Environment, Icosahedron } from "@react-three/drei";
import * as THREE from "three";

const ConnectionLines = ({ count = 90 }: { count?: number }) => {
  const { positions, colors } = useMemo(() => {
    const posArray: number[] = [];
    const colArray: number[] = [];
    const color1 = new THREE.Color("#1D4ED8");
    const color2 = new THREE.Color("#3B82F6");
    const color3 = new THREE.Color("#60A5FA");

    for (let i = 0; i < count; i++) {
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 10
      );
      const end = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 10
      );

      posArray.push(start.x, start.y, start.z);
      posArray.push(end.x, end.y, end.z);

      const col = i % 3 === 0 ? color1 : i % 3 === 1 ? color2 : color3;
      colArray.push(col.r, col.g, col.b);
      colArray.push(col.r, col.g, col.b);
    }

    return {
      positions: new Float32Array(posArray),
      colors: new Float32Array(colArray),
    };
  }, [count]);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.35} />
    </lineSegments>
  );
};

interface NodeProps {
  position: [number, number, number];
  color: string;
  size?: number;
}

const Node: React.FC<NodeProps> = ({ position, color, size = 1 }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.scale.setScalar(
        size + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1 * size
      );
    }
  });
  return (
    <Sphere ref={ref} args={[0.2, 16, 16]} position={position}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        toneMapped={false}
      />
    </Sphere>
  );
};

export const NetworkScene: React.FC = () => {
  const distantPositions = useMemo(
    () =>
      [...Array(38)].map(() => [
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 10,
      ] as [number, number, number]),
    []
  );

  return (
    <div className="absolute inset-0 z-0 w-full h-full pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <fog attach="fog" args={["#0B1120", 4, 22]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#3B82F6" />
        <pointLight position={[-8, 5, 5]} intensity={0.4} color="#0EA5E9" />

        <group rotation={[0, 0, Math.PI / 8]}>
          <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
            <Node position={[0, 0, 0]} color="#FFFFFF" size={1.5} />
            <Node position={[-2, 1, -1]} color="#3B82F6" />
            <Node position={[2, -1, 1]} color="#1D4ED8" />
            <Node position={[0, 3, -2]} color="#60A5FA" />
            <Node position={[-3, -2, 0]} color="#2563EB" />
            <Node position={[3, 2, -1]} color="#0EA5E9" />
            <Node position={[-1, -3, 1]} color="#38BDF8" />

            {distantPositions.map((pos, i) => (
              <Node key={i} position={pos} color="#1E40AF" size={0.5} />
            ))}

            <ConnectionLines count={95} />
          </Float>
        </group>

        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export const CoreScene: React.FC = () => {
  return (
    <div className="w-full h-full absolute inset-0 opacity-40 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />

        <Float rotationIntensity={0.5} floatIntensity={0.2} speed={2}>
          <Icosahedron args={[1.5, 1]}>
            <meshStandardMaterial color="#1D4ED8" wireframe />
          </Icosahedron>
          <Icosahedron args={[1.2, 0]}>
            <meshStandardMaterial
              color="#60A5FA"
              emissive="#2563EB"
              emissiveIntensity={0.5}
              transparent
              opacity={0.6}
            />
          </Icosahedron>
        </Float>

        <Stars
          radius={50}
          depth={50}
          count={2000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
      </Canvas>
    </div>
  );
};

/** Default export: use as the dynamic hero background (NetworkScene). */
export default function QuantumScene() {
  return <NetworkScene />;
}
