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

---

## 🎮 Controles da Interface

*   **INICIAR TREINO:** Começa o processo de aprendizado. O cubo vai começar a se mexer sozinho.
*   **⚡ MODO TURBO:**
    *   **OFF (Padrão):** Você vê o cubo girando em tempo real. É bonito, mas o treino é lento.
    *   **ON (Rápido):** Desliga a animação 3D. O treino fica **super veloz**. Use isso para subir de nível rápido e desligue para ver o resultado.
*   **PARAR:** Pausa o treinamento.
*   **RESETAR AGENTE:** Apaga o cérebro da IA e começa do zero absoluto (nível 1).
*   **RESUMIR SESSÃO ANTERIOR:** Se você fechar a aba, seu progresso é salvo. Use esse botão para continuar de onde parou.
*   **VER ÚLTIMA VITÓRIA:** Disponível quando a IA resolve o cubo. Mostra o replay passo-a-passo.

---

## 🧠 Como a IA Aprende? (A Lógica)

A IA usa **Curriculum Learning** (Aprendizado Gradual). Ela começa como um bebê e vai amadurecendo.

### 1. Níveis de Dificuldade
*   **Nível 1:** O cubo é embaralhado com apenas **1 movimento**.
*   **Nível 2:** Embaralhado com 2 movimentos... e assim por diante.
*   O objetivo é chegar no Nível 20 (Cubo totalmente misturado).

### 2. O Ciclo de Treino (TRAIN vs EVAL)
O robô alterna entre dois modos automaticamente:

*   **Fase TRAIN (Treino - 100 Jogos):**
    Aqui ele é criativo. Tenta movimentos aleatórios para descobrir coisas novas. Não importa se ele perde, ele está acumulando experiência.
    
*   **Fase EVAL (A Prova - 20 Jogos):**
    Aqui a brincadeira acaba. Ele para de chutar e usa **apenas o que aprendeu**.
    *   **Para passar de nível:** Ele precisa vencer pelo menos **1 vez** (de 20) nesta fase de prova.
    *   Se conseguir, **LEVEL UP!** 🏆 A dificuldade aumenta.
    *   Se falhar, ele volta a treinar na mesma dificuldade.

---

## 🛠 Tecnologia ("Debaixo do Capô")

*   **Double DQN (Deep Q-Network com Target Network):**
    Usamos duas redes neurais. Uma "Ágil" que joga e uma "Sábia" que corrige a Ágil a cada 500 jogadas. Isso evita que a IA fique "confusa" e estabiliza o aprendizado.
*   **TensorFlow.js:** Biblioteca de Machine Learning do Google para Javascript.
*   **Three.js:** Biblioteca 3D para renderizar o cubo com luzes e sombras.

## 📝 Dicas
*   Deixe no **MODO TURBO** até chegar no Nível 3 ou 4.
*   Se ele travar em um nível, tenha paciência. Ele precisa "acertar sem querer" algumas vezes para aprender o padrão.
*   O progresso é salvo automaticamente no seu navegador.
