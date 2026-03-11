# Client Profile Picture Upload - Implementation Summary

## ✅ What Was Implemented

### 1. **Supabase Storage Helper** (`lib/supabase/storage.ts`)
- `uploadClientAvatar(file, clientId?)` - Uploads image to `client_profile_image` bucket
- `deleteClientAvatar(avatarUrl)` - Deletes image from storage
- `updateClientAvatar(file, clientId, oldAvatarUrl?)` - Upload new + delete old
- File organization: `{clientId}/{timestamp}_{filename}` or `temp/{timestamp}_{filename}`
- 5MB file size limit, image types only

### 2. **Updated Avatar Upload Component** (`components/shared/avatar-upload.tsx`)
- Now **uploads directly to Supabase Storage** (was previously just converting to data URL)
- Shows upload progress with spinner
- Displays toast notifications (success/error)
- Returns the **public URL** from Supabase Storage
- Usage in form:
  ```tsx
  <AvatarUpload
    value={field.value}
    onChange={field.onChange}
    clientId={client?.id} // optional
  />
  ```

### 3. **Database Schema** (`supabase/migrations/003_setup_client_avatar_storage.sql`)
- Creates `client_profile_image` bucket (public, 5MB limit)
- Sets up storage policies:
  - Public read access (anyone can view avatars)
  - Authenticated users can upload/update/delete
- Adds URL format validation to `clients.avatar_url` column
- **Run this migration in Supabase SQL Editor to set up the bucket**

### 4. **Form → API Mapping** (already existed in `store/useClientsStore.ts`)
- Form uses `avatar` field (matches existing mock data)
- Store automatically transforms `avatar` → `avatarUrl` when calling API
- API expects `avatarUrl` (matches `lib/validation/client.schema.ts`)

## 🚀 How It Works

### Adding a Client with Profile Picture:

1. User clicks avatar circle in "Add Client" form
2. Selects an image file
3. **AvatarUpload** uploads to Supabase Storage bucket `client_profile_image`
4. Returns public URL (e.g., `https://xxx.supabase.co/storage/v1/object/public/client_profile_image/temp/1234_photo.jpg`)
5. Form saves the URL in the `avatar` field
6. On submit, store transforms `avatar` → `avatarUrl` and calls `POST /api/clients`
7. API validates and saves to database `clients.avatar_url` column

### File Structure in Storage:
```
client_profile_image/
  ├── temp/
  │   └── 1234567890_photo.jpg         (temporary uploads during creation)
  └── client-abc123/
      └── 1234567890_new-photo.jpg     (organized by client ID after creation)
```

## 📋 Setup Instructions

### 1. **Run the SQL Migration**

In Supabase Dashboard → SQL Editor, run:
```sql
-- Run this file:
supabase/migrations/003_setup_client_avatar_storage.sql
```

This creates the bucket and sets up policies automatically.

### 2. **Verify Bucket Settings**

Go to Supabase Dashboard → Storage → `client_profile_image`:
- ✅ Bucket is **Public**
- ✅ File size limit: 5MB
- ✅ Allowed types: image/jpeg, image/png, image/gif, image/webp
- ✅ Policies exist for SELECT, INSERT, UPDATE, DELETE

### 3. **Environment Variables** (Already Set)

Your `.env.local` already has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://cusgbxefnenkfnrwzgtg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 🧪 Testing

### Test Avatar Upload:

1. **Start dev server**: `npm run dev`
2. Go to `/clients`
3. Click "Add Client"
4. **Click the avatar circle** at the top of the form
5. Select an image (< 5MB, jpg/png/gif/webp)
6. You should see:
   - ✅ Upload spinner
   - ✅ "Profile picture uploaded" toast
   - ✅ Preview shows in the circle
7. Fill out the rest of the form and submit
8. **Verify** in Supabase:
   - Storage → `client_profile_image` → file appears
   - Database → `clients` table → `avatar_url` column has the public URL

### Test Edit:

1. Go to client profile page
2. Click Edit button
3. The inline edit form should show the existing avatar
4. (Avatar upload in edit form can be added later if needed)

## 🔧 Troubleshooting

### "Failed to upload image: new row violates row-level security policy"
- **Fix**: Run the migration SQL to set up storage policies
- Ensure bucket is public and policies allow INSERT for authenticated users

### Image uploads but avatar_url is null in database
- Check that the form field is named `avatar` (not `avatarUrl`)
- The store automatically maps `avatar` → `avatarUrl` when calling the API

### "Failed to upload image: The resource already exists"
- File with same name already exists
- The timestamp prefix should prevent this, but you can manually delete from Storage

### Images don't load (broken image icon)
- Check that bucket is **public** (not private)
- Test the URL directly in a browser
- Verify the URL format in `clients.avatar_url` column

## 📁 Files Created/Modified

### New Files:
- `lib/supabase/storage.ts` - Upload/delete helpers
- `supabase/migrations/003_setup_client_avatar_storage.sql` - Bucket setup
- `supabase/STORAGE_SETUP.md` - Detailed storage documentation
- `CLIENT_AVATAR_UPLOAD.md` - This file

### Modified Files:
- `components/shared/avatar-upload.tsx` - Now uploads to Supabase
- `.env.example` - Documented service role key (optional)

### Existing (No Changes Needed):
- `store/useClientsStore.ts` - Already handles `avatar` → `avatarUrl` transformation
- `lib/validation/client.schema.ts` - Already expects `avatarUrl`
- `app/clients/forms/schema.ts` - Already has `avatar` field

## 🎯 Next Steps (Optional)

1. **Add avatar upload to inline edit form** (`ClientProfileEditCard.tsx`)
2. **Delete old avatar when uploading new one** (already implemented in `updateClientAvatar`)
3. **Add image cropping/resizing** before upload
4. **Organize temp uploads** - move files from `temp/` to `{clientId}/` after client creation

---

**Status**: ✅ Fully implemented and ready to test after running the SQL migration!
