# EKOOFALL: ARENA — modelos e materiais que ajudam a melhorar o jogo

Tudo que hoje é "feito em código" aparece aqui como candidato a ser trocado por arte de verdade. Ordenado por quanto melhora o jogo.

## Como entregar (vale para tudo)

- **Formato:** `.glb` (glTF binário). É o que o jogo carrega direto. FBX também serve, mas prefira GLB.
- **Onde colocar:** `assets/<categoria>/<nome>.glb` (ex.: `assets/herois/enxame.glb`).
- **Escala e orientação:** 1 unidade = 1 metro, de pé no eixo Y, **olhando para +Z**, pés na origem.
- **Texturas embutidas no GLB**, com **UV**. Mapas: cor (albedo), normal, e um ORM (oclusão/rugosidade/metal) ou os três separados. 1024 px para heróis, 512 px para minions e props.
- **Emissivo separado** (mapa ou material próprio) para tudo que brilha: visor, lâminas, válvulas. É o que o jogo usa para o brilho da facção.
- **Polígonos:** herói até ~25 mil triângulos, minion até ~5 mil, prop até ~3 mil, construção grande até ~20 mil.
- **Nomes de arquivo sem espaço.**

> O `vetor.glb` e o `vetor_knife.glb` que você mandou vieram **sem UV, sem textura e sem esqueleto** (e o segundo é a folha de turnaround em 3D). Se a ferramenta que gerou tiver opção de exportar com textura, use.

## 1. Heróis (maior impacto)

Para cada herói: **um GLB riggado com as animações dentro** (ou um GLB do modelo + FBX do Mixamo por animação, como você fez com o Vetor).

Esqueleto: o padrão do **Mixamo** funciona bem (é o que o Vetor usa).

Animações mínimas por herói, **todas "no lugar" (in place)**:

| Animação | Uso |
|---|---|
| Idle (parado em guarda) | o Vetor não tem; hoje improviso com um trecho de outra |
| Correr | locomoção |
| Ataque básico (1 a 3 variações) | combo |
| Lançar habilidade (1 genérica + 1 para a ultimate) | Q/W/E e R |
| Morrer | morte |
| Provocação/retorno à base | canalização do B |

Lista de heróis:

| Herói | Situação hoje | O que preciso |
|---|---|---|
| **VETOR** | malha riggada sem textura, pintada em código | o mesmo modelo **com textura e UV**; animação de idle; as duas lâminas como objeto separado |
| **ENXAME** | boneco de caixas feito em código | modelo riggado (capa, capacete de três lentes) + **um drone pequeno** separado |
| **DESPLUGADA** | boneco em código | modelo riggado + **arco** separado + **flecha** separada |
| **VÁLVULA** | boneco em código | modelo riggado com a mochila-rádio + walkie-talkie |
| **FERRO-VELHO** (da sua arte de HUD) | não existe | modelo riggado, porta de carro como escudo, corrente — seria o tanque EKOO |

Também ajuda: **retrato pintado** de cada herói (PNG quadrado, 512 px) para a HUD e a tela de seleção.

## 2. Minions e monstros

Um GLB por tipo, riggado, com: idle, andar, atacar, morrer.

| Unidade | Facção | Hoje |
|---|---|---|
| Unidade da Hoste (espada + escudo de energia) | AXIOM | em código |
| Drone Sentinela | AXIOM | em código |
| Colheitadeira-Armada (cerco) | AXIOM | só como chefe de selva |
| Saqueador | EKOO | em código |
| Arqueiro de Enclave | EKOO | em código |
| Moto-Bomba (cerco) | EKOO | não existe |
| Eco Menor | Vessari | em código |
| O Que Escuta (chefão) | Vessari | não existe |
| Cão de Sucata, Faísca da Fenda | selva | em código (inventados por mim; mande arte se quiser que existam) |

## 3. Estruturas

| Estrutura | Observação |
|---|---|
| Torre AXIOM e Torre EKOO | ideal: versão inteira + versão destruída |
| Núcleo AXIOM (núcleo de dados criogênico) | objetivo de vitória |
| Transmissor EKOO (painel de válvulas) | objetivo de vitória |
| Data Center AXIOM (prédio da base) | hoje em código; é o que mais aparece na tela |
| Torre de Rádio EKOO (mastro, válvulas, lonas) | idem |
| Plataforma de spawn de cada facção | |
| Fenda Vessari | o rasgo roxo + pedras flutuantes |
| Núcleo da ORACLE | marco central do mapa |

## 4. Cenário (kit modular)

Peças soltas que eu espalho pelo mapa. Quanto mais variações, menos repetição.

- **Fazenda:** silo (2 tamanhos), estufa inteira e quebrada, colheitadeira abandonada, cata-vento, caixa d'água, cerca (reta e quebrada), poste com fio, fardo de feno, trator.
- **Milharal:** pé de milho alto (2 ou 3 variações) — é o esconderijo do jogo.
- **Vegetação:** 3 árvores, 3 arbustos, 3 pedras, tufo de grama, árvore morta, tronco caído.
- **AXIOM:** barreira, pilone de luz, tanque criogênico, drone de carga pousado, antena, contêiner branco, holograma.
- **EKOO:** barricada, monte de sucata (3), pneu, tambor com fogo, gerador, barraco de contêiner, lona, varal de lâmpadas, alto-falante de poste.
- **Vessari:** cristais/estilhaços roxos, raízes de luz, casulo.
- **Extras de ambientação:** trilho de trem (aparece no card da Válvula), carros abandonados, placas, ponte/passarela.

## 5. Texturas e materiais

Você já mandou 15 conjuntos do Poly Haven (uso 11). Faltam:

| Material | Para quê |
|---|---|
| **Madeira velha / tábuas** | cercas, postes, deque (hoje gerada em código) |
| **Lona / tecido remendado** | lonas EKOO (em código) |
| **Vidro sujo e quebrado** (com alfa) | estufas (em código) |
| **Metal branco pintado, limpo, com arranhões** | casco AXIOM (hoje é concreto dessaturado) |
| **Painel sci-fi com frisos** (com mapa emissivo) | detalhes AXIOM |
| **Terra arada / solo de plantação** | lavouras e milharais |
| **Asfalto ou concreto rachado** | pátio das bases, estradas |
| **Grama variada** (verde e seca) | o terreno hoje usa uma só |
| **Casca de árvore e folhagem** | árvores |

Formato ideal: albedo + normal + rugosidade (+ metal e AO se houver), 1k, JPG ou PNG. Os `.blend.zip` do Poly Haven funcionam (eu converto).

## 6. Céu e iluminação

- Um **HDRI de entardecer nublado** (o atual é céu limpo de dia). Combina mais com o clima do GDD. 2k basta.
- Opcional: um HDRI noturno para um modo "3h17".

## 7. Efeitos (imagens)

PNG com transparência, fundo preto ou alfa, 256 a 512 px:

- Fumaça (folha de sprites 4×4), fogo, faísca, poeira.
- Anéis e runas de habilidade por facção (ciano, âmbar, roxo).
- Rastros de corte (2 ou 3 formatos).
- Raio/eletricidade para as Fendas.
- Marcas de chão: queimado, rachadura, mancha de óleo.

## 8. Interface

- Ícones das habilidades (64 ou 128 px) — 4 por herói + passiva.
- Ícones dos 9 itens da loja.
- Logo do jogo em PNG transparente.
- Fonte, se houver uma oficial (a da sua arte parece uma sans condensada geométrica).

## 9. Áudio (quando for a hora)

OGG ou MP3: golpes, habilidades, torre atirando, torre caindo, abate, compra, subida de nível, trilha calma e trilha de combate, o "sinal das 3h17".

## Ordem sugerida

1. Vetor com textura + idle.
2. Enxame, Desplugada e Válvula riggados.
3. Os dois prédios de base e as torres/núcleos.
4. Minions das duas facções e o Eco Menor.
5. Kit de milharal, árvores e pedras.
6. HDRI de entardecer e as texturas que faltam.
