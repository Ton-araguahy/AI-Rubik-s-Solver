import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Cube3D } from './components/Cube3D'
import { TrainingLoop, TrainingStats, TrainConfig, defaultTrainConfig } from './logic/TrainingLoop'
import { CubeState, Move } from './logic/CubeState'

const emptyStats: TrainingStats = {
    episode: 0,
    epsilon: 1.0,
    lastReward: 0,
    bestReward: -Infinity,
    wins: 0,
    moves: 0,
    loss: 0,
    scramble: 1,
}

function App() {
    const [cubeState, setCubeState] = useState(new CubeState());
    const [visualMove, setVisualMove] = useState<Move | null>(null);
    const [visualAnimationId, setVisualAnimationId] = useState(0);
    const [stats, setStats] = useState<TrainingStats>(emptyStats);
    const [cfg, setCfg] = useState<TrainConfig>(defaultTrainConfig);
    const [status, setStatus] = useState('Cubo resolvido. Arraste para olhar, embaralhe ou inicie o treino.');

    const trainingLoopRef = useRef<TrainingLoop | null>(null);

    useEffect(() => {
        trainingLoopRef.current = new TrainingLoop(
            (newStats) => setStats(newStats),
            (newCube, move) => {
                setCubeState(newCube.clone());
                setVisualMove(move ?? null);
                setVisualAnimationId((id) => id + 1);
            }
        );
        return () => {
            trainingLoopRef.current?.stop();
        };
    }, []);

    const pushConfig = (resetEpsilon = false) => {
        trainingLoopRef.current?.applyConfig(cfg, resetEpsilon);
        setStatus('Variáveis aplicadas.');
    };

    const handleStart = () => {
        pushConfig(false);
        trainingLoopRef.current?.start();
        setStatus('Treino rodando. O cubo embaralha e gira sozinho.');
    };

    const handleStop = () => {
        trainingLoopRef.current?.stop();
        setStatus('Treino pausado.');
    };

    const handleReset = () => {
        trainingLoopRef.current?.applyConfig(cfg, true);
        trainingLoopRef.current?.reset();
        setVisualMove(null);
        setVisualAnimationId((id) => id + 1);
        setStatus('Agente zerado. Cubo resolvido na tela.');
    };

    const handleScramble = () => {
        trainingLoopRef.current?.applyConfig(cfg, false);
        trainingLoopRef.current?.scrambleNow();
        setVisualMove(null);
        setVisualAnimationId((id) => id + 1);
        setStatus(`Cubo embaralhado com ${cfg.scramble} movimento(s).`);
    };

    const field = (
        label: string,
        key: keyof TrainConfig,
        step = 1,
        min?: number,
        max?: number
    ) => (
        <label className="flex items-center justify-between gap-2 text-xs text-gray-300">
            <span>{label}</span>
            <input
                type="number"
                step={step}
                min={min}
                max={max}
                value={cfg[key]}
                onChange={(e) => setCfg({ ...cfg, [key]: Number(e.target.value) })}
                className="w-20 bg-black/60 border border-gray-700 rounded px-2 py-1 text-right text-white"
            />
        </label>
    );

    return (
        <div className="w-full h-screen bg-brand-dark flex flex-col md:flex-row text-white overflow-hidden">
            <div className="flex-1 h-[55vh] md:h-full relative min-h-[280px] bg-[#0f0f13]">
                <Canvas
                    dpr={[1, 2]}
                    camera={{ position: [6, 5, 6], fov: 45 }}
                    gl={{ antialias: true, powerPreference: 'high-performance' }}
                >
                    <color attach="background" args={['#0f0f13']} />
                    <ambientLight intensity={0.7} />
                    <pointLight position={[10, 10, 10]} intensity={1.4} />
                    <pointLight position={[-10, -8, -6]} intensity={0.6} />

                    <Cube3D
                        cubeState={cubeState}
                        move={visualMove}
                        animationId={visualAnimationId}
                    />

                    <OrbitControls target={[0, 0, 0]} />
                    <gridHelper args={[20, 20, 0x333333, 0x111111]} position={[0, -2.4, 0]} />
                </Canvas>
                <div className="absolute left-3 bottom-3 max-w-sm text-xs bg-black/60 border border-gray-800 rounded px-3 py-2">
                    {status}
                </div>
            </div>

            <div className="md:w-96 w-full bg-gray-900 border-l border-brand-accent p-6 flex flex-col gap-4 z-10 shadow-2xl overflow-y-auto">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-neon to-brand-accent bg-clip-text text-transparent mb-2">
                        AI Rubik's Solver
                    </h1>
                    <p className="text-gray-400 text-sm">Simulação de Aprendizado por Reforço (DQN)</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleStart} className="bg-brand-neon text-black font-bold py-2 rounded hover:opacity-80 transition">
                        INICIAR
                    </button>
                    <button onClick={handleStop} className="bg-red-500 text-white font-bold py-2 rounded hover:opacity-80 transition">
                        PARAR
                    </button>
                    <button onClick={handleScramble} className="border border-gray-600 py-2 rounded hover:bg-gray-800 transition">
                        EMBARALHAR
                    </button>
                    <button onClick={() => pushConfig(false)} className="border border-brand-accent text-brand-accent py-2 rounded hover:bg-brand-accent hover:text-white transition">
                        APLICAR
                    </button>
                    <button onClick={handleReset} className="col-span-2 border border-brand-accent text-brand-accent py-2 rounded hover:bg-brand-accent hover:text-white transition">
                        RESETAR MEMÓRIA
                    </button>
                </div>

                <div className="p-4 bg-black/40 rounded border border-gray-800 space-y-2">
                    <h2 className="text-brand-neon uppercase text-xs tracking-wider">Variáveis</h2>
                    {field('Embaralhamento', 'scramble', 1, 1, 40)}
                    {field('Movimentos por tentativa', 'maxSteps', 1, 1, 200)}
                    {field('Pausa visual (ms)', 'pauseMs', 10, 0, 500)}
                    {field('Epsilon', 'epsilon', 0.01, 0, 1)}
                    {field('Epsilon mínimo', 'epsilonMin', 0.01, 0, 1)}
                    {field('Decaimento epsilon', 'epsilonDecay', 0.001, 0.9, 1)}
                    {field('Gamma', 'gamma', 0.01, 0, 1)}
                    {field('Learning rate', 'learningRate', 0.0001, 0.0001, 0.01)}
                    {field('Pena por movimento', 'stepPenalty', 0.05, 0, 5)}
                    {field('Prêmio ao resolver', 'solveReward', 1, 0, 100)}
                    {field('Prêmio por peça certa', 'progressReward', 0.1, 0, 5)}
                </div>

                <div className="space-y-4 font-mono text-sm">
                    <div className="p-4 bg-black/40 rounded border border-gray-800">
                        <h2 className="text-brand-neon mb-2 uppercase text-xs tracking-wider">Métricas</h2>
                        <div className="flex justify-between py-1 border-b border-gray-800">
                            <span className="text-gray-400">Episódio:</span>
                            <span className="font-bold">{stats.episode}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-800">
                            <span className="text-gray-400">Epsilon:</span>
                            <span className="font-bold text-yellow-500">{stats.epsilon.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-800">
                            <span className="text-gray-400">Vitórias:</span>
                            <span className="font-bold text-green-500">{stats.wins}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-800">
                            <span className="text-gray-400">Última recompensa:</span>
                            <span className={stats.lastReward > 0 ? 'text-green-400' : 'text-red-400'}>
                                {stats.lastReward.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-gray-400">Melhor:</span>
                            <span className="text-brand-accent">{stats.bestReward === -Infinity ? '-' : stats.bestReward.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
