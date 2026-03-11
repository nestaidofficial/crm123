"use client";

/**
 * Avatar upload component – rounded circle image picker with Supabase Storage
 * Styling follows: .cursor/rules/nessa-form-design.mdc
 */

import { useState, useRef } from "react";
import { Camera, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadClientAvatar } from "@/lib/supabase/storage";
import { toast } from "sonner";

interface AvatarUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  clientId?: string; // Optional: for organized file naming (deprecated, use entityId)
  entityId?: string; // Optional: for organized file naming (generic)
  uploadFn?: (file: File, entityId?: string) => Promise<string>; // Custom upload function
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

const iconSizes = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function AvatarUpload({
  value,
  onChange,
  clientId,
  entityId,
  uploadFn = uploadClientAvatar,
  size = "md",
  className,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(value);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use entityId if provided, otherwise fall back to clientId for backward compatibility
  const actualEntityId = entityId ?? clientId;

  const handleClick = () => {
    if (isUploading) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage using the provided upload function
    setIsUploading(true);
    try {
      const publicUrl = await uploadFn(file, actualEntityId);
      onChange?.(publicUrl);
      toast.success("Profile picture uploaded");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
      setPreview(value); // Revert preview on error
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "relative rounded-full overflow-hidden border-2 border-neutral-200/80 bg-neutral-50 hover:bg-neutral-100 transition-colors group",
          sizeClasses[size]
        )}
      >
        {preview ? (
          <img
            src={preview}
            alt="Avatar preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <User className={cn("text-neutral-400", iconSizes[size])} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </button>
      <p className="text-[11px] text-neutral-400 text-center mt-2">
        {isUploading ? "Uploading..." : "Click to upload"}
      </p>
    </div>
  );
}
