/**
 * Picker for dynamic value templates like {customer_name}.
 */

'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import type { CardType } from '@/components/wallet/types/unified-state';
import { DYNAMIC_TEMPLATES } from '@/components/wallet/types/dynamic-templates';

export interface DynamicTemplatePickerProps {
  value: string;
  onChange: (value: string) => void;
  cardType: CardType;
}

const CATEGORY_ORDER = ['Customer', 'Program', 'Card-specific'] as const;

type Category = (typeof CATEGORY_ORDER)[number];

function categorizeTemplate(templateId: string): Category {
  const customerIds = ['customer_name', 'phone_number', 'email_address'];
  const programIds = ['program_name', 'merchant_name', 'current_date'];
  if (customerIds.includes(templateId)) return 'Customer';
  if (programIds.includes(templateId)) return 'Program';
  return 'Card-specific';
}

export function DynamicTemplatePicker({ value, onChange, cardType }: DynamicTemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const filteredTemplates = useMemo(() => {
    const applicable = DYNAMIC_TEMPLATES.filter((t) =>
      t.applicableCardTypes.includes(cardType)
    );
    if (!search.trim()) return applicable;
    const q = search.toLowerCase();
    return applicable.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
    );
  }, [cardType, search]);

  const grouped = useMemo(() => {
    const map = new Map<Category, typeof filteredTemplates>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, []);
    }
    for (const template of filteredTemplates) {
      const cat = categorizeTemplate(template.id);
      const arr = map.get(cat) ?? [];
      arr.push(template);
      map.set(cat, arr);
    }
    return map;
  }, [filteredTemplates]);

  const handleInsert = useCallback(
    (templateId: string) => {
      const input = inputRef.current;
      let newValue: string;
      if (input) {
        const start = input.selectionStart ?? value.length;
        const end = input.selectionEnd ?? value.length;
        const before = value.slice(0, start);
        const after = value.slice(end);
        newValue = `${before}{${templateId}}${after}`;
      } else {
        newValue = value + `{${templateId}}`;
      }
      onChange(newValue);
      setIsOpen(false);
      setSearch('');
    },
    [value, onChange]
  );

  const resolvedPreview = useMemo(() => {
    return value.replace(/\{([^}]+)\}/g, (_match, key: string) => {
      const template = DYNAMIC_TEMPLATES.find((t) => t.id === key);
      return template ? template.exampleValue : `{${key}}`;
    });
  }, [value]);

  const hasTemplates = useMemo(
    () => /\{[^}]+\}/.test(value),
    [value]
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter value or insert template..."
          aria-label="Field value"
        />
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex-shrink-0 px-3 py-2 text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Insert dynamic template"
        >
          {'{ }'}
        </button>
      </div>

      {hasTemplates && (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Preview: <span className="font-medium text-neutral-700 dark:text-neutral-300">{resolvedPreview}</span>
        </p>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            className="absolute z-20 mt-2 w-80 right-0 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg"
            role="dialog"
            aria-label="Dynamic template picker"
          >
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full px-3 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search templates..."
                aria-label="Search templates"
              />
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {filteredTemplates.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 px-2 py-3 text-center">
                  No templates found
                </p>
              ) : (
                Array.from(grouped.entries()).map(([category, templates]) =>
                  templates.length > 0 ? (
                    <div key={category} className="mb-3">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-2 mb-1">
                        {category}
                      </h4>
                      <div className="space-y-1">
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => handleInsert(template.id)}
                            className="w-full text-left px-2 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                {template.label}
                              </span>
                              <code className="text-[10px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1 rounded">
                                {'{' + template.id + '}'}
                              </code>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                              {template.description}
                            </p>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                              Example: {template.exampleValue}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
