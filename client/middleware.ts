import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // ถ้าล็อกอินแล้วแต่เข้ามาที่หน้า / หรือ /login ให้เด้งไปหน้า dashboard ของตัวเอง
    if (token && (path === "/login" || path === "/")) {
      const url = req.nextUrl.clone();
      url.pathname = token.role === "admin" ? "/admin" : "/user";
      return NextResponse.redirect(url);
    }

    // ถ้ายังไม่ล็อกอินแต่พยายามเข้าหน้า admin หรือ user หรือ profile
    if (!token && (path.startsWith("/admin") || path.startsWith("/user") || path.startsWith("/profile"))) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // ตรวจสอบสิทธิ์สำหรับคนล็อกอินแล้ว
    if (token) {
      if (token.permission === false && (path.startsWith("/admin") || path.startsWith("/user"))) {
        const url = req.nextUrl.clone();
        url.pathname = "/not-found";
        return NextResponse.rewrite(url);
      }

      if (path.startsWith("/admin") && token.role !== "admin") {
        const url = req.nextUrl.clone();
        url.pathname = "/not-found";
        return NextResponse.rewrite(url);
      }

      if (path.startsWith("/user") && token.role !== "user" && token.role !== "admin") {
        const url = req.nextUrl.clone();
        url.pathname = "/not-found";
        return NextResponse.rewrite(url);
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











