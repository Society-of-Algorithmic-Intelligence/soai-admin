import { Fragment, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Users, Newspaper, CalendarDays } from 'lucide-react'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
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

function NavItem({ to, icon: Icon, label, end = false }: { to: string; icon: any; label: string; end?: boolean }) {
  const location = useLocation();
  const active = end ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
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
  return (
    <SidebarProvider style={{ "--sidebar-width": "12rem" } as any}>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="h-14 p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-0 w-full h-full">
                <a href="#" className="flex w-full h-full items-center justify-center">
                  <img src={import.meta.env.BASE_URL + 'SoAI_logo.svg'} alt="SoAI" className="w-[60%] h-auto max-h-full object-contain" />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem to="/members" icon={Users} label="Members" />
                <NavItem to="/news" icon={Newspaper} label="News" />
                <NavItem to="/events" icon={CalendarDays} label="Events" />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="text-xs text-muted-foreground px-2">v1</div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-14 shrink-0 items-center border-b">
          <SidebarTrigger />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
          <Crumbs />
        </header>
        <div>
          <Outlet />
        </div>
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
      case 'news': return 'News';
      case 'events': return 'Events';
      default: return 'Members';
    }
  };
  const paths = segments.map((_, i) => '/' + segments.slice(0, i + 1).join('/'));
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.length === 0 && (
          <BreadcrumbItem>
            <BreadcrumbPage>Members</BreadcrumbPage>
          </BreadcrumbItem>
        )}
        {segments.length === 1 && (
          <BreadcrumbItem>
            <BreadcrumbPage>{titleFor(segments[0])}</BreadcrumbPage>
          </BreadcrumbItem>
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


