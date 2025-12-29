import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateProfileSchema = z.object({
  name: z.string().max(50).optional(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        bio: true,
        followers: true,
        following: true,
        createdAt: true,
        _count: {
          select: {
            videos: true,
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error: any) {
    if (error.message === "인증이 필요합니다") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "프로필을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const body = await request.json();

    // 프로필 업데이트인지 비밀번호 변경인지 확인
    if (body.currentPassword && body.newPassword) {
      // 비밀번호 변경
      const validationResult = changePasswordSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: validationResult.error.errors[0].message },
          { status: 400 }
        );
      }

      const { currentPassword, newPassword } = validationResult.data;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user || !user.password) {
        return NextResponse.json(
          { error: "비밀번호를 변경할 수 없습니다" },
          { status: 400 }
        );
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "현재 비밀번호가 올바르지 않습니다" },
          { status: 401 }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return NextResponse.json({ message: "비밀번호가 변경되었습니다" });
    } else {
      // 프로필 업데이트
      const validationResult = updateProfileSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: validationResult.error.errors[0].message },
          { status: 400 }
        );
      }

      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.username !== undefined) updateData.username = body.username;
      if (body.bio !== undefined) updateData.bio = body.bio;
      if (body.avatar !== undefined) updateData.avatar = body.avatar;

      // 사용자명 중복 확인
      if (body.username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            username: body.username,
            NOT: { id: userId },
          },
        });

        if (existingUser) {
          return NextResponse.json(
            { error: "이미 사용 중인 사용자명입니다" },
            { status: 400 }
          );
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          bio: true,
        },
      });

      return NextResponse.json(updatedUser);
    }
  } catch (error: any) {
    if (error.message === "인증이 필요합니다") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "프로필을 업데이트하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

