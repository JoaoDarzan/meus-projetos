# Darzan Produções: vídeo vertical 4K

Vídeo institucional vertical de 43 segundos para Reels, TikTok, Shorts e Status.
Tem locução, efeitos sonoros, trilha, a logo em 3D dourada e legendas palavra por palavra.

- **`out/darzan-vertical-4k.mp4`**: o vídeo final, 2160×3840 (4K vertical), 30 fps, H.264 + AAC, áudio a -14 LUFS.
- **`out/darzan-vertical-1080p.mp4`**: o mesmo vídeo em 1080×1920, mais leve para WhatsApp e celular.
- **`index.html`**: a animação, que também funciona como **versão interativa**. Abra em um navegador
  (precisa de um servidor local, veja abaixo) e use play/pause, a barra de tempo e os botões de capítulo
  (Abertura, Logo, Serviços, Celebrações, Storymaker, Como funciona, Contato). Atalhos: espaço = play/pausa,
  ←/→ = meio segundo (com Shift, um quadro), R = recomeçar, `?t=12.5` na URL abre no tempo 12,5 s.

## Roteiro

| Tempo | Cena | Locução |
|---|---|---|
| 0–3,4 s | Visor de câmera (REC + timecode) e íris de 8 lâminas que se abre | "Todo momento merece virar cinema." |
| 3,4–8,8 s | Logo 3D dourada monta peça por peça: emblema, anéis, louro, nome | "Darzan Produções. Videomaker cinematográfico em Campinas e região." |
| 8,2–11 s | A câmera voa para dentro do obturador; película de cinema passando | "O seu dia, contado como cinema." |
| 11–19,8 s | Carrossel 3D com os 6 serviços, girando a cada serviço falado | "Filme cinematográfico. Teaser. Cerimônia na íntegra..." |
| 19,8–24,3 s | Lista de celebrações virando em 3D | "Casamentos, eventos corporativos, aniversários e chá revelação." |
| 24,3–28,5 s | Celular 3D com stories e selo "pronto no mesmo dia" | "Com o storymaker, os seus stories ficam prontos no mesmo dia." |
| 28,5–35,2 s | Linha do tempo: conversa → planejamento → dia do evento → entrega | "É simples: a gente conversa, planeja junto..." |
| 35,2–43 s | Logo 3D de volta e botão do WhatsApp (19) 99527-3041, @darzanproducoes | "Darzan Produções. Chama no WhatsApp e garanta a sua data." |

## Áudio

- **Locução**: ElevenLabs, voz "Thales - Sophisticated and Vibrant", modelo eleven_v4 (`audio/locucao.mp3`).
  Os tempos de cada palavra (`audio/palavras.json`) vieram da transcrição do ElevenLabs (Scribe)
  e comandam as animações e as legendas.
- **Efeitos sonoros**: ElevenLabs, modelo de efeitos (`audio/sfx/`): impacto, riser, whoosh, obturador, clique, brilho.
- **Trilha**: sintetizada por código em `audio/mixar.py` (pad de cordas em ré menor, pulso grave a 90 BPM e arpejo).
  Ela abaixa sozinha quando a locução fala.

## Logo

A logo vetorizada fica em `../marca/` (veja o `LEIA-ME.md` de lá). O 3D usa `../marca/logo-partes.svg`:
cada parte (rolo, obturador, play, seta, anéis, louro, textos) vira uma peça extrudada em three.js
com material de ouro metálico.

## Como gerar de novo

Precisa de Node com Playwright (Chromium), ffmpeg e Python 3 com numpy e scipy.

```bash
cd video-vertical
node render.js tempos                 # salva tempos.json (tempos das cenas)
python3 audio/mixar.py                # mixa audio/mix.wav e audio/mix.m4a
ESCALA=1 node render.js probe 5 12 30 # quadros de teste em out/probe/folha.png
for k in 0 1 2 3; do node render.js parte $k 4 & done; wait   # quadros em 4K (out/quadros/)
node render.js video                  # out/darzan-vertical-4k.mp4
```

Para ver a versão interativa: na raiz do repositório, rode `python3 -m http.server 8000`
e abra `http://localhost:8000/video-vertical/`.

## Como mudar textos e tempos

- Textos dos serviços, celebrações, stories e passos: listas `SERV`, `CEL`, `STO` e `PAS` no `<script>` do `index.html`.
- Tempos das cenas: objeto `T` no começo do `<script>` (estão casados com as palavras da locução).
- Trocando a locução, atualize `audio/palavras.json` e os tempos em `T`, rode `node render.js tempos`
  e depois `python3 audio/mixar.py`.
