"use client";
import React, { useState, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, PerspectiveCamera, QuadraticBezierLine, Float } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { BoxSelect, Layers, Zap } from "lucide-react";
import { LanternUser } from "@/app/lantern/page";
import { useRouter } from "next/navigation";

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
            {/* TOGGLE SWITCH */}
            <div className="absolute top-6 right-6 z-[100] flex bg-[var(--bg-dark)]/80 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--border-color)] shadow-2xl">
                <button
                    onClick={() => setIs3D(false)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${!is3D ? 'bg-[var(--accent-teal)] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    <BoxSelect size={14} /> 2D Map
                </button>
                <button
                    onClick={() => setIs3D(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${is3D ? 'bg-[var(--accent-teal)] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    <Layers size={14} /> 3D Void
                </button>
            </div>

            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 120]} fov={30} />
                <ambientLight intensity={0.4} />
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

function SingleLantern({ user, is3D, isHovered, setHovered, clearHover, isSelf }: SingleLanternProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const router = useRouter();
    const xPos = (user.gridX - 6) * 12 + (user.jitterX / 8);
    const yPos = (user.gridY - 6) * 12 + (user.jitterY / 8);
    const targetZ = is3D ? (user.hours / 10) - 20 : 0;
    const [startPos] = useState<[number, number, number]>([xPos, yPos, targetZ]);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, delta * 5);
        }
    });

    const baseColor = isSelf ? "#ff007f" : (user.status === 'flowstate' ? '#2dd4bf' : '#fbbf24');

    return (
        <group ref={groupRef} position={startPos}>
            <Float speed={isSelf ? 3 : 1.5} rotationIntensity={0.5} floatIntensity={isHovered ? 3 : 1}>
                {isSelf && (
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[1.5, 0.04, 16, 100]} />
                        <meshStandardMaterial color={baseColor} emissive={baseColor} emissiveIntensity={10} toneMapped={false} />
                    </mesh>
                )}

                <mesh ref={meshRef} onPointerOver={(e) => { e.stopPropagation(); setHovered(); }} onPointerOut={() => clearHover()}>
                    <sphereGeometry args={[isSelf ? 1.2 : (isHovered ? 1.0 : 0.6), 32, 32]} />
                    <meshStandardMaterial color={baseColor} emissive={baseColor} emissiveIntensity={isSelf ? 8 : (isHovered ? 5 : 2)} toneMapped={false} />
                </mesh>

                {/* 👇 FIXED: whitespace-nowrap added, positioned slightly higher */}
                {isSelf && !isHovered && (
                    <Html position={[0, 3.5, 0]} center zIndexRange={[100, 0]}>
                        <span className="whitespace-nowrap text-[9px] font-black text-[var(--accent-teal)] tracking-[0.2em] uppercase bg-[var(--bg-dark)]/80 px-3 py-1 rounded-full border border-[var(--accent-teal)]/30 backdrop-blur-md">
                            North Star
                        </span>
                    </Html>
                )}
            </Float>

            {/* 👇 FIXED: Beautiful Glassmorphic Tooltip anchored higher to prevent clipping */}
            <AnimatePresence>
                {isHovered && (
                    <Html distanceFactor={is3D ? 30 : 45} position={[0, 5, 0]} center zIndexRange={[100, 0]} className="pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-[var(--bg-card)]/95 backdrop-blur-xl border border-[var(--border-color)] p-5 rounded-3xl shadow-2xl w-64 pointer-events-auto"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-[var(--text-main)] font-black text-sm">{isSelf ? "You (Architect)" : user.name}</h3>
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold mt-1">{user.chumLabel}</p>
                                </div>
                                <div className="text-2xl drop-shadow-lg">{user.chumLabel.split(' ')[0]}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 bg-[var(--bg-dark)]/50 p-3 rounded-2xl border border-[var(--border-color)] mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[8px] uppercase font-black text-[var(--text-muted)] tracking-wider mb-1">Legacy</span>
                                    <span className="text-xs font-mono font-bold text-[var(--accent-teal)]">{user.hours}h</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[8px] uppercase font-black text-[var(--text-muted)] tracking-wider mb-1">State</span>
                                    <span className={`text-xs font-bold uppercase ${user.status === 'flowstate' ? 'text-[var(--accent-teal)]' : 'text-[var(--accent-yellow)]'}`}>
                                        {user.status}
                                    </span>
                                </div>
                            </div>

                            {!isSelf && user.isHosting && (
                                <button
                                    onClick={() => router.push(`/room/${user.roomCode}`)}
                                    className="w-full mt-4 py-3 bg-[var(--accent-teal)] text-black text-xs font-black tracking-wide rounded-xl shadow-lg hover:scale-105 transition-all active:scale-95 pointer-events-auto"
                                >
                                    Join Room [{user.roomCode}]
                                </button>
                            )}
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