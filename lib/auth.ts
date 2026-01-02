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
          console.log(`[Auth] Attempting login with email: ${normalizedEmail}`);

          // 먼저 정규화된 이메일로 찾기
          let foundUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });

          // 찾지 못한 경우, 원본 이메일로도 시도 (대소문자 차이 대비)
          if (!foundUser) {
            console.log(`[Auth] User not found with normalized email, trying original: ${credentials.email}`);
            foundUser = await prisma.user.findUnique({
              where: { email: credentials.email.trim() },
            });
          }

          // 여전히 찾지 못한 경우, 모든 사용자를 가져와서 대소문자 무시하고 비교
          if (!foundUser) {
            const allUsers = await prisma.user.findMany({
              where: {
                email: {
                  contains: normalizedEmail,
                },
              },
            });
            
            // 대소문자 무시하고 매칭되는 사용자 찾기
            foundUser = allUsers.find(u => u.email.toLowerCase() === normalizedEmail) || null;
            
            if (foundUser) {
              console.log(`[Auth] Found user with case-insensitive match: ${foundUser.email}`);
            }
          }

          // 사용자가 존재하지 않는 경우
          if (!foundUser) {
            console.error(`[Auth] User not found: ${normalizedEmail}`);
            // 디버깅: 데이터베이스에 있는 이메일 확인
            const allUsers = await prisma.user.findMany({
              select: { email: true },
              take: 5,
            });
            console.log(`[Auth] Sample emails in DB:`, allUsers.map(u => u.email));
            throw new Error("이메일 또는 비밀번호가 올바르지 않습니다");
          }

          // 소셜 로그인으로 가입한 사용자 (비밀번호가 없는 경우)
          if (!foundUser.password) {
            console.error(`[Auth] User exists but no password (social login): ${normalizedEmail}`);
            throw new Error("이 계정은 소셜 로그인으로 가입되었습니다. 소셜 로그인을 사용해주세요");
          }

          // 차단된 사용자 확인
          if (foundUser.isBanned) {
            console.error(`[Auth] Banned user attempted login: ${normalizedEmail}`);
            throw new Error("차단된 계정입니다");
          }

          console.log(`[Auth] Found user: ${foundUser.email} (${foundUser.username}), comparing password...`);
          console.log(`[Auth] Password hash exists: ${!!foundUser.password}`);
          console.log(`[Auth] Password hash length: ${foundUser.password?.length || 0}`);
          console.log(`[Auth] Password hash prefix: ${foundUser.password?.substring(0, 30) || 'null'}...`);
          
          // 비밀번호 비교
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            foundUser.password
          );

          console.log(`[Auth] Password comparison result: ${isPasswordValid}`);

          if (!isPasswordValid) {
            console.error(`[Auth] Invalid password for user: ${normalizedEmail}`);
            console.error(`[Auth] Input password length: ${credentials.password.length}`);
            console.error(`[Auth] Stored password hash: ${foundUser.password?.substring(0, 30)}...`);
            
            // 디버깅: 비밀번호 해시 형식 확인
            const hashParts = foundUser.password?.split('$') || [];
            console.error(`[Auth] Hash format: ${hashParts.length} parts, algorithm: ${hashParts[0] || 'unknown'}`);
            
            throw new Error("이메일 또는 비밀번호가 올바르지 않습니다");
          }

          console.log(`[Auth] Successful login: ${normalizedEmail} (${foundUser.username})`);

          return {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            username: foundUser.username,
            image: foundUser.avatar,
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
        // 도메인 명시 (IP 주소 사용 시 도메인 설정하지 않음)
        // domain: process.env.NEXTAUTH_URL?.includes("://") 
        //   ? new URL(process.env.NEXTAUTH_URL).hostname 
        //   : undefined,
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

