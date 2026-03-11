#!/usr/bin/env node
/**
 * Migrate storage buckets from patient to client naming.
 * Copies all files from patient_profile_image -> client_profile_image
 * and patient-documents -> client-documents, then removes old buckets.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Run: node scripts/migrate-storage-to-client.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf8");
  env.split("\n").forEach((line) => {
    const [key, ...valParts] = line.split("=");
    if (key && valParts.length) {
      const val = valParts.join("=").trim().replace(/^["']|["']$/g, "");
      process.env[key.trim()] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listAllFiles(bucketId, prefix = "") {
  const files = [];
  const { data, error } = await supabase.storage.from(bucketId).list(prefix, { limit: 1000 });

  if (error) {
    throw new Error(`List ${bucketId}/${prefix}: ${error.message}`);
  }

  for (const item of data || []) {
    if (item.name === null) continue;
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      // It's a folder
      const subFiles = await listAllFiles(bucketId, path);
      files.push(...subFiles);
    } else {
      files.push(path);
    }
  }
  return files;
}

async function copyFile(fromBucket, toBucket, filePath) {
  const { data: blob, error: downloadError } = await supabase.storage
    .from(fromBucket)
    .download(filePath);

  if (downloadError || !blob) {
    throw new Error(`Download ${fromBucket}/${filePath}: ${downloadError?.message || "No data"}`);
  }

  const { error: uploadError } = await supabase.storage
    .from(toBucket)
    .upload(filePath, blob, { upsert: true, contentType: blob.type || undefined });

  if (uploadError) {
    throw new Error(`Upload ${toBucket}/${filePath}: ${uploadError.message}`);
  }
}

async function bucketHasFiles(bucketId) {
  const { data, error } = await supabase.storage.from(bucketId).list("", { limit: 1 });
  if (error && error.message?.includes("not found")) return { exists: false, files: [] };
  if (error) throw new Error(`Check ${bucketId}: ${error.message}`);
  const files = await listAllFiles(bucketId);
  return { exists: true, files };
}

async function migrateAvatarBucket() {
  const from = "patient_profile_image";
  const to = "client_profile_image";

  let files;
  try {
    const result = await bucketHasFiles(from);
    if (!result.exists || result.files.length === 0) {
      console.log(`  Skip: ${from} does not exist or is empty`);
      return;
    }
    files = result.files;
  } catch (e) {
    if (e.message?.includes("not found")) {
      console.log(`  Skip: ${from} bucket does not exist`);
      return;
    }
    throw e;
  }
  console.log(`  Copying ${files.length} file(s) from ${from} -> ${to}...`);
  for (const filePath of files) {
    await copyFile(from, to, filePath);
    process.stdout.write(".");
  }
  console.log(" done.");

  // Update clients.avatar_url: replace patient_profile_image with client_profile_image
  const { data: clients, error: fetchError } = await supabase
    .from("clients")
    .select("id, avatar_url")
    .not("avatar_url", "is", null);

  if (!fetchError && clients?.length) {
    let updated = 0;
    for (const c of clients) {
      if (c.avatar_url && c.avatar_url.includes("patient_profile_image")) {
        const newUrl = c.avatar_url.replace(/patient_profile_image/g, "client_profile_image");
        await supabase.from("clients").update({ avatar_url: newUrl }).eq("id", c.id);
        updated++;
      }
    }
    if (updated) console.log(`  Updated ${updated} client avatar_url(s)`);
  }

  // Remove files from old bucket
  const { error: removeError } = await supabase.storage.from(from).remove(files);
  if (removeError) {
    console.warn(`  Warning: could not remove files from ${from}: ${removeError.message}`);
  } else {
    console.log(`  Removed files from ${from}`);
  }
}

async function migrateDocumentsBucket() {
  const from = "patient-documents";
  const to = "client-documents";

  let files;
  try {
    const result = await bucketHasFiles(from);
    if (!result.exists || result.files.length === 0) {
      console.log(`  Skip: ${from} does not exist or is empty`);
      return;
    }
    files = result.files;
  } catch (e) {
    if (e.message?.includes("not found")) {
      console.log(`  Skip: ${from} bucket does not exist`);
      return;
    }
    throw e;
  }

  // Ensure client-documents exists
  const { data: toList, error: toErr } = await supabase.storage.from(to).list("", { limit: 1 });
  if (toErr && (toErr.message?.includes("not found") || toErr.message?.includes("Bucket not found"))) {
    const { error: createErr } = await supabase.storage.createBucket(to, {
      public: false,
      fileSizeLimit: 10485760,
      allowedMimeTypes: [
        "application/pdf", "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
        "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "text/csv",
      ],
    });
    if (createErr) {
      throw new Error(`Create bucket ${to}: ${createErr.message}`);
    }
    console.log(`  Created bucket ${to}`);
  }

  console.log(`  Copying ${files.length} file(s) from ${from} -> ${to}...`);
  for (const filePath of files) {
    await copyFile(from, to, filePath);
    process.stdout.write(".");
  }
  console.log(" done.");

  const { error: removeError } = await supabase.storage.from(from).remove(files);
  if (removeError) {
    console.warn(`  Warning: could not remove files from ${from}: ${removeError.message}`);
  } else {
    console.log(`  Removed files from ${from}`);
  }
}

async function main() {
  console.log("Migrating storage buckets from patient to client naming...\n");

  try {
    console.log("1. Avatar bucket (patient_profile_image -> client_profile_image):");
    await migrateAvatarBucket();

    console.log("\n2. Documents bucket (patient-documents -> client-documents):");
    await migrateDocumentsBucket();

    console.log("\nDone. You can now delete the empty patient_profile_image and patient-documents buckets from Supabase Dashboard → Storage.");
  } catch (err) {
    console.error("\nError:", err.message);
    process.exit(1);
  }
}

main();
