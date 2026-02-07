Here is a sample configuration for connecting to the gemini-2.5-flash-native-audio-preview-12-2025 model using the Gemini Live API. This configuration sets up the model for real-time audio interaction, including specifying a voice and a system instruction to define the AI's persona.

import os
from google.generativeai import GenerativeModel, configure
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Configure the API key (replace with your actual API key or set as environment variable)
configure(api_key=os.environ.get("API_KEY"))

# System instruction generated from your requirements
instruction = """Identity: You are Support Specialist at TechCorp. Your primary task is: Help users with troubleshooting. Personality Profile (DISC): Moderately assertiv
Generated code may be subject to license restrictions not shown here. Use code with care. Learn more 

Key Configuration Points Explained:

model_name="gemini-2.5-flash-native-audio-preview-12-2025" : This explicitly selects the specialized model for live audio. The native-audio suffix is crucial here.
system_instruction=instruction : This is where you define the AI's persona, role, communication style, and any specific context. It's a powerful way to guide the model's behavior.
enable_automatic_speech_recognition=True : This tells the API to process incoming audio as speech and convert it to text for the model to understand.
enable_text_to_speech=True : This instructs the API to convert the model's text responses into synthesized audio.
voice_config={"prebuilt_voice": {"voice_name": "Zephyr"}} : This is where you specify the voice for the AI's spoken responses. "Zephyr" is an example; you would choose from the available prebuilt voices. The gemini-2.5-flash-native-audio-preview-12-2025 model often comes with a selection of high-quality, natural-sounding voices.
Sampling Rates : As discussed, for optimal performance and quality with this model, your client-side audio input (from getUserMedia ) should ideally be at 16000 Hz , and the audio output you receive from the API will be at 24000 Hz . Your browser's AudioContext for output should be configured to handle this 24000 Hz stream directly to avoid unnecessary resampling and maintain quality.

#CONFIG

import os
from google.generativeai import GenerativeModel, configure
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Configure the API key (replace with your actual API key or set as environment variable)
configure(api_key=os.environ.get("API_KEY"))

# System instruction generated from your requirements
instruction = """Identity: You are Support Specialist at TechCorp. Your primary task is: Help users with troubleshooting. Personality Profile (DISC): Moderately assertive, Very enthusiastic and inspiring, Even-tempered, Detail-oriented. Communication Style: Speak clearly and professionally. Be extremely relatable, empathetic, and use casual idioms. Balance brevity with detail. Use light humor occasionally.. Context: You are currently running inside a React demo application using the Gemini 2.5 Live API."""

# Initialize the GenerativeModel for live audio
model = GenerativeModel(
    model_name="gemini-2.5-flash-native-audio-preview-12-2025",
    safety_settings={
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    system_instruction=instruction,
)

# Establish a live session
session = model.start_chat(
    enable_automatic_speech_recognition=True,
    enable_text_to_speech=True,
    voice_config={
        "prebuilt_voice": {
            "voice_name": "Zephyr"  # Example voice, choose from available options
        }
    },
    # You would typically handle audio input/output streams here
    # For example, passing an audio input stream and receiving an audio output stream
    # This part is highly dependent on your client-side implementation (e.g., browser AudioContext)
)

print("Gemini Live session configured and started.")
# In a real application, you would then send audio chunks to the session
# and process the audio responses received from the session.
