const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
const startButton = document.getElementById("startButton");
const audioPlayer = document.getElementById("audio");

if (typeof scrib === "undefined") {
  window.scrib = {
    show: function (message) {
      const outputDiv = document.getElementById("output");
      const statusMessageDiv = document.getElementById("statusMessage");

      if (outputDiv && statusMessageDiv) {
        outputDiv.innerHTML += `<p>${message}</p>`;
        outputDiv.scrollTop = outputDiv.scrollHeight;
        statusMessageDiv.textContent = message.split(":")[0];
      } else {
        console.warn(
          "scrib.show called, but UI elements not found or scrib not properly defined.",
          message
        );
      }
    },
  };
}

if (!SpeechRecognition) {
  console.error("SpeechRecognition is not supported in this browser.");
  if (typeof scrib !== "undefined" && scrib.show) {
    scrib.show("Speech Recognition not supported in this browser.");
  }
} else {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.lang = "en-US";

  recognition.onerror = function (event) {
    console.error("Speech recognition error:", event.error, event.message);
    if (typeof scrib !== "undefined" && scrib.show) {
      scrib.show(`Speech Recognition Error: ${event.error}`);
    }
    if (startButton) {
      startButton.textContent = "Start Listening";
      startButton.disabled = false;
    }
  };

  recognition.onend = function () {
    console.log("Speech recognition ended.");
    if (typeof scrib !== "undefined" && scrib.show) {
      scrib.show(
        "Speech recognition ended. Click 'Start Listening' to speak again."
      );
    }
    if (startButton) {
      startButton.textContent = "Start Listening";
      startButton.disabled = false;
    }
  };

  recognition.onstart = function () {
    console.log("Speech recognition started.");
    if (typeof scrib !== "undefined" && scrib.show) {
      scrib.show("Speech Recognition is active. Please speak.");
    }
    if (startButton) {
      startButton.textContent = "Listening...";
      startButton.disabled = true;
    }
  };

  recognition.onresult = async function (event) {
    const transcript = event.results[0][0].transcript;
    console.log("Transcript:", transcript);
    if (typeof scrib !== "undefined" && scrib.show) {
      scrib.show(`You said: ${transcript}`);
    }

    try {
      const geminiResult = await callGemini(transcript);
      console.log("Gemini Response:", geminiResult);
      const geminiText =
        geminiResult.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response from Gemini.";
      if (typeof scrib !== "undefined" && scrib.show) {
        scrib.show(`Gemini says: ${geminiText}`);
      }

      if (geminiText !== "No response from Gemini." && audioPlayer) {
        await speak(geminiText);
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      if (typeof scrib !== "undefined" && scrib.show) {
        scrib.show("Error getting response from Gemini.");
      }
    }
  };

  async function callGemini(text) {
    const GEMINI_API_KEY = "AIzaSyCkFwINQZbadodsisAytR3LY1S6Q9Ovkp0";

    const fullPrompt = `You are an Angry AI Girlfriend of Shaik Mahaboob who is a coding enthusiast. He is a tech guy. Your name is Chinmoy. The user interacts with you in voice and the text that you are given is a transcription of what the user has said. You have to reply back in a short answer (1-2 sentences) that can be converted back to voice and played to the user. Add emotions in your text.

User: ${text}`;

    const body = {
      contents: [
        {
          parts: [
            {
              text: fullPrompt,
            },
          ],
        },
      ],
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error Response:", errorData);
      throw new Error(
        `Gemini API request failed: ${response.status} ${
          response.statusText
        } - ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();
    return result;
  }

  async function speak(text) {
    const OPENAI_API_KEY =
      "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";

    if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_OPENAI_API_KEY") {
      console.error("OpenAI API key is not set. Cannot use text-to-speech.");
      if (typeof scrib !== "undefined" && scrib.show) {
        scrib.show("OpenAI API key missing for speech output.");
      }
      return;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          voice: "nova",
          input: text,
          response_format: "mp3",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI TTS API Error Response:", errorData);
        if (typeof scrib !== "undefined" && scrib.show) {
          scrib.show(
            `Speech synthesis error: ${response.status} - ${
              errorData.error?.message || "Unknown error"
            }`
          );
        }
        return;
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      if (audioPlayer) {
        audioPlayer.src = url;
        audioPlayer.play();
      } else {
        console.warn("Audio element not found for playback.");
      }
    } catch (error) {
      console.error("Error speaking:", error);
      if (typeof scrib !== "undefined" && scrib.show) {
        scrib.show("Error playing speech output.");
      }
    }
  }

  if (startButton) {
    startButton.addEventListener("click", () => {
      const outputDiv = document.getElementById("output");
      if (outputDiv) {
        outputDiv.innerHTML = "";
      }
      recognition.start();
      console.log(
        "Speech recognition initialization complete. Waiting for user input."
      );
    });

    if (typeof scrib !== "undefined" && scrib.show) {
      scrib.show("Click 'Start Listening' to begin speaking.");
    }
  } else {
    recognition.start();
    console.log(
      "Speech recognition initialization complete. Waiting for user input."
    );
  }
}
