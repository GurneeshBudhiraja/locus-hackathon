# Supabase Setup Instructions

## 1. Create the Database Table

Run the SQL script in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run" to execute the SQL

This will create:
- `contractors` table with all required fields
- Indexes for performance
- Row Level Security (RLS) policies
- Auto-update trigger for `updated_at` timestamp

## 2. Configure Environment Variables

1. Create a `.env.local` file in the `frontend` directory
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings:
- Go to Project Settings → API
- Copy the "Project URL" for `NEXT_PUBLIC_SUPABASE_URL`
- Copy the "anon public" key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. Install Dependencies

```bash
npm install
```

## 4. Run the Development Server

```bash
npm run dev
```

## Row Level Security (RLS) Policies

The schema includes RLS policies that allow:
- Authenticated users to insert, read, and update contractors

If you want to allow anonymous form submissions (without authentication), you can uncomment the anonymous insert policy in the SQL file.

