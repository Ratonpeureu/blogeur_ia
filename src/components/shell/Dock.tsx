import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { navItems, ECOLE_BASE } from './navigation';



export function Dock({ alertes }: {alertes: Record<string, number>;}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';

  return (
    <nav
      aria-label="Navigation principale"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-3">
      
      <div className="pointer-events-auto flex items-end gap-1 border border-win-borderStrong/70 bg-white/85 px-2 py-1.5 shadow-dock backdrop-blur-md rounded-winLg">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active =
          item.to === ECOLE_BASE
            ? pathname === ECOLE_BASE                 // tableau de bord : correspondance exacte
            : pathname === item.to || pathname.startsWith(`${item.to}/`); // reste actif sur les sous-pages
          const isHovered = hovered === item.to;
          const badge = alertes[item.to];
          const separator = index === navItems.length - 1;
          return (
            <React.Fragment key={item.to}>
              {separator && <span className="mx-1 mb-1 h-8 w-px self-center bg-win-border" aria-hidden="true" />}
              <div className="relative flex flex-col items-center">
                {isHovered &&
                <span className="pointer-events-none absolute -top-8 whitespace-nowrap border border-win-borderStrong bg-win-chrome px-2 py-1 text-2xs font-medium text-white shadow-flyout rounded-win">
                    {item.label}
                  </span>
                }
                <NavLink
                  to={item.to}
                  end={item.to === ECOLE_BASE}
                  onMouseEnter={() => setHovered(item.to)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(item.to)}
                  onBlur={() => setHovered(null)}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex h-11 w-11 items-center justify-center border transition-transform duration-150 ease-out rounded-win hover:-translate-y-1 hover:scale-105 ${
                  active ?
                  'border-win-accent bg-win-accent text-white' :
                  'border-transparent text-win-chromeSoft hover:border-win-border hover:bg-win-panel'}`
                  }>
                  
                  <Icon size={19} strokeWidth={1.75} />
                  {badge ?
                  <span className="absolute -right-0.5 -top-0.5 min-w-[16px] border border-white bg-state-dangerFg px-1 text-center text-[10px] font-semibold leading-4 text-white rounded-win">
                      {badge > 99 ? '99+' : badge}
                    </span> :
                  null}
                </NavLink>
                <span
                  className={`mt-0.5 h-1 w-1 rounded-full ${active ? 'bg-win-accent' : 'bg-transparent'}`}
                  aria-hidden="true" />
                
              </div>
            </React.Fragment>);

        })}
      </div>
    </nav>);

}