# Darzan Produções — Vídeo de apresentação em motion

Vídeo de 37 segundos (1920×1080, 30 fps, sem áudio) apresentando a Darzan Produções,
com as mesmas cores e fontes do site.

- **`apresentacao-darzan.mp4`**: o vídeo pronto, sem áudio.
- **`apresentacao-darzan-locucao.mp4`**: o mesmo vídeo com locução em português (voz "Fabio Manarin", ElevenLabs, modelo eleven_v4).
- **`index.html`**: a animação. Abra no navegador para assistir, pausar (barra de espaço) e avançar.
- **`render.js`**: gera o MP4 a partir do `index.html`.

## Roteiro

| Tempo | Cena |
|---|---|
| 0–5 s | Abertura: visor de câmera (REC + timecode), monograma "D" e o nome DARZAN Produções |
| 5–9,6 s | "Seu dia contado como *cinema*" |
| 9,6–18,8 s | Os 6 serviços: filme cinematográfico, teaser, cerimônia na íntegra, motion, empresas, storymaker |
| 18,8–22,8 s | Para todo tipo de celebração: casamentos, empresas, aniversários, chá revelação |
| 22,8–27,4 s | Storymaker: celular com stories, "pronto no mesmo dia" |
| 27,4–31,6 s | Como funciona: conversa → planejamento → dia do evento → entrega |
| 31,6–37 s | Encerramento: WhatsApp (19) 99527-3041, @darzanproducoes, Campinas e região |

## Como mudar textos

Os textos dos serviços, celebrações, passos e stories ficam no início do `<script>` do
`index.html` (`SERVICOS`, `CELEBRACOES`, `PASSOS`, `STORIES`). Os outros textos estão no HTML.
Os tempos de cada cena ficam em `T`.

## Como gerar o MP4 de novo

Precisa de Node, Playwright (com Chromium) e ffmpeg:

```bash
npm install playwright && npx playwright install chromium   # só na primeira vez
node render.js                        # gera apresentacao-darzan.mp4
node render.js teste.png 30 12.5      # gera só um quadro, no tempo 12,5 s
```

O vídeo sai sem som. Para colocar uma trilha, use qualquer editor (CapCut, Premiere, DaVinci)
ou o ffmpeg:

```bash
ffmpeg -i apresentacao-darzan.mp4 -i trilha.mp3 -c:v copy -c:a aac -shortest -af "afade=t=out:st=34:d=3" com-trilha.mp4
```
