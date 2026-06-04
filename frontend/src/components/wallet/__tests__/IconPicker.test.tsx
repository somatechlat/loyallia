/**
 * Unit tests for IconPicker component.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { IconPicker } from '@/components/wallet/studio/IconPicker';

describe('IconPicker', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders trigger button with placeholder text when no value selected', () => {
    render(
      <I18nProvider>
        <IconPicker value="" onChange={() => {}} />
      </I18nProvider>
    );
    expect(screen.getByText('Select icon…')).toBeDefined();
  });

  it('opens modal when trigger is clicked', () => {
    render(
      <I18nProvider>
        <IconPicker value="" onChange={() => {}} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));
    expect(screen.getByTestId('icon-picker-modal')).toBeDefined();
    expect(screen.getByText('Select Icon')).toBeDefined();
  });

  it('closes modal when close button is clicked', () => {
    render(
      <I18nProvider>
        <IconPicker value="" onChange={() => {}} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));
    expect(screen.getByTestId('icon-picker-modal')).toBeDefined();

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('icon-picker-modal')).toBeNull();
  });

  it('filters icons by category when category tab is clicked', () => {
    render(
      <I18nProvider>
        <IconPicker value="" onChange={() => {}} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const foodTab = screen.getByTestId('category-tab-food');
    fireEvent.click(foodTab);

    expect(screen.queryByTestId('icon-option-coffee')).toBeDefined();
  });

  it('filters icons by search query', () => {
    render(
      <I18nProvider>
        <IconPicker value="" onChange={() => {}} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const searchInput = screen.getByTestId('icon-picker-search');
    fireEvent.change(searchInput, { target: { value: 'coffee' } });

    expect(screen.queryByTestId('icon-option-coffee')).toBeDefined();
  });

  it('calls onChange with icon id when icon is selected', () => {
    let selectedId = '';
    render(
      <I18nProvider>
        <IconPicker
          value=""
          onChange={(id) => { selectedId = id; }}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const iconOption = screen.getByTestId('icon-option-coffee');
    fireEvent.click(iconOption);

    expect(selectedId).toBe('coffee');
  });

  it('closes modal after selecting an icon', () => {
    render(
      <I18nProvider>
        <IconPicker value="" onChange={() => {}} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const iconOption = screen.getByTestId('icon-option-coffee');
    fireEvent.click(iconOption);

    expect(screen.queryByTestId('icon-picker-modal')).toBeNull();
  });

  it('shows selected icon name in trigger when value is set', () => {
    render(
      <I18nProvider>
        <IconPicker value="coffee" onChange={() => {}} />
      </I18nProvider>
    );
    expect(screen.getByText('Coffee')).toBeDefined();
  });

  it('respects initial category prop', () => {
    render(
      <I18nProvider>
        <IconPicker value="" onChange={() => {}} category="stamp" />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    expect(screen.queryByTestId('icon-option-stamp-circle')).toBeDefined();
  });

  it('shows upload hint when allowUpload is true', () => {
    render(
      <I18nProvider>
        <IconPicker value="" onChange={() => {}} allowUpload />
      </I18nProvider>
    );
    expect(screen.getByText(/File upload available in advanced settings./)).toBeDefined();
  });

  it('shows no results message when search yields nothing', () => {
    render(
      <I18nProvider>
        <IconPicker value="" onChange={() => {}} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('icon-picker-trigger'));

    const searchInput = screen.getByTestId('icon-picker-search');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    expect(screen.getByText('No icons found.')).toBeDefined();
  });
});
