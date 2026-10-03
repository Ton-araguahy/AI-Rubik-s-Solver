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
    mode: 'idle' | 'train' | 'test';
    level: number;
}

export interface PlayConfig {
    scramble: number;
    testPauseMs: number;
}

export const defaultPlayConfig: PlayConfig = {
    scramble: 2,
    testPauseMs: 420,
};

const AUTO = {
    stepPenalty: 0.1,
    solveReward: 10,
    progressReward: 0.2,
    epsilonMin: 0.05,
    gamma: 0.95,
    learningRate: 0.0005,
    trainPauseMs: 0,
};

export class TrainingLoop {
    agent: RLAgent;
    cube: CubeState;
    running = false;
    mode: 'idle' | 'train' | 'test' = 'idle';
    play: PlayConfig = { ...defaultPlayConfig };
    level = 1;
    private recent: boolean[] = [];
    currentStats: TrainingStats = {
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
    };

    private onStatsUpdate: (stats: TrainingStats) => void;
    private onCubeUpdate: (cube: CubeState, move?: Move) => void;
    private onWin?: (win: { depth: number; moves: string[]; steps: number }) => void;
    private onTestDone?: (result: { solved: boolean; steps: number; depth: number }) => void;

    constructor(
        onStatsUpdate: (stats: TrainingStats) => void,
        onCubeUpdate: (cube: CubeState, move?: Move) => void,
        onWin?: (win: { depth: number; moves: string[]; steps: number }) => void,
        onTestDone?: (result: { solved: boolean; steps: number; depth: number }) => void
    ) {
        this.agent = new RLAgent({
            epsilon: 1,
            epsilonMin: AUTO.epsilonMin,
            epsilonDecay: 1,
            gamma: AUTO.gamma,
            learningRate: AUTO.learningRate,
        });
        this.cube = new CubeState();
        this.onStatsUpdate = onStatsUpdate;
        this.onCubeUpdate = onCubeUpdate;
        this.onWin = onWin;
        this.onTestDone = onTestDone;
        this.onCubeUpdate(this.cube);
        this.publish();
    }

    setPlay(next: Partial<PlayConfig>) {
        this.play = {
            scramble: clamp(next.scramble ?? this.play.scramble, 1, 12),
            testPauseMs: clamp(next.testPauseMs ?? this.play.testPauseMs, 180, 900),
        };
    }

    scrambleNow() {
        if (this.running) return;
        this.cube.reset();
        this.cube.scramble(this.play.scramble);
        this.onCubeUpdate(this.cube.clone());
    }

    startTrain() {
        if (this.running) return;
        this.mode = 'train';
        this.running = true;
        this.publish();
        this.loop();
    }

    async startTest() {
        if (this.running) return;
        this.mode = 'test';
        this.running = true;
        this.publish();
        const saved = this.agent.epsilon;
        this.agent.epsilon = 0;
        const depth = this.play.scramble;
        const result = await this.episode(depth, this.play.testPauseMs, false);
        this.agent.epsilon = saved;
        this.running = false;
        this.mode = 'idle';
        this.publish();
        this.onTestDone?.({ solved: result.solved, steps: result.steps, depth });
    }

    stop() {
        this.running = false;
        this.mode = 'idle';
        this.publish();
    }

    reset() {
        this.running = false;
        this.mode = 'idle';
        this.level = 1;
        this.recent = [];
        this.agent = new RLAgent({
            epsilon: 1,
            epsilonMin: AUTO.epsilonMin,
            epsilonDecay: 1,
            gamma: AUTO.gamma,
            learningRate: AUTO.learningRate,
        });
        this.cube.reset();
        this.currentStats = {
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
        };
        this.onCubeUpdate(this.cube.clone());
        this.publish();
    }

    private publish() {
        this.currentStats.epsilon = this.agent.epsilon;
        this.currentStats.scramble = this.mode === 'test' ? this.play.scramble : this.level;
        this.currentStats.mode = this.mode;
        this.currentStats.level = this.level;
        this.onStatsUpdate({ ...this.currentStats });
    }

    private async loop() {
        while (this.running && this.mode === 'train') {
            const result = await this.episode(this.level, AUTO.trainPauseMs, true);
            if (!this.running) break;
            await this.agent.train(result.experiences);
            this.currentStats.episode++;
            this.currentStats.lastReward = result.reward;
            this.currentStats.moves = result.steps;
            if (result.reward > this.currentStats.bestReward) {
                this.currentStats.bestReward = result.reward;
            }
            this.recent.push(result.solved);
            if (this.recent.length > 10) this.recent.shift();
            const hits = this.recent.filter(Boolean).length;
            if (this.recent.length === 10 && hits >= 8 && this.level < 12) {
                this.level++;
                this.recent = [];
                this.agent.epsilon = Math.max(0.35, this.agent.epsilon);
            } else if (this.agent.epsilon > AUTO.epsilonMin) {
                this.agent.epsilon = Math.max(AUTO.epsilonMin, this.agent.epsilon * 0.998);
            }
            this.publish();
            await new Promise((r) => setTimeout(r, 10));
        }
        this.running = false;
        this.mode = 'idle';
        this.publish();
    }

    private async episode(depth: number, pauseMs: number, learn: boolean) {
        this.cube.reset();
        this.cube.scramble(depth);
        this.onCubeUpdate(this.cube.clone());
        if (pauseMs > 0) await new Promise((r) => setTimeout(r, pauseMs));

        let state = this.cube.clone();
        let rewardSum = 0;
        let steps = 0;
        let solved = false;
        const episodeMoves: string[] = [];
        const experiences = [];
        const maxSteps = depth + 4;

        while (steps < maxSteps && !state.isSolved() && this.running) {
            const action = await this.agent.act(state);
            const move = RLAgent.decodeAction(action);
            const nextState = state.clone();
            nextState.applyMove(move);
            episodeMoves.push(move);

            let reward = -AUTO.stepPenalty;
            if (nextState.isSolved()) {
                reward = AUTO.solveReward;
                solved = true;
                this.currentStats.wins++;
                this.onWin?.({ depth, moves: [...episodeMoves], steps: steps + 1 });
            } else {
                reward += (nextState.getCorrectFaceletsCount() - state.getCorrectFaceletsCount()) * AUTO.progressReward;
            }

            if (learn) {
                experiences.push({
                    state,
                    action,
                    reward,
                    nextState,
                    done: nextState.isSolved() || steps >= maxSteps - 1,
                });
            }

            state = nextState;
            rewardSum += reward;
            steps++;
            this.cube.state = state.state;
            this.onCubeUpdate(this.cube.clone(), move);
            if (pauseMs > 0) await new Promise((r) => setTimeout(r, pauseMs));
            if (solved) break;
        }

        return { solved, steps, reward: rewardSum, experiences };
    }
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}
