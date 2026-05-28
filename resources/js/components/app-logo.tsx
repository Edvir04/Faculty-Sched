import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <AppLogoIcon className="size-8" />
            <div className="ml-2 flex min-w-0 flex-1 flex-col items-start gap-0 text-left text-sm leading-none">
                <span className="truncate font-semibold">IT Faculty</span>
                <span className="truncate font-semibold">Comlab Scheduler</span>
            </div>
        </>
    );
}
