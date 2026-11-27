import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized user" }, { status: 401 });
  }

  if (
    !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json(
      { error: "Missing Cloudinary configuration" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const title = formData.get("title")?.toString();
    const description = formData.get("description")?.toString();
    const file = formData.get("file") as File | null;
    const originalSize = file?.size ? Number(file.size) : 0;

    if (!file) {
      return NextResponse.json(
        { error: "Please upload a file" },
        { status: 400 },
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Please provide a title for the video" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "cloudinary-saas: videos",
          resource_type: "video",
          transformation: [
            {
              quality: "auto",
              fetch_format: "mp4",
            },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result) {
            reject(new Error("Cloudinary upload returned no result"));
          } else {
            resolve(result);
          }
        },
      );
      uploadStream.end(buffer);
    });

    const createdVideo = await prisma.video.create({
      data: {
        title,
        description,
        originalSize,
        publicId: result.public_id,
        duration: result.duration || 0,
        compressedSize: String(result.bytes),
      },
    });

    return NextResponse.json(
      { createdVideo, message: "video uploaded successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Something went wrong in the video uploading:", error);
    return NextResponse.json(
      { error: "something went wrong in the video uploading" },
      { status: 500 },
    );
  }
}
