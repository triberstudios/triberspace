import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// R2 Client configuration
const r2Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET!;
const CDN_BASE_URL = process.env.CDN_BASE_URL!;

// Supported file types and their limits (in bytes)
export const FILE_LIMITS = {
  images: {
    types: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  models: {
    types: ['glb', 'gltf'],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  videos: {
    types: ['mp4', 'webm', 'mov'],
    maxSize: 100 * 1024 * 1024, // 100MB
  },
  audio: {
    types: ['mp3', 'ogg', 'wav'],
    maxSize: 20 * 1024 * 1024, // 20MB
  },
  documents: {
    types: ['pdf', 'zip'],
    maxSize: 25 * 1024 * 1024, // 25MB
  },
};

// Supported upload categories
export const UPLOAD_CATEGORIES = [
  'users',
  'creators', 
  'worlds',
  'spaces',
  'events',
  'products',
  'avatars',
  'shared',
  'temp'
] as const;

export type UploadCategory = typeof UPLOAD_CATEGORIES[number];

// Generate file path based on category, entity ID, and filename
export function generateFilePath(category: UploadCategory, entityId: string, filename: string): string {
  // Sanitize filename
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${category}/${entityId}/${sanitizedFilename}`;
}

// Generate CDN URL for a file
export function generateCdnUrl(filePath: string): string {
  return `${CDN_BASE_URL}/${filePath}`;
}

// Validate file type and size
export function validateFile(filename: string, fileSize: number): { isValid: boolean; error?: string; category?: string } {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (!extension) {
    return { isValid: false, error: 'File must have an extension' };
  }

  // Find which category this file type belongs to
  for (const [category, config] of Object.entries(FILE_LIMITS)) {
    if (config.types.includes(extension)) {
      if (fileSize > config.maxSize) {
        const maxMB = Math.round(config.maxSize / 1024 / 1024);
        return { 
          isValid: false, 
          error: `${category} files must be smaller than ${maxMB}MB` 
        };
      }
      return { isValid: true, category };
    }
  }

  return { 
    isValid: false, 
    error: `Unsupported file type: ${extension}. Supported types: ${Object.values(FILE_LIMITS).flatMap(c => c.types).join(', ')}` 
  };
}

// Generate presigned URL for upload
export async function generatePresignedUploadUrl(
  category: UploadCategory,
  entityId: string,
  filename: string,
  fileSize: number,
  expiresIn: number = 900 // 15 minutes
): Promise<{ uploadUrl: string; cdnUrl: string; filePath: string }> {
  
  // Validate file
  const validation = validateFile(filename, fileSize);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Generate file path
  const filePath = generateFilePath(category, entityId, filename);
  
  // Create put object command
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filePath,
    ContentLength: fileSize,
    // Add content type based on file extension
    ContentType: getContentType(filename),
  });

  // Generate presigned URL
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn });
  const cdnUrl = generateCdnUrl(filePath);

  return {
    uploadUrl,
    cdnUrl,
    filePath
  };
}

// Delete a file from R2
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath,
    });
    
    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting file from R2:', error);
    return false;
  }
}

// Check if file exists in R2
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath,
    });
    
    await r2Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

// Get content type based on file extension
function getContentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const contentTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    
    // 3D Models
    glb: 'model/gltf-binary',
    gltf: 'model/gltf+json',
    
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    
    // Audio
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    
    // Documents
    pdf: 'application/pdf',
    zip: 'application/zip',
  };

  return contentTypes[extension || ''] || 'application/octet-stream';
}