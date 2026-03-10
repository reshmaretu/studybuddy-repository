"use client";
import React, { useState, useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, PerspectiveCamera, QuadraticBezierLine, Float, Points, PointMaterial } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { BoxSelect, Layers, Zap } from "lucide-react";
import { LanternUser } from "@/app/lantern/page";
import { useRouter } from "next/navigation";
import * as random from 'maath/random/dist/maath-random.esm';

// --- CONFIG & UTILS ---

const STATUS_CONFIG: Record<LanternUser['status'], { color: string; emissive: number; scale: number; pulse: number }> = {
    offline: { color: '#555522', emissive: 0.5, scale: 0.4, pulse: 0 },
    idle: { color: '#ffcc00', emissive: 5.0, scale: 0.6, pulse: 1 },
    drafting: { color: '#ffd000', emissive: 6.0, scale: 0.6, pulse: 2 },
    hosting: { color: '#ffff00', emissive: 18.0, scale: 0.9, pulse: 4 }, // Pure Yellow
    joined: { color: '#ffff33', emissive: 10.0, scale: 0.8, pulse: 3 },
    flowstate: { color: '#00ffff', emissive: 25.0, scale: 0.8, pulse: 6 }, // Cyan/Teal
    cafe: { color: '#ff8800', emissive: 8.0, scale: 0.7, pulse: 1.5 },
    mastering: { color: '#ff00ff', emissive: 18.0, scale: 0.7, pulse: 5 }  // Magenta
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

// --- COMPONENTS ---

export default function ThreeLanternNet({ users }: { users: LanternUser[] }) {
    const [is3D, setIs3D] = useState(false);
    const [warpTarget, setWarpTarget] = useState<THREE.Vector3 | null>(null);
    const controlsRef = useRef<any>(null);

    const [globalIntensity, setGlobalIntensity] = useState(0);

    // 2. THE POWER UP LOGIC
    useEffect(() => {
        let current = 0;
        const target = 1.8; // The "Sweet Spot" for brightness
        const interval = setInterval(() => {
            if (current >= target) {
                clearInterval(interval);
                return;
            }
            current += 0.04; // Speed of the power-up
            setGlobalIntensity(current);
        }, 30); // Runs every 30ms

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full bg-[#05080c] relative group">
            {/* --- TOOLBAR --- */}
            <div className="absolute top-6 right-6 z-[100] flex flex-col gap-3 items-end">
                <div className="flex bg-[var(--bg-dark)]/80 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--border-color)] shadow-2xl">
                    <button onClick={() => setIs3D(false)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${!is3D ? 'bg-[var(--accent-teal)] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><BoxSelect size={14} /> 2D Map</button>
                    <button onClick={() => setIs3D(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${is3D ? 'bg-[var(--accent-teal)] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Layers size={14} /> 3D Void</button>
                </div>

                {/* --- BRIGHTNESS SLIDER --- */}
                <div className="flex items-center gap-3 bg-[var(--bg-dark)]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-[var(--border-color)] shadow-xl">
                    <Zap size={14} className="text-[var(--accent-yellow)]" />
                    <input
                        type="range" min="0.5" max="4.0" step="0.1"
                        value={globalIntensity}
                        onChange={(e) => setGlobalIntensity(parseFloat(e.target.value))}
                        className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent-teal)]"
                    />
                </div>
            </div>

            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 120]} fov={30} />
                <FloatingParticles />
                <GlobalPulse />
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#2dd4bf" />
                <LanternConstellation users={users} is3D={is3D} onWarp={setWarpTarget} />
                <CameraRig is3D={is3D} controlsRef={controlsRef} warpTarget={warpTarget} intensity={globalIntensity} onWarpComplete={() => setWarpTarget(null)} />
                <OrbitControls
                    ref={controlsRef}
                    enableRotate={is3D}
                    enablePan={true}
                    enableZoom={true}
                    enableDamping={true}
                    dampingFactor={0.2}
                    makeDefault
                    mouseButtons={{
                        LEFT: is3D ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
                        MIDDLE: THREE.MOUSE.DOLLY,
                        RIGHT: THREE.MOUSE.PAN
                    }}
                />
            </Canvas>
        </div>
    );
}

function LanternConstellation({ users, is3D, onWarp }: { users: LanternUser[], is3D: boolean, onWarp: (v: THREE.Vector3) => void }) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const getPos = (user: LanternUser): [number, number, number] => {
        const zPos = is3D ? (user.hours / 10) - 20 : 0;
        return [(user.gridX - 6) * 12 + (user.jitterX / 8), (user.gridY - 6) * 12 + (user.jitterY / 8), zPos];
    };

    const me = users.find(u => u.id === 'me');
    const myPos: [number, number, number] = me ? getPos(me) : [0, 0, 0];

    return (
        <group>
            {users.map((user) => {
                const isSelf = user.id === 'me';
                const userPos = getPos(user);
                const isConnected = !isSelf && (user.status === 'hosting' || user.status === 'joined');
                return (
                    <React.Fragment key={user.id}>
                        <SingleLantern
                            user={user}
                            is3D={is3D}
                            isSelf={isSelf}
                            isHovered={hoveredId === user.id}
                            isSelected={selectedId === user.id}
                            setHovered={() => setHoveredId(user.id)}
                            clearHover={() => setHoveredId(null)}
                            onClick={() => {
                                setSelectedId(user.id);
                                const pos = getPos(user);
                                onWarp(new THREE.Vector3(pos[0], pos[1], pos[2]));
                            }}
                        />
                        {isConnected && (
                            <QuadraticBezierLine
                                start={myPos} end={userPos} mid={[(myPos[0] + userPos[0]) / 2, (myPos[1] + userPos[1]) / 2 + (is3D ? 15 : 0), (myPos[2] + userPos[2]) / 2 + (is3D ? 10 : 0)] as [number, number, number]}
                                color={isSelf ? "#ff007f" : "#2dd4bf"}
                                lineWidth={user.status === 'hosting' ? 2 + Math.sin(Date.now() * 0.005) * 1 : 1}
                                transparent opacity={user.status === 'hosting' ? 0.6 + Math.sin(Date.now() * 0.005) * 0.2 : 0.3}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </group>
    );
}

function SingleLantern({ user, is3D, isHovered, isSelected, onClick, isSelf, intensity, setHovered, clearHover }: any) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    const spriteRef = useRef<THREE.Sprite>(null);
    const groupRef = useRef<THREE.Group>(null);
    const router = useRouter();
    const glowTexture = useMemo(() => createGlowTexture(), []);

    const xPos = (user.gridX - 6) * 12 + (user.jitterX / 8);
    const yPos = (user.gridY - 6) * 12 + (user.jitterY / 8);
    const targetZ = is3D ? (user.hours / 10) - 20 : 0;

    useFrame((state, delta) => {
        if (!meshRef.current || !materialRef.current || !spriteRef.current || !groupRef.current) return;

        const statusKey = user.status as keyof typeof STATUS_CONFIG;
        const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.idle;

        groupRef.current.position.set(xPos, yPos, THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, delta * 5));
        const baseIntensity = (isHovered || isSelected ? config.emissive + 5 : config.emissive) * intensity; 4

        const pulse = Math.sin(state.clock.elapsedTime * config.pulse) * 0.2 + 1;
        const targetColor = new THREE.Color(isSelf ? "#ff007f" : config.color);

        materialRef.current.color.lerp(targetColor, delta * 4);
        materialRef.current.emissive.lerp(targetColor, delta * 4);

        materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
            materialRef.current.emissiveIntensity,
            baseIntensity * pulse,
            delta * 4
        );

        spriteRef.current.material.opacity = THREE.MathUtils.lerp(
            spriteRef.current.material.opacity,
            (baseIntensity > 10 ? 0.6 : 0.2),
            delta * 2
        );

        const s = isHovered || isSelected ? config.scale + 0.2 : config.scale;
        meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), delta * 4);

        const isHighEnergy = ['hosting', 'flowstate', 'mastering'].includes(user.status);
        spriteRef.current.material.opacity = THREE.MathUtils.lerp(spriteRef.current.material.opacity, isHighEnergy ? 0.5 : 0.1, delta * 2);
        spriteRef.current.scale.setScalar(THREE.MathUtils.lerp(spriteRef.current.scale.x, isSelf ? 6 : 4, delta * 2));
        spriteRef.current.material.color.lerp(targetColor, delta * 4);
    });

    return (
        <group ref={groupRef}>
            <Float speed={isSelf ? 3 : 1.5}>
                <sprite ref={spriteRef}>
                    <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
                </sprite>

                <mesh ref={meshRef}
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(); }}
                    onPointerOut={clearHover}
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                >
                    <sphereGeometry args={[1, 32, 32]} />
                    <meshStandardMaterial
                        ref={materialRef}
                        toneMapped={false}
                        transparent={true}
                        roughness={0}
                        metalness={1}
                    />
                </mesh>
            </Float>

            <AnimatePresence>
                {(isHovered || isSelected) && (
                    <Html distanceFactor={is3D ? 30 : 45} position={[0, 5, 0]} center className="pointer-events-none">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            className="bg-[#111111]/95 backdrop-blur-xl border border-white/5 p-5 rounded-3xl shadow-2xl w-64 pointer-events-auto text-white">
                            <div className="flex justify-between items-start mb-4">
                                <div><h3 className="font-black text-sm">{user.name}</h3><p className="text-[10px] text-teal-400 font-bold uppercase">{user.chumLabel}</p></div>
                                <div className="text-2xl">{user.chumLabel.split(' ')[0]}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 bg-black/40 p-3 rounded-2xl border border-white/5">
                                <div className="flex flex-col"><span className="text-[8px] uppercase font-black opacity-40">Total Hours</span><span className="text-xs font-mono font-bold text-teal-400">{user.hours}h</span></div>
                                <div className="flex flex-col text-right"><span className="text-[8px] uppercase font-black opacity-40">Focus Score</span><span className="text-xs font-bold text-[#e8c366]">{user.focusScore || 0}</span></div>
                            </div>
                            {isSelected && !isSelf && (user.status === 'hosting' || user.status === 'joined') && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-[10px] font-black uppercase text-white/40 mb-2">Current Sanctuary</p>
                                    <p className="text-xs font-bold text-white mb-4 italic">"{user.roomTitle || 'Quiet Study'}"</p>
                                    <button onClick={() => router.push(`/room/${user.roomCode}`)} className="w-full py-3 bg-teal-400 text-black text-xs font-black rounded-xl shadow-lg hover:scale-105 transition-all">Join Room [{user.roomCode}]</button>
                                </motion.div>
                            )}
                        </motion.div>
                    </Html>
                )}
            </AnimatePresence>
        </group>
    );
}

function CameraRig({ is3D, controlsRef, warpTarget, onWarpComplete }: any) {
    const isTransitioning = useRef(false);
    useEffect(() => { isTransitioning.current = true; if (controlsRef.current) controlsRef.current.enabled = false; }, [is3D, controlsRef]);

    useFrame((state, delta) => {
        const cam = state.camera as THREE.PerspectiveCamera;
        const speed = delta * 3;
        cam.fov = THREE.MathUtils.lerp(cam.fov, is3D ? 50 : 30, speed);
        cam.updateProjectionMatrix();

        if (warpTarget) {
            const offset = new THREE.Vector3(0, 0, 40);
            const targetPos = warpTarget.clone().add(offset);
            cam.position.lerp(targetPos, speed);
            controlsRef.current.target.lerp(warpTarget, speed);
            controlsRef.current.update();
            if (cam.position.distanceTo(targetPos) < 1) onWarpComplete();
        } else if (isTransitioning.current) {
            const targetPos = is3D ? new THREE.Vector3(0, 0, 80) : new THREE.Vector3(0, 0, 120);
            cam.position.lerp(targetPos, speed);
            controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), speed);
            controlsRef.current.update();
            if (cam.position.distanceTo(targetPos) < 1) { isTransitioning.current = false; controlsRef.current.enabled = true; }
        }
    });
    return null;
}

function PulseWave() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        // Expand and fade a ring every 4 seconds
        const s = (clock.elapsedTime % 4) * 40;
        meshRef.current.scale.setScalar(s);
        const mat = meshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 1 - (s / 100));
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1, 1.1, 64]} />
            <meshBasicMaterial color="#2dd4bf" transparent opacity={0} blending={THREE.AdditiveBlending} />
        </mesh>
    );
}

function GlobalPulse() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        // Ripple every 5 seconds
        const cycle = (clock.elapsedTime % 5) / 5;
        const s = cycle * 150; // Expansion size
        meshRef.current.scale.setScalar(s);

        const mat = meshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.pow(1 - cycle, 2) * 0.3; // Fade out quadratically
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1, 1.05, 64]} />
            <meshBasicMaterial color="#2dd4bf" transparent opacity={0} blending={THREE.AdditiveBlending} />
        </mesh>
    );
}

function FloatingParticles() {
    const ref = useRef<any>(null); // 👈 Fixed
    const [sphere] = useState(() => random.inSphere(new Float32Array(6000), { radius: 100 }));

    useFrame((state, delta) => {
        // 👇 ALWAYS add this check to ensure the ref isn't null during the first frame
        if (!ref.current) return;

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