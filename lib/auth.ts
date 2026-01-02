import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import AppleProvider from "next-auth/providers/apple";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import type { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("이메일과 비밀번호를 입력해주세요");
        }

        try {
          // 이메일 정규화 (소문자 변환 및 공백 제거)
          const normalizedEmail = credentials.email.trim().toLowerCase();

          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });

          // 사용자가 존재하지 않는 경우
          if (!user) {
            console.error(`[Auth] User not found: ${normalizedEmail}`);
            throw new Error("이메일 또는 비밀번호가 올바르지 않습니다");
          }

          // 소셜 로그인으로 가입한 사용자 (비밀번호가 없는 경우)
          if (!user.password) {
            console.error(`[Auth] User exists but no password (social login): ${normalizedEmail}`);
            throw new Error("이 계정은 소셜 로그인으로 가입되었습니다. 소셜 로그인을 사용해주세요");
          }

          // 차단된 사용자 확인
          if (user.isBanned) {
            console.error(`[Auth] Banned user attempted login: ${normalizedEmail}`);
            throw new Error("차단된 계정입니다");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.error(`[Auth] Invalid password for user: ${normalizedEmail}`);
            throw new Error("이메일 또는 비밀번호가 올바르지 않습니다");
          }

          console.log(`[Auth] Successful login: ${normalizedEmail} (${user.username})`);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            image: user.avatar,
          };
        } catch (error: any) {
          // 이미 에러 메시지가 있는 경우 그대로 전달
          if (error.message && error.message.startsWith("이메일") || 
              error.message && error.message.startsWith("이 계정") ||
              error.message && error.message.startsWith("차단된")) {
            throw error;
          }
          // 기타 에러는 로그하고 일반적인 에러 메시지 반환
          console.error("[Auth] Unexpected error during authorization:", error);
          throw new Error("로그인 중 오류가 발생했습니다");
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || "",
      clientSecret: process.env.APPLE_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  pages: {
    signIn: "/auth/signin",
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // HTTPS가 아닌 경우 secure를 false로 설정
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username || null;
        // 사용자 정보가 없으면 데이터베이스에서 다시 가져오기
        if (!token.username && token.id) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { username: true },
            });
            if (dbUser) {
              token.username = dbUser.username;
            }
          } catch (error) {
            console.error("Error fetching username in jwt callback:", error);
          }
        }
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).username = token.username as string;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // 소셜 로그인 시 사용자 정보 업데이트
      if (account?.provider === "google" || account?.provider === "github" || account?.provider === "apple") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (existingUser) {
            // 아바타 업데이트
            if (!existingUser.avatar && user.image) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { avatar: user.image },
              });
            }
            // 차단된 사용자 확인
            if (existingUser.isBanned) {
              return false; // 로그인 차단
            }
          }
        } catch (error) {
          console.error("Error updating user:", error);
        }
      }
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

