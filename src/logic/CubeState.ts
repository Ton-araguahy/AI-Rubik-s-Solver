
export type Color = 'W' | 'O' | 'G' | 'R' | 'B' | 'Y';
export type Face = 'U' | 'L' | 'F' | 'R' | 'B' | 'D';
export type Move = 'U' | 'U\'' | 'L' | 'L\'' | 'F' | 'F\'' | 'R' | 'R\'' | 'B' | 'B\'' | 'D' | 'D\'';

const ORDERED_colors: Color[] = ['W', 'O', 'G', 'R', 'B', 'Y'];

export class CubeState {
    // 6 faces, 3 linhas, 3 colunas
    // Mapeamento: 0: U (Topo), 1: L (Esq), 2: F (Frente), 3: R (Dir), 4: B (Trás), 5: D (Baixo)
    state: Color[][][];

    constructor() {
        this.state = this.getSolvedState();
    }

    // Gera um cubo resolvido (todas as faces com suas respectivas cores)
    getSolvedState(): Color[][][] {
        return ORDERED_colors.map(c =>
            Array(3).fill(null).map(() => Array(3).fill(c))
        );
    }

    // Reinicia o estado para resolvido
    reset() {
        this.state = this.getSolvedState();
    }

    // Verifica se completou o cubo (todas as peças das faces iguais ao centro)
    isSolved(): boolean {
        for (let f = 0; f < 6; f++) {
            const center = this.state[f][1][1];
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (this.state[f][r][c] !== center) return false;
                }
            }
        }
        return true;
    }

    // Cria uma cópia profunda (Deep Copy) para simulação
    clone(): CubeState {
        const newCube = new CubeState();
        newCube.state = JSON.parse(JSON.stringify(this.state));
        return newCube;
    }

    private rotateFaceClockwise(faceIdx: number) {
        const face = this.state[faceIdx];
        const newFace = [
            [face[2][0], face[1][0], face[0][0]],
            [face[2][1], face[1][1], face[0][1]],
            [face[2][2], face[1][2], face[0][2]]
        ];
        this.state[faceIdx] = newFace as Color[][];
    }

    private rotateFaceCounterClockwise(faceIdx: number) {
        const face = this.state[faceIdx];
        const newFace = [
            [face[0][2], face[1][2], face[2][2]],
            [face[0][1], face[1][1], face[2][1]],
            [face[0][0], face[1][0], face[2][0]]
        ];
        this.state[faceIdx] = newFace as Color[][];
    }

    applyMove(move: Move) {
        const clockwise = !move.endsWith("'");
        const baseMove = move.replace("'", "") as Face;

        let faceIdx = 0;
        switch (baseMove) {
            case 'U': faceIdx = 0; break;
            case 'L': faceIdx = 1; break;
            case 'F': faceIdx = 2; break;
            case 'R': faceIdx = 3; break;
            case 'B': faceIdx = 4; break;
            case 'D': faceIdx = 5; break;
        }

        if (clockwise) {
            this.rotateFaceClockwise(faceIdx);
        } else {
            this.rotateFaceCounterClockwise(faceIdx);
        }

        // Handle adjacent edges
        // This logic mimics the physical cube connections
        const s = this.state;
        let temp: Color[];

        if (baseMove === 'U') {
            // adjacent: F(2), R(3), B(4), L(1) - top row (0)
            if (clockwise) {
                temp = [...s[2][0]];
                s[2][0] = s[3][0];
                s[3][0] = s[4][0];
                s[4][0] = s[1][0];
                s[1][0] = temp;
            } else {
                temp = [...s[2][0]];
                s[2][0] = s[1][0];
                s[1][0] = s[4][0];
                s[4][0] = s[3][0];
                s[3][0] = temp;
            }
        } else if (baseMove === 'D') {
            // adjacent: F(2), R(3), B(4), L(1) - bottom row (2)
            if (clockwise) {
                temp = [...s[2][2]];
                s[2][2] = s[1][2];
                s[1][2] = s[4][2];
                s[4][2] = s[3][2];
                s[3][2] = temp;
            } else {
                temp = [...s[2][2]];
                s[2][2] = s[3][2];
                s[3][2] = s[4][2];
                s[4][2] = s[1][2];
                s[1][2] = temp;
            }
        } else if (baseMove === 'F') {
            // adjacent: U(0) row 2, R(3) col 0, D(5) row 0, L(1) col 2
            if (clockwise) {
                temp = [s[0][2][0], s[0][2][1], s[0][2][2]];
                s[0][2][0] = s[1][2][2]; s[0][2][1] = s[1][1][2]; s[0][2][2] = s[1][0][2]; // U row 2 = L col 2 reversed
                s[1][0][2] = s[5][0][0]; s[1][1][2] = s[5][0][1]; s[1][2][2] = s[5][0][2]; // L col 2 = D row 0
                s[5][0][0] = s[3][2][0]; s[5][0][1] = s[3][1][0]; s[5][0][2] = s[3][0][0]; // D row 0 = R col 0 reversed
                s[3][0][0] = temp[0]; s[3][1][0] = temp[1]; s[3][2][0] = temp[2];    // R col 0 = old U row 2
            } else {
                temp = [s[0][2][0], s[0][2][1], s[0][2][2]];
                s[0][2][0] = s[3][0][0]; s[0][2][1] = s[3][1][0]; s[0][2][2] = s[3][2][0];
                s[3][0][0] = s[5][0][2]; s[3][1][0] = s[5][0][1]; s[3][2][0] = s[5][0][0];
                s[5][0][0] = s[1][0][2]; s[5][0][1] = s[1][1][2]; s[5][0][2] = s[1][2][2];
                s[1][0][2] = temp[2]; s[1][1][2] = temp[1]; s[1][2][2] = temp[0];
            }
        } else if (baseMove === 'B') {
            // adjacent: U(0) row 0, L(1) col 0, D(5) row 2, R(3) col 2
            if (clockwise) {
                temp = [s[0][0][0], s[0][0][1], s[0][0][2]];
                s[0][0][0] = s[3][0][2]; s[0][0][1] = s[3][1][2]; s[0][0][2] = s[3][2][2];
                s[3][0][2] = s[5][2][2]; s[3][1][2] = s[5][2][1]; s[3][2][2] = s[5][2][0];
                s[5][2][0] = s[1][0][0]; s[5][2][1] = s[1][1][0]; s[5][2][2] = s[1][2][0];
                s[1][0][0] = temp[2]; s[1][1][0] = temp[1]; s[1][2][0] = temp[0];
            } else {
                temp = [s[0][0][0], s[0][0][1], s[0][0][2]];
                s[0][0][0] = s[1][2][0]; s[0][0][1] = s[1][1][0]; s[0][0][2] = s[1][0][0];
                s[1][0][0] = s[5][2][0]; s[1][1][0] = s[5][2][1]; s[1][2][0] = s[5][2][2];
                s[5][2][0] = s[3][2][2]; s[5][2][1] = s[3][1][2]; s[5][2][2] = s[3][0][2];
                s[3][0][2] = temp[0]; s[3][1][2] = temp[1]; s[3][2][2] = temp[2];
            }
        } else if (baseMove === 'L') {
            // adjacent: U(0) col 0, F(2) col 0, D(5) col 0, B(4) col 2 (upside down relation in standard mapping)
            // But here our mapping is simplified. Let's trace standard standard orientation.
            // U, F, D are aligned on col 0. B is on the back.
            // B is usually represented such that 'up' on B is 'up' in world, but adjacent to U is B's top row.
            // Wait, standard unwrapping:
            //      U
            //    L F R B
            //      D
            // If I rotate L (left face), I am affecting U(col 0), F(col 0), D(col 0), B(col 2).
            // Indices:
            // U(0) col 0
            // F(2) col 0
            // D(5) col 0
            // B(4) col 2 (inverted direction? No, effectively standard cycle)

            if (clockwise) {
                temp = [s[0][0][0], s[0][1][0], s[0][2][0]];
                s[0][0][0] = s[4][2][2]; s[0][1][0] = s[4][1][2]; s[0][2][0] = s[4][0][2];
                s[4][0][2] = s[5][2][0]; s[4][1][2] = s[5][1][0]; s[4][2][2] = s[5][0][0]; // note B's vertical is inverted relative to flow? Let's check standard.
                // Actually, let's keep it simple.
                // Standard L move: U -> F -> D -> B -> U
                // U left col -> F left col -> D left col -> B right col (inverted vert) -> U left col

                // Let's restart the block for L to be precise.
                // U(0,0), U(1,0), U(2,0) gets replaced by B(2,2), B(1,2), B(0,2)
                s[0][0][0] = s[4][2][2]; s[0][1][0] = s[4][1][2]; s[0][2][0] = s[4][0][2];

                // B(right col) gets replaced by D(left col)
                // Wait, L move moves U contents INTO F.
                /* Correct cycle for L:
                   U(col0) -> F(col0)
                   F(col0) -> D(col0)
                   D(col0) -> B(col2) (inverted)
                   B(col2) -> U(col0) (inverted)
                */
                // Let's re-read previous temp logic.
                // I need to save U first.
                // s[0] = s[4] (B into U? No, B goes into U)

                // Real L move: Top moves to Front.
                // So s[2] (F) takes s[0] (U)
                // s[5] (D) takes s[2] (F)
                // s[4] (B) takes s[5] (D)
                // s[0] (U) takes s[4] (B)

                // Let's redo using temp for U
                // temp = U
                // U = B
                // B = D
                // D = F
                // F = temp

                temp = [s[0][0][0], s[0][1][0], s[0][2][0]];

                // U takes B (inverted)
                s[0][0][0] = s[4][2][2]; s[0][1][0] = s[4][1][2]; s[0][2][0] = s[4][0][2];

                // B takes D (inverted)
                s[4][0][2] = s[5][2][0]; s[4][1][2] = s[5][1][0]; s[4][2][2] = s[5][0][0];

                // D takes F (direct)
                s[5][0][0] = s[2][0][0]; s[5][1][0] = s[2][1][0]; s[5][2][0] = s[2][2][0];

                // F takes temp (U) (direct)
                s[2][0][0] = temp[0]; s[2][1][0] = temp[1]; s[2][2][0] = temp[2];
            } else {
                temp = [s[0][0][0], s[0][1][0], s[0][2][0]];

                // U takes F
                s[0][0][0] = s[2][0][0]; s[0][1][0] = s[2][1][0]; s[0][2][0] = s[2][2][0];

                // F takes D
                s[2][0][0] = s[5][0][0]; s[2][1][0] = s[5][1][0]; s[2][2][0] = s[5][2][0];

                // D takes B (inverted)
                s[5][0][0] = s[4][2][2]; s[5][1][0] = s[4][1][2]; s[5][2][0] = s[4][0][2];

                // B takes temp (U) (inverted)
                s[4][0][2] = temp[2]; s[4][1][2] = temp[1]; s[4][2][2] = temp[0];
            }

        } else if (baseMove === 'R') {
            // Adjacent: U(0) col 2, F(2) col 2, D(5) col 2, B(4) col 0
            // R move: U -> B(inverted) -> D -> F -> U ... wait.
            // R moves UP on the front face? No, R moves UP on Front Face? No.
            // R (Clockwise) moves the Right face Clockwise.
            // Looking at Right face, clockwise means Top moves to Back?
            // Imagine holding cube. R move (up away from you).
            // Front col 2 moves UP to Top.
            // Top col 2 moves Back to Back? Yes.
            // So: F -> U -> B -> D -> F

            if (clockwise) {
                temp = [s[2][0][2], s[2][1][2], s[2][2][2]];

                // F takes D
                s[2][0][2] = s[5][0][2]; s[2][1][2] = s[5][1][2]; s[2][2][2] = s[5][2][2];

                // D takes B (inverted from col 0)
                s[5][0][2] = s[4][2][0]; s[5][1][2] = s[4][1][0]; s[5][2][2] = s[4][0][0];

                // B takes U (inverted from col 2)
                s[4][0][0] = s[0][2][2]; s[4][1][0] = s[0][1][2]; s[4][2][0] = s[0][0][2];

                // U takes temp (F)
                s[0][0][2] = temp[0]; s[0][1][2] = temp[1]; s[0][2][2] = temp[2];
            } else {
                temp = [s[2][0][2], s[2][1][2], s[2][2][2]];

                // F takes U
                s[2][0][2] = s[0][0][2]; s[2][1][2] = s[0][1][2]; s[2][2][2] = s[0][2][2];

                // U takes B (inverted)
                s[0][0][2] = s[4][2][0]; s[0][1][2] = s[4][1][0]; s[0][2][2] = s[4][0][0];

                // B takes D (inverted)
                s[4][0][0] = s[5][2][2]; s[4][1][0] = s[5][1][2]; s[4][2][0] = s[5][0][2];

                // D takes temp (F)
                s[5][0][2] = temp[0]; s[5][1][2] = temp[1]; s[5][2][2] = temp[2];
            }
        }
    }

    // Embaralha o cubo com movimentos aleatórios
    scramble(moves: number = 20) {
        const possibleMoves: Move[] = ['U', "U'", 'D', "D'", 'L', "L'", 'R', "R'", 'F', "F'", 'B', "B'"];
        for (let i = 0; i < moves; i++) {
            const mv = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            this.applyMove(mv);
        }
    }

    // Converte o estado 6x3x3 em um vetor de 54 números (0-5) para a Rede Neural
    getEncoding(): number[] {
        const map = { 'W': 0, 'O': 1, 'G': 2, 'R': 3, 'B': 4, 'Y': 5 };
        const flat: number[] = [];
        for (let f = 0; f < 6; f++) {
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    flat.push(map[this.state[f][r][c]]);
                }
            }
        }
        return flat;
    }

    // Conta quantas peças ("facelets") estão na posição/cor correta
    // Usado para calcular recompensa parcial
    getCorrectFaceletsCount(): number {
        let count = 0;
        const solved = this.getSolvedState();
        for (let f = 0; f < 6; f++) {
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (this.state[f][r][c] === solved[f][r][c]) count++;
                }
            }
        }
        return count;
    }

    static getAllMoves(): Move[] {
        return ['U', "U'", 'D', "D'", 'L', "L'", 'R', "R'", 'F', "F'", 'B', "B'"];
    }
}
