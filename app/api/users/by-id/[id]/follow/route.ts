import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const followerId = await requireAuth(request);
    const followingId = params.id;

    if (followerId === followingId) {
      return NextResponse.json(
        { error: "자기 자신을 팔로우할 수 없습니다" },
        { status: 400 }
      );
    }

    // 이미 팔로우 중인지 확인
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      return NextResponse.json(
        { error: "이미 팔로우 중입니다", liked: true },
        { status: 400 }
      );
    }

    // 팔로우 생성
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    // 팔로워/팔로잉 수 업데이트
    await Promise.all([
      prisma.user.update({
        where: { id: followingId },
        data: { followers: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: followerId },
        data: { following: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({
      message: "팔로우되었습니다",
      following: true,
    });
  } catch (error: any) {
    if (error.message === "인증이 필요합니다") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error following user:", error);
    return NextResponse.json(
      { error: "팔로우 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const followerId = await requireAuth(request);
    const followingId = params.id;

    // 팔로우 관계 확인
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!existingFollow) {
      return NextResponse.json(
        { error: "팔로우하지 않은 사용자입니다", following: false },
        { status: 400 }
      );
    }

    // 팔로우 삭제
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    // 팔로워/팔로잉 수 업데이트
    await Promise.all([
      prisma.user.update({
        where: { id: followingId },
        data: { followers: { decrement: 1 } },
      }),
      prisma.user.update({
        where: { id: followerId },
        data: { following: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({
      message: "언팔로우되었습니다",
      following: false,
    });
  } catch (error: any) {
    if (error.message === "인증이 필요합니다") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error unfollowing user:", error);
    return NextResponse.json(
      { error: "언팔로우 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request);
    const userId = params.id;

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session,
          followingId: userId,
        },
      },
    });

    return NextResponse.json({
      liked: !!follow,
    });
  } catch (error: any) {
    if (error.message === "인증이 필요합니다") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "팔로우 상태 확인 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

