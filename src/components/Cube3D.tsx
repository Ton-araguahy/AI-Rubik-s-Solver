
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CubeState, Color } from '../logic/CubeState';

interface Cube3DProps {
    cubeState: CubeState;
}

// Mapeia os códigos de cor para Hexadecimais
const COLORS: Record<Color, string> = {
    'W': '#ffffff',
    'Y': '#ffff00',
    'G': '#00ff00',
    'B': '#0000ff',
    'R': '#ff0000',
    'O': '#ff8800',
};

// Componente individual de cada "adesivo" colorido do cubo
const Sticker = ({ color, position, rotation }: { color: Color, position: [number, number, number], rotation: [number, number, number] }) => {
    return (
        <mesh position={position} rotation={rotation}>
            {/* Geometria fina para parecer um adesivo/tampa */}
            <boxGeometry args={[0.9, 0.9, 0.05]} />
            <meshStandardMaterial
                color={COLORS[color]}
                emissive={COLORS[color]} // Brilho próprio (neon)
                emissiveIntensity={0.5}
                roughness={0.2}
                metalness={0.8}
            />
        </mesh>
    );
};

export const Cube3D: React.FC<Cube3DProps> = ({ cubeState }) => {
    // Renderizamos 6 faces x 9 adesivos = 54 adesivos.
    // Mapeamento: 0: U (Topo), 1: L (Esq), 2: F (Frente), 3: R (Dir), 4: B (Trás), 5: D (Baixo)

    // Sistema de Coordenadas 3D (Three.js):
    // x: Esquerda(-1) -> Direita(1)
    // y: Baixo(-1) -> Cima(1)
    // z: Trás(-1) -> Frente(1)

    // Calculamos a posição 3D de cada adesivo com base em índices (linha, coluna)
    const faces = useMemo(() => {
        const stickers = [];

        // Face U (Topo) - Índice 0
        // Posição Y = 1.55 (No topo)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: cubeState.state[0][r][c],
                    pos: [(c - 1) * 1.0, 1.55, (r - 1) * 1.0] as [number, number, number],
                    rot: [-Math.PI / 2, 0, 0] as [number, number, number] // Rotacionado para olhar pra cima
                });
            }
        }

        // Face L (Esquerda) - Índice 1
        // Posição X = -1.55 (Na esquerda)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: cubeState.state[1][r][c],
                    pos: [-1.55, (1 - r) * 1.0, (c - 1) * 1.0] as [number, number, number],
                    rot: [0, -Math.PI / 2, 0] as [number, number, number]
                });
            }
        }

        // Face F (Frente) - Índice 2
        // Posição Z = 1.55 (Na frente)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: cubeState.state[2][r][c],
                    pos: [(c - 1) * 1.0, (1 - r) * 1.0, 1.55] as [number, number, number],
                    rot: [0, 0, 0] as [number, number, number]
                });
            }
        }

        // Face R (Direita) - Índice 3
        // Posição X = 1.55
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: cubeState.state[3][r][c],
                    pos: [1.55, (1 - r) * 1.0, (1 - c) * 1.0] as [number, number, number],
                    rot: [0, Math.PI / 2, 0] as [number, number, number]
                });
            }
        }

        // Face B (Trás) - Índice 4
        // Posição Z = -1.55
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: cubeState.state[4][r][c],
                    pos: [(1 - c) * 1.0, (1 - r) * 1.0, -1.55] as [number, number, number],
                    rot: [0, Math.PI, 0] as [number, number, number] // Olhando pra trás
                });
            }
        }

        // Face D (Baixo) - Índice 5
        // Posição Y = -1.55
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                stickers.push({
                    color: cubeState.state[5][r][c],
                    pos: [(c - 1) * 1.0, -1.55, (1 - r) * 1.0] as [number, number, number],
                    rot: [Math.PI / 2, 0, 0] as [number, number, number]
                });
            }
        }

        return stickers;
    }, [cubeState]); // Recalcula apenas quando o estado do cubo muda

    const groupRef = useRef<THREE.Group>(null);

    // Animação leve de rotação (Idle animation)
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.002; // Gira devagar no eixo Y
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2; // Balança leve no eixo X
        }
    });

    return (
        <group ref={groupRef}>
            {/* Cubo preto central (núcleo) */}
            <mesh>
                <boxGeometry args={[2.95, 2.95, 2.95]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.1} />
            </mesh>
            {/* Renderiza todos os adesivos */}
            {faces.map((s, i) => (
                <Sticker key={i} color={s.color} position={s.pos} rotation={s.rot} />
            ))}
        </group>
    );
};
