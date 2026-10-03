# 🧠 IA Resolvendo Cubo Mágico (Rubik's Cube AI Solver)

Este projeto é uma Inteligência Artificial completa que aprende a resolver um Cubo Mágico do zero, usando **Deep Reinforcement Learning (Aprendizado por Reforço Profundo)**.

Tudo roda diretamente no seu navegador, usando a placa de vídeo do seu computador via **TensorFlow.js**.

## 🚀 Como Rodar

A versão mais atual e estável é o arquivo único `standalone.html`.

1.  **Opção Fácil:** Clique duas vezes em `standalone.html` para abrir no seu navegador.
2.  **Opção Recomendada (Servidor):**
    Abra um terminal na pasta do projeto e rode:
    ```bash
    python3 -m http.server 8000
    ```
    Depois acesse `http://localhost:8000/standalone.html` no Chrome.

No começo o cubo já aparece resolvido (fundo escuro, câmera ajustada). Dá para girar a câmera, embaralhar na hora e mexer nas variáveis antes de treinar.

---

## 🎮 Controles da Interface

*   **INICIAR TREINO:** Começa o processo de aprendizado. O cubo vai começar a se mexer sozinho.
*   **EMBARALHAR CUBO AGORA:** Mistura o cubo parado, com o número de movimentos do nível inicial.
*   **Variáveis (ao vivo):** nível inicial/máximo, movimentos por tentativa, blocos de treino e prova, epsilon, gamma, learning rate, recompensas, memória e pausa visual. Clique em **APLICAR VARIÁVEIS**.
*   **PARAR:** Pausa o treinamento.
*   **RESETAR AGENTE:** Apaga o cérebro da IA e começa do zero absoluto (nível escolhido).
*   **VER ÚLTIMA VITÓRIA:** Disponível quando a IA resolve o cubo. Mostra o replay passo-a-passo.

---

## 🧠 Como a IA Aprende? (A Lógica)

A IA usa **Curriculum Learning** (Aprendizado Gradual). Ela começa como um bebê e vai amadurecendo.

### 1. Níveis de Dificuldade
*   **Nível 1:** O cubo é embaralhado com apenas **1 movimento**.
*   **Nível 2:** Embaralhado com 2 movimentos... e assim por diante.
*   O objetivo é chegar no nível máximo configurado (padrão 20).

### 2. O Ciclo de Treino (TRAIN vs EVAL)
O robô alterna entre dois modos automaticamente:

*   **Fase TRAIN:** tenta movimentos aleatórios e acumula experiência.
*   **Fase EVAL:** usa só o que aprendeu. Sobe de nível se bater o mínimo de vitórias da prova.

---

## 🛠 Tecnologia ("Debaixo do Capô")

*   **Double DQN (Deep Q-Network com Target Network)** no `standalone.html`.
*   **TensorFlow.js** e **Three.js**.

## 📝 Dicas
*   Se o cubo não aparecer, abra pelo servidor local (opção 2), não só com clique duplo.
*   Suba o nível inicial se quiser um cubo já misturado antes do treino.
*   O progresso é salvo automaticamente no navegador.
