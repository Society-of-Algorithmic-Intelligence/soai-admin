import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Newspaper, CalendarDays } from 'lucide-react'
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
  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
                <a href="#">
                  <LayoutDashboard className="!size-4" />
                  <span className="text-base font-semibold">SOAI Admin</span>
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
                <NavItem to="/" icon={LayoutDashboard} label="Home" end />
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
      default: return 'Home';
    }
  };
  const paths = segments.map((_, i) => '/' + segments.slice(0, i + 1).join('/'));
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.length === 0 ? (
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        ) : (
          <>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            {segments.map((seg, idx) => {
              const isLast = idx === segments.length - 1;
              const label = titleFor(seg);
              const href = paths[idx];
              return (
                <>
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
                </>
              );
            })}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}


