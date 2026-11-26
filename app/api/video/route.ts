import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req:NextRequest, res:NextResponse){
    try {
        const videos = prisma.video.findMany({
            orderBy:{
                createdAt: "desc"
            }
        })

        if(!videos){
            return NextResponse.json({message: "Videos not found"},{status: 404})
        }

        return NextResponse.json({videos, message: "Videos fetched successfully"}, {status: 200})

    } catch (error) {
        return NextResponse.json({error, message: "Could not fetched videos"}, {status: 500})
    }
}