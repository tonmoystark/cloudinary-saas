"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";

const MAX_FILE_SIZE = 70 * 1024 * 1024; // 70 MB

interface UploadedVideo {
  id: string;
  title: string;
  description: string | null;
  publicId: string;
  originalSize: number;
  compressedSize: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

interface VideoUploadResponse {
  createdVideo: UploadedVideo;
  message: string;
}

interface UploadPayload {
  file: File;
  title: string;
  description: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VideoUploadClient() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation<VideoUploadResponse, Error, UploadPayload>(
    {
      mutationFn: async ({ file, title, description }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title.trim());
        formData.append("description", description.trim());
        formData.append("originalSize", String(file.size));

        return await new Promise<VideoUploadResponse>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/video-upload");

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percent);
            }
          };

          xhr.onload = () => {
            let parsed: { error?: string } & Partial<VideoUploadResponse> = {};
            try {
              parsed = JSON.parse(xhr.responseText);
            } catch {
              // ignore non-JSON body
            }

            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(parsed as VideoUploadResponse);
            } else {
              reject(new Error(parsed.error || "Failed to upload video"));
            }
          };

          xhr.onerror = () => {
            reject(new Error("Network error while uploading video"));
          };

          xhr.send(formData);
        });
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["videos"] });
        setTitle("");
        setDescription("");
        setFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        router.push("/home");
      },
      onError: () => {
        setUploadProgress(0);
      },
    }
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setValidationError(null);
    uploadMutation.reset();

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.type.startsWith("video/")) {
      setValidationError("Please select a valid video file.");
      setFile(null);
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setValidationError(
        `File size (${formatFileSize(selectedFile.size)}) exceeds the 70 MB limit.`
      );
      setFile(null);
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    if (!title.trim()) {
      setValidationError("Please enter a title for your video.");
      return;
    }

    if (!file) {
      setValidationError("Please select a video file to upload.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setValidationError("File size exceeds the 70 MB limit.");
      return;
    }

    setUploadProgress(0);
    uploadMutation.mutate({ file, title, description });
  };

  const isUploading = uploadMutation.isPending;
  const errorMessage = validationError ?? uploadMutation.error?.message ?? null;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Upload Video</h1>
        <p className="mt-2 text-base-content/70">
          Upload a video up to 70 MB to automatically compress and optimize it
          with Cloudinary.
        </p>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <form onSubmit={handleSubmit} className="card-body gap-5">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Title *</legend>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your video"
              disabled={isUploading}
              className="input input-bordered w-full"
              required
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Description</legend>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add an optional description..."
              disabled={isUploading}
              rows={3}
              className="textarea textarea-bordered w-full"
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              Video File * (Max 70 MB)
            </legend>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="file-input file-input-primary w-full"
              required
            />
            {file && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="badge badge-outline">{file.name}</span>
                <span className="badge badge-ghost">
                  {formatFileSize(file.size)}
                </span>
              </div>
            )}
          </fieldset>

          {isUploading && (
            <div className="space-y-2 rounded-box bg-base-300/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {uploadProgress < 100
                    ? `Uploading video... ${uploadProgress}%`
                    : "Processing and compressing on Cloudinary..."}
                </span>
                <span className="loading loading-dots loading-sm text-primary" />
              </div>
              {uploadProgress < 100 ? (
                <progress
                  className="progress progress-primary w-full"
                  value={uploadProgress}
                  max={100}
                />
              ) : (
                <progress className="progress progress-primary w-full" />
              )}
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="alert alert-error">
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="card-actions justify-end pt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isUploading || !file || !title.trim()}
            >
              {isUploading ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Uploading...
                </>
              ) : (
                "Upload Video"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
