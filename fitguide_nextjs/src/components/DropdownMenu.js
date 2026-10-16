'use client';

/**
 * Dropdown Menu Component
 * Professional dropdown navigation similar to ACE Fitness
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
export const DropdownMenu = ({ trigger, items, }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);
    const handleItemClick = (item) => {
        item.onClick();
        setIsOpen(false);
    };
    return (<div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (<div className="absolute top-full left-0 mt-2 min-w-[220px] bg-obsidian-wave border border-white-30/20 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden z-50 animate-fade-in">
          {items.map((item, index) => (<button key={index} onClick={() => handleItemClick(item)} className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-white-30/10 transition-colors group">
              <div className="flex items-center space-x-3">
                {item.icon && (<span className="text-white-50 group-hover:text-lime-light transition-colors">
                    {item.icon}
                  </span>)}
                <span className="text-sm font-medium text-white group-hover:text-lime-light transition-colors">
                  {item.label}
                </span>
              </div>
              {item.badge && (<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-light/20 text-lime-light">
                  {item.badge}
                </span>)}
            </button>))}
        </div>)}
    </div>);
};
export const DropdownTrigger = ({ label, icon: Icon, isActive, hasDropdown = true, }) => {
    return (<div className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all ${isActive
            ? 'bg-lime-light text-noir-eclipse shadow-[0_2px_10px_rgba(0, 196, 180,0.2)]'
            : 'text-white-50 hover:text-white hover:bg-white-30/10'}`}>
      {Icon}
      <span>{label}</span>
      {hasDropdown && (<ChevronDown className="w-3 h-3 ml-1"/>)}
    </div>);
};
