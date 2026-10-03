import { CubeState, Move } from './CubeState';
import { RLAgent } from './RLAgent';

export interface TrainingStats {
    episode: number;
    epsilon: number;
    lastReward: number;
    bestReward: number;
    wins: number;
    moves: number; // Média de movimentos ou movimentos do último episódio
    loss: number;
}

export class TrainingLoop {
    agent: RLAgent;
    cube: CubeState;
    running: boolean = false;
    currentStats: TrainingStats = {
        episode: 0,
        epsilon: 1.0,
        lastReward: 0,
        bestReward: -Infinity,
        wins: 0,
        moves: 0,
        loss: 0
    };

    private onStatsUpdate: (stats: TrainingStats) => void;
    private onCubeUpdate: (cube: CubeState, move?: Move) => void;

    constructor(
        onStatsUpdate: (stats: TrainingStats) => void,
        onCubeUpdate: (cube: CubeState, move?: Move) => void
    ) {
        this.agent = new RLAgent();
        this.cube = new CubeState();
        this.onStatsUpdate = onStatsUpdate;
        this.onCubeUpdate = onCubeUpdate;
    }

    async start() {
        if (this.running) return;
        this.running = true;
        this.loop();
    }

    stop() {
        this.running = false;
    }

    reset() {
        this.running = false;
        this.agent = new RLAgent();
        this.currentStats = {
            episode: 0,
            epsilon: 1.0,
            lastReward: 0,
            bestReward: -Infinity,
            wins: 0,
            moves: 0,
            loss: 0
        };
        this.onStatsUpdate(this.currentStats);
    }

    private async loop() {
        while (this.running) {
            // 1. Embaralhar (Scramble)
            this.cube.reset();
            this.cube.scramble(10);
            this.onCubeUpdate(this.cube);

            let state = this.cube.clone();
            let totalReward = 0;
            let steps = 0;
            const maxSteps = 100;

            const experiences = [];

            // 2. Tentar Resolver (Episódio)
            while (steps < maxSteps && !state.isSolved() && this.running) {
                const action = await this.agent.act(state);
                const move = RLAgent.decodeAction(action);

                const nextState = state.clone();
                nextState.applyMove(move);

                let reward = -0.1;
                if (nextState.isSolved()) {
                    reward = 10.0;
                    this.currentStats.wins++;
                } else {
                    const currentCorrect = state.getCorrectFaceletsCount();
                    const nextCorrect = nextState.getCorrectFaceletsCount();
                    reward += (nextCorrect - currentCorrect) * 0.2;
                }

                experiences.push({
                    state: state,
                    action: action,
                    reward: reward,
                    nextState: nextState,
                    done: nextState.isSolved() || steps >= maxSteps - 1
                });

                state = nextState;
                totalReward += reward;
                steps++;

                this.cube.state = state.state;
                this.onCubeUpdate(this.cube, move);

                if (state.isSolved()) break;
            }

            // 3. Treinar (Aprender com as experiências)
            if (this.running) {
                await this.agent.train(experiences);

                this.currentStats.episode++;
                this.currentStats.epsilon = this.agent.epsilon;
                this.currentStats.lastReward = totalReward;
                this.currentStats.moves = steps;
                if (totalReward > this.currentStats.bestReward) {
                    this.currentStats.bestReward = totalReward;
                }

                this.onStatsUpdate({ ...this.currentStats });

                await new Promise(r => setTimeout(r, 50));
            }
        }
    }
}
