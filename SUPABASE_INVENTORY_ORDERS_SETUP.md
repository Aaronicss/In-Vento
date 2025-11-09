# Supabase Setup Guide for Inventory and Orders Tables

This guide will help you set up the Supabase database tables for user-specific inventory and orders in the In-Vento application.

## Prerequisites

- A Supabase account with an existing project (see `SUPABASE_SETUP.md` for initial setup)
- Authentication already configured (see `SUPABASE_SETUP.md`)
- Access to your Supabase dashboard

## Overview

We'll create three tables:
1. **inventory_items** - Stores inventory items for each user
2. **orders** - Stores orders for each user
3. **order_items** - Stores items within each order (many-to-many relationship)

## Step 1: Create the Inventory Items Table

1. Go to your Supabase dashboard
2. Navigate to **Table Editor** in the sidebar
3. Click **New Table**
4. Configure the table:
   - **Name**: `inventory_items`
   - **Description**: "User-specific inventory items"
   - **Enable Row Level Security (RLS)**: ✅ Check this box (important for security)

5. Add the following columns:

| Column Name | Type | Default Value | Nullable | Description |
|------------|------|---------------|----------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | ❌ | Primary key |
| `user_id` | `uuid` | - | ❌ | Foreign key to auth.users |
| `name` | `text` | - | ❌ | Item name |
| `icon` | `text` | - | ❌ | Icon key (e.g., "burger", "cheese") |
| `count` | `integer` | `0` | ❌ | Current quantity |
| `created_at` | `timestamptz` | `now()` | ❌ | Creation timestamp |
| `expires_at` | `timestamptz` | - | ❌ | Expiration timestamp |
| `updated_at` | `timestamptz` | `now()` | ✅ | Last update timestamp |

6. Set `id` as the **Primary Key**
7. Click **Save**

### Add Foreign Key Constraint for inventory_items

1. Click on the `inventory_items` table
2. Click on the `user_id` column
3. Under **Foreign Key**, click **Add Foreign Key**
4. Configure:
   - **Foreign Table**: `auth.users`
   - **Foreign Column**: `id`
   - **On Delete**: `CASCADE` (when user is deleted, their inventory items are also deleted)
5. Click **Save**

### Enable Updated At Trigger for inventory_items

1. Go to **Database** > **Functions** in the sidebar
2. Click **New Function**
3. Create a function to automatically update `updated_at`:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

4. Go to **Database** > **Triggers**
5. Click **New Trigger**
6. Configure:
   - **Name**: `update_inventory_items_updated_at`
   - **Table**: `inventory_items`
   - **Events**: `UPDATE`
   - **Trigger Type**: `BEFORE`
   - **Function**: `update_updated_at_column()`
7. Click **Save**

## Step 2: Create the Orders Table

1. Go to **Table Editor** in the sidebar
2. Click **New Table**
3. Configure the table:
   - **Name**: `orders`
   - **Description**: "User-specific orders"
   - **Enable Row Level Security (RLS)**: ✅ Check this box

4. Add the following columns:

| Column Name | Type | Default Value | Nullable | Description |
|------------|------|---------------|----------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | ❌ | Primary key |
| `user_id` | `uuid` | - | ❌ | Foreign key to auth.users |
| `table_number` | `integer` | - | ❌ | Table number for the order |
| `progress` | `numeric` | `1.0` | ❌ | Order progress (0.0 to 1.0) |
| `created_at` | `timestamptz` | `now()` | ❌ | Creation timestamp |
| `updated_at` | `timestamptz` | `now()` | ✅ | Last update timestamp |

5. Set `id` as the **Primary Key**
6. Click **Save**

### Add Foreign Key Constraint for orders

1. Click on the `orders` table
2. Click on the `user_id` column
3. Under **Foreign Key**, click **Add Foreign Key**
4. Configure:
   - **Foreign Table**: `auth.users`
   - **Foreign Column**: `id`
   - **On Delete**: `CASCADE`
5. Click **Save**

### Enable Updated At Trigger for orders

1. Go to **Database** > **Triggers**
2. Click **New Trigger**
3. Configure:
   - **Name**: `update_orders_updated_at`
   - **Table**: `orders`
   - **Events**: `UPDATE`
   - **Trigger Type**: `BEFORE`
   - **Function**: `update_updated_at_column()` (use the same function created earlier)
4. Click **Save**

## Step 3: Create the Order Items Table

1. Go to **Table Editor** in the sidebar
2. Click **New Table**
3. Configure the table:
   - **Name**: `order_items`
   - **Description**: "Items within orders"
   - **Enable Row Level Security (RLS)**: ✅ Check this box

4. Add the following columns:

| Column Name | Type | Default Value | Nullable | Description |
|------------|------|---------------|----------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | ❌ | Primary key |
| `order_id` | `uuid` | - | ❌ | Foreign key to orders |
| `name` | `text` | - | ❌ | Item name |
| `quantity` | `integer` | `1` | ❌ | Item quantity |
| `created_at` | `timestamptz` | `now()` | ❌ | Creation timestamp |

5. Set `id` as the **Primary Key**
6. Click **Save**

### Add Foreign Key Constraint for order_items

1. Click on the `order_items` table
2. Click on the `order_id` column
3. Under **Foreign Key**, click **Add Foreign Key**
4. Configure:
   - **Foreign Table**: `orders`
   - **Foreign Column**: `id`
   - **On Delete**: `CASCADE` (when order is deleted, its items are also deleted)
5. Click **Save**

## Step 4: Set Up Row Level Security (RLS) Policies

### Inventory Items RLS Policies

1. Go to **Authentication** > **Policies** in the sidebar
2. Select the `inventory_items` table
3. Click **New Policy**
4. Create the following policies:

#### Policy 1: Users can view their own inventory items
- **Policy Name**: `Users can view own inventory items`
- **Allowed Operation**: `SELECT`
- **Policy Definition**: 
```sql
(user_id = auth.uid())
```

#### Policy 2: Users can insert their own inventory items
- **Policy Name**: `Users can insert own inventory items`
- **Allowed Operation**: `INSERT`
- **Policy Definition**: 
```sql
(user_id = auth.uid())
```

#### Policy 3: Users can update their own inventory items
- **Policy Name**: `Users can update own inventory items`
- **Allowed Operation**: `UPDATE`
- **Policy Definition**: 
```sql
(user_id = auth.uid())
```

#### Policy 4: Users can delete their own inventory items
- **Policy Name**: `Users can delete own inventory items`
- **Allowed Operation**: `DELETE`
- **Policy Definition**: 
```sql
(user_id = auth.uid())
```

### Orders RLS Policies

1. Select the `orders` table
2. Create the following policies:

#### Policy 1: Users can view their own orders
- **Policy Name**: `Users can view own orders`
- **Allowed Operation**: `SELECT`
- **Policy Definition**: 
```sql
(user_id = auth.uid())
```

#### Policy 2: Users can insert their own orders
- **Policy Name**: `Users can insert own orders`
- **Allowed Operation**: `INSERT`
- **Policy Definition**: 
```sql
(user_id = auth.uid())
```

#### Policy 3: Users can update their own orders
- **Policy Name**: `Users can update own orders`
- **Allowed Operation**: `UPDATE`
- **Policy Definition**: 
```sql
(user_id = auth.uid())
```

#### Policy 4: Users can delete their own orders
- **Policy Name**: `Users can delete own orders`
- **Allowed Operation**: `DELETE`
- **Policy Definition**: 
```sql
(user_id = auth.uid())
```

### Order Items RLS Policies

1. Select the `order_items` table
2. Create the following policies:

#### Policy 1: Users can view order items for their own orders
- **Policy Name**: `Users can view order items for own orders`
- **Allowed Operation**: `SELECT`
- **Policy Definition**: 
```sql
EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
)
```

#### Policy 2: Users can insert order items for their own orders
- **Policy Name**: `Users can insert order items for own orders`
- **Allowed Operation**: `INSERT`
- **Policy Definition**: 
```sql
EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
)
```

#### Policy 3: Users can update order items for their own orders
- **Policy Name**: `Users can update order items for own orders`
- **Allowed Operation**: `UPDATE`
- **Policy Definition**: 
```sql
EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
)
```

#### Policy 4: Users can delete order items for their own orders
- **Policy Name**: `Users can delete order items for own orders`
- **Allowed Operation**: `DELETE`
- **Policy Definition**: 
```sql
EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
)
```

## Step 5: Create Indexes for Better Performance

1. Go to **Database** > **Indexes** in the sidebar
2. Click **New Index**

### Indexes for inventory_items

1. **Index on user_id**:
   - **Table**: `inventory_items`
   - **Index Name**: `idx_inventory_items_user_id`
   - **Columns**: `user_id`
   - **Index Method**: `btree`

2. **Index on expires_at**:
   - **Table**: `inventory_items`
   - **Index Name**: `idx_inventory_items_expires_at`
   - **Columns**: `expires_at`
   - **Index Method**: `btree`

### Indexes for orders

1. **Index on user_id**:
   - **Table**: `orders`
   - **Index Name**: `idx_orders_user_id`
   - **Columns**: `user_id`
   - **Index Method**: `btree`

2. **Index on created_at**:
   - **Table**: `orders`
   - **Index Name**: `idx_orders_created_at`
   - **Columns**: `created_at`
   - **Index Method**: `btree`

### Indexes for order_items

1. **Index on order_id**:
   - **Table**: `order_items`
   - **Index Name**: `idx_order_items_order_id`
   - **Columns**: `order_id`
   - **Index Method**: `btree`

## Step 6: Verify the Setup

### Test the Tables

1. Go to **Table Editor** and verify all three tables exist:
   - `inventory_items`
   - `orders`
   - `order_items`

2. Verify RLS is enabled on all tables (should show a shield icon)

3. Verify foreign key constraints are set up correctly

### Test RLS Policies

1. In your app, log in as a user
2. Try to create an inventory item - it should succeed
3. Try to create an order - it should succeed
4. Log out and log in as a different user
5. The previous user's data should not be visible (RLS is working)

## Alternative: Using SQL Editor (Faster Method)

If you prefer to set up everything at once using SQL, you can use the SQL Editor:

1. Go to **SQL Editor** in the sidebar
2. Click **New Query**
3. Run the following SQL script:

```sql
-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  progress NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for inventory_items
CREATE POLICY "Users can view own inventory items"
  ON inventory_items FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own inventory items"
  ON inventory_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own inventory items"
  ON inventory_items FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own inventory items"
  ON inventory_items FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own orders"
  ON orders FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for order_items
CREATE POLICY "Users can view order items for own orders"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert order items for own orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update order items for own orders"
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete order items for own orders"
  ON order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_expires_at ON inventory_items(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
```

4. Click **Run** to execute the script
5. Verify all tables, policies, and indexes were created successfully

## Troubleshooting

### Error: "permission denied for table inventory_items"

- Make sure RLS policies are created correctly
- Verify the user is authenticated (check `auth.uid()`)
- Check that the policy conditions match your use case

### Error: "foreign key constraint violation"

- Verify the `user_id` exists in `auth.users`
- Check that foreign key constraints are set up correctly
- Ensure you're using the correct user ID from the authenticated session

### Data not showing up

- Check that RLS policies allow SELECT operations
- Verify the `user_id` in the data matches `auth.uid()`
- Check the Supabase logs for errors

### Updated_at not updating

- Verify the trigger function exists
- Check that the trigger is attached to the correct table
- Ensure the trigger is set to fire on UPDATE events

## Security Notes

⚠️ **Important Security Considerations**:

1. **Row Level Security (RLS)**: Always enable RLS on tables containing user data
2. **Policy Testing**: Test policies with different users to ensure data isolation
3. **Foreign Keys**: Use CASCADE deletion carefully - it will delete related data
4. **Indexes**: Create indexes on frequently queried columns (like `user_id`) for better performance

## Next Steps

After setting up the tables, you should:

1. Update your app's `InventoryContext` to fetch and save data to Supabase
2. Update your app's `OrdersContext` to fetch and save data to Supabase
3. Test the integration with multiple users to ensure data isolation
4. Monitor the Supabase dashboard for any errors or performance issues

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [Supabase Foreign Keys](https://supabase.com/docs/guides/database/foreign-keys)
- [Supabase Triggers](https://supabase.com/docs/guides/database/triggers)

---

**Setup completed!** Your In-Vento app now has user-specific inventory and orders tables. 🎉

