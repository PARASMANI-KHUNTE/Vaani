import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    backendAccessToken?: string;
    backendUser?: {
      _id: string;
      name: string;
      email: string;
      avatar: string | null;
      lastSeen: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendAccessToken?: string;
    backendUser?: {
      _id: string;
      name: string;
      email: string;
      avatar: string | null;
      lastSeen: string | null;
    };
  }
}
