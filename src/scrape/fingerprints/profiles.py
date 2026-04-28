"""Coherent fingerprint bundles — UA + screen + timezone + locale must match.

Each profile is a real-device snapshot. Mixing fields across profiles
(e.g. macOS UA + Windows screen) is the #1 fingerprint mistake.

These bundles are minimal — for a production system, capture more device
profiles via tooling like Camoufox's profile generator or Multilogin export.
"""
from __future__ import annotations

import random
from dataclasses import dataclass


@dataclass(frozen=True)
class FingerprintProfile:
    name: str
    user_agent: str
    accept_language: str
    timezone: str
    locale: str
    screen_width: int
    screen_height: int
    viewport_width: int
    viewport_height: int
    device_memory: int     # GB
    hardware_concurrency: int
    platform: str          # "MacIntel", "Win32", "Linux x86_64"
    color_depth: int = 24

    @property
    def is_mobile(self) -> bool:
        return "Mobile" in self.user_agent or "Android" in self.user_agent


# Hand-curated set spanning common 2026 device profiles.
PROFILES: tuple[FingerprintProfile, ...] = (
    FingerprintProfile(
        name="macos-chrome-14pro",
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        accept_language="en-US,en;q=0.9",
        timezone="America/Los_Angeles",
        locale="en-US",
        screen_width=1728, screen_height=1117,
        viewport_width=1440, viewport_height=900,
        device_memory=16, hardware_concurrency=10,
        platform="MacIntel",
    ),
    FingerprintProfile(
        name="windows11-edge-i7",
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
        accept_language="en-US,en;q=0.9",
        timezone="America/New_York",
        locale="en-US",
        screen_width=1920, screen_height=1080,
        viewport_width=1536, viewport_height=824,
        device_memory=16, hardware_concurrency=8,
        platform="Win32",
    ),
    FingerprintProfile(
        name="windows11-firefox",
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
        accept_language="en-US,en;q=0.5",
        timezone="Europe/London",
        locale="en-GB",
        screen_width=2560, screen_height=1440,
        viewport_width=1920, viewport_height=1057,
        device_memory=8, hardware_concurrency=12,
        platform="Win32",
    ),
    FingerprintProfile(
        name="ubuntu-firefox",
        user_agent="Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
        accept_language="en-US,en;q=0.5",
        timezone="Europe/Berlin",
        locale="de-DE,en-US;q=0.7",
        screen_width=1920, screen_height=1080,
        viewport_width=1850, viewport_height=970,
        device_memory=8, hardware_concurrency=8,
        platform="Linux x86_64",
    ),
    FingerprintProfile(
        name="iphone15-safari",
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        accept_language="en-US,en;q=0.9",
        timezone="America/Chicago",
        locale="en-US",
        screen_width=390, screen_height=844,
        viewport_width=390, viewport_height=664,
        device_memory=4, hardware_concurrency=6,
        platform="iPhone",
    ),
    FingerprintProfile(
        name="pixel8-chrome",
        user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        accept_language="en-US,en;q=0.9",
        timezone="America/Denver",
        locale="en-US",
        screen_width=412, screen_height=915,
        viewport_width=412, viewport_height=786,
        device_memory=8, hardware_concurrency=8,
        platform="Linux armv81",
    ),
)

PROFILES_BY_NAME: dict[str, FingerprintProfile] = {p.name: p for p in PROFILES}


def random_profile(desktop_only: bool = False) -> FingerprintProfile:
    pool = [p for p in PROFILES if not (desktop_only and p.is_mobile)]
    return random.choice(pool)


def get_profile(name: str) -> FingerprintProfile:
    return PROFILES_BY_NAME[name]
