#!/usr/bin/env python3
"""Compose one report figure: office client (desktop, via LAN address) + phone-sized view."""
import os
from PIL import Image
D = os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots")
a = Image.open(os.path.join(D, "06-office-lan.png")).convert("RGB")
b = Image.open(os.path.join(D, "07-mobile.png")).convert("RGB")
H = 760
a = a.resize((round(a.width * H / a.height), H), Image.LANCZOS)
b = b.resize((round(b.width * H / b.height), H), Image.LANCZOS)
gap = 28
S = Image.new("RGB", (a.width + gap + b.width, H), "white")
S.paste(a, (0, 0)); S.paste(b, (a.width + gap, 0))
S.save(os.path.join(D, "09-office-and-mobile.png"), optimize=True)
print("composed", S.size)
