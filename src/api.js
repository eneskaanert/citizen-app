const API_URL = "http://127.0.0.1:8000";

export async function analyzeEmergency(message) {
  try {
    const response = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        message: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend HTTP ${response.status}`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("API bağlantı hatası:", error);
    throw error;
  }
}