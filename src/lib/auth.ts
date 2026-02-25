import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

// Simple in-memory store for development
// In production, replace with database queries
const users = new Map<string, { 
  id: string; 
  email: string; 
  name: string; 
  password: string; 
  subscription: string;
  image?: string;
}>();

// Hash password helper
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password helper
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
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
        
        const user = users.get(email);
        
        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(password, user.password);
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
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account?.provider === "google") {
        // For Google users, create/update in our store
        const existingUser = users.get(token.email as string);
        if (!existingUser) {
          const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          users.set(token.email as string, {
            id,
            email: token.email as string,
            name: token.name as string,
            password: "", // Google users don't have passwords
            subscription: "free",
            image: token.picture as string,
          });
          token.id = id;
        } else {
          token.id = existingUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        
        // Get subscription from store
        const user = users.get(session.user.email as string);
        if (user) {
          (session.user as any).subscription = user.subscription;
        }
      }
      return session;
    },
  },
});

// Helper to register users (called from signup API)
export async function registerUser(email: string, name: string, password: string) {
  if (users.has(email)) {
    throw new Error("User already exists");
  }
  
  const hashedPassword = await hashPassword(password);
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  users.set(email, { 
    id, 
    email, 
    name, 
    password: hashedPassword, 
    subscription: "free" 
  });
  
  return { id, email, name };
}

export function getUser(email: string) {
  return users.get(email);
}

export function updateUserSubscription(email: string, subscription: string) {
  const user = users.get(email);
  if (user) {
    user.subscription = subscription;
    users.set(email, user);
  }
}
