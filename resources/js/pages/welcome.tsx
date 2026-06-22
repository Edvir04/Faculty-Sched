import { glassPanel } from '@/lib/glass-panel';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="IT Faculty Schedule">
                <link rel="preload" href="/images/LNU.jfif" as="image" />
            </Head>
            <div className="relative isolate min-h-screen text-white">
                <div
                    aria-hidden
                    className="pointer-events-none fixed inset-0 -z-10 bg-blue-950 bg-[url('/images/LNU.jfif')] bg-cover bg-center bg-no-repeat"
                />
                <div
                    aria-hidden
                    className="pointer-events-none fixed inset-0 -z-10 bg-[#001f54]/90"
                />
                <div className="relative flex min-h-screen items-center justify-center p-6 lg:p-8">
                    <main className="flex w-full max-w-xs flex-col-reverse sm:max-w-sm lg:max-w-4xl lg:flex-row">
                        {/* Text panel — DOM first → visually bottom on mobile, left on desktop */}
                        <div
                            className={`flex-1 p-5 pb-8 text-center text-sm leading-5 text-white ${glassPanel} rounded-tl-none rounded-tr-none rounded-bl-2xl rounded-br-2xl sm:p-7 sm:pb-10 lg:rounded-tl-2xl lg:rounded-bl-2xl lg:rounded-tr-none lg:rounded-br-none lg:p-20 lg:text-left`}
                        >
                            <h1 className="mb-2 font-serif text-xl font-bold uppercase tracking-tight text-white sm:mb-3 sm:text-2xl lg:mb-4 lg:text-5xl">
                                IT Faculty Schedule
                            </h1>
                            <p className="mb-4 text-xs text-white/90 sm:text-sm lg:mb-6 lg:text-base">
                                Faculty comlab scheduling for Leyte Normal University. Sign in to manage
                                teachers, subjects, sections, and weekly schedules.
                            </p>
                            <ul className="flex justify-center gap-2 text-xs leading-normal sm:gap-3 sm:text-sm lg:justify-start lg:text-sm">
                                {auth.user ? (
                                    <li>
                                        <Link
                                            href={route('dashboard')}
                                            className="inline-block rounded-lg border border-white/30 bg-white/25 px-4 py-1.5 text-xs leading-normal text-white backdrop-blur-sm hover:bg-white/35 lg:px-5 lg:text-sm"
                                        >
                                            Go to dashboard
                                        </Link>
                                    </li>
                                ) : (
                                    <>
                                        <li>
                                            <Link
                                                href={route('login')}
                                                className="inline-block rounded-lg border border-white/30 bg-white/25 px-4 py-1.5 text-xs leading-normal text-white backdrop-blur-sm hover:bg-white/35 lg:px-5 lg:text-sm"
                                            >
                                                Log in
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href={route('register')}
                                                className="inline-block rounded-lg border border-white/40 bg-transparent px-4 py-1.5 text-xs leading-normal text-white backdrop-blur-sm hover:bg-white/15 lg:px-5 lg:text-sm"
                                            >
                                                Register
                                            </Link>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>
                        {/* Logo panel — DOM second → visually top on mobile, right on desktop */}
                        <div
                            className={`-mb-px flex w-full shrink-0 items-center justify-center p-6 sm:p-8 lg:mb-0 lg:-ml-px lg:aspect-auto lg:min-h-[376px] lg:w-[438px] lg:p-8 ${glassPanel} rounded-tl-2xl rounded-tr-2xl rounded-bl-none rounded-br-none lg:rounded-tl-none lg:rounded-bl-none lg:rounded-tr-2xl lg:rounded-br-2xl`}
                        >
                            <img
                                src="/LNULOGO.png"
                                alt="Leyte Normal University"
                                className="max-h-24 w-full max-w-[100px] object-contain sm:max-h-36 sm:max-w-[150px] lg:max-h-80 lg:max-w-[360px]"
                            />
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
