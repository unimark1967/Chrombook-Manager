import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      orgId?: string | null;
    };
  }
  interface User {
    role?: Role;
    orgId?: string | null;
  }
}

function detectRoleFromEmail(email: string, hd?: string): Role {
  if (!hd) return 'teacher';

  const localPart = email.split('@')[0].toLowerCase();
  if (/^\d+/.test(localPart)) return 'student';

  return 'teacher';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') return false;

      const googleProfile = profile as { hd?: string; email?: string };
      const email = user.email ?? '';
      const hd = googleProfile?.hd ?? email.split('@')[1];

      let org = await prisma.organization.findFirst({
        where: { domain: hd },
      });

      if (!org) {
        org = await prisma.organization.create({
          data: {
            name: hd,
            domain: hd,
          },
        });
      }

      const role = detectRoleFromEmail(email, hd);

      try {
        await prisma.user.update({
          where: { email },
          data: { role, orgId: org.id },
        });
      } catch {
        // User may not exist yet — adapter will create it
      }

      return true;
    },

    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, orgId: true },
      });

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          role: dbUser?.role ?? 'teacher',
          orgId: dbUser?.orgId ?? null,
        },
      };
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
});