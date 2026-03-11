# Supabase Storage Setup for Client Avatars

## Bucket Configuration

The client profile images are stored in a Supabase Storage bucket named **`client_profile_image`**.

### Option 1: Run the SQL Migration (Recommended)

Run the migration file to automatically create the bucket and set up policies:

```bash
# In Supabase Dashboard → SQL Editor, run:
supabase/migrations/003_setup_client_avatar_storage.sql
```

This will:
- Create the `client_profile_image` bucket (public, 5MB limit)
- Set up read/write policies for authenticated users
- Add validation to the `clients.avatar_url` column

### Option 2: Manual Setup (if migration fails)

1. **Create the bucket:**
   - Go to Supabase Dashboard → Storage
   - Click "New bucket"
   - Name: `client_profile_image`
   - Make it **Public** (so avatars are accessible via public URLs)
   - Set file size limit: 5MB
   - Allowed MIME types: `image/jpeg, image/jpg, image/png, image/gif, image/webp`

2. **Set up policies:**
   - Click on the bucket → Policies
   - Add the following policies:
     - **SELECT (read)**: Public read access
     - **INSERT**: Authenticated users can upload
     - **UPDATE**: Authenticated users can update
     - **DELETE**: Authenticated users can delete

## Folder Structure

Uploaded avatars are organized as:
- `{clientId}/{timestamp}_{filename}` - for existing clients
- `temp/{timestamp}_{filename}` - for clients being created

## Environment Variables

Make sure you have these in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing

1. Go to `/clients` → "Add Client"
2. Click the avatar circle to upload an image
3. The image should upload to Supabase Storage
4. The `avatar_url` in the database should be set to the public URL

## Troubleshooting

**Upload fails with "Failed to upload image":**
- Check that the bucket exists and is named exactly `client_profile_image`
- Verify the bucket is **public**
- Check storage policies allow INSERT for authenticated users
- Check browser console for detailed error messages

**Images not loading:**
- Verify the bucket is public
- Check the `avatar_url` value in the database
- Test the URL directly in a browser

**Policy errors:**
- Make sure you're authenticated (logged in)
- Run the migration SQL to set up policies correctly
