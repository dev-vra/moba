# EKOOFALL: ARENA — revisão de mecânicas e melhorias

Revisão feita a partir do estado atual do jogo e das convenções do gênero MOBA. Não é pesquisa de mercado com fontes; é análise de design. Ordenado por impacto dentro de cada bloco.

Legenda: **[feito]** já está no jogo · **[próximo]** recomendo fazer em seguida · **[depois]** vale, mas não agora.

## 1. Controles e sensação de jogo

- **[feito]** Clique esquerdo move/ataca, com marcador no chão; rota automática; cantos cortados; aceleração curta.
- **[próximo]** Fila de comandos: lançar uma skill durante a animação do básico e ela sair assim que possível (hoje o comando é descartado se o herói está travado).
- **[próximo]** Ataque-mover (tecla A + clique): anda atacando o que encontrar. É o que falta para "farmar" com conforto.
- **[próximo]** Câmera livre opcional: empurrar a borda da tela ou segurar tecla para olhar longe, Barra/Y para recentralizar. Hoje a câmera é sempre presa ao herói.
- **[próximo]** Cursor próprio (ciano em terreno, vermelho sobre inimigo, verde sobre aliado) e contorno no alvo sob o mouse.
- **[depois]** Remapear teclas e "lançamento rápido" configurável por habilidade.

## 2. Combate

- **[feito]** Heróis causam 60% de dano entre si, para as lutas durarem o bastante para reagir.
- **[próximo]** Armadura e resistência separadas (dano físico × dano de habilidade). Hoje só existe "redução de dano" única, o que deixa os itens rasos.
- **[próximo]** Controle de grupo de verdade: atordoar, enraizar, silenciar, empurrar. Hoje só existe lentidão. Cada herói deveria ter pelo menos um.
- **[próximo]** Indicadores de perigo inimigos no chão (a Chuva de Sucata da Desplugada já avisa; o resto não).
- **[próximo]** Regeneração fora de combate mais clara e um item consumível de cura, para reduzir idas à base.
- **[depois]** Acerto crítico, velocidade de ataque e penetração como atributos de item completos.

## 3. Heróis

- **[feito]** 4 kits: Vetor (assassino), Enxame (mago), Desplugada (atiradora), Válvula (suporte).
- **[próximo]** Escolha de lado: jogar de EKOO com Desplugada ou Válvula (os kits já funcionam; falta a tela e espelhar a câmera).
- **[próximo]** Um tanque/iniciador por facção. Sugestões dentro do tema: **Ferro-Velho** (EKOO, o da sua arte de HUD, com porta de carro como escudo e corrente) e **Colheitadeira** (AXIOM, mecha de cerco).
- **[próximo]** Passivas com mais identidade (a do Vetor é boa; a da Desplugada hoje é quase decorativa).
- **[depois]** Habilidades com dois estágios e combos entre heróis aliados.

## 4. Mapa e objetivos

- **[feito]** Torre externa + Núcleo na base (só o Núcleo vence; fica protegido enquanto a torre existe).
- **[feito]** Milharais para se esconder; portões de gank atrás das torres; anel externo ligando base e selva; todo acampamento com duas saídas.
- **[feito]** Selva com acampamentos de farm, dois chefes de buff e duas Fendas que convertem Vessari.
- **[próximo]** Névoa de guerra: hoje só o milharal esconde. Com névoa, o minimapa e os ganks passam a importar de verdade.
- **[próximo]** Sentinelas (itens de visão) e um acampamento-olho que revela a selva inimiga.
- **[próximo]** Chefão **"O Que Escuta"** numa terceira Fenda: derrotá-lo dá um reforço forte na lane (equivalente ao objetivo épico do gênero).
- **[próximo]** Evento **3h17**: a cada X minutos o sinal toca; por 30 s os Vessari ficam agressivos e uma Fenda abre no meio da lane. Dá ritmo e usa a sua lore.
- **[depois]** Segunda lane (ou lane em S) para partidas 3v3; inibidor/super-minions ao derrubar a torre externa.
- **[depois]** Terreno com desnível e pontes (o silo com esteira passando por cima da lane, por exemplo).

## 5. Minions e economia

- **[feito]** Ondas escalam com o tempo; minions contornam torres.
- **[próximo]** Minion de cerco a cada 3 ondas (Colheitadeira-Armada / Moto-Bomba, já desenhados no seu GDD) que bate forte em torre.
- **[próximo]** Minions com alvo mais inteligente: defender o herói aliado que foi atacado.
- **[próximo]** Ouro por assistência e por derrubar estrutura (hoje torre não paga).
- **[próximo]** Itens com receita (componentes que viram item completo), venda de itens e 2 ou 3 itens com efeito ativo.
- **[depois]** Sistema de nível de conta, runas/talentos antes da partida.

## 6. IA

- **[feito]** Bots usam habilidades, compram itens, recuam, não mergulham em torre sem minions e às vezes fazem selva.
- **[próximo]** Bots usarem os milharais e os portões de gank (hoje andam pela lane).
- **[próximo]** Níveis de dificuldade (fácil/normal/difícil) na tela de seleção.
- **[próximo]** Coordenação mínima: focar o mesmo alvo, recuar juntos.

## 7. Visual, partículas e iluminação

- **[feito]** Estilo HQ (tinta + faixas de luz); poças de luz sob lâmpadas, fogueiras, Fendas e objetivos; marco do Núcleo da ORACLE.
- **[próximo]** Projéteis com modelo próprio por herói (flecha de cobre, drone, pulso de rádio) em vez do losango genérico.
- **[próximo]** Decalques de impacto que ficam no chão por alguns segundos (queimado de habilidade, marca de corte).
- **[próximo]** Destruição em etapas das torres (peças caindo, fumaça crescente conforme a vida baixa).
- **[próximo]** Milharal balançando quando alguém passa; poeira nos pés ao correr; rastros de drone.
- **[próximo]** Ciclo de clima curto: tempestade de poeira no lado EKOO, neblina criogênica no lado AXIOM, relâmpagos roxos durante o evento 3h17.
- **[próximo]** Retratos pintados dos heróis na HUD e na tela de seleção (hoje são ícones).
- **[depois]** Sombras de nuvens passando, pássaros, sinalização rasgada, hologramas AXIOM, rádio-postes EKOO com alto-falantes.

## 8. Áudio (ainda inexistente)

- **[próximo]** Efeitos de impacto, habilidades, torre, morte e compra; aviso sonoro de abate.
- **[próximo]** Vozes curtas por herói ao lançar a ultimate.
- **[depois]** Trilha em duas camadas (calma / combate) e o "sinal das 3h17" como tema.

## 9. Online (intenção declarada)

- **[feito]** Heróis são movidos só por comandos; a simulação não lê teclado nem tela.
- **[próximo]** Tornar a simulação determinística: trocar `Math.random` por gerador com semente dentro de `game/`, e passo de tempo fixo (hoje o passo varia com a taxa de quadros).
- **[próximo]** Separar de vez "simulação" e "apresentação": hoje dano dispara efeitos visuais direto; precisa virar lista de eventos.
- **[depois]** Servidor autoritativo (Node com a mesma simulação), cliente com predição do próprio herói e interpolação dos demais; sala/lobby; reconexão.

## 10. Técnico

- **[próximo]** Fundir os 6 FBX do Vetor num GLB único (carrega mais rápido).
- **[próximo]** Carregamento em etapas com barra real; hoje a geração do mapa trava a aba por alguns segundos.
- **[próximo]** Testes automáticos da simulação (a ferramenta `tools/sim.mjs` já roda partidas aceleradas; falta virar verificação com critérios).
- **[depois]** Modo de qualidade "médio" e detecção automática por taxa de quadros.
