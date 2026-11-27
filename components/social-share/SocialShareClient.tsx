"use client";

import { useMutation } from "@tanstack/react-query";
import { CldImage, getCldImageUrl } from "next-cloudinary";
import React, { useState } from "react";

interface SocialFormatConfig {
  width: number;
  height: number;
  aspectRatio: string;
}

const SOCIAL_FORMATS = {
  "Instagram Square (1:1)": { width: 1080, height: 1080, aspectRatio: "1:1" },
  "Instagram Portrait (4:5)": { width: 1080, height: 1350, aspectRatio: "4:5" },
  "Instagram / TikTok Story (9:16)": {
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
  },
  "Twitter / X Post (16:9)": { width: 1200, height: 675, aspectRatio: "16:9" },
  "Twitter / X Header (3:1)": { width: 1500, height: 500, aspectRatio: "3:1" },
  "Facebook Cover (205:78)": { width: 820, height: 312, aspectRatio: "205:78" },
  "YouTube Thumbnail (16:9)": { width: 1280, height: 720, aspectRatio: "16:9" },
  "LinkedIn Banner (4:1)": { width: 1584, height: 396, aspectRatio: "4:1" },
  "Custom Size": { width: 1080, height: 1080, aspectRatio: "1:1" },
} as const satisfies Record<string, SocialFormatConfig>;

type SocialFormat = keyof typeof SOCIAL_FORMATS;
type GravityOption = "auto" | "face" | "center";

interface UploadResponse {
  publicId: string;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

function clampDimension(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 50) return fallback;
  return Math.min(Math.round(value), 4000);
}

function getExtensionFromMime(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("avif")) return "avif";
  if (mimeType.includes("gif")) return "gif";
  return "jpg";
}

export default function SocialShareClient() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<SocialFormat>(
    "Instagram Square (1:1)"
  );
  const [customWidth, setCustomWidth] = useState<number>(1080);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [draftWidth, setDraftWidth] = useState<string>("1080");
  const [draftHeight, setDraftHeight] = useState<string>("1080");
  const [gravity, setGravity] = useState<GravityOption>("auto");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [transformError, setTransformError] = useState<string | null>(null);

  const isCustom = selectedFormat === "Custom Size";
  const activeWidth = isCustom
    ? customWidth
    : SOCIAL_FORMATS[selectedFormat].width;
  const activeHeight = isCustom
    ? customHeight
    : SOCIAL_FORMATS[selectedFormat].height;

  const divisor = gcd(activeWidth, activeHeight);
  const activeAspectRatio = isCustom
    ? `${activeWidth / divisor}:${activeHeight / divisor}`
    : SOCIAL_FORMATS[selectedFormat].aspectRatio;

  const previewKey = `${uploadedImage ?? ""}-${activeWidth}-${activeHeight}-${activeAspectRatio}-${gravity}`;
  const isTransforming = Boolean(uploadedImage) && loadedKey !== previewKey;

  const uploadMutation = useMutation<UploadResponse, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/image-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      return data as UploadResponse;
    },
    onSuccess: (data) => {
      setFileError(null);
      setTransformError(null);
      setUploadedImage(data.publicId);
    },
  });

  const downloadMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!uploadedImage) {
        throw new Error("No image available to download");
      }

      const imageUrl = getCldImageUrl({
        src: uploadedImage,
        width: activeWidth,
        height: activeHeight,
        crop: "fill",
        aspectRatio: activeAspectRatio,
        gravity,
        format: "png",
      });

      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error("Failed to download transformed image");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const ext = getExtensionFromMime(blob.type);
      const slug = selectedFormat
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${slug}-${activeWidth}x${activeHeight}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        window.URL.revokeObjectURL(url);
      }
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFileError("Please select a valid image file (PNG, JPG, WebP, etc.).");
      return;
    }

    setFileError(null);
    uploadMutation.mutate(file);
  };

  const handleApplyCustomSize = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextW = clampDimension(Number(draftWidth), customWidth);
    const nextH = clampDimension(Number(draftHeight), customHeight);
    setCustomWidth(nextW);
    setCustomHeight(nextH);
    setDraftWidth(String(nextW));
    setDraftHeight(String(nextH));
    setTransformError(null);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Social Media Image Creator
        </h1>
        <p className="mt-2 text-base-content/70">
          Upload an image, pick a social media aspect ratio or custom size,
          preview it live with Cloudinary, and download.
        </p>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body gap-6">
          {/* Step 1: Upload */}
          <div>
            <h2 className="card-title text-lg mb-3">1. Upload an Image</h2>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                Choose an image file (PNG, JPG, WebP)
              </legend>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadMutation.isPending}
                className="file-input file-input-primary w-full"
              />
            </fieldset>

            {uploadMutation.isPending && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading to Cloudinary...</span>
                  <span className="loading loading-dots loading-sm text-primary" />
                </div>
                <progress className="progress progress-primary w-full" />
              </div>
            )}

            {(fileError || uploadMutation.isError) && (
              <div role="alert" className="alert alert-error mt-4">
                <span>{fileError ?? uploadMutation.error?.message}</span>
              </div>
            )}
          </div>

          {/* Step 2: Format, Size & Preview */}
          {uploadedImage && (
            <>
              <div className="divider my-0" />

              <div className="space-y-4">
                <h2 className="card-title text-lg">
                  2. Choose Aspect Ratio &amp; Size
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Format Preset</legend>
                    <select
                      className="select select-bordered w-full"
                      value={selectedFormat}
                      onChange={(e) => {
                        setTransformError(null);
                        setSelectedFormat(e.target.value as SocialFormat);
                      }}
                    >
                      {(Object.keys(SOCIAL_FORMATS) as SocialFormat[]).map(
                        (format) => (
                          <option key={format} value={format}>
                            {format}
                          </option>
                        )
                      )}
                    </select>
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Crop Focus</legend>
                    <select
                      className="select select-bordered w-full"
                      value={gravity}
                      onChange={(e) => {
                        setTransformError(null);
                        setGravity(e.target.value as GravityOption);
                      }}
                    >
                      <option value="auto">Smart AI Auto-Focus</option>
                      <option value="face">Focus on Faces</option>
                      <option value="center">Center Crop</option>
                    </select>
                  </fieldset>
                </div>

                {isCustom && (
                  <form
                    onSubmit={handleApplyCustomSize}
                    className="grid grid-cols-1 items-end gap-4 rounded-box bg-base-300/60 p-4 sm:grid-cols-3"
                  >
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">
                        Width (50–4000px)
                      </legend>
                      <input
                        type="number"
                        min={50}
                        max={4000}
                        value={draftWidth}
                        onChange={(e) => setDraftWidth(e.target.value)}
                        className="input input-bordered w-full"
                        required
                      />
                    </fieldset>
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">
                        Height (50–4000px)
                      </legend>
                      <input
                        type="number"
                        min={50}
                        max={4000}
                        value={draftHeight}
                        onChange={(e) => setDraftHeight(e.target.value)}
                        className="input input-bordered w-full"
                        required
                      />
                    </fieldset>
                    <button type="submit" className="btn btn-secondary w-full">
                      Apply Size
                    </button>
                  </form>
                )}

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="badge badge-outline">
                    Dimensions: {activeWidth} × {activeHeight}px
                  </span>
                  <span className="badge badge-outline">
                    Aspect Ratio: {activeAspectRatio}
                  </span>
                  <span className="badge badge-outline">
                    Gravity: {gravity}
                  </span>
                </div>
              </div>

              <div className="divider my-0" />

              {/* Step 3: Live Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="card-title text-lg">3. Live Preview</h2>
                  {isTransforming && (
                    <span className="badge badge-info gap-2">
                      <span className="loading loading-spinner loading-xs" />
                      Transforming...
                    </span>
                  )}
                </div>

                {transformError && (
                  <div role="alert" className="alert alert-warning">
                    <span>{transformError}</span>
                  </div>
                )}

                <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-box bg-base-300 p-4">
                  {isTransforming && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-100/60 backdrop-blur-xs">
                      <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                  )}

                  <CldImage
                    key={previewKey}
                    width={activeWidth}
                    height={activeHeight}
                    src={uploadedImage}
                    sizes="(max-width: 768px) 100vw, 768px"
                    alt={`Preview transformed for ${selectedFormat}`}
                    crop="fill"
                    aspectRatio={activeAspectRatio}
                    gravity={gravity}
                    className="max-h-[540px] w-auto rounded-lg object-contain shadow-md"
                    onLoad={() => setLoadedKey(previewKey)}
                    onError={() => {
                      setLoadedKey(previewKey);
                      setTransformError(
                        "Could not load the transformed preview. Please try another size or image."
                      );
                    }}
                  />
                </div>

                {downloadMutation.isError && (
                  <div role="alert" className="alert alert-error">
                    <span>{downloadMutation.error.message}</span>
                  </div>
                )}

                <div className="card-actions justify-end">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => downloadMutation.mutate()}
                    disabled={isTransforming || downloadMutation.isPending}
                  >
                    {downloadMutation.isPending ? (
                      <>
                        <span className="loading loading-spinner loading-sm" />
                        Downloading...
                      </>
                    ) : (
                      `Download for ${selectedFormat}`
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
