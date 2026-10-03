import { CubeState, Move } from './CubeState';
import { RLAgent } from './RLAgent';

export interface TrainingStats {
    episode: number;
    epsilon: number;
    lastReward: number;
    bestReward: number;
    wins: number;
    moves: number;
    loss: number;
    scramble: number;
}

export interface TrainConfig {
    scramble: number;
    maxSteps: number;
    stepPenalty: number;
    solveReward: number;
    progressReward: number;
    epsilon: number;
    epsilonMin: number;
    epsilonDecay: number;
    gamma: number;
    learningRate: number;
    pauseMs: number;
}

export const defaultTrainConfig: TrainConfig = {
    scramble: 1,
    maxSteps: 30,
    stepPenalty: 0.1,
    solveReward: 10,
    progressReward: 0.2,
    epsilon: 1,
    epsilonMin: 0.1,
    epsilonDecay: 0.995,
    gamma: 0.95,
    learningRate: 0.001,
    pauseMs: 40,
};

export class TrainingLoop {
    agent: RLAgent;
    cube: CubeState;
    running: boolean = false;
    config: TrainConfig = { ...defaultTrainConfig };
    currentStats: TrainingStats = {
        episode: 0,
        epsilon: 1.0,
        lastReward: 0,
        bestReward: -Infinity,
        wins: 0,
        moves: 0,
        loss: 0,
        scramble: 1,
    };

    private onStatsUpdate: (stats: TrainingStats) => void;
    private onCubeUpdate: (cube: CubeState, move?: Move) => void;

    constructor(
        onStatsUpdate: (stats: TrainingStats) => void,
        onCubeUpdate: (cube: CubeState, move?: Move) => void
    ) {
        this.agent = new RLAgent(this.config);
        this.cube = new CubeState();
        this.onStatsUpdate = onStatsUpdate;
        this.onCubeUpdate = onCubeUpdate;
        this.onCubeUpdate(this.cube);
        this.onStatsUpdate({ ...this.currentStats });
    }

    applyConfig(next: Partial<TrainConfig>, resetEpsilon = false) {
        this.config = { ...this.config, ...next };
        this.agent.applyConfig({
            epsilon: resetEpsilon ? this.config.epsilon : this.agent.epsilon,
            epsilonMin: this.config.epsilonMin,
            epsilonDecay: this.config.epsilonDecay,
            gamma: this.config.gamma,
            learningRate: this.config.learningRate,
        });
        this.currentStats.epsilon = this.agent.epsilon;
        this.currentStats.scramble = this.config.scramble;
        this.onStatsUpdate({ ...this.currentStats });
    }

    scrambleNow() {
        if (this.running) return;
        this.cube.reset();
        this.cube.scramble(this.config.scramble);
        this.onCubeUpdate(this.cube.clone());
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
        this.agent = new RLAgent(this.config);
        this.cube.reset();
        this.currentStats = {
            episode: 0,
            epsilon: this.agent.epsilon,
            lastReward: 0,
            bestReward: -Infinity,
            wins: 0,
            moves: 0,
            loss: 0,
            scramble: this.config.scramble,
        };
        this.onCubeUpdate(this.cube.clone());
        this.onStatsUpdate({ ...this.currentStats });
    }

    private async loop() {
        while (this.running) {
            this.cube.reset();
            this.cube.scramble(this.config.scramble);
            this.onCubeUpdate(this.cube.clone());

            let state = this.cube.clone();
            let totalReward = 0;
            let steps = 0;
            const maxSteps = this.config.maxSteps;
            const experiences = [];

            while (steps < maxSteps && !state.isSolved() && this.running) {
                const action = await this.agent.act(state);
                const move = RLAgent.decodeAction(action);

                const nextState = state.clone();
                nextState.applyMove(move);

                let reward = -this.config.stepPenalty;
                if (nextState.isSolved()) {
                    reward = this.config.solveReward;
                    this.currentStats.wins++;
                } else {
                    const currentCorrect = state.getCorrectFaceletsCount();
                    const nextCorrect = nextState.getCorrectFaceletsCount();
                    reward += (nextCorrect - currentCorrect) * this.config.progressReward;
                }

                experiences.push({
                    state,
                    action,
                    reward,
                    nextState,
                    done: nextState.isSolved() || steps >= maxSteps - 1,
                });

                state = nextState;
                totalReward += reward;
                steps++;

                this.cube.state = state.state;
                this.onCubeUpdate(this.cube.clone(), move);

                if (state.isSolved()) break;
                if (this.config.pauseMs > 0) {
                    await new Promise((r) => setTimeout(r, this.config.pauseMs));
                }
            }

            if (this.running) {
                await this.agent.train(experiences);

                this.currentStats.episode++;
                this.currentStats.epsilon = this.agent.epsilon;
                this.currentStats.lastReward = totalReward;
                this.currentStats.moves = steps;
                this.currentStats.scramble = this.config.scramble;
                if (totalReward > this.currentStats.bestReward) {
                    this.currentStats.bestReward = totalReward;
                }

                this.onStatsUpdate({ ...this.currentStats });
                await new Promise((r) => setTimeout(r, 20));
            }
        }
    }
}
