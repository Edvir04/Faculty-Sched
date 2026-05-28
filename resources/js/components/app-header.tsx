import { Breadcrumbs } from '@/components/breadcrumbs';
import { Icon } from '@/components/icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Calendar, ChevronDown, LayoutGrid, Menu, Monitor, Users } from 'lucide-react';
import AppLogo from './app-logo';
import AppLogoIcon from './app-logo-icon';

function pathMatches(pageUrl: string, itemUrl: string): boolean {
    const path = pageUrl.split('?')[0] ?? '';
    return path === itemUrl || path === `${itemUrl}/`;
}

const navHighlightBarClass =
    'pointer-events-none absolute bottom-0 left-0 h-0.5 w-full origin-left translate-y-px bg-yellow-500 transition-transform duration-300 ease-out will-change-transform dark:bg-yellow-400';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Schedules',
        url: '/schedules',
        icon: Calendar,
    },
    {
        title: 'Teachers',
        url: '/teachers',
        icon: Users,
    },
    {
        title: 'Sections & Comlabs',
        url: '/sections-comlabs',
        icon: Monitor,
    },
    {
        title: 'Subjects',
        url: '/subjects',
        icon: BookOpen,
    },
];

interface AppHeaderProps {
    breadcrumbs?: BreadcrumbItem[];
}

export function AppHeader({ breadcrumbs = [] }: AppHeaderProps) {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const getInitials = useInitials();
    return (
        <>
            <div className="border-sidebar-border/80 border-b">
                <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 md:gap-4">
                    {/* Mobile Menu */}
                    <div className="shrink-0 lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-[34px] w-[34px]">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="flex h-full w-64 flex-col items-stretch justify-between bg-sidebar">
                                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                                <SheetHeader className="flex justify-start text-left">
                                    <AppLogoIcon className="size-6" />
                                </SheetHeader>
                                <div className="mt-6 flex h-full flex-1 flex-col space-y-4 overflow-y-auto text-sm">
                                    <nav className="flex flex-col space-y-1">
                                        {mainNavItems.map((item) => {
                                            const active = pathMatches(page.url, item.url);
                                            return (
                                                <Link
                                                    key={item.title}
                                                    href={item.url}
                                                    className={cn(
                                                        'group/nav-link relative flex items-center gap-2 px-2 py-2 font-serif font-medium transition-colors',
                                                        !active && 'hover:bg-accent hover:text-accent-foreground',
                                                    )}
                                                >
                                                    {item.icon && <Icon iconNode={item.icon} className="h-5 w-5 shrink-0" />}
                                                    <span>{item.title}</span>
                                                    <span
                                                        aria-hidden
                                                        className={cn(
                                                            navHighlightBarClass,
                                                            active
                                                                ? 'scale-x-100'
                                                                : 'scale-x-0 group-hover/nav-link:scale-x-100',
                                                        )}
                                                    />
                                                </Link>
                                            );
                                        })}
                                    </nav>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <div className="flex min-w-0 shrink-0 items-center space-x-2">
                        <AppLogo />
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden min-w-0 flex-1 items-center lg:flex">
                        <NavigationMenu className="flex h-full max-w-none items-stretch">
                            <NavigationMenuList className="flex h-full flex-nowrap items-stretch gap-1 space-x-0 sm:gap-2">
                                {mainNavItems.map((item, index) => {
                                    const active = pathMatches(page.url, item.url);
                                    return (
                                        <NavigationMenuItem key={index} className="relative flex h-full shrink-0 items-center">
                                            <Link
                                                href={item.url}
                                                className={cn(
                                                    navigationMenuTriggerStyle(),
                                                    'group/nav-link relative h-9 cursor-pointer px-3',
                                                )}
                                            >
                                                {item.icon && <Icon iconNode={item.icon} className="mr-2 h-4 w-4" />}
                                                {item.title}
                                                <span
                                                    aria-hidden
                                                    className={cn(
                                                        navHighlightBarClass,
                                                        active
                                                            ? 'scale-x-100'
                                                            : 'scale-x-0 group-hover/nav-link:scale-x-100',
                                                    )}
                                                />
                                            </Link>
                                        </NavigationMenuItem>
                                    );
                                })}
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    <div className="ml-auto flex shrink-0 items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-10 max-w-[min(100vw-8rem,240px)] gap-2 rounded-md px-3 shadow-none hover:shadow-none focus:shadow-none focus-visible:shadow-none active:shadow-none focus-visible:ring-1 focus-visible:ring-neutral-300 focus-visible:ring-offset-0 dark:focus-visible:ring-neutral-600"
                                >
                                    <Avatar className="size-8 shrink-0 overflow-hidden rounded-full">
                                        <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                                        <AvatarFallback className="rounded-full bg-neutral-200 text-xs text-black dark:bg-neutral-700 dark:text-white">
                                            {getInitials(auth.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{auth.user.name}</span>
                                    <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56"
                                align="end"
                                onCloseAutoFocus={(e) => e.preventDefault()}
                            >
                                <UserMenuContent user={auth.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            {breadcrumbs.length > 1 && (
                <div className="border-sidebar-border/70 flex w-full border-b">
                    <div className="mx-auto flex h-12 w-full items-center justify-start px-4 text-neutral-500 md:max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
