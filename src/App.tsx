import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Cube3D } from './components/Cube3D'
import { TrainingLoop, TrainingStats } from './logic/TrainingLoop'
import { CubeState, Move } from './logic/CubeState'

function App() {
    // Estado do Cubo (Visualização)
    const [cubeState, setCubeState] = useState(new CubeState());
    const [visualMove, setVisualMove] = useState<Move | null>(null);
    const [visualAnimationId, setVisualAnimationId] = useState(0);

    // Estado das Estatísticas de Treinamento
    const [stats, setStats] = useState<TrainingStats>({
        episode: 0,
        epsilon: 1.0,
        lastReward: 0,
        bestReward: -Infinity,
        wins: 0,
        moves: 0,
        loss: 0
    });

    // Referência para o controlador do Loop de Treinamento
    const trainingLoopRef = useRef<TrainingLoop | null>(null);

    useEffect(() => {
        // Inicializa o loop de treinamento ao montar o componente
        trainingLoopRef.current = new TrainingLoop(
            (newStats) => setStats(newStats),
            (newCube, move) => {
                setCubeState(newCube.clone());
                setVisualMove(move ?? null);
                setVisualAnimationId((id) => id + 1);
            }
        );

        // Limpeza ao desmontar
        return () => {
            trainingLoopRef.current?.stop();
        };
    }, []);

    const handleStart = () => {
        trainingLoopRef.current?.start();
    };

    const handleStop = () => {
        trainingLoopRef.current?.stop();
    };

    const handleReset = () => {
        trainingLoopRef.current?.reset();
        setCubeState(new CubeState());
        setVisualMove(null);
        setVisualAnimationId((id) => id + 1);
    };

    return (
        <div className="w-full h-screen bg-brand-dark flex flex-col md:flex-row text-white overflow-hidden">
            {/* Visualização 3D (Esquerda) */}
            <div className="flex-1 h-1/2 md:h-full relative">
                <Canvas
                    dpr={[1, 2]}
                    camera={{ position: [6, 6, 6], fov: 45 }}
                    gl={{ antialias: true, powerPreference: 'high-performance' }}
                >
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} />

                    <Cube3D
                        cubeState={cubeState}
                        move={visualMove}
                        animationId={visualAnimationId}
                    />

                    <OrbitControls autoRotate={false} />
                    <gridHelper args={[20, 20, 0x333333, 0x111111]} position={[0, -3, 0]} />
                </Canvas>
            </div>

            {/* Painel de Controle (Direita) */}
            <div className="md:w-96 w-full bg-gray-900 border-l border-brand-accent p-6 flex flex-col gap-6 z-10 shadow-2xl overflow-y-auto">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-neon to-brand-accent bg-clip-text text-transparent mb-2">
                        AI Rubik's Solver
                    </h1>
                    <p className="text-gray-400 text-sm">Simulação de Aprendizado por Reforço (DQN)</p>
                </div>

                {/* Botões de Controle */}
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleStart} className="bg-brand-neon text-black font-bold py-2 rounded hover:opacity-80 transition">
                        INICIAR
                    </button>
                    <button onClick={handleStop} className="bg-red-500 text-white font-bold py-2 rounded hover:opacity-80 transition">
                        PARAR
                    </button>
                    <button onClick={handleReset} className="col-span-2 border border-brand-accent text-brand-accent py-2 rounded hover:bg-brand-accent hover:text-white transition">
                        RESETAR MEMÓRIA
                    </button>
                </div>

                {/* Estatísticas */}
                <div className="space-y-4 font-mono text-sm">
                    <div className="p-4 bg-black/40 rounded border border-gray-800">
                        <h2 className="text-brand-neon mb-2 uppercase text-xs tracking-wider">Métricas</h2>
                        <div className="flex justify-between py-1 border-b border-gray-800">
                            <span className="text-gray-400">Episódio:</span>
                            <span className="font-bold">{stats.episode}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-800">
                            <span className="text-gray-400">Epsilon (Exploração):</span>
                            <span className="font-bold text-yellow-500">{stats.epsilon.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-800">
                            <span className="text-gray-400">Vitórias (Resolvido):</span>
                            <span className="font-bold text-green-500">{stats.wins}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-800">
                            <span className="text-gray-400">Última Recompensa:</span>
                            <span className={stats.lastReward > 0 ? "text-green-400" : "text-red-400"}>
                                {stats.lastReward.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-gray-400">Melhor Recompensa:</span>
                            <span className="text-brand-accent">{stats.bestReward === -Infinity ? '-' : stats.bestReward.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-1 pt-3">
                            <span className="text-gray-400">Movimentos (Episódio):</span>
                            <span>{stats.moves}</span>
                        </div>
                    </div>
                </div>

                {/* Explicação */}
                <div className="text-xs text-gray-500 space-y-2">
                    <p>
                        O agente tenta resolver o cubo repetidamente.
                        Ele recebe recompensas por resolver ou se aproximar da solução.
                    </p>
                    <p>
                        <span className="text-brand-neon">Visualização</span>: Agora cada movimento é mostrado com uma rotação física da camada.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default App
