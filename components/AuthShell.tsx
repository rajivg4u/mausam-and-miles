import Link from "next/link";
export default function AuthShell({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}) {
 return <main className="auth-page"><section className="auth-card">
  <Link href="/" className="auth-brand">☀️ Mausam <span>&</span> Miles</Link>
  <h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>{children}
 </section></main>;
}
