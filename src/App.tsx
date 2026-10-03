import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Cube3D } from './components/Cube3D'
import { TrainingLoop, TrainingStats, PlayConfig, defaultPlayConfig } from './logic/TrainingLoop'
import { CubeState, Move } from './logic/CubeState'
import { CollectiveBook, loadCollective, saveWin } from './logic/collective'

const emptyStats: TrainingStats = {
    episode: 0,
    epsilon: 1,
    lastReward: 0,
    bestReward: -Infinity,
    wins: 0,
    moves: 0,
    loss: 0,
    scramble: 1,
    mode: 'idle',
    level: 1,
}

function App() {
    const [cubeState, setCubeState] = useState(new CubeState());
    const [visualMove, setVisualMove] = useState<Move | null>(null);
    const [visualAnimationId, setVisualAnimationId] = useState(0);
    const [stats, setStats] = useState<TrainingStats>(emptyStats);
    const [play, setPlay] = useState<PlayConfig>(defaultPlayConfig);
    const [status, setStatus] = useState('Cubo resolvido. Treino é rápido. Teste gira devagar pra você ver.');
    const [showIntro, setShowIntro] = useState(true);
    const [book, setBook] = useState<CollectiveBook>({ model: 'dqn-1', wins: [], bestDepth: 0, updatedAt: null });

    const trainingLoopRef = useRef<TrainingLoop | null>(null);

    useEffect(() => {
        trainingLoopRef.current = new TrainingLoop(
            (newStats) => setStats(newStats),
            (newCube, move) => {
                setCubeState(newCube.clone());
                setVisualMove(move ?? null);
                setVisualAnimationId((id) => id + 1);
            },
            (win) => {
                saveWin(win).then((saved) => {
                    setStatus(`Vitória salva. Mistura de ${win.depth}. Banco: ${saved.count}.`);
                    loadCollective().then(setBook);
                }).catch(() => setStatus('Vitória ficou só neste navegador.'));
            },
            (result) => {
                setStatus(result.solved
                    ? `Teste ok: resolveu a mistura de ${result.depth} em ${result.steps} giros.`
                    : `Teste falhou na mistura de ${result.depth}. Ele ainda não sabe esse nível.`);
            }
        );
        loadCollective().then(setBook);
        return () => {
            trainingLoopRef.current?.stop();
        };
    }, []);

    const handleTrain = () => {
        trainingLoopRef.current?.setPlay(play);
        trainingLoopRef.current?.startTrain();
        setStatus('Treino rápido. O nível sobe sozinho quando ele acerta 8 de 10.');
    };

    const handleTest = () => {
        trainingLoopRef.current?.setPlay(play);
        setStatus('Teste devagar. Sem chute: ou ele resolve, ou você vê onde trava.');
        trainingLoopRef.current?.startTest();
    };

    const handleStop = () => {
        trainingLoopRef.current?.stop();
        setStatus('Parado.');
    };

    const handleReset = () => {
        trainingLoopRef.current?.reset();
        setVisualMove(null);
        setVisualAnimationId((id) => id + 1);
        setStatus('Cérebro zerado. O treino volta do nível 1.');
    };

    const handleScramble = () => {
        trainingLoopRef.current?.setPlay(play);
        trainingLoopRef.current?.scrambleNow();
        setVisualMove(null);
        setVisualAnimationId((id) => id + 1);
        setStatus(`Cubo embaralhado com ${play.scramble} movimento(s).`);
    };

    return (
        <div className="w-full h-screen bg-brand-dark flex flex-col md:flex-row text-white overflow-hidden">
            {showIntro && (
                <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center p-6">
                    <div className="max-w-lg bg-gray-900 border border-brand-accent rounded-xl p-6 space-y-4">
                        <p className="text-xs uppercase tracking-widest text-brand-neon">Modelo 1 de 1</p>
                        <h2 className="text-3xl font-bold">DQN</h2>
                        <p className="text-gray-300 text-sm">
                            Primeiro cérebro. O treino é automático e rápido. O teste gira devagar pra você ver se ele resolve ou trava.
                        </p>
                        <p className="text-gray-400 text-xs">
                            Banco: {book.wins.length} vitórias. Maior mistura resolvida: {book.bestDepth || 0}.
                        </p>
                        <button onClick={() => setShowIntro(false)} className="bg-brand-neon text-black font-bold px-4 py-2 rounded">
                            Entrar no cubo
                        </button>
                    </div>
                </div>
            )}
            <div className="flex-1 h-[55vh] md:h-full relative min-h-[280px] bg-[#0f0f13]">
                <Canvas dpr={[1, 2]} camera={{ position: [6, 5, 6], fov: 45 }} gl={{ antialias: true }}>
                    <color attach="background" args={['#0f0f13']} />
                    <ambientLight intensity={0.7} />
                    <pointLight position={[10, 10, 10]} intensity={1.4} />
                    <pointLight position={[-10, -8, -6]} intensity={0.6} />
                    <Cube3D cubeState={cubeState} move={visualMove} animationId={visualAnimationId} />
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
                    <p className="text-gray-400 text-sm">Modelo 1, DQN. Treino no automático.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleTrain} className="bg-brand-neon text-black font-bold py-2 rounded hover:opacity-80 transition">
                        TREINAR
                    </button>
                    <button onClick={handleTest} className="bg-white text-black font-bold py-2 rounded hover:opacity-80 transition">
                        TESTAR
                    </button>
                    <button onClick={handleStop} className="bg-red-500 text-white font-bold py-2 rounded hover:opacity-80 transition">
                        PARAR
                    </button>
                    <button onClick={handleScramble} className="border border-gray-600 py-2 rounded hover:bg-gray-800 transition">
                        EMBARALHAR
                    </button>
                    <button onClick={handleReset} className="col-span-2 border border-brand-accent text-brand-accent py-2 rounded hover:bg-brand-accent hover:text-white transition">
                        RESETAR CÉREBRO
                    </button>
                </div>

                <div className="p-4 bg-black/40 rounded border border-gray-800 space-y-4">
                    <h2 className="text-brand-neon uppercase text-xs tracking-wider">Pra brincar</h2>
                    <label className="block text-xs text-gray-300">
                        <span className="flex justify-between"><span>Mistura do teste</span><b>{play.scramble}</b></span>
                        <input type="range" min={1} max={8} value={play.scramble}
                            onChange={(e) => setPlay({ ...play, scramble: Number(e.target.value) })}
                            className="w-full mt-2" />
                        <span className="block text-gray-500 mt-1">Quantos giros aleatórios antes do teste. 1 é fácil, 8 já é duro pra esse modelo.</span>
                    </label>
                    <label className="block text-xs text-gray-300">
                        <span className="flex justify-between"><span>Velocidade do teste</span><b>{play.testPauseMs} ms</b></span>
                        <input type="range" min={220} max={800} step={20} value={play.testPauseMs}
                            onChange={(e) => setPlay({ ...play, testPauseMs: Number(e.target.value) })}
                            className="w-full mt-2" />
                        <span className="block text-gray-500 mt-1">Pausa entre giros só no teste, pra você ver o cubo resolver ou falhar. O treino ignora isso e fica rápido.</span>
                    </label>
                </div>

                <div className="space-y-1 font-mono text-sm p-4 bg-black/40 rounded border border-gray-800">
                    <h2 className="text-brand-neon mb-2 uppercase text-xs tracking-wider">Automático</h2>
                    <div className="flex justify-between py-1 border-b border-gray-800"><span className="text-gray-400">Nível do treino</span><span>{stats.level}</span></div>
                    <div className="flex justify-between py-1 border-b border-gray-800"><span className="text-gray-400">Episódio</span><span>{stats.episode}</span></div>
                    <div className="flex justify-between py-1 border-b border-gray-800"><span className="text-gray-400">Vitórias</span><span className="text-green-400">{stats.wins}</span></div>
                    <div className="flex justify-between py-1 border-b border-gray-800"><span className="text-gray-400">Modo</span><span>{stats.mode}</span></div>
                    <div className="flex justify-between py-1"><span className="text-gray-400">Banco</span><span>{book.wins.length} / nível {book.bestDepth || 0}</span></div>
                    <p className="text-[11px] text-gray-500 pt-2">Epsilon, gamma, learning rate e recompensa ficam escondidos. Sobe de nível sozinho ao acertar 8 de 10.</p>
                </div>
            </div>
        </div>
    )
}

export default App
