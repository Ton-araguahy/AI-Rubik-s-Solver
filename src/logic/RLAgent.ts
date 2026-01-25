
import * as tf from '@tensorflow/tfjs';
import { CubeState, Move } from './CubeState';

export class RLAgent {
    model: tf.Sequential;
    epsilon: number = 1.0; // Taxa de Exploração (1.0 = 100% aleatório)
    epsilonMin: number = 0.1; // Mínimo de 10% de exploração sempre
    epsilonDecay: number = 0.995; // Fator de decaimento a cada treino
    gamma: number = 0.95; // Fator de Desconto (importância do futuro vs imediato)
    learningRate: number = 0.001; // Velocidade de aprendizado da rede

    constructor() {
        this.model = this.createModel();
    }

    // Cria a arquitetura da Rede Neural (Cérebro do Agente)
    createModel(): tf.Sequential {
        const model = tf.sequential();
        // Entrada: 54 peças * 6 cores (One-Hot Encoding) = 324 neurônios
        model.add(tf.layers.dense({ units: 256, inputShape: [324], activation: 'relu' }));
        // Camada oculta para processar padrões complexos
        model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
        // Saída: 12 neurônios (um para cada movimento possível do cubo)
        // Usamos linear (sem ativação) porque queremos prever o valor Q
        model.add(tf.layers.dense({ units: 12, activation: 'linear' }));
        model.compile({ optimizer: tf.train.adam(this.learningRate), loss: 'meanSquaredError' });
        return model;
    }

    // Converte o estado do Cubo para Tensores do TensorFlow
    getStateTensor(cube: CubeState): tf.Tensor2D {
        const flat = cube.getEncoding(); // Array de inteiros 0-5
        // Realiza One-Hot Encoding: Transforma cada cor em um vetor de 6 posições
        // 0 -> [1, 0, 0, 0, 0, 0]
        // 1 -> [0, 1, 0, 0, 0, 0] ...
        const buffer = tf.buffer([1, 324]);
        flat.forEach((colorIdx, i) => {
            buffer.set(1, 0, i * 6 + colorIdx);
        });
        return buffer.toTensor() as tf.Tensor2D;
    }

    // Decide qual ação tomar (Política Epsilon-Greedy)
    async act(cube: CubeState): Promise<number> {
        // Exploração: Tenta um movimento aleatório para descobrir coisas novas
        if (Math.random() < this.epsilon) {
            return Math.floor(Math.random() * 12);
        }
        // Exploração (Greedy): Usa o modelo para escolher a melhor ação conhecida
        const stateTensor = this.getStateTensor(cube);
        const prediction = this.model.predict(stateTensor) as tf.Tensor;
        const action = (await prediction.argMax(1).data())[0];
        stateTensor.dispose();
        prediction.dispose();
        return action;
    }

    // Treina o modelo com base no histórico de experiências (Replay)
    async train(experiences: { state: CubeState, action: number, reward: number, nextState: CubeState, done: boolean }[]) {
        if (experiences.length === 0) return;

        // Treinamento em Mini-Lote (Batch)
        const batchSize = Math.min(experiences.length, 64);
        const batch = experiences.slice(0, batchSize); // Pegando os primeiros (ideal seria aleatório)

        const states = batch.map(e => this.getStateTensor(e.state));
        const nextStates = batch.map(e => this.getStateTensor(e.nextState));

        const stateTensor = tf.concat(states);
        const nextStateTensor = tf.concat(nextStates);

        // Previsão dos valores Q atuais e futuros
        const currentQs = this.model.predict(stateTensor) as tf.Tensor;
        const nextQs = this.model.predict(nextStateTensor) as tf.Tensor;

        const currentQsData = await currentQs.array() as number[][];
        const nextQsData = await nextQs.array() as number[][];
        const maxNextQs = nextQsData.map(row => Math.max(...row));

        // Atualização dos valores Q (Equação de Bellman)
        for (let i = 0; i < batch.length; i++) {
            const { action, reward, done } = batch[i];
            let target = reward;
            if (!done) {
                // Q(s,a) = recompensa + gamma * max(Q(s', a'))
                target = reward + this.gamma * maxNextQs[i];
            }
            currentQsData[i][action] = target;
        }

        const targetTensor = tf.tensor2d(currentQsData);

        // Ajusta os pesos da rede para aproximar os valores Q alvo
        await this.model.fit(stateTensor, targetTensor, { epochs: 1, verbose: 0 });

        // Limpeza de memória (TensorFlow exige isso manually)
        states.forEach(t => t.dispose());
        nextStates.forEach(t => t.dispose());
        stateTensor.dispose();
        nextStateTensor.dispose();
        currentQs.dispose();
        nextQs.dispose();
        targetTensor.dispose();

        // Decai o epsilon para diminuir a exploração ao longo do tempo
        if (this.epsilon > this.epsilonMin) {
            this.epsilon *= this.epsilonDecay;
        }
    }

    static decodeAction(action: number): Move {
        const moves = CubeState.getAllMoves();
        return moves[action];
    }
}
