# Freshness Prediction Setup Guide

This guide will help you set up the freshness prediction feature for the In-Vento application. This feature uses WeatherAPI to fetch temperature and humidity data, Supabase to store ingredient data, and a Flask API on Render to predict ingredient freshness using a trained Random Forest model.

## Overview

The freshness prediction system works as follows:

1. **WeatherAPI**: Fetches current temperature and humidity for the device's city (e.g., Bacoor)
2. **Supabase**: Stores ingredient data including `ingredient_type` and `added_at` (created_at) timestamp
3. **Flask API**: Receives four features (temperature, humidity, time_in_refrigerator, ingredient_type) and returns freshness classification
4. **React Native App**: Displays the freshness classification next to each ingredient in the inventory

## Prerequisites

- Supabase account and project (see `SUPABASE_SETUP.md`)
- WeatherAPI account and API key (free tier available at [weatherapi.com](https://www.weatherapi.com))
- Render account (free tier available at [render.com](https://render.com))
- Trained Random Forest classifier model (saved as `.pkl` file)

## Part 1: Supabase Database Setup

### Step 1: Verify Inventory Items Table

The `inventory_items` table should already exist. Verify it has the following columns:

| Column Name | Type | Description |
|------------|------|-------------|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Foreign key to auth.users |
| `name` | `text` | Item name (used as ingredient_type) |
| `icon` | `text` | Icon key |
| `count` | `integer` | Quantity |
| `created_at` | `timestamptz` | Creation timestamp (used as added_at) |
| `expires_at` | `timestamptz` | Expiration timestamp |
| `updated_at` | `timestamptz` | Last update timestamp |

### Step 2: Verify RLS Policies

Ensure Row Level Security (RLS) is enabled on the `inventory_items` table and policies allow users to:
- SELECT their own inventory items
- INSERT their own inventory items
- UPDATE their own inventory items
- DELETE their own inventory items

See `SUPABASE_INVENTORY_ORDERS_SETUP.md` for detailed RLS policy setup.

### Step 3: Test Database Connection

1. Go to Supabase Dashboard → Table Editor
2. Verify you can see the `inventory_items` table
3. Check that `created_at` column exists (this will be used as `added_at` for freshness calculation)

**Note**: The app uses the `name` column as `ingredient_type` and `created_at` as `added_at`. If you need separate columns, you'll need to:
1. Add `ingredient_type` column to the table
2. Add `added_at` column to the table
3. Update the React Native app code accordingly

## Part 2: WeatherAPI Setup

### Step 1: Create WeatherAPI Account

1. Go to [https://www.weatherapi.com](https://www.weatherapi.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Key

1. After logging in, go to your dashboard
2. Copy your API key (it will look like: `abc123def456ghi789`)
3. Save this key securely - you'll need it for the app configuration

### Step 3: Test API Key

You can test your API key using curl:

```bash
curl "http://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q=Bacoor&aqi=no"
```

Replace `YOUR_API_KEY` with your actual API key.

You should get a JSON response with temperature and humidity data.

## Part 3: Flask API Setup on Render

### Step 1: Prepare Your Model

1. Train your Random Forest classifier model using scikit-learn
2. Save the model using pickle:
   ```python
   import pickle
   from sklearn.ensemble import RandomForestClassifier
   
   # Train your model
   # model = RandomForestClassifier(...)
   # model.fit(X_train, y_train)
   
   # Save the model
   with open('freshness_model.pkl', 'wb') as f:
       pickle.dump(model, f)
   ```
3. Ensure your model expects these features in order:
   - Temperature (float)
   - Humidity (float)
   - Time in Refrigerator (float, in hours)
   - Ingredient Type (integer, encoded)

### Step 2: Update Flask API Code

1. Open `flask_backend/freshness_api.py`
2. Update the `encode_ingredient_type()` function to match your training data:
   ```python
   def encode_ingredient_type(ingredient_type: str) -> int:
       ingredient_mapping = {
           'BEEF': 0,
           'CHEESE': 1,
           'LETTUCE': 2,
           'TOMATO': 3,
           'ONION': 4,
           'BURGER BUN': 5,
           # Add all ingredient types from your training data
       }
       normalized = ingredient_type.upper().strip()
       return ingredient_mapping.get(normalized, 0)
   ```
3. Ensure the feature array order matches your training data
4. Update classification mapping if your model outputs different labels

### Step 3: Create Render Account

1. Go to [https://render.com](https://render.com)
2. Sign up for a free account
3. Connect your GitHub account (recommended) or use another git provider

### Step 4: Deploy Flask API on Render

1. **Create New Web Service**:
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your Flask API code

2. **Configure Build Settings**:
   - **Name**: `freshness-api` (or your preferred name)
   - **Environment**: `Python 3`
   - **Region**: Choose the region closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (or `flask_backend` if your API is in a subdirectory)
   - **Build Command**: `pip install -r flask_backend/freshness_requirements.txt`
   - **Start Command**: `cd flask_backend && gunicorn freshness_api:app --bind 0.0.0.0:$PORT`

3. **Set Environment Variables**:
   - Click "Advanced" → "Add Environment Variable"
   - Add `MODEL_PATH` = `freshness_model.pkl` (or your model file name)
   - `PORT` is automatically set by Render (don't override it)

4. **Upload Model File**:
   - Option A: Include model in repository (not recommended for large files > 100MB)
     - Add `freshness_model.pkl` to your repository
     - Commit and push to GitHub
   - Option B: Use Render's persistent disk (recommended for large files)
     - After deployment, use Render's CLI or dashboard to upload the model file
     - Update `MODEL_PATH` environment variable to point to the uploaded file path

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment to complete (usually 2-5 minutes)
   - Your API will be available at: `https://freshness-api.onrender.com`

### Step 5: Test Flask API

1. **Test Health Endpoint**:
   ```bash
   curl https://freshness-api.onrender.com/health
   ```

2. **Test Prediction Endpoint**:
   ```bash
   curl -X POST https://freshness-api.onrender.com/predict \
     -H "Content-Type: application/json" \
     -d '{
       "temperature": 25.5,
       "humidity": 65.0,
       "time_in_refrigerator": 24.5,
       "ingredient_type": "BEEF"
     }'
   ```

You should get a response like:
```json
{
  "classification": "Fresh",
  "confidence": 0.95
}
```

## Part 4: React Native App Configuration

### Step 1: Update app.json

Add WeatherAPI configuration to `app.json`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "YOUR_SUPABASE_URL",
      "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY",
      "weatherCity": "Bacoor",
      "weatherApiKey": "YOUR_WEATHER_API_KEY"
    }
  }
}
```

Replace:
- `YOUR_SUPABASE_URL`: Your Supabase project URL
- `YOUR_SUPABASE_ANON_KEY`: Your Supabase anon key
- `YOUR_WEATHER_API_KEY`: Your WeatherAPI key
- `Bacoor`: Your city name (or leave as "Bacoor")

### Step 2: Update Flask API URL (if needed)

The Flask API URL is hardcoded in `services/freshnessApi.ts`:

```typescript
const FRESHNESS_API_URL = 'https://freshness-api.onrender.com/predict';
```

If your Render deployment has a different URL, update this constant.

### Step 3: Verify Services

Check that all service files are in place:
- `services/weatherApi.ts` - WeatherAPI service
- `services/freshnessApi.ts` - Flask API service
- `services/freshnessService.ts` - Orchestration service

### Step 4: Test the App

1. Start your Expo development server:
   ```bash
   npm start
   ```

2. Open the app on your device or emulator
3. Navigate to the Inventory screen
4. Add an inventory item if you don't have any
5. The app should automatically fetch freshness predictions for all items

## Part 5: Troubleshooting

### Issue: "WeatherAPI key not configured" warning

**Solution**:
- Verify `weatherApiKey` is set in `app.json`
- Restart your Expo development server after updating `app.json`
- Check that the key is correctly copied (no extra spaces)

### Issue: Flask API returns 500 error

**Solution**:
- Check Render logs for error messages
- Verify model file is uploaded and `MODEL_PATH` is correct
- Test the API locally first using `python freshness_api.py`
- Verify feature order matches training data

### Issue: Freshness predictions not appearing

**Solution**:
- Check browser/device console for errors
- Verify Flask API is accessible: `curl https://freshness-api.onrender.com/health`
- Check that inventory items have `created_at` timestamps
- Verify WeatherAPI is returning data for your city

### Issue: Model not loading on Render

**Solution**:
- Verify model file is in the repository or uploaded to Render
- Check `MODEL_PATH` environment variable is correct
- Check Render logs for file not found errors
- Ensure model file size is within Render's limits (free tier has limits)

### Issue: CORS errors

**Solution**:
- Verify `flask-cors` is installed: `pip install flask-cors`
- Check that `CORS(app)` is enabled in `freshness_api.py`
- Verify Render allows CORS requests

### Issue: Invalid classification labels

**Solution**:
- Update `classification_map` in `freshness_api.py` to match your model's output
- Verify your model outputs the expected labels: "Fresh", "Stale", "Expired"
- Check model training code to ensure labels are consistent

## Part 6: Production Considerations

### Security

1. **API Keys**: Never commit API keys to version control
   - Use environment variables
   - Use `.env` file (and add to `.gitignore`)
   - Use Expo's `Constants.expoConfig.extra` for app.json

2. **Rate Limiting**: Implement rate limiting on Flask API
   - WeatherAPI free tier has rate limits
   - Consider caching weather data
   - Implement request throttling

3. **Authentication**: Add authentication to Flask API
   - Use API keys or JWT tokens
   - Validate requests from your app only

### Performance

1. **Caching**: Cache weather data (update every 15-30 minutes)
2. **Batch Requests**: Use batch prediction endpoint for multiple items
3. **Error Handling**: Implement retry logic for API calls
4. **Loading States**: Show loading indicators while fetching predictions

### Monitoring

1. **Render Logs**: Monitor Render logs for errors
2. **WeatherAPI Usage**: Monitor API usage to avoid exceeding limits
3. **App Analytics**: Track prediction accuracy and user feedback

## Part 7: Next Steps

1. **Improve Model**: Collect more training data and retrain the model
2. **Add Features**: Consider adding more features (e.g., storage temperature, packaging type)
3. **User Feedback**: Allow users to provide feedback on predictions to improve the model
4. **Notifications**: Send alerts when ingredients are about to expire
5. **Analytics**: Track prediction accuracy and ingredient usage patterns

## Additional Resources

- [WeatherAPI Documentation](https://www.weatherapi.com/docs/)
- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [scikit-learn Random Forest](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html)
- [Flask Documentation](https://flask.palletsprojects.com/)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Render logs for Flask API errors
3. Check browser/device console for React Native app errors
4. Verify all API keys and configuration are correct
5. Test each component individually (WeatherAPI, Flask API, Supabase)

---

**Last Updated**: 2024
**Version**: 1.0.0

