import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// For demo purposes, we'll use a simple in-memory store
// In production, replace with database
const users: Map<string, { id: string; email: string; name: string; password: string; subscription: string }> = new Map();

export const { handlers, signIn, signOut, auth } = NextAuth({
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

        // Simple password check (in production, use bcrypt)
        if (user.password !== password) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
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
      }
      return session;
    },
  },
});

// Helper to register users (called from signup API)
export function registerUser(email: string, name: string, password: string) {
  if (users.has(email)) {
    throw new Error("User already exists");
  }
  
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  users.set(email, { id, email, name, password, subscription: "free" });
  
  return { id, email, name };
}

export function getUser(email: string) {
  return users.get(email);
}
