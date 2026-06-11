import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    // WP0 funnel: signup via OAuth (adapter-created users, i.e. Google).
    // Credentials signups are recorded in /api/auth/signup.
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.event
        .create({ data: { name: 'signup', userId: user.id, meta: { provider: 'oauth' } } })
        .catch(() => {});
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;

        // Fetch subscription from database
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            subscription: true,
            aiGenerationsThisMonth: true,
            aiGenerationsResetDate: true,
            stripeCustomerId: true,
          },
        });

        if (dbUser) {
          (session.user as any).subscription = dbUser.subscription;
          (session.user as any).aiGenerationsThisMonth = dbUser.aiGenerationsThisMonth;
          (session.user as any).aiGenerationsResetDate = dbUser.aiGenerationsResetDate;
          (session.user as any).stripeCustomerId = dbUser.stripeCustomerId;
        }
      }
      return session;
    },
  },
});
