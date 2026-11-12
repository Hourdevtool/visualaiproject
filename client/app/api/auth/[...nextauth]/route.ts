import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

async function refreshAccessToken(token: any) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': `re=${token.refreshToken}`
      }
    });

    if (!res.ok) throw new Error("RefreshTokenError");

    const tokens = await res.json();

    return {
      ...token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + 14 * 60 * 1000,
    };
  } catch (error) {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              username: user.name || user.email,
              profile: user.image || null,
              provider: account.provider,
              provider_id: account.providerAccountId
            })
          });
          
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || "Authentication failed");
          }
          
          const data = await res.json();
          (user as any).backendTokens = data;
          return true;
        } catch (error: any) {
          return `${basePath}/login?error=${encodeURIComponent(error.message)}`;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // First login
      if (user && (user as any).backendTokens) {
        const tokens = (user as any).backendTokens;
        token.accessToken = tokens.access_token;
        token.refreshToken = tokens.refresh_token;
        token.accessTokenExpires = Date.now() + 14 * 60 * 1000; // 14 mins

        try {
          const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/auth/me`, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token.accessToken}`
              }
          });
          if (meRes.ok) {
              const userData = await meRes.json();
              token.id = userData.id;
              token.role = userData.role;
              token.permission = userData.permission;
          }
        } catch(e) {}
        
        return token;
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to update it
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as string;
      session.user = {
        ...session.user,
        id: token.id as string,
        role: token.role as string,
        permission: token.permission as boolean,
      } as any;
      
      return session;
    }
  },
  pages: {
    signIn: `${basePath}/login`,
    error: `${basePath}/login`,
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };