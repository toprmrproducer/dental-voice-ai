"""
Sarvam AI Plugin for LiveKit Agents
Implements STT (saaras:v3) and TTS (bulbul:v3) using Sarvam AI APIs.
Designed as drop-in replacements for groq.STT and groq.TTS.
"""

import os
import io
import wave
import base64
import logging
import struct
from typing import AsyncIterable

import httpx

from livekit import rtc
from livekit.agents import stt, tts, utils

logger = logging.getLogger("sarvam-plugin")

SARVAM_API_BASE = "https://api.sarvam.ai"
SARVAM_STT_ENDPOINT = f"{SARVAM_API_BASE}/speech-to-text"
SARVAM_TTS_ENDPOINT = f"{SARVAM_API_BASE}/text-to-speech"


class SarvamSTT(stt.STT):
    """
    Sarvam AI Speech-to-Text using saaras:v3 model.
    Buffers incoming PCM audio frames, converts to WAV,
    and sends to Sarvam's /speech-to-text endpoint.
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str = "saaras:v3",
        language_code: str = "hi-IN",
        sample_rate: int = 16000,
    ):
        super().__init__(
            capabilities=stt.STTCapabilities(streaming=False, interim_results=False)
        )
        self._api_key = api_key or os.environ.get("SARVAM_API_KEY", "")
        self._model = model
        self._language_code = language_code
        self._sample_rate = sample_rate

        if not self._api_key:
            raise ValueError("SARVAM_API_KEY is required for SarvamSTT")

    def _pcm_to_wav(self, pcm_data: bytes, sample_rate: int, num_channels: int = 1) -> bytes:
        """Convert raw PCM16 audio data to WAV format."""
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(num_channels)
            wf.setsampwidth(2)  # 16-bit PCM
            wf.setframerate(sample_rate)
            wf.writeframes(pcm_data)
        return buf.getvalue()

    async def recognize(
        self,
        *,
        buffer: utils.AudioBuffer,
        language: str | None = None,
    ) -> stt.SpeechEvent:
        """
        Recognize speech from a complete audio buffer.
        Converts PCM to WAV and sends to Sarvam API.
        """
        # Merge all frames into one PCM buffer
        frames = utils.merge_frames(buffer)
        pcm_data = frames.data.tobytes()
        sample_rate = frames.sample_rate or self._sample_rate
        num_channels = frames.num_channels or 1

        wav_data = self._pcm_to_wav(pcm_data, sample_rate, num_channels)

        lang = language or self._language_code

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                SARVAM_STT_ENDPOINT,
                headers={
                    "api-subscription-key": self._api_key,
                },
                files={
                    "file": ("audio.wav", wav_data, "audio/wav"),
                },
                data={
                    "model": self._model,
                    "language_code": lang,
                },
            )

        if resp.status_code != 200:
            logger.error(f"Sarvam STT error: {resp.status_code} {resp.text}")
            return stt.SpeechEvent(
                type=stt.SpeechEventType.FINAL_TRANSCRIPT,
                alternatives=[stt.SpeechData(text="", language=lang)],
            )

        result = resp.json()
        transcript = result.get("transcript", "")

        logger.debug(f"Sarvam STT result: {transcript}")

        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[
                stt.SpeechData(
                    text=transcript,
                    language=lang,
                    confidence=result.get("confidence", 1.0),
                )
            ],
        )


class SarvamTTS(tts.TTS):
    """
    Sarvam AI Text-to-Speech using bulbul:v3 model.
    Sends text to Sarvam's /text-to-speech endpoint
    and returns decoded audio frames.
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str = "bulbul:v3",
        voice: str = "meera",
        language_code: str = "hi-IN",
        sample_rate: int = 22050,
        enable_preprocessing: bool = True,
    ):
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=sample_rate,
            num_channels=1,
        )
        self._api_key = api_key or os.environ.get("SARVAM_API_KEY", "")
        self._model = model
        self._voice = voice
        self._language_code = language_code
        self._sample_rate = sample_rate
        self._enable_preprocessing = enable_preprocessing

        if not self._api_key:
            raise ValueError("SARVAM_API_KEY is required for SarvamTTS")

    def synthesize(self, text: str) -> "SarvamTTSStream":
        return SarvamTTSStream(
            text=text,
            api_key=self._api_key,
            model=self._model,
            voice=self._voice,
            language_code=self._language_code,
            sample_rate=self._sample_rate,
            enable_preprocessing=self._enable_preprocessing,
        )


class SarvamTTSStream(tts.SynthesizeStream):
    """Stream wrapper for Sarvam TTS synthesis."""

    def __init__(
        self,
        *,
        text: str,
        api_key: str,
        model: str,
        voice: str,
        language_code: str,
        sample_rate: int,
        enable_preprocessing: bool,
    ):
        super().__init__()
        self._text = text
        self._api_key = api_key
        self._model = model
        self._voice = voice
        self._language_code = language_code
        self._sample_rate = sample_rate
        self._enable_preprocessing = enable_preprocessing

    async def _run(self) -> None:
        """Synthesize text and push audio frames."""
        # Split long text into chunks (Sarvam has input limits)
        chunks = self._split_text(self._text, max_chars=500)

        for chunk in chunks:
            if not chunk.strip():
                continue

            try:
                audio_data = await self._synthesize_chunk(chunk)
                if audio_data:
                    frame = rtc.AudioFrame(
                        data=audio_data,
                        sample_rate=self._sample_rate,
                        num_channels=1,
                        samples_per_channel=len(audio_data) // 2,  # 16-bit samples
                    )
                    self._event_ch.send_nowait(
                        tts.SynthesizedAudio(
                            request_id="",
                            frame=frame,
                        )
                    )
            except Exception as e:
                logger.error(f"Sarvam TTS synthesis error: {e}")

    async def _synthesize_chunk(self, text: str) -> bytes | None:
        """Send text to Sarvam TTS and return raw PCM audio bytes."""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                SARVAM_TTS_ENDPOINT,
                headers={
                    "api-subscription-key": self._api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "inputs": [text],
                    "target_language_code": self._language_code,
                    "speaker": self._voice,
                    "model": self._model,
                    "enable_preprocessing": self._enable_preprocessing,
                },
            )

        if resp.status_code != 200:
            logger.error(f"Sarvam TTS error: {resp.status_code} {resp.text}")
            return None

        result = resp.json()
        audios = result.get("audios", [])
        if not audios:
            logger.warning("No audio returned from Sarvam TTS")
            return None

        # Sarvam returns base64-encoded WAV audio
        audio_b64 = audios[0]
        audio_bytes = base64.b64decode(audio_b64)

        # Extract raw PCM from WAV
        pcm_data = self._wav_to_pcm(audio_bytes)
        return pcm_data

    def _wav_to_pcm(self, wav_data: bytes) -> bytes:
        """Extract raw PCM data from WAV bytes."""
        buf = io.BytesIO(wav_data)
        try:
            with wave.open(buf, "rb") as wf:
                return wf.readframes(wf.getnframes())
        except Exception:
            # If it's not a valid WAV, try returning raw data
            # (some APIs return raw PCM with WAV header)
            logger.warning("Could not parse WAV, returning raw bytes")
            return wav_data

    @staticmethod
    def _split_text(text: str, max_chars: int = 500) -> list[str]:
        """Split text into chunks at sentence boundaries."""
        if len(text) <= max_chars:
            return [text]

        chunks = []
        current = ""
        sentences = text.replace(". ", ".\n").replace("? ", "?\n").replace("! ", "!\n").split("\n")

        for sentence in sentences:
            if len(current) + len(sentence) + 1 <= max_chars:
                current = f"{current} {sentence}".strip() if current else sentence
            else:
                if current:
                    chunks.append(current)
                current = sentence

        if current:
            chunks.append(current)

        return chunks
