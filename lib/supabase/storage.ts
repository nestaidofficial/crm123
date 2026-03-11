import { createServerSupabaseClient } from "./server";
import { supabase } from "../supabase";

export const CLIENT_AVATAR_BUCKET = "client_profile_image";
export const EMPLOYEE_AVATAR_BUCKET = "employee_profile_image";
export const ADMIN_AVATAR_BUCKET = "admin_profile_images";

/**
 * Upload client avatar to Supabase Storage (client-side)
 * @param file - The image file to upload
 * @param clientId - Optional client ID (for organized file naming)
 * @returns The public URL of the uploaded image
 */
export async function uploadClientAvatar(
  file: File,
  clientId?: string
): Promise<string> {
  // Generate unique filename: client_id/timestamp_originalname or just timestamp_originalname
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = clientId
    ? `${clientId}/${timestamp}_${sanitizedName}`
    : `temp/${timestamp}_${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from(CLIENT_AVATAR_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(CLIENT_AVATAR_BUCKET).getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Delete client avatar from Supabase Storage
 * @param avatarUrl - The full public URL of the avatar to delete
 */
export async function deleteClientAvatar(avatarUrl: string): Promise<void> {
  // Extract path from URL (handles both client_profile_image and legacy patient_profile_image)
  const match = avatarUrl.match(/\/(client_profile_image|patient_profile_image)\/(.+)$/);
  if (!match) {
    console.warn("Could not parse avatar URL for deletion:", avatarUrl);
    return;
  }

  const bucket = match[1];
  const filePath = match[2];

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error("Delete error:", error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Update client avatar: upload new and optionally delete old
 * @param file - The new image file
 * @param clientId - The client ID
 * @param oldAvatarUrl - Optional: URL of old avatar to delete
 * @returns The public URL of the new uploaded image
 */
export async function updateClientAvatar(
  file: File,
  clientId: string,
  oldAvatarUrl?: string | null
): Promise<string> {
  // Upload new avatar
  const newUrl = await uploadClientAvatar(file, clientId);

  // Delete old avatar if it exists and is from our bucket
  if (oldAvatarUrl && oldAvatarUrl.includes(CLIENT_AVATAR_BUCKET)) {
    try {
      await deleteClientAvatar(oldAvatarUrl);
    } catch (error) {
      console.warn("Failed to delete old avatar, but new avatar uploaded:", error);
    }
  }

  return newUrl;
}

/**
 * Upload employee avatar to Supabase Storage (client-side)
 * @param file - The image file to upload
 * @param employeeId - Optional employee ID (for organized file naming)
 * @returns The public URL of the uploaded image
 */
export async function uploadEmployeeAvatar(
  file: File,
  employeeId?: string
): Promise<string> {
  // Generate unique filename: employee_id/timestamp_originalname or just timestamp_originalname
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = employeeId
    ? `${employeeId}/${timestamp}_${sanitizedName}`
    : `temp/${timestamp}_${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from(EMPLOYEE_AVATAR_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(EMPLOYEE_AVATAR_BUCKET).getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Delete employee avatar from Supabase Storage
 * @param avatarUrl - The full public URL of the avatar to delete
 */
export async function deleteEmployeeAvatar(avatarUrl: string): Promise<void> {
  // Extract path from URL: https://xxx.supabase.co/storage/v1/object/public/employee_profile_image/path
  const match = avatarUrl.match(/\/employee_profile_image\/(.+)$/);
  if (!match) {
    console.warn("Could not parse avatar URL for deletion:", avatarUrl);
    return;
  }

  const filePath = match[1];

  const { error } = await supabase.storage
    .from(EMPLOYEE_AVATAR_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error("Delete error:", error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Update employee avatar: upload new and optionally delete old
 * @param file - The new image file
 * @param employeeId - The employee ID
 * @param oldAvatarUrl - Optional: URL of old avatar to delete
 * @returns The public URL of the new uploaded image
 */
export async function updateEmployeeAvatar(
  file: File,
  employeeId: string,
  oldAvatarUrl?: string | null
): Promise<string> {
  // Upload new avatar
  const newUrl = await uploadEmployeeAvatar(file, employeeId);

  // Delete old avatar if it exists and is from our bucket
  if (oldAvatarUrl && oldAvatarUrl.includes(EMPLOYEE_AVATAR_BUCKET)) {
    try {
      await deleteEmployeeAvatar(oldAvatarUrl);
    } catch (error) {
      console.warn("Failed to delete old avatar, but new avatar uploaded:", error);
    }
  }

  return newUrl;
}

/**
 * Upload admin avatar to Supabase Storage (client-side)
 * @param file - The image file to upload
 * @param userId - Optional user ID (for organized file naming)
 * @returns The public URL of the uploaded image
 */
export async function uploadAdminAvatar(
  file: File,
  userId?: string
): Promise<string> {
  // Generate unique filename: user_id/timestamp_originalname or just timestamp_originalname
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = userId
    ? `${userId}/${timestamp}_${sanitizedName}`
    : `temp/${timestamp}_${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from(ADMIN_AVATAR_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(ADMIN_AVATAR_BUCKET).getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Delete admin avatar from Supabase Storage
 * @param avatarUrl - The full public URL of the avatar to delete
 */
export async function deleteAdminAvatar(avatarUrl: string): Promise<void> {
  // Extract path from URL: https://xxx.supabase.co/storage/v1/object/public/admin_profile_images/path
  const match = avatarUrl.match(/\/admin_profile_images\/(.+)$/);
  if (!match) {
    console.warn("Could not parse avatar URL for deletion:", avatarUrl);
    return;
  }

  const filePath = match[1];

  const { error } = await supabase.storage
    .from(ADMIN_AVATAR_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error("Delete error:", error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Update admin avatar: upload new and optionally delete old
 * @param file - The new image file
 * @param userId - The user ID
 * @param oldAvatarUrl - Optional: URL of old avatar to delete
 * @returns The public URL of the new uploaded image
 */
export async function updateAdminAvatar(
  file: File,
  userId: string,
  oldAvatarUrl?: string | null
): Promise<string> {
  // Upload new avatar
  const newUrl = await uploadAdminAvatar(file, userId);

  // Delete old avatar if it exists and is from our bucket
  if (oldAvatarUrl && oldAvatarUrl.includes(ADMIN_AVATAR_BUCKET)) {
    try {
      await deleteAdminAvatar(oldAvatarUrl);
    } catch (error) {
      console.warn("Failed to delete old avatar, but new avatar uploaded:", error);
    }
  }

  return newUrl;
}
