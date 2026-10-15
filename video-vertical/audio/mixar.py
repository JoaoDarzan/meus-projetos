"""Mixagem do vídeo vertical: locução (ElevenLabs) + efeitos (ElevenLabs) + trilha.

A trilha é sintetizada aqui mesmo (pad de cordas, pulso grave e arpejo), no
mesmo relógio do vídeo, e abaixa sozinha quando a locução fala.
Saída: audio/mix.wav (master, -14 LUFS) e audio/mix.m4a (para o player).

Uso: python3 audio/mixar.py
"""
import json
import subprocess
from pathlib import Path

import numpy as np

AQUI = Path(__file__).parent
SR = 48000
DUR = 43.0
O = 0.8                       # atraso da locução no vídeo (igual a O no index.html)
N = int(DUR * SR)


def ler(arq):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(arq), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def poe(buf, som, t, ganho=1.0):
    i = int(t * SR)
    if i < 0:
        som, i = som[-i:], 0
    n = min(len(som), len(buf) - i)
    if n > 0:
        buf[i:i + n] += som[:n] * ganho


def pico(som):
    return int(np.argmax(np.abs(som).sum(1)))


def poe_no_pico(buf, som, t, ganho):
    """Posiciona o efeito para que o ponto mais forte caia em t."""
    poe(buf, som, t - pico(som) / SR, ganho)


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    try:
        from scipy.signal import lfilter
        return lfilter([1 - a], [1, -a], x)
    except ImportError:
        y = np.zeros_like(x)
        prev = 0.0
        b = 1 - a
        for i in range(len(x)):
            prev = b * x[i] + a * prev
            y[i] = prev
        return y


def nota(m):
    return 440.0 * 2 ** ((m - 69) / 12)


t = np.arange(N) / SR
trilha = np.zeros((N, 2), np.float32)

# --- pad: acordes em ré menor (Dm9 · Bb · F · C), 4 s cada, entra devagar
ACORDES = [[50, 57, 62, 65, 69, 76], [46, 53, 58, 62, 65, 74], [41, 53, 57, 60, 65, 72], [48, 55, 60, 64, 67, 74]]
pad = np.zeros(N)
for k in range(int(DUR // 4) + 1):
    ac = ACORDES[k % 4]
    a0, a1 = k * 4.0, k * 4.0 + 4.6
    i0, i1 = int(a0 * SR), min(N, int(a1 * SR))
    if i0 >= N:
        break
    tt = t[i0:i1] - a0
    env = np.clip(tt / 1.2, 0, 1) * np.clip((a1 - a0 - tt) / 1.0, 0, 1)
    s = np.zeros(i1 - i0)
    for m in ac:
        for det in (-0.08, 0.0, 0.07):     # leve desafinação = cordas
            f = nota(m + det)
            s += np.sin(2 * np.pi * f * tt + det * 40) + 0.35 * np.sin(4 * np.pi * f * tt)
    pad[i0:i1] += s * env / len(ac)
pad = lp(pad, 1400)
vol_pad = np.interp(t, [0, 2.5, 3.8, 34.5, 35.2, 41, 43], [0.05, 0.16, 0.30, 0.26, 0.42, 0.30, 0])
trilha[:, 0] += pad * vol_pad * 0.9
trilha[:, 1] += np.roll(pad, 240) * vol_pad * 0.9   # abre o estéreo

# --- pulso grave (batida de coração cinematográfica) a 90 BPM depois da logo
pulso = np.zeros(N)
bt = 60 / 90
for b in np.arange(T_IMP := 3.87, 41.5, bt):
    i0 = int(b * SR)
    if i0 >= N:
        break
    tt = np.arange(int(0.5 * SR)) / SR
    f = 52 * np.exp(-tt * 6) + 38
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)
    n = min(len(s), N - i0)
    pulso[i0:i0 + n] += s[:n]
vol_pulso = np.interp(t, [0, 3.8, 3.9, 10.9, 11.0, 34.8, 35.3, 40, 42], [0, 0, 0.35, 0.35, 0.5, 0.5, 0.65, 0.45, 0])
trilha += (pulso * vol_pulso)[:, None] * 0.8

# --- arpejo de "brilho" (colcheias) nas cenas de serviços até o fim
arp = np.zeros(N)
passo = bt / 2
seq = [74, 77, 81, 86, 81, 77]
for j, b in enumerate(np.arange(11.0, 42.0, passo)):
    i0 = int(b * SR)
    tt = np.arange(int(0.6 * SR)) / SR
    m = seq[j % len(seq)] + ([0, -4, -9, -2][int((b // 4) % 4)])
    f = nota(m)
    s = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 9)
    n = min(len(s), N - i0)
    arp[i0:i0 + n] += s[:n]
vol_arp = np.interp(t, [0, 10.9, 11.4, 34.8, 35.3, 41, 43], [0, 0, 0.09, 0.09, 0.12, 0.08, 0])
trilha[:, 0] += arp * vol_arp
trilha[:, 1] += np.roll(arp, int(0.18 * SR)) * vol_arp * 0.8   # eco no lado direito

# --- locução e ducking
voz = np.zeros((N, 2), np.float32)
poe(voz, ler(AQUI / "locucao.mp3"), O, 1.0)
env = np.abs(voz).mean(1)
env = lp(lp(env, 6), 6)
duck = 1 - 0.62 * np.clip(env / (env.max() * 0.12), 0, 1)
trilha *= duck[:, None]

# --- efeitos sonoros (ElevenLabs), cada um no seu momento
sfx = np.zeros((N, 2), np.float32)
S = {n: ler(AQUI / "sfx" / f"{n}.mp3") for n in ["obturador", "clique", "riser", "riser-curto", "impacto", "impacto-final", "whoosh", "whoosh2", "brilho", "brilho-curto"]}
T = json.loads((AQUI.parent / "tempos.json").read_text())
poe_no_pico(sfx, S["obturador"], 0.42, 0.9)
poe_no_pico(sfx, S["riser-curto"], T["impacto"] - 0.05, 0.55)
poe_no_pico(sfx, S["impacto"], T["impacto"], 0.85)
poe(sfx, S["brilho"], 4.05, 0.5)
poe(sfx, S["brilho-curto"], 6.65, 0.45)
poe_no_pico(sfx, S["whoosh"], T["voo"] + 0.5, 0.7)
poe_no_pico(sfx, S["impacto"], T["voo"] + 0.62, 0.35)
for k, ts in enumerate([T["c4"], T["c5"], T["c6"], T["c7"]]):
    poe_no_pico(sfx, S["whoosh2" if k % 2 else "whoosh"], ts + 0.12, 0.5)
for ts in T["serv"][1:]:
    poe_no_pico(sfx, S["whoosh2"], ts - 0.15, 0.22)
for ts in T["cel"] + T["passos"]:
    poe_no_pico(sfx, S["clique"], ts - 0.15, 0.45)
poe(sfx, S["brilho-curto"], T["prontos"] - 0.1, 0.5)
poe_no_pico(sfx, S["riser"], T["c8"], 0.35)
poe_no_pico(sfx, S["impacto-final"], T["c8"] + 0.05, 0.75)
poe(sfx, S["brilho"], T["darzan"] + 0.2, 0.45)
poe(sfx, S["brilho-curto"], T["zap"] + 0.55, 0.45)
poe(sfx, S["brilho"], 40.2, 0.3)

mix = voz * 1.0 + trilha * 0.55 + sfx * 0.8
fade = np.clip((DUR - t) / 1.2, 0, 1)
mix *= fade[:, None]
mix /= max(1.0, np.abs(mix).max() / 0.95)

bruto = AQUI / "mix_bruto.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", str(bruto)],
               input=mix.astype(np.float32).tobytes(), check=True)
# loudnorm em duas passadas: -14 LUFS, pico -1.3 dBTP
med = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(bruto), "-af", "loudnorm=I=-14:TP=-1.3:LRA=11:print_format=json", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
j = json.loads(med[med.rindex("{"):med.rindex("}") + 1])
af = (f"loudnorm=I=-14:TP=-1.3:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
      f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(bruto), "-af", af, "-ar", str(SR), str(AQUI / "mix.wav")], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(AQUI / "mix.wav"), "-c:a", "aac", "-b:a", "192k", str(AQUI / "mix.m4a")], check=True)
bruto.unlink()
print("mix pronto:", AQUI / "mix.wav", "| medido antes:", j["input_i"], "LUFS")
