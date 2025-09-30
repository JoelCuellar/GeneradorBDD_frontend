// app/login/page.tsx
import LoginClient from "./LoginClient";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  const nextParam = Array.isArray(searchParams.next)
    ? searchParams.next[0]
    : searchParams.next;

  const next = nextParam && typeof nextParam === "string" && nextParam.startsWith("/")
    ? nextParam
    : "/dashboard";

  return <LoginClient next={next} />; // componente cliente con tu formulario
}
