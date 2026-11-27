
import { auth } from "@clerk/nextjs/server";
import { v2 as cloudinary } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

interface cloudinaryUploadResult {
    public_id: string;
    [key: string] : any
}

export async function POST( request: NextRequest ){
    const {userId} = await auth()

    if(!userId) {
        return NextResponse.json({error: "Unauthorized user"}, {status: 401})
    }

    try {
        
const formData = request.formData()
const file = (await formData).get("file") as File | null

if(!file) {
    return NextResponse.json({error: "Please upload a file"}, {status: 400})
}

    const bytes =  await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await new Promise<cloudinaryUploadResult>((resolve, reject)=>{
        const uploadStream = cloudinary.uploader.upload_stream({
            folder: `cloudinary saas`
        },
        (error, result) => {
            if(error){
                reject(error)
            }else{
                resolve(result as cloudinaryUploadResult)
            }
        }
    )
    uploadStream.end(buffer)
    })

    return NextResponse.json({publicId: result.public_id}, {status: 200})

    } catch (error) {
        console.log(error, "something went wrong in the uploading")
        NextResponse.json({error: "something went wrong in the uploading"}, {status: 500})
    }

}