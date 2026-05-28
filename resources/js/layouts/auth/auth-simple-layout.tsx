import { authGlassForm, glassPanel } from '@/lib/glass-panel';
import { Head, Link } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <>
            <Head>
                <link rel="preload" href="/LNULOGO.png" as="image" />
            </Head>
            <div className="relative isolate min-h-screen text-white">
                <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-blue-950" />
                <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                    <img
                        src="/LNULOGO.png"
                        alt=""
                        className="absolute top-1/2 left-1/2 h-[min(94vh,960px)] w-auto max-w-[min(98vw,960px)] -translate-x-1/2 -translate-y-1/2 object-contain object-center opacity-[0.42]"
                    />
                </div>
                <div
                    aria-hidden
                    className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(30,58,138,0.15)_0%,rgba(30,58,138,0.55)_45%,rgba(23,37,84,0.88)_100%)]"
                />
                <div
                    aria-hidden
                    className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-blue-950/50 via-transparent to-blue-950/50"
                />

                <div className="relative grid min-h-screen w-full place-items-center p-4 sm:p-6">
                    <div className={`mx-auto w-full max-w-md p-6 sm:p-8 ${glassPanel} ${authGlassForm}`}>
                        <div className="mb-6 flex flex-col items-center space-y-2 text-center">
                            <Link
                                href={route('home')}
                                className="inline-block text-sm text-white/70 transition-colors hover:text-white"
                            >
                                ← Home
                            </Link>
                            <h1 className="font-serif text-xl font-bold text-white sm:text-2xl">{title}</h1>
                            <p className="max-w-sm text-sm text-white/90">{description}</p>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}
