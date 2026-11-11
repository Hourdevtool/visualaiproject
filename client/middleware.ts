import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // ถ้าล็อกอินแล้วแต่เข้ามาที่หน้า / หรือ /login ให้เด้งไปหน้า dashboard ของตัวเอง
    if (token && (path === "/login" || path === "/")) {
      if (token.role === "admin") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.redirect(new URL("/user", req.url));
    }

    // ถ้ายังไม่ล็อกอินแต่พยายามเข้าหน้า admin หรือ user หรือ profile
    if (!token && (path.startsWith("/admin") || path.startsWith("/user") || path.startsWith("/profile"))) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // ตรวจสอบสิทธิ์สำหรับคนล็อกอินแล้ว
    if (token) {
      if (token.permission === false && (path.startsWith("/admin") || path.startsWith("/user"))) {
        return NextResponse.rewrite(new URL("/not-found", req.url));
      }

      if (path.startsWith("/admin") && token.role !== "admin") {
        return NextResponse.rewrite(new URL("/not-found", req.url));
      }

      if (path.startsWith("/user") && token.role !== "user" && token.role !== "admin") {
        return NextResponse.rewrite(new URL("/not-found", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: () => true, // ยอมให้ middleware รันทุกครั้งที่ตรง matcher
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/user/:path*", "/login", "/", "/profile"],
};











