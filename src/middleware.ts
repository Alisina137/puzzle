import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {
    // Protected routes are already authorized by the callback below.
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*", "/books/:path*", "/settings/:path*"],
};
