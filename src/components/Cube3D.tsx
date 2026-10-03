import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CubeState, Color, Move } from '../logic/CubeState';

interface Cube3DProps {
    cubeState: CubeState;
    move?: Move | null;
    animationId?: number;
}

type Axis = 'x' | 'y' | 'z';

interface PendingAnimation {
    cube: CubeState;
    move: Move;
}

interface ActiveAnimation extends PendingAnimation {
    startedAt: number;
}

const TURN_DURATION_MS = 220;
const MAX_PENDING_ANIMATIONS = 20;

// Mapeia os códigos de cor para Hexadecimais.
const COLORS: Record<Color, string> = {
    'W': '#ffffff',
    'Y': '#ffff00',
    'G': '#00ff00',
    'B': '#0000ff',
    'R': '#ff0000',
    'O': '#ff8800',
};

// O sentido do giro segue exatamente a convenção usada pelo CubeState.
const MOVE_ANIMATIONS: Record<Move, { axis: Axis; angle: number }> = {
    'U':  { axis: 'y', angle: -Math.PI / 2 },
    "U'": { axis: 'y', angle:  Math.PI / 2 },
    'D':  { axis: 'y', angle:  Math.PI / 2 },
    "D'": { axis: 'y', angle: -Math.PI / 2 },
    'L':  { axis: 'x', angle:  Math.PI / 2 },
    "L'": { axis: 'x', angle: -Math.PI / 2 },
    'R':  { axis: 'x', angle: -Math.PI / 2 },
    "R'": { axis: 'x', angle:  Math.PI / 2 },
    'F':  { axis: 'z', angle: -Math.PI / 2 },
    "F'": { axis: 'z', angle:  Math.PI / 2 },
    'B':  { axis: 'z', angle:  Math.PI / 2 },
    "B'": { axis: 'z', angle: -Math.PI / 2 },
};

const getBaseMove = (move: Move) => move.replace("'", "") as Move;

const isStickerInLayer = (
    position: [number, number, number],
    move: Move
): boolean => {
    switch (getBaseMove(move)) {
        case 'U':
            return position[1] > 0.9;
        case 'D':
            return position[1] < -0.9;
        case 'L':
            return position[0] < -0.9;
        case 'R':
            return position[0] > 0.9;
        case 'F':
            return position[2] > 0.9;
        case 'B':
            return position[2] < -0.9;
        default:
            return false;
    }
};

const easeInOutCubic = (t: number): number =>
    t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Componente individual de cada "adesivo" colorido do cubo.
const Sticker = ({
    color,
    position,
    rotation,
}: {
    color: Color;
    position: [number, number, number];
    rotation: [number, number, number];
}) => {
    return (
        <mesh position={position} rotation={rotation}>
            <boxGeometry args={[0.9, 0.9, 0.05]} />
            <meshStandardMaterial
                color={COLORS[color]}
                emissive={COLORS[color]}
                emissiveIntensity={0.15}
                roughness={0.3}
                metalness={0.15}
            />
        </mesh>
    );
};

export const Cube3D: React.FC<Cube3DProps> = ({
    cubeState,
    move = null,
    animationId = 0,
}) => {
    const [displayState, setDisplayState] = useState<CubeState>(() => cubeState.clone());
    const [activeMove, setActiveMove] = useState<Move | null>(null);

    const groupRef = useRef<THREE.Group>(null);
    const turnGroupRef = useRef<THREE.Group>(null);
    const pendingRef = useRef<PendingAnimation[]>([]);
    const activeAnimationRef = useRef<ActiveAnimation | null>(null);

    // Renderizamos 6 faces x 9 adesivos = 54 adesivos.
    // Mapeamento: 0: U (Topo), 1: L (Esq), 2: F (Frente), 3: R (Dir), 4: B (Trás), 5: D (Baixo)
    const faces = useMemo(() => {
        const stickers = [];

        // Face U (Topo)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: displayState.state[0][r][c],
                    pos: [(c - 1) * 1.0, 1.55, (r - 1) * 1.0] as [number, number, number],
                    rot: [-Math.PI / 2, 0, 0] as [number, number, number],
                });
            }
        }

        // Face L (Esquerda)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: displayState.state[1][r][c],
                    pos: [-1.55, (1 - r) * 1.0, (c - 1) * 1.0] as [number, number, number],
                    rot: [0, -Math.PI / 2, 0] as [number, number, number],
                });
            }
        }

        // Face F (Frente)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: displayState.state[2][r][c],
                    pos: [(c - 1) * 1.0, (1 - r) * 1.0, 1.55] as [number, number, number],
                    rot: [0, 0, 0] as [number, number, number],
                });
            }
        }

        // Face R (Direita)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: displayState.state[3][r][c],
                    pos: [1.55, (1 - r) * 1.0, (1 - c) * 1.0] as [number, number, number],
                    rot: [0, Math.PI / 2, 0] as [number, number, number],
                });
            }
        }

        // Face B (Trás)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: displayState.state[4][r][c],
                    pos: [(1 - c) * 1.0, (1 - r) * 1.0, -1.55] as [number, number, number],
                    rot: [0, Math.PI, 0] as [number, number, number],
                });
            }
        }

        // Face D (Baixo)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: displayState.state[5][r][c],
                    pos: [(c - 1) * 1.0, -1.55, (1 - r) * 1.0] as [number, number, number],
                    rot: [Math.PI / 2, 0, 0] as [number, number, number],
                });
            }
        }

        return stickers;
    }, [displayState]);

    const startNextAnimation = () => {
        const next = pendingRef.current.shift();

        if (!next) {
            activeAnimationRef.current = null;
            setActiveMove(null);
            if (turnGroupRef.current) {
                turnGroupRef.current.rotation.set(0, 0, 0);
            }
            return;
        }

        activeAnimationRef.current = {
            ...next,
            startedAt: performance.now(),
        };

        if (turnGroupRef.current) {
            turnGroupRef.current.rotation.set(0, 0, 0);
        }

        setActiveMove(next.move);
    };

    useEffect(() => {
        // Scramble/reset ou atualização sem movimento: aplica imediatamente.
        if (!move) {
            pendingRef.current = [];
            activeAnimationRef.current = null;
            setActiveMove(null);
            turnGroupRef.current?.rotation.set(0, 0, 0);
            setDisplayState(cubeState.clone());
            return;
        }

        pendingRef.current.push({
            cube: cubeState.clone(),
            move,
        });

        // Impede que uma rajada de treinamento deixe a animação minutos atrasada.
        if (pendingRef.current.length > MAX_PENDING_ANIMATIONS) {
            const latest = pendingRef.current[pendingRef.current.length - 1];
            pendingRef.current = [];

            activeAnimationRef.current = null;
            setActiveMove(null);
            turnGroupRef.current?.rotation.set(0, 0, 0);
            setDisplayState(latest.cube.clone());
            return;
        }

        if (!activeAnimationRef.current) {
            startNextAnimation();
        }
    }, [cubeState, move, animationId]);

    useFrame((state) => {
        if (groupRef.current) {
            const elapsed = state.clock.elapsedTime;
            groupRef.current.rotation.y = elapsed * 0.12;
            groupRef.current.rotation.x = Math.sin(elapsed * 0.5) * 0.16;
        }

        const animation = activeAnimationRef.current;
        const turnGroup = turnGroupRef.current;

        if (!animation || !turnGroup) return;

        const config = MOVE_ANIMATIONS[animation.move];
        const progress = Math.min(
            1,
            (performance.now() - animation.startedAt) / TURN_DURATION_MS
        );
        const eased = easeInOutCubic(progress);

        turnGroup.rotation[config.axis] = config.angle * eased;

        if (progress >= 1) {
            activeAnimationRef.current = null;
            turnGroup.rotation.set(0, 0, 0);

            // O novo estado só fica visível quando o giro físico termina.
            setDisplayState(animation.cube.clone());
            setActiveMove(null);

            // Continua a fila no próximo movimento.
            startNextAnimation();
        }
    });

    const animatedFaces = activeMove
        ? faces.filter((s) => isStickerInLayer(s.pos, activeMove))
        : [];

    const staticFaces = activeMove
        ? faces.filter((s) => !isStickerInLayer(s.pos, activeMove))
        : faces;

    return (
        <group ref={groupRef}>
            <mesh>
                <boxGeometry args={[2.95, 2.95, 2.95]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.18} metalness={0.05} />
            </mesh>

            <group ref={turnGroupRef}>
                {animatedFaces.map((s, i) => (
                    <Sticker
                        key={`animated-${i}`}
                        color={s.color}
                        position={s.pos}
                        rotation={s.rot}
                    />
                ))}
            </group>

            {staticFaces.map((s, i) => (
                <Sticker
                    key={`static-${i}`}
                    color={s.color}
                    position={s.pos}
                    rotation={s.rot}
                />
            ))}
        </group>
    );
};
