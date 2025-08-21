"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Upload, X, FileText, Image, Video, Package, File } from "lucide-react";

// Types for API responses
interface UploadConfig {
  categories: string[];
  fileLimits: {
    [key: string]: {
      types: string[];
      maxSize: number;
    };
  };
  supportedTypes: string[];
  maxFileSizes: {
    [key: string]: {
      maxSize: number;
      maxSizeMB: number;
    };
  };
}

interface UploadResult {
  uploadUrl: string;
  cdnUrl: string;
  filePath: string;
  expiresIn: number;
}

export default function StorePage() {
  const { data: session } = useSession();
  const [config, setConfig] = useState<UploadConfig | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>("checking...");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("temp");
  const [entityId, setEntityId] = useState("test-entity-123");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch upload configuration and health status
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configResponse = await fetch("http://localhost:3001/api/v1/uploads/config");
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setConfig(configData.data);
        }

        const healthResponse = await fetch("http://localhost:3001/api/v1/uploads/health");
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          setHealthStatus(healthData.data.r2Connection);
        }
      } catch (err) {
        setHealthStatus("error");
        setError("Failed to fetch upload configuration");
      }
    };

    fetchConfig();
  }, []);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setUploadResult(null);
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setUploadResult(null);
    }
  };

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    const type = file.type.split('/')[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (type === 'image') return <Image className="h-8 w-8" />;
    if (type === 'video') return <Video className="h-8 w-8" />;
    if (extension === 'glb' || extension === 'gltf') return <Package className="h-8 w-8" />;
    if (extension === 'pdf') return <FileText className="h-8 w-8" />;
    return <File className="h-8 w-8" />;
  };

  // Validate file before upload
  const validateFile = (file: File): boolean => {
    if (!config) return false;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension) {
      setError("File must have an extension");
      return false;
    }

    // Check if file type is supported
    const isSupported = config.supportedTypes.includes(extension);
    if (!isSupported) {
      setError(`Unsupported file type: ${extension}. Supported types: ${config.supportedTypes.join(', ')}`);
      return false;
    }

    // Check file size limits
    for (const [limitCategory, limits] of Object.entries(config.fileLimits)) {
      if (limits.types.includes(extension)) {
        if (file.size > limits.maxSize) {
          const maxMB = Math.round(limits.maxSize / 1024 / 1024);
          setError(`${limitCategory} files must be smaller than ${maxMB}MB`);
          return false;
        }
        break;
      }
    }

    return true;
  };

  // Upload file using presigned URL
  const handleUpload = async () => {
    if (!selectedFile || !session) {
      setError("Please select a file and ensure you're logged in");
      return;
    }

    if (!validateFile(selectedFile)) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URL from backend
      const presignedResponse = await fetch("http://localhost:3001/api/v1/uploads/presigned", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": document.cookie,
        },
        credentials: "include",
        body: JSON.stringify({
          category,
          entityId,
          filename: selectedFile.name,
          fileSize: selectedFile.size,
        }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error?.message || "Failed to get presigned URL");
      }

      const presignedData = await presignedResponse.json();
      const { uploadUrl, cdnUrl, filePath } = presignedData.data;

      setUploadProgress(25);

      // Step 2: Upload file directly to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to R2");
      }

      setUploadProgress(100);

      // Step 3: Display results
      setUploadResult({
        uploadUrl,
        cdnUrl,
        filePath,
        expiresIn: presignedData.data.expiresIn,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError(null);
    setUploadProgress(0);
    setEntityId("test-entity-123");
    setCategory("temp");
  };

  return (
    <div className="p-8 flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold">File Upload Testing</h1>
        <p className="text-lg text-muted-foreground">
          Cloudflare R2 upload testing ground
        </p>
      </div>

      {/* Main Upload Section */}
      <div className="bg-card border rounded-lg p-8 max-w-3xl mx-auto w-full">
        {!selectedFile ? (
          // Drag and Drop Area
          <div
            className={`relative rounded-lg border-2 border-dashed transition-all duration-200 ${
              isDragging 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Upload className="h-10 w-10 text-gray-400" />
              </div>
              
              <p className="text-xl font-medium mb-2">
                Drag and drop files to upload
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Your files will be uploaded to Cloudflare R2
              </p>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="lg"
                className="px-8"
              >
                Select files
              </Button>
            </div>
          </div>
        ) : (
          // File Selected View
          <div className="space-y-6">
            {/* File Preview */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {getFileIcon(selectedFile)}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(selectedFile.size / 1024)}KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload Settings */}
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {config?.categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Entity ID</label>
                <Input
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="test-entity-123"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter any test ID like "test-user-123" or "my-world-456"
                </p>
              </div>
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                onClick={handleUpload} 
                disabled={isLoading || !session}
                className="flex-1"
              >
                {isLoading ? "Uploading..." : "Upload"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Upload Results */}
        {uploadResult && (
          <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-green-600 dark:text-green-400 mb-3">
              Upload Successful!
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex flex-col gap-1">
                <span className="font-medium">File Path:</span>
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {uploadResult.filePath}
                </code>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-medium">CDN URL:</span>
                <a 
                  href={uploadResult.cdnUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline break-all text-xs"
                >
                  {uploadResult.cdnUrl}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Configuration (moved to bottom) */}
      <div className="bg-card border rounded-lg p-8">
        <h2 className="text-2xl font-medium mb-4">Upload Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">R2 Status:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  healthStatus === "ok" 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {healthStatus}
                </span>
              </div>
              
              {config && (
                <>
                  <div>
                    <span className="font-medium">Categories:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.categories.map(cat => (
                        <span key={cat} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div>
            {config && (
              <div className="text-sm space-y-2">
                <div>
                  <span className="font-medium">File Limits:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(config.maxFileSizes).map(([type, limits]) => (
                      <div key={type} className="flex justify-between text-xs">
                        <span className="capitalize">{type}:</span>
                        <span className="text-muted-foreground">{limits.maxSizeMB}MB</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}