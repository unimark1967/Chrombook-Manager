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
  // Google Workspace hosted domain present → could be teacher or student.
  // Convention: accounts ending in .teacher@domain or teacher. prefix are teachers.
  // Fallback: all workspace accounts default to teacher; personal Gmail → student.
  if (!hd) return 'student';

  const localPart = email.split('@')[0].toLowerCase();
  if (
    localPart.startsWith('teacher') ||
    localPart.endsWith('.t') ||
    localPart.includes('teacher') ||
    localPart.includes('prof') ||
    localPart.includes('ucitel')
  ) {
    return 'teacher';
  }

  // Check if it looks like a student ID (digits or short codes)
  if (/^\d+/.test(localPart)) return 'student';

  return 'teacher'; // Workspace accounts default to teacher
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

      // Determine org from hosted domain
      if (googleProfile?.hd) {
        let org = await prisma.organization.findFirst({
          where: { domain: googleProfile.hd },
        });

        if (!org) {
          org = await prisma.organization.create({
            data: {
              name: googleProfile.hd,
              domain: googleProfile.hd,
            },
          });
        }

        // Update user role and orgId on every sign-in
        const role = detectRoleFromEmail(email, googleProfile.hd);
        await prisma.user.update({
          where: { email },
          data: { role, orgId: org.id },
        });
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
          role: dbUser?.role ?? 'student',
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
