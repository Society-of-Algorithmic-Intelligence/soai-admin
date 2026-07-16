import { Fragment, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Users, Newspaper, CalendarDays, LogOut } from 'lucide-react'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '../../components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb'
import { Separator } from '../../components/ui/separator'
import { cn } from '../../lib/utils'

function NavItem({ to, icon: Icon, label, end = false }: { to: string; icon: any; label: string; end?: boolean }) {
  const location = useLocation();
  const active = end ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        className={cn(
          'border-l-2 transition-colors',
          active ? 'border-white/70' : 'border-transparent',
        )}
      >
        <NavLink to={to} end={end} className="flex items-center gap-2">
          <Icon className="size-4" />
          <span>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const token = localStorage.getItem('soai_admin_token');
      if (!token) navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  function handleLogout() {
    try { localStorage.removeItem('soai_admin_token'); } catch {}
    navigate('/login', { replace: true });
  }

  return (
    <SidebarProvider style={{ '--sidebar-width': '13rem' } as any}>
      <Sidebar collapsible="offcanvas">

        {/* Sidebar header — logo + label */}
        <SidebarHeader className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={import.meta.env.BASE_URL + 'SoAI_logo.svg'}
              alt="SoAI"
              className="h-7 w-auto brightness-0 invert"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold tracking-widest text-white/90 uppercase">Admin</span>
              <span className="text-[10px] text-white/50 tracking-wide">Portal</span>
            </div>
          </div>
        </SidebarHeader>

        {/* Nav items */}
        <SidebarContent className="pt-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem to="/members" icon={Users} label="Members" />
                <NavItem to="/news"    icon={Newspaper} label="News" />
                <NavItem to="/events"  icon={CalendarDays} label="Events" />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t border-white/10 px-4 py-3">
          <div className="mb-2 text-[10px] text-white/40 leading-snug">
            Society of Algorithmic Intelligence
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        {/* Top header bar */}
        <header className="sticky top-0 z-10 flex h-13 shrink-0 items-center gap-2 border-b bg-white px-4 shadow-sm">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 mx-1" />
          <Crumbs />
          <div className="ml-auto">
            <span className="text-[11px] font-semibold tracking-widest text-[#003d7b]/60 uppercase">SoAI Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function Crumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const titleFor = (seg: string) => {
    switch (seg) {
      case 'members': return 'Members';
      case 'news':    return 'News';
      case 'events':  return 'Events';
      default:        return seg.charAt(0).toUpperCase() + seg.slice(1);
    }
  };
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.length === 0 && (
          <BreadcrumbItem><BreadcrumbPage>Members</BreadcrumbPage></BreadcrumbItem>
        )}
        {segments.length === 1 && (
          <BreadcrumbItem><BreadcrumbPage>{titleFor(segments[0])}</BreadcrumbPage></BreadcrumbItem>
        )}
        {segments.length > 1 && (
          <>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/members">Members</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            {segments.slice(1).map((seg, idx) => {
              const isLast = idx === segments.slice(1).length - 1;
              const href = '/' + ['members', ...segments.slice(1).slice(0, idx + 1)].join('/');
              const label = titleFor(seg);
              return (
                <Fragment key={href}>
                  {!isLast ? (
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                    </BreadcrumbItem>
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbPage>{label}</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                  {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                </Fragment>
              );
            })}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
