import { glassPanel } from '@/lib/glass-panel';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="IT Faculty Schedule">
                <link rel="preload" href="/BGlanding.jpg" as="image" />
            </Head>
            <div className="relative isolate min-h-screen text-white">
                <div
                    aria-hidden
                    className="pointer-events-none fixed inset-0 -z-10 bg-blue-950 bg-[url('/BGlanding.jpg')] bg-cover bg-center bg-no-repeat"
                />
                <div
                    aria-hidden
                    className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,#1e3a8a_0%,#1e3a8a_58%,rgba(30,58,138,0.5)_64%,transparent_70%)]"
                />
                <div className="relative flex min-h-screen flex-col items-center p-6 lg:justify-center lg:p-8">
                    <div className="flex w-full flex-col items-center lg:grow">
                        <div className="flex w-full items-center justify-center lg:grow">
                            <main className="flex w-full max-w-[335px] flex-col-reverse lg:max-w-4xl lg:flex-row">
                                <div
                                    className={`flex-1 p-6 pb-12 text-sm leading-5 text-white ${glassPanel} lg:rounded-tl-2xl lg:rounded-br-none lg:rounded-tr-none lg:rounded-bl-2xl lg:p-20`}
                                >
                                    <h1 className="mb-4 font-serif text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
                                        IT Faculty Schedule
                                    </h1>
                                    <p className="mb-6 text-white/90">
                                        Faculty comlab scheduling for Leyte Normal University. Sign in to manage teachers,
                                        subjects, sections, and weekly schedules.
                                    </p>
                                    <ul className="flex gap-3 text-sm leading-normal">
                                        {auth.user ? (
                                            <li>
                                                <Link
                                                    href={route('dashboard')}
                                                    className="inline-block rounded-lg border border-white/30 bg-white/25 px-5 py-1.5 text-sm leading-normal text-white backdrop-blur-sm hover:bg-white/35"
                                                >
                                                    Go to dashboard
                                                </Link>
                                            </li>
                                        ) : (
                                            <>
                                                <li>
                                                    <Link
                                                        href={route('login')}
                                                        className="inline-block rounded-lg border border-white/30 bg-white/25 px-5 py-1.5 text-sm leading-normal text-white backdrop-blur-sm hover:bg-white/35"
                                                    >
                                                        Log in
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href={route('register')}
                                                        className="inline-block rounded-lg border border-white/40 bg-transparent px-5 py-1.5 text-sm leading-normal text-white backdrop-blur-sm hover:bg-white/15"
                                                    >
                                                        Register
                                                    </Link>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                                <div
                                    className={`relative -mb-px flex aspect-[335/376] w-full shrink-0 items-center justify-center p-8 lg:mb-0 lg:-ml-px lg:aspect-auto lg:min-h-[376px] lg:w-[438px] lg:rounded-tl-none lg:rounded-tr-2xl lg:rounded-br-2xl lg:rounded-bl-none ${glassPanel}`}
                                >
                                    <img
                                        src="/LNULOGO.png"
                                        alt="Leyte Normal University"
                                        className="max-h-64 w-full max-w-[280px] object-contain sm:max-h-72 sm:max-w-[320px] lg:max-h-80 lg:max-w-[360px]"
                                    />
                                </div>
                            </main>
                        </div>
                        <div className="hidden h-14.5 lg:block" />
                    </div>
                </div>
            </div>
        </>
    );
}
