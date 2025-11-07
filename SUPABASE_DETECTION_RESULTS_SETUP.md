# Supabase Setup for YOLO Detection Results

This guide will help you set up Supabase to store and retrieve YOLO detection results from your Flask API backend.

## Step 1: Create the Detection Results Table

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** in the left sidebar
3. Click **"New Table"**

### Table Configuration

**Table Name:** `detection_results`

### Columns Setup

Add the following columns:

| Column Name | Type | Default | Nullable | Description |
|------------|------|---------|----------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | ❌ | Primary key (auto-generated) |
| `user_id` | `uuid` | - | ❌ | Foreign key to auth.users |
| `image_url` | `text` | - | ✅ | URL or path to the captured image |
| `detected_items` | `jsonb` | - | ✅ | Array of detected items with bounding boxes |
| `primary_item` | `text` | - | ✅ | The main item detected |
| `mold_detected` | `boolean` | `false` | ❌ | Whether mold was detected |
| `confidence_scores` | `jsonb` | - | ✅ | Array of confidence scores |
| `total_detections` | `integer` | `0` | ❌ | Total number of detections |
| `created_at` | `timestamp` | `now()` | ❌ | Timestamp of detection |

### SQL to Create Table (Alternative Method)

If you prefer using SQL Editor, run this:

```sql
-- Create detection_results table
CREATE TABLE detection_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  detected_items JSONB DEFAULT '[]'::jsonb,
  primary_item TEXT,
  mold_detected BOOLEAN DEFAULT false,
  confidence_scores JSONB DEFAULT '[]'::jsonb,
  total_detections INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on user_id for faster queries
CREATE INDEX idx_detection_results_user_id ON detection_results(user_id);

-- Create index on created_at for sorting
CREATE INDEX idx_detection_results_created_at ON detection_results(created_at DESC);
```

## Step 2: Enable Row Level Security (RLS)

1. Go to **Authentication** > **Policies** in Supabase dashboard
2. Click on the `detection_results` table
3. Enable **Row Level Security** (toggle switch)

### Create RLS Policies

You need to create policies so users can only see their own detection results:

#### Policy 1: Users can read their own detection results

**Policy Name:** `Users can view own detection results`

**Policy Definition:**
```sql
CREATE POLICY "Users can view own detection results"
ON detection_results
FOR SELECT
USING (auth.uid() = user_id);
```

**Using Supabase Dashboard:**
1. Click **"New Policy"**
2. Select **"For SELECT"**
3. Policy name: `Users can view own detection results`
4. Policy definition: `auth.uid() = user_id`
5. Click **"Save"**

#### Policy 2: Users can insert their own detection results

**Policy Name:** `Users can insert own detection results`

**Policy Definition:**
```sql
CREATE POLICY "Users can insert own detection results"
ON detection_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Using Supabase Dashboard:**
1. Click **"New Policy"**
2. Select **"For INSERT"**
3. Policy name: `Users can insert own detection results`
4. Policy definition: `auth.uid() = user_id`
5. Click **"Save"**

#### Policy 3: Users can update their own detection results (Optional)

**Policy Name:** `Users can update own detection results`

**Policy Definition:**
```sql
CREATE POLICY "Users can update own detection results"
ON detection_results
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### Policy 4: Users can delete their own detection results (Optional)

**Policy Name:** `Users can delete own detection results`

**Policy Definition:**
```sql
CREATE POLICY "Users can delete own detection results"
ON detection_results
FOR DELETE
USING (auth.uid() = user_id);
```

## Step 3: Test the Setup

### Test Insert (Using SQL Editor)

```sql
-- Get your user ID first
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Insert a test detection result (replace USER_ID_HERE with actual user ID)
INSERT INTO detection_results (
  user_id,
  image_url,
  detected_items,
  primary_item,
  mold_detected,
  confidence_scores,
  total_detections
) VALUES (
  'USER_ID_HERE'::uuid,
  'test-image.jpg',
  '[{"class_id": 1, "item_name": "ground_beef", "confidence": 0.85}]'::jsonb,
  'ground_beef',
  false,
  '[0.85]'::jsonb,
  1
);
```

### Verify Data

```sql
-- View your detection results
SELECT * FROM detection_results 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

## Step 4: Update Your Flask API (Optional Enhancement)

You can optionally modify your Flask API to directly insert into Supabase instead of having the mobile app do it:

```python
from supabase import create_client, Client
import os

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Use service role for server-side
supabase: Client = create_client(supabase_url, supabase_key)

# In your /api/detect endpoint, after detection:
# Get user_id from request header or token
user_id = request.headers.get('X-User-ID')  # Pass from mobile app

# Insert into Supabase
supabase.table('detection_results').insert({
    'user_id': user_id,
    'image_url': image_filename,
    'detected_items': detection_result['detections'],
    'primary_item': detection_result['primary_item'],
    'mold_detected': detection_result['mold_detected'],
    'confidence_scores': detection_result['confidence_scores'],
    'total_detections': detection_result['total_detections'],
}).execute()
```

**Note:** For server-side Supabase operations, use the **Service Role Key** (not the anon key) which bypasses RLS. Keep it secure!

## Step 5: Query Detection Results in Mobile App

The mobile app code in `detection-results.tsx` already queries Supabase. Here's how it works:

```typescript
// Fetch latest detection result
const { data, error } = await supabase
  .from('detection_results')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1);

// Fetch specific detection by ID
const { data, error } = await supabase
  .from('detection_results')
  .select('*')
  .eq('id', detectionId)
  .eq('user_id', user.id)
  .single();
```

## Step 6: Data Structure Example

### Example Detection Result Object

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "image_url": "file:///path/to/image.jpg",
  "detected_items": [
    {
      "class_id": 1,
      "item_name": "ground_beef",
      "confidence": 0.85,
      "bbox": {
        "x1": 100.0,
        "y1": 100.0,
        "x2": 300.0,
        "y2": 300.0
      }
    }
  ],
  "primary_item": "ground_beef",
  "mold_detected": false,
  "confidence_scores": [0.85, 0.78],
  "total_detections": 2,
  "created_at": "2024-01-15T10:30:00Z"
}
```

## Troubleshooting

### Issue: "permission denied for table detection_results"

**Solution:** 
- Ensure RLS is enabled and policies are created correctly
- Verify you're authenticated in the mobile app
- Check that `user_id` matches `auth.uid()`

### Issue: Cannot insert detection results

**Solution:**
- Verify INSERT policy exists
- Check that `user_id` is provided and valid
- Ensure you're using the authenticated user's ID

### Issue: Cannot fetch detection results

**Solution:**
- Verify SELECT policy exists
- Check that you're filtering by `user_id`
- Ensure the user is authenticated

### Issue: Foreign key constraint error

**Solution:**
- Ensure `user_id` references a valid user in `auth.users`
- Check that the user exists before inserting detection results

## Security Notes

⚠️ **Important Security Considerations:**

1. **RLS Policies**: Always enable Row Level Security to ensure users can only access their own data
2. **Service Role Key**: Never expose the service role key in client-side code
3. **User Authentication**: Always verify user authentication before inserting/querying data
4. **Input Validation**: Validate and sanitize all inputs before inserting into database

## Next Steps

- Consider adding indexes for better query performance
- Set up database functions/triggers for automatic cleanup of old detection results
- Add storage bucket for storing actual images (see Supabase Storage documentation)
- Implement pagination for detection results list

## Additional Resources

- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Storage for Images](https://supabase.com/docs/guides/storage)
