/**
 * Freshness Prediction API Service
 * Sends ingredient data to Flask API for freshness classification
 */

const FRESHNESS_API_URL = 'https://freshness-api-m31w.onrender.com/predict';

export interface FreshnessPredictionRequest {
  temperature: number;
  humidity: number;
  time_in_refrigerator: number; // hours
  ingredient_type: string;
}

export interface FreshnessPredictionResponse {
  classification: 'Fresh' | 'Stale' | 'Expired';
  confidence?: number; // optional confidence score
}

/**
 * Predicts freshness of an ingredient based on environmental factors
 * @param request - Prediction request with temperature, humidity, time, and ingredient type
 * @returns Promise with freshness classification
 */
export async function predictFreshness(
  request: FreshnessPredictionRequest
): Promise<FreshnessPredictionResponse> {
  try {
    const response = await fetch(FRESHNESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Freshness API error: ${response.status}`
      );
    }

    const data = await response.json();
    
    return {
      classification: data.classification || data.prediction || 'Fresh',
      confidence: data.confidence,
    };
  } catch (error) {
    console.error('Error predicting freshness:', error);
    // Return a default classification on error
    throw error;
  }
}

/**
 * Calculates time in refrigerator in hours
 * @param addedAt - Timestamp when ingredient was added
 * @returns Number of hours since added
 */
export function calculateTimeInRefrigerator(addedAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - addedAt.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(0, Math.round(diffHours * 100) / 100); // Round to 2 decimal places
}

