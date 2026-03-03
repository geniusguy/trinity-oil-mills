import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { createConnection } from '@/lib/database';
import bcrypt from 'bcryptjs';

// Auth.js v5 configuration
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('[Auth] Missing credentials:', {
            hasEmail: !!credentials?.email,
            hasPassword: !!credentials?.password
          });
          return null;
        }

        try {
          console.log('[Auth] Attempting login for:', credentials.email);
          
          // Direct MySQL connection
          const connection = await createConnection();
          console.log('[Auth] Database connection established');

          const [users] = await connection.query(
            'SELECT id, email, password, name, role FROM users WHERE email = ? LIMIT 1',
            [credentials.email]
          ) as any;

          await connection.end();

          const usersArray = Array.isArray(users) ? users : [];
          console.log('[Auth] Query result:', {
            foundUsers: usersArray.length,
            userExists: usersArray.length > 0
          });

          if (usersArray.length === 0) {
            console.error('[Auth] User not found:', credentials.email);
            return null;
          }

          const user = usersArray[0] as {
            id: string;
            email: string;
            password: string;
            name: string;
            role: string;
          };
          console.log('[Auth] User found:', {
            id: user.id,
            email: user.email,
            hasPassword: !!user.password,
            passwordLength: user.password?.length || 0
          });
          
          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          console.log('[Auth] Password validation:', {
            isValid: isValidPassword
          });

          if (!isValidPassword) {
            console.error('[Auth] Invalid password for:', credentials.email);
            return null;
          }

          console.log('[Auth] Login successful for:', credentials.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('[Auth] Error during authentication:', error);
          if (error instanceof Error) {
            console.error('[Auth] Error message:', error.message);
            console.error('[Auth] Error stack:', error.stack);
          }
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string || token.sub!;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  // Auth.js v5 requires AUTH_SECRET or NEXTAUTH_SECRET
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'trinity-oil-mills-super-secret-key-2024-production',
  // Auth.js v5 requires AUTH_URL or NEXTAUTH_URL for production
  trustHost: true, // Trust the host header in production
});
