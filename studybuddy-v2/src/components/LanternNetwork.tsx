"use client";
import React, { useState, useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, PerspectiveCamera, QuadraticBezierLine, Float } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { BoxSelect, Layers, Zap } from "lucide-react";
import { LanternUser } from "@/app/lantern/page";
import { useRouter } from "next/navigation";
import { Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';

interface SingleLanternProps {
    user: LanternUser;
    is3D: boolean;
    isHovered: boolean;
    isSelf: boolean;
    setHovered: () => void;
    clearHover: () => void;
}

export default function ThreeLanternNet({ users }: { users: LanternUser[] }) {
    const [is3D, setIs3D] = useState(false);
    const controlsRef = useRef<any>(null);

    return (
        <div className="w-full h-full bg-[#05080c] relative group">
            <div className="absolute top-6 right-6 z-[100] flex bg-[var(--bg-dark)]/80 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--border-color)] shadow-2xl">
                <button onClick={() => setIs3D(false)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${!is3D ? 'bg-[var(--accent-teal)] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><BoxSelect size={14} /> 2D Map</button>
                <button onClick={() => setIs3D(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${is3D ? 'bg-[var(--accent-teal)] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Layers size={14} /> 3D Void</button>
            </div>

            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 120]} fov={30} />
                <FloatingParticles />
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#2dd4bf" />

                <LanternConstellation users={users} is3D={is3D} />
                <CameraRig is3D={is3D} controlsRef={controlsRef} />

                <OrbitControls
                    ref={controlsRef}
                    enableRotate={is3D}
                    enablePan={true}
                    enableZoom={true}
                    makeDefault
                    mouseButtons={{
                        LEFT: is3D ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
                        MIDDLE: THREE.MOUSE.DOLLY,
                        RIGHT: is3D ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE
                    }}
                />
            </Canvas>
        </div>
    );
}

function LanternConstellation({ users, is3D }: { users: LanternUser[], is3D: boolean }) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const getPos = (user: LanternUser): [number, number, number] => {
        const zPos = is3D ? (user.hours / 10) - 20 : 0;
        return [
            (user.gridX - 6) * 12 + (user.jitterX / 8),
            (user.gridY - 6) * 12 + (user.jitterY / 8),
            zPos
        ];
    };

    const me = users.find(u => u.id === 'me');
    const myPos: [number, number, number] = me ? getPos(me) : [0, 0, 0];

    return (
        <group>
            {users.map((user) => {
                const isSelf = user.id === 'me';
                const userPos = getPos(user);
                const isConnected = !isSelf && user.isHosting;

                return (
                    <React.Fragment key={user.id}>
                        <SingleLantern
                            user={user}
                            is3D={is3D}
                            isHovered={hoveredId === user.id}
                            setHovered={() => setHoveredId(user.id)}
                            clearHover={() => setHoveredId(null)}
                            isSelf={isSelf}
                        />

                        {isConnected && (
                            <QuadraticBezierLine
                                start={myPos}
                                end={userPos}
                                mid={[
                                    (myPos[0] + userPos[0]) / 2,
                                    (myPos[1] + userPos[1]) / 2 + (is3D ? 15 : 0),
                                    (myPos[2] + userPos[2]) / 2 + (is3D ? 10 : 0)
                                ] as [number, number, number]}
                                color="#ff4d8d"
                                lineWidth={1.5}
                                dashed={false}
                                transparent
                                opacity={0.4}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </group>
    );
}

const STATUS_CONFIG: Record<string, { color: string, emissive: number, scale: number, pulse: number }> = {
    offline: { color: '#4a4a22', emissive: 0.2, scale: 0.4, pulse: 0 },
    idle: { color: '#fbbf24', emissive: 1.5, scale: 0.6, pulse: 1 },
    drafting: { color: '#fbbf24', emissive: 2.0, scale: 0.6, pulse: 2 },
    hosting: { color: '#fde047', emissive: 6.0, scale: 0.9, pulse: 4 },
    joined: { color: '#fde047', emissive: 4.0, scale: 0.8, pulse: 3 },
    flowstate: { color: '#2dd4bf', emissive: 8.0, scale: 0.8, pulse: 6 },
    cafe: { color: '#f97316', emissive: 4.0, scale: 0.7, pulse: 1.5 },
    mastering: { color: '#c084fc', emissive: 7.0, scale: 0.7, pulse: 5 }
};

const createGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
};

function SingleLantern({ user, is3D, isHovered, setHovered, clearHover, isSelf }: SingleLanternProps) {
    // 👇 FIXED: Added null to every ref
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    const spriteRef = useRef<THREE.Sprite>(null);
    const groupRef = useRef<THREE.Group>(null);

    // 👇 FIXED: Added null to FloatingParticles ref if you used it there
    const particlesRef = useRef<any>(null);

    const glowTexture = useMemo(() => createGlowTexture(), []);

    useFrame((state, delta) => {
        // 👇 FIXED: The "possibly null" check - safety first!
        if (!meshRef.current || !materialRef.current || !spriteRef.current) return;
        const config = STATUS_CONFIG[user.status] || STATUS_CONFIG.idle;
        const speed = delta * 4; // Transition speed

        // 1. Smooth Color Transition
        const targetColor = new THREE.Color(isSelf ? "#ff007f" : config.color);
        materialRef.current.color.lerp(targetColor, speed);
        materialRef.current.emissive.lerp(targetColor, speed);

        // 2. Dynamic Glow & Pulsing
        const pulse = Math.sin(state.clock.elapsedTime * config.pulse) * 0.2 + 1;
        const targetIntensity = isSelf ? 10 : (isHovered ? config.emissive + 2 : config.emissive);
        materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
            materialRef.current.emissiveIntensity,
            targetIntensity * pulse,
            speed
        );

        // 3. Scale Transition
        const targetScale = isHovered ? config.scale + 0.2 : config.scale;
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), speed);
    });

    return (
        <group /* ... existing position logic ... */>
            <mesh ref={meshRef} onPointerOver={setHovered} onPointerOut={clearHover}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial ref={materialRef} toneMapped={false} />
            </mesh>

            {/* Tooltip Fix: Split the string to show the emoji and label correctly */}
            <AnimatePresence>
                {isHovered && (
                    <Html /* ... */>
                        <motion.div className="...">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="...">{isSelf ? "You" : user.name}</h3>
                                    {/* Displays real Chum Label from DB */}
                                    <p className="text-[10px] text-teal-400 font-bold uppercase">{user.chumLabel}</p>
                                </div>
                                <div className="text-2xl">{user.chumLabel.split(' ')[0]}</div>
                            </div>
                            {/* ... Rest of stats ... */}
                        </motion.div>
                    </Html>
                )}
            </AnimatePresence>
        </group>
    );
}

function CameraRig({ is3D, controlsRef }: { is3D: boolean, controlsRef: React.MutableRefObject<any> }) {
    const isTransitioning = useRef(false);

    React.useEffect(() => {
        isTransitioning.current = true;
        if (controlsRef.current) {
            controlsRef.current.enabled = false;
        }
    }, [is3D, controlsRef]);

    useFrame((state, delta) => {
        const cam = state.camera as THREE.PerspectiveCamera;
        const smoothSpeed = delta * 2.5;

        cam.fov = THREE.MathUtils.lerp(cam.fov, is3D ? 50 : 30, smoothSpeed);
        cam.updateProjectionMatrix();

        if (isTransitioning.current) {
            const targetPos = is3D ? new THREE.Vector3(0, 0, 80) : new THREE.Vector3(0, 0, 120);
            const targetLook = new THREE.Vector3(0, 0, 0);

            cam.position.lerp(targetPos, smoothSpeed);

            if (controlsRef.current) {
                controlsRef.current.target.lerp(targetLook, smoothSpeed);
                controlsRef.current.update();
            }

            if (cam.position.distanceTo(targetPos) < 1.0) {
                cam.position.copy(targetPos);

                if (controlsRef.current) {
                    controlsRef.current.target.copy(targetLook);
                    controlsRef.current.update();
                    controlsRef.current.enabled = true;
                }
                isTransitioning.current = false;
            }
        }
    });
    return null;
}

function FloatingParticles() {
    const ref = useRef<any>();
    // Generate 2000 points in a sphere of radius 100
    const [sphere] = useState(() => random.inSphere(new Float32Array(6000), { radius: 100 }));

    useFrame((state, delta) => {
        // Slowly rotate the entire particle field
        ref.current.rotation.x -= delta / 15;
        ref.current.rotation.y -= delta / 20;
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
                <PointMaterial
                    transparent
                    color="#2dd4bf"
                    size={0.15}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.2}
                    blending={THREE.AdditiveBlending}
                />
            </Points>
        </group>
    );
}