# Wallet Pass Studio — Testing & QA Strategy

> **Branch:** `PASS-DESIGNER`  
> **Status:** Specification — NO CODE YET  
> **Date:** 2026-06-03  
> **Scope:** Complete testing strategy for Wallet Pass Studio redesign  
> **Companion Document:** `COMPLETE-IMPLEMENTATION-GUIDE.md`

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Test Environments](#2-test-environments)
3. [Test Pyramid](#3-test-pyramid)
4. [Unit Testing](#4-unit-testing)
5. [Component Testing](#5-component-testing)
6. [Integration Testing](#6-integration-testing)
7. [End-to-End Testing](#7-end-to-end-testing)
8. [Visual Regression Testing](#8-visual-regression-testing)
9. [Accessibility Testing](#9-accessibility-testing)
10. [Performance Testing](#10-performance-testing)
11. [Cross-Platform Testing](#11-cross-platform-testing)
12. [Mobile Testing](#12-mobile-testing)
13. [Test Data & Fixtures](#13-test-data--fixtures)
14. [QA Checklist Per Phase](#14-qa-checklist-per-phase)
15. [CI/CD Integration](#15-cicd-integration)
16. [Bug Reporting Workflow](#16-bug-reporting-workflow)
17. [Test Ownership Matrix](#17-test-ownership-matrix)

---

## 1. Testing Philosophy

### The Golden Rule
> **Every feature MUST have tests before it is considered "done". No exceptions.**

### Testing Principles

| Principle | Implementation |
|-----------|---------------|
| **Test-Driven Where Possible** | Write tests before code for utilities, hooks, and state logic |
| **Behavior Over Implementation** | Test what the user sees/does, not internal structure |
| **Isolation** | Each test independent — no shared state between tests |
| ** determinism** | Same input → same output, every time |
| **Fast Feedback** | Unit tests < 1s, component tests < 5s, full suite < 5min |
| **Coverage Threshold** | 80% minimum for utilities/hooks, 70% for components |

### What We Test

| Category | What | Tools |
|----------|------|-------|
| **Logic** | Utilities, mappers, validators, formatters | Jest |
| **State** | Hooks, context, state machines | Jest + React Testing Library |
| **Rendering** | Components render correctly with props | React Testing Library |
| **Interaction** | User clicks, drags, types, submits | React Testing Library + user-event |
| **API** | Backend endpoints, serializers, permissions | Django TestCase + DRF test client |
| **Integration** | Frontend ↔ Backend data flow | Cypress/Playwright |
| **Journeys** | Complete user workflows | Playwright |
| **Visual** | Pixel-perfect rendering across platforms | Chromatic/Storybook |
| **Accessibility** | Screen readers, keyboard nav, color contrast | axe-core + Lighthouse |
| **Performance** | Load times, render times, memory | Lighthouse + custom timers |

---

## 2. Test Environments

### 2.1 Environment Matrix

| Environment | URL | Data | Purpose | Who |
|-------------|-----|------|---------|-----|
| **Local Dev** | `localhost:3000` | Fake/test data | Developer daily work | Engineers |
| **Local Backend** | `localhost:8000` | SQLite/dev DB | API development | Engineers |
| **Test (CI)** | Ephemeral Docker | Fixtures | Automated test runs | CI Pipeline |
| **Staging** | `staging.loyallia.app` | Production-like | Pre-release validation | QA + PM |
| **Production** | `loyallia.app` | Real data | Live monitoring | Everyone |

### 2.2 Test Database Fixtures

```python
# backend/apps/wallet/tests/fixtures.py

@pytest.fixture
def test_tenant():
    """Standard tenant with Pro plan."""
    return TenantFactory.create(plan__name="Professional")

@pytest.fixture
def test_user(test_tenant):
    """Standard user in test tenant."""
    return UserFactory.create(tenant=test_tenant)

@pytest.fixture
def test_program(test_tenant):
    """Stamp card program for testing."""
    return ProgramFactory.create(
        tenant=test_tenant,
        card_type="stamp",
        name="Café Central"
    )

@pytest.fixture
def stamp_card_design():
    """Complete v2 stamp card design state."""
    return {
        "cardType": "stamp",
        "industry": "cafe",
        "colors": {
            "background": "#3E2723",
            "foreground": "#FFFFFF",
            "label": "#D7CCC8"
        },
        "images": {
            "logo": {"url": "https://cdn.test/logo.png", "width": 160, "height": 160},
            "hero": {"url": "https://cdn.test/hero.jpg", "width": 1125, "height": 432}
        },
        "fields": [
            {
                "id": "stamp_count",
                "label": "SELLOS",
                "value": "3 / 10",
                "fieldGroup": "header",
                "order": 0,
                "showOnApple": True,
                "showOnGoogle": True,
                "isDynamic": True,
                "dynamicTemplate": "{stamp_count} / {stamps_required}",
                "appleOptions": {
                    "changeMessage": "⭐ ¡Nuevo sello en Café Central! Ahora tienes %@",
                    "textAlignment": "center"
                },
                "notifications": {
                    "appleChangeMessage": {"enabled": True, "message": "⭐ ¡Nuevo sello! Ahora tienes %@"},
                    "googleMessage": {"enabled": True, "header": "⭐ ¡Nuevo sello!", "body": "Has recibido un sello", "trigger": "onChange"}
                }
            }
        ],
        "cardTypeConfig": {
            "stampCount": 3,
            "stampsRequired": 10,
            "stampShape": "circle",
            "stampIcon": "coffee",
            "stampFilledIcon": "coffee_filled",
            "stampColor": "#D7CCC8",
            "stampGridLayout": "10_horizontal"
        },
        "barcode": {
            "format": "QR_CODE",
            "message": "LOYALLIA-CAFE-12345",
            "messageEncoding": "iso-8859-1"
        },
        "backContent": {
            "fields": [
                {"id": "terms", "label": "TÉRMINOS Y CONDICIONES", "value": "Válido por 12 meses.", "isLink": False, "order": 0},
                {"id": "contact", "label": "CONTACTO", "value": "hola@cafecentral.com", "isLink": True, "linkUrl": "mailto:hola@cafecentral.com", "linkType": "email", "order": 1},
                {"id": "rules", "label": "REGLAS DEL PROGRAMA", "value": "• 1 sello por compra >$5\n• Recompensa: café gratis", "isLink": False, "order": 2}
            ],
            "links": [
                {"id": "website", "type": "website", "url": "https://cafecentral.com", "label": "Sitio Web"},
                {"id": "phone", "type": "phone", "url": "tel:+1234567890", "label": "Llamar"}
            ]
        },
        "apple": {
            "passStyle": "storeCard",
            "description": "Tarjeta de sellos de Café Central",
            "organizationName": "Café Central"
        },
        "google": {
            "passType": "loyalty",
            "programName": "Café Central Rewards",
            "hexBackgroundColor": "#3E2723"
        },
        "ui": {
            "activeTab": "fields",
            "platformView": "both",
            "showBack": False,
            "zoom": 100,
            "isModified": False
        },
        "version": 2
    }
```

---

## 3. Test Pyramid

```
                    ▲
                   / \
                  / E2E \           ~10 tests  (slow, expensive)
                 /  Tests  \        Playwright
                /───────────\
               /  Integration \     ~30 tests  (medium speed)
              /     Tests      \    Django TestCase + DRF
             /─────────────────\
            /   Component Tests  \  ~50 tests  (fast)
           /   React Testing Lib   \ user-event
          /─────────────────────────\
         /      Unit Tests            \ ~80 tests (fastest)
        /   Jest — pure functions      \  < 1s each
       /─────────────────────────────────\
```

| Level | Count | Speed | Cost | Reliability |
|-------|:-----:|-------|------|-------------|
| Unit | ~80 | < 1s each | Low | ⭐⭐⭐⭐⭐ |
| Component | ~50 | < 5s each | Low | ⭐⭐⭐⭐⭐ |
| Integration | ~30 | < 10s each | Medium | ⭐⭐⭐⭐ |
| E2E | ~10 | < 60s each | High | ⭐⭐⭐ |
| Visual | ~20 | < 30s each | Medium | ⭐⭐⭐⭐ |

---

## 4. Unit Testing

### 4.1 Utility Tests (Frontend)

```typescript
// frontend/src/components/wallet/__tests__/colors.test.ts
import { hexToRgb, rgbToHex, getLuminance, blendColors } from '../utils/colors';

describe('Color Utilities', () => {
  describe('hexToRgb', () => {
    it('converts #FFFFFF to {r:255, g:255, b:255}', () => {
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    });
    
    it('converts #3E2723 to {r:62, g:39, b:35}', () => {
      expect(hexToRgb('#3E2723')).toEqual({ r: 62, g: 39, b: 35 });
    });
    
    it('converts short hex #FFF to {r:255, g:255, b:255}', () => {
      expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
    });
    
    it('throws on invalid hex', () => {
      expect(() => hexToRgb('invalid')).toThrow();
    });
  });
  
  describe('rgbToHex', () => {
    it('converts {r:255, g:255, b:255} to #FFFFFF', () => {
      expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#FFFFFF');
    });
  });
  
  describe('getLuminance', () => {
    it('returns ~1.0 for white', () => {
      expect(getLuminance('#FFFFFF')).toBeCloseTo(1.0, 2);
    });
    
    it('returns ~0.0 for black', () => {
      expect(getLuminance('#000000')).toBeCloseTo(0.0, 2);
    });
  });
  
  describe('blendColors', () => {
    it('blends two colors with alpha', () => {
      const result = blendColors('#FF0000', '#0000FF', 0.5);
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });
  });
});
```

### 4.2 Contrast Tests

```typescript
// frontend/src/components/wallet/__tests__/contrast.test.ts
import { getContrastRatio, meetsWCAG, getWCAGLevel } from '../utils/contrast';

describe('WCAG Contrast', () => {
  it('white on black = 21:1', () => {
    expect(getContrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });
  
  it('black on white = 21:1', () => {
    expect(getContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });
  
  it('#333 on #444 fails WCAG AA', () => {
    expect(meetsWCAG('#333333', '#444444', 'AA')).toBe(false);
  });
  
  it('#FFF on #3E2723 passes WCAG AA', () => {
    expect(meetsWCAG('#FFFFFF', '#3E2723', 'AA')).toBe(true);
  });
  
  it('returns correct WCAG level', () => {
    expect(getWCAGLevel('#FFFFFF', '#000000')).toBe('AAA');
    expect(getWCAGLevel('#FFFFFF', '#666666')).toBe('AA');
    expect(getWCAGLevel('#FFFFFF', '#999999')).toBe('FAIL');
  });
});
```

### 4.3 Field Mapper Tests

```typescript
// frontend/src/components/wallet/__tests__/field-mappers.test.ts
import { mapToAppleField, mapToGoogleField } from '../utils/field-mappers';

describe('Field Mappers', () => {
  const mockUnifiedField = {
    id: 'stamp_count',
    label: 'Sellos',
    value: '3 / 10',
    fieldGroup: 'header',
    order: 0,
    showOnApple: true,
    showOnGoogle: true,
    isDynamic: false,
    appleOptions: {
      changeMessage: '¡Nuevo sello! %@',
      textAlignment: 'center',
    },
    googleOptions: {},
    notifications: {},
    formatting: { isLink: false },
  };
  
  describe('mapToAppleField', () => {
    it('maps basic field correctly', () => {
      const apple = mapToAppleField(mockUnifiedField);
      expect(apple).toMatchObject({
        key: 'stamp_count',
        label: 'SELLOS',
        value: '3 / 10',
      });
    });
    
    it('uppercases label', () => {
      const apple = mapToAppleField(mockUnifiedField);
      expect(apple.label).toBe('SELLOS');
    });
    
    it('includes changeMessage when present', () => {
      const apple = mapToAppleField(mockUnifiedField);
      expect(apple.changeMessage).toBe('¡Nuevo sello! %@');
    });
    
    it('maps text alignment to PKTextAlignment', () => {
      const apple = mapToAppleField(mockUnifiedField);
      expect(apple.textAlignment).toBe('PKTextAlignmentCenter');
    });
    
    it('converts attributedValue for links', () => {
      const linkField = { ...mockUnifiedField, formatting: { isLink: true, linkUrl: 'https://test.com' } };
      const apple = mapToAppleField(linkField);
      expect(apple.attributedValue).toContain('<a href=');
    });
  });
  
  describe('mapToGoogleField', () => {
    it('maps to textModulesData', () => {
      const google = mapToGoogleField(mockUnifiedField);
      expect(google).toMatchObject({
        type: 'textModule',
        id: 'stamp_count',
        header: 'Sellos',
        body: '3 / 10',
      });
    });
    
    it('uses predefined path when configured', () => {
      const predefinedField = { 
        ...mockUnifiedField, 
        googleOptions: { isPredefined: true, predefinedPath: 'object.loyaltyPoints' } 
      };
      const google = mapToGoogleField(predefinedField);
      expect(google.type).toBe('predefined');
    });
  });
});
```

### 4.4 Field Validation Tests

```typescript
// frontend/src/components/wallet/__tests__/field-validation.test.ts
import { validateFieldCount, validateFieldKey, validateChangeMessage } from '../utils/field-validation';

describe('Field Validation', () => {
  describe('validateFieldCount', () => {
    it('allows up to 3 header fields', () => {
      const fields = [{ fieldGroup: 'header' }, { fieldGroup: 'header' }, { fieldGroup: 'header' }];
      expect(validateFieldCount(fields, 'header')).toBe(true);
    });
    
    it('rejects 4th header field', () => {
      const fields = [
        { fieldGroup: 'header' }, { fieldGroup: 'header' }, 
        { fieldGroup: 'header' }, { fieldGroup: 'header' }
      ];
      expect(validateFieldCount(fields, 'header')).toBe(false);
    });
    
    it('allows only 1 primary field', () => {
      const fields = [{ fieldGroup: 'primary' }];
      expect(validateFieldCount(fields, 'primary')).toBe(true);
    });
    
    it('rejects 2nd primary field', () => {
      const fields = [{ fieldGroup: 'primary' }, { fieldGroup: 'primary' }];
      expect(validateFieldCount(fields, 'primary')).toBe(false);
    });
    
    it('enforces combined secondary+auxiliary limit with square barcode', () => {
      const fields = [
        { fieldGroup: 'secondary' }, { fieldGroup: 'secondary' },
        { fieldGroup: 'auxiliary' }, { fieldGroup: 'auxiliary' },
        { fieldGroup: 'secondary' }  // 5th combined — over limit
      ];
      expect(validateFieldCount(fields, 'secondary', { barcodeFormat: 'QR_CODE' })).toBe(false);
    });
  });
  
  describe('validateFieldKey', () => {
    it('rejects duplicate keys', () => {
      const fields = [{ id: 'stamp_count' }, { id: 'stamp_count' }];
      expect(validateFieldKey(fields, 'stamp_count')).toBe(false);
    });
    
    it('allows unique keys', () => {
      const fields = [{ id: 'stamp_count' }];
      expect(validateFieldKey(fields, 'points')).toBe(true);
    });
  });
  
  describe('validateChangeMessage', () => {
    it('rejects messages over 120 chars', () => {
      const longMessage = 'a'.repeat(121);
      expect(validateChangeMessage(longMessage)).toBe(false);
    });
    
    it('requires %@ placeholder', () => {
      expect(validateChangeMessage('New value is')).toBe(false);
    });
    
    it('accepts valid changeMessage', () => {
      expect(validateChangeMessage('New stamp! Now you have %@')).toBe(true);
    });
  });
});
```

---

## 5. Component Testing

### 5.1 Hook Tests

```typescript
// frontend/src/components/wallet/__tests__/useUndoRedo.test.ts
import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '../hooks/useUndoRedo';

describe('useUndoRedo', () => {
  it('initializes with given state', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));
    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
  
  it('tracks state changes', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));
    
    act(() => {
      result.current.setState({ count: 1 });
    });
    
    expect(result.current.state.count).toBe(1);
    expect(result.current.canUndo).toBe(true);
  });
  
  it('undoes state change', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));
    
    act(() => result.current.setState({ count: 1 }));
    act(() => result.current.undo());
    
    expect(result.current.state.count).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });
  
  it('redoes undone state', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));
    
    act(() => result.current.setState({ count: 1 }));
    act(() => result.current.undo());
    act(() => result.current.redo());
    
    expect(result.current.state.count).toBe(1);
  });
  
  it('caps history at 50 actions', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));
    
    // Perform 60 actions
    for (let i = 0; i < 60; i++) {
      act(() => result.current.setState({ count: i + 1 }));
    }
    
    // Should only remember last 50
    // Undoing 50 times should get us to count: 10
    for (let i = 0; i < 50; i++) {
      act(() => result.current.undo());
    }
    
    expect(result.current.state.count).toBe(10);
  });
  
  it('clears redo history on new action after undo', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));
    
    act(() => result.current.setState({ count: 1 }));
    act(() => result.current.setState({ count: 2 }));
    act(() => result.current.undo());
    act(() => result.current.setState({ count: 99 }));
    
    expect(result.current.canRedo).toBe(false);
    expect(result.current.state.count).toBe(99);
  });
});
```

```typescript
// frontend/src/components/wallet/__tests__/useAutoSave.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '../hooks/useAutoSave';

jest.useFakeTimers();

describe('useAutoSave', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('saves to localStorage after debounce', async () => {
    const onSave = jest.fn();
    const { result } = renderHook(() => useAutoSave({ key: 'test-draft', onSave }));
    
    act(() => {
      result.current.markDirty({ test: 'data' });
    });
    
    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ test: 'data' });
    });
    
    expect(localStorage.getItem('test-draft')).toContain('data');
  });
  
  it('recovers saved draft on mount', () => {
    localStorage.setItem('test-draft', JSON.stringify({ recovered: true }));
    
    const { result } = renderHook(() => useAutoSave({ key: 'test-draft' }));
    
    expect(result.current.recoveredDraft).toEqual({ recovered: true });
  });
  
  it('does not save if not modified', () => {
    const onSave = jest.fn();
    renderHook(() => useAutoSave({ key: 'test-draft', onSave }));
    
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    
    expect(onSave).not.toHaveBeenCalled();
  });
});
```

### 5.2 Component Rendering Tests

```typescript
// frontend/src/components/wallet/__tests__/FieldCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldCard } from '../studio/FieldCard';

describe('FieldCard', () => {
  const mockField = {
    id: 'stamp_count',
    label: 'SELLOS',
    value: '3 / 10',
    fieldGroup: 'header',
    order: 0,
    showOnApple: true,
    showOnGoogle: true,
    isDynamic: true,
    dynamicTemplate: '{stamp_count} / {stamps_required}',
    notifications: {
      appleChangeMessage: { enabled: true, message: '¡Nuevo sello! %@' },
    },
  };
  
  it('renders field label and value', () => {
    render(<FieldCard field={mockField} onEdit={jest.fn()} onDelete={jest.fn()} />);
    
    expect(screen.getByText('SELLOS')).toBeInTheDocument();
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
  });
  
  it('shows notification bell when field has changeMessage', () => {
    render(<FieldCard field={mockField} onEdit={jest.fn()} onDelete={jest.fn()} />);
    
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });
  
  it('shows dynamic value indicator', () => {
    render(<FieldCard field={mockField} onEdit={jest.fn()} onDelete={jest.fn()} />);
    
    expect(screen.getByTestId('dynamic-indicator')).toBeInTheDocument();
  });
  
  it('calls onEdit when clicked', async () => {
    const onEdit = jest.fn();
    render(<FieldCard field={mockField} onEdit={onEdit} onDelete={jest.fn()} />);
    
    await userEvent.click(screen.getByTestId('field-card'));
    expect(onEdit).toHaveBeenCalledWith(mockField);
  });
  
  it('calls onDelete when delete button clicked', async () => {
    const onDelete = jest.fn();
    render(<FieldCard field={mockField} onEdit={jest.fn()} onDelete={onDelete} />);
    
    await userEvent.click(screen.getByTestId('delete-field'));
    expect(onDelete).toHaveBeenCalledWith(mockField.id);
  });
  
  it('shows platform toggles', () => {
    render(<FieldCard field={mockField} onEdit={jest.fn()} onDelete={jest.fn()} />);
    
    expect(screen.getByTestId('platform-apple')).toBeChecked();
    expect(screen.getByTestId('platform-google')).toBeChecked();
  });
});
```

```typescript
// frontend/src/components/wallet/__tests__/ColorsTab.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorsTab } from '../studio/ColorsTab';

describe('ColorsTab', () => {
  const mockColors = {
    background: '#3E2723',
    foreground: '#FFFFFF',
    label: '#D7CCC8',
  };
  
  it('renders color inputs', () => {
    render(<ColorsTab colors={mockColors} onChange={jest.fn()} />);
    
    expect(screen.getByLabelText('Color de fondo')).toHaveValue('#3E2723');
    expect(screen.getByLabelText('Color de texto')).toHaveValue('#FFFFFF');
  });
  
  it('shows contrast ratio', () => {
    render(<ColorsTab colors={mockColors} onChange={jest.fn()} />);
    
    expect(screen.getByText(/Ratio de contraste/)).toBeInTheDocument();
    expect(screen.getByTestId('wcag-badge')).toHaveTextContent('AA');
  });
  
  it('calls onChange when color updated', async () => {
    const onChange = jest.fn();
    render(<ColorsTab colors={mockColors} onChange={onChange} />);
    
    const input = screen.getByLabelText('Color de fondo');
    await userEvent.clear(input);
    await userEvent.type(input, '#000000');
    
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      background: '#000000',
    }));
  });
  
  it('shows warning when contrast fails WCAG', async () => {
    const badColors = { background: '#333333', foreground: '#444444', label: '#555555' };
    render(<ColorsTab colors={badColors} onChange={jest.fn()} />);
    
    expect(screen.getByTestId('contrast-warning')).toBeInTheDocument();
  });
});
```

### 5.3 Studio Canvas Tests

```typescript
// frontend/src/components/wallet/__tests__/StudioCanvas.test.tsx
import { render, screen } from '@testing-library/react';
import { StudioCanvas } from '../studio/StudioCanvas';

describe('StudioCanvas', () => {
  const mockState = {
    colors: { background: '#3E2723', foreground: '#FFFFFF', label: '#D7CCC8' },
    images: { logo: { url: 'test-logo.png' } },
    fields: [],
    ui: { platformView: 'both', showBack: false },
  };
  
  it('renders both iPhone and Pixel frames in "both" mode', () => {
    render(<StudioCanvas state={mockState} />);
    
    expect(screen.getByTestId('iphone-frame')).toBeInTheDocument();
    expect(screen.getByTestId('pixel-frame')).toBeInTheDocument();
  });
  
  it('renders only iPhone in "apple" mode', () => {
    render(<StudioCanvas state={{ ...mockState, ui: { ...mockState.ui, platformView: 'apple' } }} />);
    
    expect(screen.getByTestId('iphone-frame')).toBeInTheDocument();
    expect(screen.queryByTestId('pixel-frame')).not.toBeInTheDocument();
  });
  
  it('shows back preview when showBack is true', () => {
    render(<StudioCanvas state={{ ...mockState, ui: { ...mockState.ui, showBack: true } }} />);
    
    expect(screen.getByTestId('apple-back-preview')).toBeInTheDocument();
    expect(screen.getByTestId('google-back-preview')).toBeInTheDocument();
  });
});
```

---

## 6. Integration Testing

### 6.1 Backend API Tests

```python
# backend/apps/wallet/tests/test_templates.py
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

@pytest.mark.django_db
class TestTemplateCRUD:
    def test_create_template(self, test_user, stamp_card_design):
        client = APIClient()
        client.force_authenticate(user=test_user)
        
        response = client.post(
            reverse('template-list'),
            data={
                'name': 'Café Central — Tarjeta de Sellos',
                'description': 'Diseño cálido con tonos café',
                'card_type': 'stamp',
                'industry': 'cafe',
                'design_data': stamp_card_design,
                'include_back_content': True
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Café Central — Tarjeta de Sellos'
        assert response.data['type'] == 'user'
        assert 'id' in response.data
    
    def test_list_templates(self, test_user):
        client = APIClient()
        client.force_authenticate(user=test_user)
        
        response = client.get(reverse('template-list'))
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
    
    def test_delete_user_template(self, test_user):
        # Create a template first
        client = APIClient()
        client.force_authenticate(user=test_user)
        
        create_response = client.post(
            reverse('template-list'),
            data={'name': 'Test', 'card_type': 'stamp', 'design_data': {}},
            format='json'
        )
        template_id = create_response.data['id']
        
        # Delete it
        response = client.delete(reverse('template-detail', kwargs={'pk': template_id}))
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    def test_cannot_delete_system_template(self, test_user):
        # System templates have no user
        client = APIClient()
        client.force_authenticate(user=test_user)
        
        # Assuming fixture creates system template
        response = client.delete(reverse('template-detail', kwargs={'pk': 'system-template-uuid'}))
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_duplicate_template(self, test_user):
        client = APIClient()
        client.force_authenticate(user=test_user)
        
        create_response = client.post(
            reverse('template-list'),
            data={'name': 'Original', 'card_type': 'stamp', 'design_data': {}},
            format='json'
        )
        template_id = create_response.data['id']
        
        response = client.post(reverse('template-duplicate', kwargs={'pk': template_id}))
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Original (copia)'
```

### 6.2 Plan Enforcement Tests

```python
# backend/apps/wallet/tests/test_plan_limits.py
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

@pytest.mark.django_db
class TestPlanLimits:
    def test_free_plan_cannot_access_studio(self, free_plan_user):
        """Free plan users should get 403 when accessing studio."""
        client = APIClient()
        client.force_authenticate(user=free_plan_user)
        
        response = client.get('/api/v1/wallet/studio/')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'wallet_pass_studio' in response.data.get('message', '')
    
    def test_starter_plan_can_access_studio(self, starter_plan_user):
        """Starter plan users can access studio."""
        client = APIClient()
        client.force_authenticate(user=starter_plan_user)
        
        response = client.get('/api/v1/wallet/studio/')
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_starter_cannot_save_custom_templates(self, starter_plan_user):
        """Starter plan cannot save custom templates."""
        client = APIClient()
        client.force_authenticate(user=starter_plan_user)
        
        response = client.post(
            reverse('template-list'),
            data={'name': 'Test', 'card_type': 'stamp', 'design_data': {}},
            format='json'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_pro_can_save_templates_up_to_limit(self, pro_plan_user):
        """Pro plan can save up to 10 templates."""
        client = APIClient()
        client.force_authenticate(user=pro_plan_user)
        
        # Create 10 templates (limit)
        for i in range(10):
            client.post(
                reverse('template-list'),
                data={'name': f'Test {i}', 'card_type': 'stamp', 'design_data': {}},
                format='json'
            )
        
        # 11th should fail
        response = client.post(
            reverse('template-list'),
            data={'name': 'Test 11', 'card_type': 'stamp', 'design_data': {}},
            format='json'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'límite' in response.data.get('message', '').lower()
    
    def test_ai_rate_limit(self, pro_plan_user):
        """AI endpoint should rate limit after 10 requests/hour."""
        client = APIClient()
        client.force_authenticate(user=pro_plan_user)
        
        # Make 10 requests
        for _ in range(10):
            response = client.post('/api/v1/ai/generate-template/', {
                'business_description': 'Test',
                'card_type': 'stamp',
                'industry': 'cafe'
            }, format='json')
            # Some may fail due to mocking, but that's fine for rate limit test
        
        # 11th should be rate limited
        response = client.post('/api/v1/ai/generate-template/', {
            'business_description': 'Test',
            'card_type': 'stamp',
            'industry': 'cafe'
        }, format='json')
        
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    
    def test_trial_gets_all_features(self, trial_user):
        """Trial users should have access to all wallet features."""
        client = APIClient()
        client.force_authenticate(user=trial_user)
        
        # Should be able to access studio
        response = client.get('/api/v1/wallet/studio/')
        assert response.status_code == status.HTTP_200_OK
        
        # Should be able to save templates (trial limit: 5)
        response = client.post(
            reverse('template-list'),
            data={'name': 'Trial Template', 'card_type': 'stamp', 'design_data': {}},
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED
```

### 6.3 AI Service Tests

```python
# backend/apps/ai/tests/test_kimi_service.py
import pytest
from unittest.mock import patch, Mock
from apps.ai.services.kimi_service import KimiService, KimiAPIError

class TestKimiService:
    @patch('apps.ai.services.kimi_service.requests.Session')
    def test_generate_template_success(self, mock_session):
        service = KimiService()
        mock_response = Mock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": '{"design_name": "Café Test", "colors": {"background": "#3E2723"}}'}}],
            "usage": {"total_tokens": 500},
        }
        mock_response.raise_for_status = Mock()
        mock_session.return_value.post.return_value = mock_response
        
        result = service.generate_template(
            business_description="A coffee shop",
            card_type="stamp",
            industry="cafe"
        )
        
        assert result["success"] is True
        assert "variations" in result
        assert result["tokens_used"]["total_tokens"] == 500
    
    @patch('apps.ai.services.kimi_service.requests.Session')
    def test_extract_json_from_markdown(self, mock_session):
        service = KimiService()
        response = {
            "choices": [{"message": {"content": '```json\n{"key": "value"}\n```'}}]
        }
        result = service._extract_json(response)
        assert result == {"key": "value"}
    
    @patch('apps.ai.services.kimi_service.requests.Session')
    def test_api_timeout_raises_error(self, mock_session):
        service = KimiService()
        from requests.exceptions import Timeout
        mock_session.return_value.post.side_effect = Timeout("Connection timed out")
        
        with pytest.raises(KimiAPIError):
            service.generate_template("Test", "stamp", "cafe")
    
    def test_validate_design_enforces_field_limits(self):
        service = KimiService()
        invalid_design = {
            "fields": {
                "headerFields": [{}, {}, {}, {}]  # 4 header fields — over limit
            }
        }
        
        with pytest.raises(ValueError):
            service._validate_design(invalid_design, "stamp")
```

---

## 7. End-to-End Testing

### 7.1 E2E Test Suite

```typescript
// e2e/wallet-studio/create-stamp-card.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Create Stamp Card from Template', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@cafecentral.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('complete stamp card creation journey', async ({ page }) => {
    // Navigate to program creation
    await page.click('[data-testid="create-program-button"]');
    await page.waitForURL('/programs/new');
    
    // Step 1: Select card type
    await page.click('[data-testid="card-type-stamp"]');
    await page.click('[data-testid="next-step-button"]');
    
    // Step 2: Template gallery (Wallet Pass Studio entry point)
    await page.waitForSelector('[data-testid="template-gallery"]');
    
    // Search for cafe templates
    await page.fill('[data-testid="template-search"]', 'cafe');
    await expect(page.locator('[data-testid="template-card"]')).toHaveCount(3);
    
    // Select first template
    await page.click('[data-testid="template-card"]:first-child');
    await page.click('[data-testid="use-template-button"]');
    
    // Studio loads with template
    await page.waitForSelector('[data-testid="wallet-studio"]');
    await expect(page.locator('[data-testid="studio-canvas"]')).toBeVisible();
    
    // Verify both previews rendered
    await expect(page.locator('[data-testid="iphone-frame"]')).toBeVisible();
    await expect(page.locator('[data-testid="pixel-frame"]')).toBeVisible();
    
    // Edit colors
    await page.click('[data-testid="tab-colors"]');
    await page.fill('[data-testid="color-background"]', '#1a1a2e');
    await page.fill('[data-testid="color-foreground"]', '#FFFFFF');
    
    // Verify contrast updated
    await expect(page.locator('[data-testid="wcag-badge"]')).toHaveText('AAA');
    
    // Add a field
    await page.click('[data-testid="tab-fields"]');
    await page.click('[data-testid="add-field-button"]');
    await page.click('[data-testid="field-position-secondary"]');
    await page.fill('[data-testid="field-label"]', 'PUNTOS');
    await page.fill('[data-testid="field-value"]', '{loyalty_points} pts');
    await page.check('[data-testid="field-dynamic"]');
    await page.click('[data-testid="save-field-button"]');
    
    // Verify field appears
    await expect(page.locator('[data-testid="field-card"]:has-text("PUNTOS")')).toBeVisible();
    
    // Configure stamp icons
    await page.click('[data-testid="tab-card-type"]');
    await page.selectOption('[data-testid="stamp-shape"]', 'heart');
    await page.click('[data-testid="stamp-icon-picker"]');
    await page.click('[data-testid="icon-coffee"]');
    await page.click('[data-testid="apply-icon-button"]');
    
    // Verify stamp grid updated
    await expect(page.locator('[data-testid="stamp-grid"] .stamp-filled')).toHaveCount(3);
    await expect(page.locator('[data-testid="stamp-grid"] .stamp-empty')).toHaveCount(7);
    
    // Save as template
    await page.click('[data-testid="save-dropdown"]');
    await page.click('[data-testid="save-as-template"]');
    await page.fill('[data-testid="template-name"]', 'Mi Café Personalizado');
    await page.click('[data-testid="confirm-save-template"]');
    
    // Verify success
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Plantilla guardada');
    
    // Continue to finish program creation
    await page.click('[data-testid="finish-button"]');
    await page.waitForURL('/programs/*');
    
    // Verify program created
    await expect(page.locator('h1')).toContainText('Mi Café Personalizado');
  });
});
```

```typescript
// e2e/wallet-studio/create-vip-with-ai.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Create VIP Card with AI', () => {
  test('AI generates VIP template and user customizes it', async ({ page }) => {
    // Login and navigate
    await page.goto('/programs/new');
    await page.fill('[data-testid="email-input"]', 'test@gympro.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Select VIP card type
    await page.click('[data-testid="card-type-vip"]');
    await page.click('[data-testid="next-step-button"]');
    
    // Click AI button
    await page.waitForSelector('[data-testid="template-gallery"]');
    await page.click('[data-testid="ai-design-button"]');
    
    // AI modal opens
    await page.waitForSelector('[data-testid="ai-chat-modal"]');
    await page.fill('[data-testid="ai-description"]', 'A premium gym membership with gold and black theme');
    await page.selectOption('[data-testid="ai-industry"]', 'gym');
    await page.click('[data-testid="ai-generate-button"]');
    
    // Wait for AI generation (mocked in test)
    await page.waitForSelector('[data-testid="ai-variations"]');
    await expect(page.locator('[data-testid="ai-variation-card"]')).toHaveCount(3);
    
    // Select second variation
    await page.click('[data-testid="ai-variation-card"]:nth-child(2)');
    await page.click('[data-testid="use-ai-variation"]');
    
    // Studio loads with AI-generated design
    await page.waitForSelector('[data-testid="wallet-studio"]');
    
    // Verify AI colors applied
    const bgColor = await page.inputValue('[data-testid="color-background"]');
    expect(bgColor).toMatch(/^#[0-9A-F]{6}$/);
    
    // Design score should be reasonable (> 6.0)
    const score = await page.textContent('[data-testid="design-score"]');
    expect(parseFloat(score)).toBeGreaterThan(6.0);
    
    // Customize VIP tier
    await page.click('[data-testid="tab-card-type"]');
    await page.selectOption('[data-testid="vip-tier"]', 'diamond');
    await page.click('[data-testid="tier-icon-picker"]');
    await page.click('[data-testid="icon-crown"]');
    
    // Add benefits
    await page.fill('[data-testid="benefit-1"]', 'Acceso 24/7');
    await page.fill('[data-testid="benefit-2"]', 'Clases ilimitadas');
    await page.click('[data-testid="add-benefit-button"]');
    await page.fill('[data-testid="benefit-3"]', '1 sesión personal/mes');
    
    // Configure back content
    await page.click('[data-testid="tab-back"]');
    await page.fill('[data-testid="back-field-1-value"]', 'Membresía válida por 12 meses. Renovación automática.');
    
    // Flip to back preview
    await page.click('[data-testid="toggle-back"]');
    await expect(page.locator('[data-testid="apple-back-preview"]')).toBeVisible();
    
    // Finish
    await page.click('[data-testid="finish-button"]');
    await page.waitForURL('/programs/*');
  });
});
```

```typescript
// e2e/wallet-studio/plan-limits.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Plan Limit Enforcement', () => {
  test('free plan user sees upgrade prompt for studio', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'free@user.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Try to create program
    await page.click('[data-testid="create-program-button"]');
    await page.click('[data-testid="card-type-stamp"]');
    await page.click('[data-testid="next-step-button"]');
    
    // Should see upgrade prompt instead of studio
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toContainText('Wallet Pass Studio');
  });
  
  test('pro plan user hits template limit', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'pro@user.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Create 10 templates (Pro limit)
    for (let i = 0; i < 10; i++) {
      await createQuickTemplate(page, `Template ${i}`);
    }
    
    // Try to create 11th
    await page.goto('/wallet-studio/templates');
    await page.click('[data-testid="save-as-template"]');
    await page.fill('[data-testid="template-name"]', 'Template 11');
    await page.click('[data-testid="confirm-save-template"]');
    
    // Should see limit reached message
    await expect(page.locator('[data-testid="limit-reached"]')).toBeVisible();
    await expect(page.locator('[data-testid="limit-reached"]')).toContainText('10/10');
  });
});
```

### 7.2 E2E Test Data Setup

```typescript
// e2e/fixtures/auth.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  loggedInPage: async ({ page }, use) => {
    // Seed test user via API
    await page.request.post('/api/v1/test/seed-user/', {
      data: {
        email: 'test@example.com',
        password: 'testpassword',
        plan: 'professional',
        tenant: 'test-tenant'
      }
    });
    
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    await use(page);
  },
  
  freeUserPage: async ({ page }, use) => {
    await page.request.post('/api/v1/test/seed-user/', {
      data: { email: 'free@user.com', password: 'testpassword', plan: 'free' }
    });
    
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'free@user.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    await use(page);
  },
});
```

---

## 8. Visual Regression Testing

### 8.1 Chromatic / Storybook Setup

```typescript
// .storybook/main.ts
export default {
  stories: ['../src/components/wallet/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@chromatic-com/storybook'],
};
```

```typescript
// frontend/src/components/wallet/studio/StudioCanvas.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { StudioCanvas } from './StudioCanvas';

const meta: Meta<typeof StudioCanvas> = {
  title: 'WalletStudio/StudioCanvas',
  component: StudioCanvas,
  parameters: {
    chromatic: { delay: 300 }, // Wait for images
  },
};

export default meta;

export const StampCardBothPlatforms: StoryObj = {
  args: {
    state: {
      cardType: 'stamp',
      colors: { background: '#3E2723', foreground: '#FFFFFF', label: '#D7CCC8' },
      fields: [
        { id: 'stamps', label: 'SELLOS', value: '3 / 10', fieldGroup: 'header', order: 0, showOnApple: true, showOnGoogle: true },
        { id: 'reward', label: 'RECOMPENSA', value: 'Café gratis', fieldGroup: 'secondary', order: 0, showOnApple: true, showOnGoogle: true },
      ],
      cardTypeConfig: { stampCount: 3, stampsRequired: 10, stampShape: 'circle', stampIcon: 'coffee', stampColor: '#D7CCC8' },
      barcode: { format: 'QR_CODE', message: 'TEST-123', messageEncoding: 'iso-8859-1' },
      ui: { platformView: 'both', showBack: false },
    },
  },
};

export const VIPCardAppleOnly: StoryObj = {
  args: {
    state: {
      cardType: 'vip_membership',
      colors: { background: '#0F172A', foreground: '#F8FAFC', label: '#94A3B8' },
      fields: [
        { id: 'member', label: 'MIEMBRO', value: 'Juan Pérez', fieldGroup: 'primary', order: 0, showOnApple: true, showOnGoogle: true },
        { id: 'tier', label: 'NIVEL', value: 'DIAMANTE', fieldGroup: 'header', order: 0, showOnApple: true, showOnGoogle: true },
      ],
      cardTypeConfig: { tierName: 'Diamante', memberSince: '2022-03-01' },
      barcode: { format: 'QR_CODE', message: 'VIP-123', messageEncoding: 'iso-8859-1' },
      ui: { platformView: 'apple', showBack: false },
    },
  },
};

export const CouponCardBackView: StoryObj = {
  args: {
    state: {
      cardType: 'coupon',
      colors: { background: '#DC2626', foreground: '#FFFFFF', label: '#FECACA' },
      fields: [
        { id: 'discount', label: 'DESCUENTO', value: '30%', fieldGroup: 'primary', order: 0, showOnApple: true, showOnGoogle: true },
      ],
      backContent: {
        fields: [
          { id: 'terms', label: 'TÉRMINOS', value: 'Válido hasta 31/12/2025', isLink: false, order: 0 },
          { id: 'rules', label: 'REGLAS', value: 'Un solo uso por cliente', isLink: false, order: 1 },
        ],
        links: [
          { id: 'web', type: 'website', url: 'https://test.com', label: 'Sitio Web' },
        ],
      },
      ui: { platformView: 'both', showBack: true },
    },
  },
};
```

### 8.2 Visual Test Scenarios

| Component | States to Capture | Viewports |
|-----------|------------------|-----------|
| StudioCanvas | Both platforms, Apple only, Google only, Back view | 1440x900, 390x844 |
| FieldStudio | Empty, with fields, limit reached, drag state | 1440x900 |
| TemplateGallery | System tab, My Templates tab, AI tab, empty state | 1440x900, 390x844 |
| ColorsTab | Good contrast, failing contrast, with presets | 1440x900 |
| DesignScore | Score 3.0, Score 7.0, Score 9.5, with suggestions | 1440x900 |
| All 10 Card Type Tabs | Default state, customized state | 1440x900 |

---

## 9. Accessibility Testing

### 9.1 axe-core Integration

```typescript
// frontend/src/components/wallet/__tests__/accessibility.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { WalletStudio } from '../WalletStudio';
import { StudioToolbar } from '../studio/StudioToolbar';
import { FieldStudio } from '../studio/FieldStudio';
import { TemplateGallery } from '../studio/TemplateGallery';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('WalletStudio has no accessibility violations', async () => {
    const { container } = render(<WalletStudio initialState={mockState} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('StudioToolbar has proper ARIA labels', () => {
    render(<StudioToolbar onUndo={jest.fn()} onRedo={jest.fn()} canUndo={true} canRedo={false} />);
    
    expect(screen.getByLabelText('Deshacer')).toBeInTheDocument();
    expect(screen.getByLabelText('Rehacer')).toBeInTheDocument();
    expect(screen.getByLabelText('Guardar diseño')).toBeInTheDocument();
  });
  
  it('FieldStudio supports keyboard navigation', async () => {
    render(<FieldStudio fields={mockFields} onEdit={jest.fn()} onDelete={jest.fn()} />);
    
    const firstField = screen.getAllByTestId('field-card')[0];
    firstField.focus();
    
    // Tab to next field
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getAllByTestId('field-card')[1]);
    
    // Enter opens edit
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  
  it('TemplateGallery has proper heading hierarchy', () => {
    render(<TemplateGallery />);
    
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Elige un diseño');
    
    // All template cards should have h2 or h3
    const cards = screen.getAllByTestId('template-card');
    cards.forEach(card => {
      const heading = card.querySelector('h2, h3');
      expect(heading).toBeInTheDocument();
    });
  });
  
  it('Color contrast meets WCAG AA', async () => {
    const { container } = render(<WalletStudio initialState={mockState} />);
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });
});
```

### 9.2 Accessibility Checklist

| Checkpoint | Tool | Frequency | Owner |
|------------|------|-----------|-------|
| Color contrast ≥ 4.5:1 | axe-core + Lighthouse | Every PR | Engineer |
| Keyboard navigation | Manual + automated | Every PR | Engineer |
| Screen reader labels | VoiceOver/NVDA | Weekly | QA |
| Focus indicators visible | Manual | Weekly | QA |
| Heading hierarchy | axe-core | Every PR | Engineer |
| ARIA roles correct | axe-core | Every PR | Engineer |
| Touch targets ≥ 44x44px | Manual on mobile | Weekly | QA |
| Reduced motion support | Manual | Weekly | QA |

---

## 10. Performance Testing

### 10.1 Performance Budgets

| Metric | Budget | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Studio initial render | < 2s | Custom timer |
| Canvas re-render | < 16ms | React Profiler |
| Undo/redo operation | < 50ms | Custom timer |
| Auto-save | < 100ms | Custom timer |
| Image upload | < 5s | Network timing |
| AI generation | < 10s | Network timing |
| Mobile bundle size | < 500KB | webpack-bundle-analyzer |
| Desktop bundle size | < 800KB | webpack-bundle-analyzer |

### 10.2 Performance Tests

```typescript
// frontend/src/components/wallet/__tests__/performance.test.ts
import { render, screen } from '@testing-library/react';
import { WalletStudio } from '../WalletStudio';
import { Profiler } from 'react';

describe('Performance', () => {
  it('renders studio in under 2 seconds', async () => {
    const start = performance.now();
    
    render(<WalletStudio initialState={mockState} />);
    
    const end = performance.now();
    expect(end - start).toBeLessThan(2000);
  });
  
  it('canvas re-renders in under 16ms', () => {
    let renderTime = 0;
    
    const onRender = (id: string, phase: string, actualDuration: number) => {
      renderTime = actualDuration;
    };
    
    const { rerender } = render(
      <Profiler id="StudioCanvas" onRender={onRender}>
        <WalletStudio initialState={mockState} />
      </Profiler>
    );
    
    // Trigger re-render by changing state
    const newState = { ...mockState, colors: { ...mockState.colors, background: '#000000' } };
    rerender(
      <Profiler id="StudioCanvas" onRender={onRender}>
        <WalletStudio initialState={newState} />
      </Profiler>
    );
    
    expect(renderTime).toBeLessThan(16);
  });
  
  it('undo operation completes in under 50ms', () => {
    const { result } = renderHook(() => useUndoRedo(mockState));
    
    const start = performance.now();
    act(() => result.current.setState(newState));
    act(() => result.current.undo());
    const end = performance.now();
    
    expect(end - start).toBeLessThan(50);
  });
});
```

### 10.3 Memory Leak Tests

```typescript
// frontend/src/components/wallet/__tests__/memory.test.ts
describe('Memory Management', () => {
  it('does not leak memory with undo/redo', () => {
    const { result, unmount } = renderHook(() => useUndoRedo({ count: 0 }));
    
    const initialMemory = (performance as any).memory?.usedJSHeapSize;
    
    // Perform 100 operations
    for (let i = 0; i < 100; i++) {
      act(() => result.current.setState({ count: i }));
    }
    
    // Undo all
    for (let i = 0; i < 100; i++) {
      act(() => result.current.undo());
    }
    
    unmount();
    
    // Force garbage collection if available
    if ((global as any).gc) {
      (global as any).gc();
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize;
    
    if (initialMemory && finalMemory) {
      const growth = finalMemory - initialMemory;
      expect(growth).toBeLessThan(1024 * 1024); // Less than 1MB growth
    }
  });
});
```

---

## 11. Cross-Platform Testing

### 11.1 Browser Matrix

| Browser | Version | Desktop | Mobile | Priority |
|---------|---------|---------|--------|----------|
| Chrome | Latest | ✅ | ✅ | Critical |
| Safari | Latest | ✅ | ✅ | Critical |
| Firefox | Latest | ✅ | ❌ | High |
| Edge | Latest | ✅ | ❌ | Medium |
| Safari iOS | 16+ | ❌ | ✅ | Critical |
| Chrome Android | Latest | ❌ | ✅ | Critical |

### 11.2 Cross-Browser Test Scenarios

| Scenario | Chrome | Safari | Firefox | Edge |
|----------|--------|--------|---------|------|
| Image drag-drop upload | ✅ | ✅ | ✅ | ⚪ |
| Color picker input type="color" | ✅ | ✅ | ✅ | ✅ |
| CSS 3D flip animation | ✅ | ✅ | ⚠️ prefix | ✅ |
| Clipboard API (copy template link) | ✅ | ✅ | ⚠️ permission | ✅ |
| File API (custom icon upload) | ✅ | ✅ | ✅ | ✅ |
| localStorage auto-save | ✅ | ✅ | ✅ | ✅ |
| Web Share API | ✅ | ⚠️ iOS only | ❌ | ✅ |

---

## 12. Mobile Testing

### 12.1 Device Matrix

| Device | OS | Screen | Priority |
|--------|-----|--------|----------|
| iPhone 15 Pro | iOS 17 | 393×852 | Critical |
| iPhone 13 | iOS 16 | 390×844 | Critical |
| iPhone SE | iOS 17 | 375×667 | High |
| Pixel 8 Pro | Android 14 | 448×998 | Critical |
| Samsung S24 | Android 14 | 384×824 | High |
| iPad Pro | iPadOS 17 | 1024×1366 | Medium |

### 12.2 Mobile-Specific Tests

```typescript
// e2e/mobile/bottom-sheet.spec.ts
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 15 Pro'] });

test.describe('Mobile Bottom Sheet', () => {
  test('sidebar opens as bottom sheet', async ({ page }) => {
    await page.goto('/wallet-studio');
    await login(page);
    
    // Sidebar hidden initially
    await expect(page.locator('[data-testid="mobile-sidebar"]')).not.toBeVisible();
    
    // Open sidebar
    await page.click('[data-testid="open-sidebar-button"]');
    await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible();
    
    // Can switch tabs
    await page.click('[data-testid="tab-colors"]');
    await expect(page.locator('[data-testid="colors-tab-content"]')).toBeVisible();
    
    // Close by swiping down
    await page.swipeDown('[data-testid="mobile-sidebar"]');
    await expect(page.locator('[data-testid="mobile-sidebar"]')).not.toBeVisible();
  });
  
  test('canvas swipe switches platform', async ({ page }) => {
    await page.goto('/wallet-studio');
    await login(page);
    
    // Swipe left to show Google only
    await page.swipeLeft('[data-testid="studio-canvas"]');
    await expect(page.locator('[data-testid="pixel-frame"]')).toBeVisible();
    await expect(page.locator('[data-testid="iphone-frame"]')).not.toBeVisible();
    
    // Swipe right to show Apple only
    await page.swipeRight('[data-testid="studio-canvas"]');
    await expect(page.locator('[data-testid="iphone-frame"]')).toBeVisible();
    await expect(page.locator('[data-testid="pixel-frame"]')).not.toBeVisible();
  });
  
  test('touch targets are large enough', async ({ page }) => {
    await page.goto('/wallet-studio');
    await login(page);
    
    const buttons = await page.locator('button, [role="button"]').all();
    
    for (const button of buttons) {
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
```

---

## 13. Test Data & Fixtures

### 13.1 Frontend Test Fixtures

```typescript
// frontend/src/components/wallet/__tests__/fixtures/design-states.ts
export const blankDesign: WalletPassStudioState = {
  cardType: 'stamp',
  industry: 'cafe',
  colors: { background: '#FFFFFF', foreground: '#000000', label: '#666666' },
  images: {},
  fields: [],
  cardTypeConfig: { stampCount: 0, stampsRequired: 10, stampShape: 'circle', stampIcon: 'star' },
  barcode: { format: 'QR_CODE', message: '', messageEncoding: 'iso-8859-1' },
  backContent: { fields: [], links: [] },
  apple: { passStyle: 'storeCard' },
  google: { passType: 'loyalty' },
  ui: { activeTab: 'images', platformView: 'both', showBack: false, zoom: 100, isModified: false },
  version: 2,
};

export const completeStampDesign: WalletPassStudioState = {
  ...blankDesign,
  colors: { background: '#3E2723', foreground: '#FFFFFF', label: '#D7CCC8' },
  images: {
    logo: { url: 'https://cdn.test/logo.png', width: 160, height: 160 },
    hero: { url: 'https://cdn.test/hero.jpg', width: 1125, height: 432 },
  },
  fields: [
    { id: 'stamps', label: 'SELLOS', value: '3 / 10', fieldGroup: 'header', order: 0, showOnApple: true, showOnGoogle: true, isDynamic: true, dynamicTemplate: '{stamp_count} / {stamps_required}', appleOptions: { changeMessage: '¡Nuevo sello! %@', textAlignment: 'center' }, notifications: { appleChangeMessage: { enabled: true, message: '¡Nuevo sello! %@' } } },
    { id: 'reward', label: 'RECOMPENSA', value: 'Café gratis', fieldGroup: 'secondary', order: 0, showOnApple: true, showOnGoogle: true, isDynamic: false },
    { id: 'customer', label: 'CLIENTE', value: '{customer_name}', fieldGroup: 'auxiliary', order: 0, showOnApple: true, showOnGoogle: true, isDynamic: true, dynamicTemplate: '{customer_name}' },
  ],
  cardTypeConfig: { stampCount: 3, stampsRequired: 10, stampShape: 'circle', stampIcon: 'coffee', stampFilledIcon: 'coffee_filled', stampColor: '#D7CCC8', stampGridLayout: '10_horizontal' },
  barcode: { format: 'QR_CODE', message: 'LOYALLIA-CAFE-12345', messageEncoding: 'iso-8859-1' },
  backContent: {
    fields: [
      { id: 'terms', label: 'TÉRMINOS Y CONDICIONES', value: 'Válido por 12 meses.', isLink: false, order: 0 },
      { id: 'contact', label: 'CONTACTO', value: 'hola@cafecentral.com', isLink: true, linkUrl: 'mailto:hola@cafecentral.com', linkType: 'email', order: 1 },
    ],
    links: [
      { id: 'website', type: 'website', url: 'https://cafecentral.com', label: 'Sitio Web' },
    ],
  },
};

export const v1LegacyDesign = {
  // Old format to test migration
  appleLogoUrl: 'https://cdn.test/logo.png',
  googleLogoUrl: 'https://cdn.test/logo.png',
  appleStripUrl: 'https://cdn.test/strip.jpg',
  googleHeroUrl: 'https://cdn.test/hero.jpg',
  headerFields: [{ key: 'stamps', label: 'SELLOS', value: '3 / 10' }],
  primaryFields: [],
  secondaryFields: [{ key: 'reward', label: 'RECOMPENSA', value: 'Café gratis' }],
  auxiliaryFields: [],
  backFields: [],
  barcodeFormat: 'QR_CODE',
  barcodeMessage: 'TEST-123',
  backgroundColor: '#3E2723',
  foregroundColor: '#FFFFFF',
  labelColor: '#D7CCC8',
};
```

### 13.2 Backend Test Fixtures

```python
# backend/apps/wallet/tests/fixtures.py
import pytest
from factory import Factory, Faker
from apps.wallet.models import WalletTemplate
from apps.billing.models import SubscriptionPlan

class SubscriptionPlanFactory(Factory):
    class Meta:
        model = SubscriptionPlan
    
    name = 'Professional'
    max_wallet_templates = 10
    max_wallet_pass_updates_month = 500
    max_ai_queries_month = 50
    features = ['wallet_pass_studio', 'wallet_custom_templates', 'ai_assistant', 'wallet_campaigns']

class WalletTemplateFactory(Factory):
    class Meta:
        model = WalletTemplate
    
    type = 'user'
    name = Faker('catch_phrase')
    card_type = 'stamp'
    industry = 'cafe'
    design_data = {}
    usage_count = 0
    is_favorite = False

@pytest.fixture
def professional_plan():
    return SubscriptionPlanFactory.create()

@pytest.fixture
def free_plan():
    return SubscriptionPlanFactory.create(
        name='Free',
        max_wallet_templates=0,
        max_wallet_pass_updates_month=0,
        max_ai_queries_month=0,
        features=[]
    )

@pytest.fixture
def trial_plan():
    return SubscriptionPlanFactory.create(
        name='Trial',
        max_wallet_templates=5,
        max_wallet_pass_updates_month=50,
        max_ai_queries_month=20,
        features=['wallet_pass_studio', 'wallet_custom_templates', 'wallet_advanced_fields', 'ai_assistant']
    )
```

---

## 14. QA Checklist Per Phase

### Phase 0 QA Checklist

- [ ] All utility functions have ≥ 80% test coverage
- [ ] All TypeScript types compile without errors
- [ ] Migration function handles all v1 test cases
- [ ] Icon library renders all 200+ icons correctly
- [ ] Color utilities handle edge cases (black, white, invalid hex)
- [ ] Contrast calculations match official WCAG algorithm
- [ ] Field mappers produce valid Apple/Google JSON structures

### Phase 1 QA Checklist

- [ ] Studio renders without console errors
- [ ] Undo/redo works for 50 consecutive actions
- [ ] Undo/redo memory usage stays under 1MB
- [ ] Auto-save recovers correctly after simulated crash
- [ ] Keyboard shortcuts work (Ctrl+Z, Ctrl+Y, Ctrl+S)
- [ ] Both device frames render at all zoom levels
- [ ] Studio responsive at 1440px, 1024px, 768px, 390px
- [ ] No layout shift during tab switching

### Phase 2 QA Checklist

- [ ] Drag-drop upload works on Chrome, Safari, Firefox
- [ ] Image validation rejects files > 5MB
- [ ] Image validation rejects non-image files
- [ ] Crop preview accurate for Apple (rect) vs Google (circle)
- [ ] @2x/@3x variants generated with correct dimensions
- [ ] Uploaded images appear in both previews within 2s
- [ ] Image removal clears preview immediately
- [ ] Failed uploads show error message

### Phase 3 QA Checklist

- [ ] All 5 field groups support add/edit/delete
- [ ] Header field limit (3) enforced with error message
- [ ] Primary field limit (1) enforced
- [ ] Combined secondary+auxiliary limit enforced with QR square
- [ ] Drag reorder updates field order correctly
- [ ] Dynamic templates resolve to example values in preview
- [ ] Apple changeMessage shows preview with %@ replaced
- [ ] Google message configuration saves correctly
- [ ] Field deletion requires confirmation
- [ ] Empty field groups show placeholder text

### Phase 4 QA Checklist

- [ ] All 5 barcode formats selectable and preview
- [ ] Barcode data builder generates valid data
- [ ] Platform warnings shown for incompatible formats
- [ ] Color picker updates both previews in real-time
- [ ] Contrast check updates on every color change
- [ ] WCAG badge shows correct level (AAA/AA/FAIL)
- [ ] Preset swatches apply all 3 colors simultaneously
- [ ] Invalid hex colors rejected

### Phase 5 QA Checklist

- [ ] All 10 card types have working configuration tabs
- [ ] Stamp grid renders correct number of filled/empty stamps
- [ ] Stamp icon changes reflected in preview
- [ ] VIP tier badge shows correct icon and color
- [ ] Cashback progress ring animates correctly
- [ ] Coupon cut line renders on Apple preview
- [ ] Gift certificate ribbon shows correctly
- [ ] Icon picker search filters correctly
- [ ] Custom icon upload works (PNG, SVG)

### Phase 6 QA Checklist

- [ ] Front/back flip animation smooth (60fps)
- [ ] Back content renders correctly on Apple preview
- [ ] Back content renders correctly on Google preview
- [ ] Design score calculates within 100ms
- [ ] Score updates on every relevant change
- [ ] All 14 checks have clear pass/fail messages
- [ ] Auto-fix works for contrast issues
- [ ] Default back content populated for all card types
- [ ] App link button appears when configured

### Phase 7 QA Checklist

- [ ] 20+ system templates load in < 2s
- [ ] Template search filters correctly
- [ ] Template preview shows both iPhone + Pixel
- [ ] "Use template" applies all settings correctly
- [ ] "Save as template" creates new user template
- [ ] Template rename updates immediately
- [ ] Template duplicate creates independent copy
- [ ] Template delete requires confirmation
- [ ] Usage count increments on apply
- [ ] Favorite toggle persists

### Phase 8 QA Checklist

- [ ] AI button generates 3 variations in < 10s
- [ ] AI-generated designs have valid structure
- [ ] AI rate limit blocks after 10 requests/hour
- [ ] AI quota display updates correctly
- [ ] Fallback designer works when Kimi unavailable
- [ ] AI error shows user-friendly message
- [ ] Color suggestions based on industry
- [ ] Design critique identifies real issues
- [ ] AI cost tracked correctly

### Phase 9 QA Checklist

- [ ] Mobile bottom sheet opens/closes smoothly
- [ ] All touch targets ≥ 44x44px
- [ ] Swipe gestures work on canvas
- [ ] Keyboard shortcuts documented and working
- [ ] Session recovery works after browser crash
- [ ] Canvas renders in < 16ms on mid-range device
- [ ] No memory leaks after 100 operations
- [ ] Lighthouse score ≥ 90 on mobile
- [ ] Screen reader announces all interactive elements

### Phase 10 QA Checklist

- [ ] Old designer fully removed from wizard
- [ ] Existing v1 designs load in v2 studio
- [ ] All E2E tests pass
- [ ] Cross-browser tests pass (Chrome, Safari, Firefox)
- [ ] Mobile tests pass (iPhone, Android)
- [ ] Accessibility audit passes
- [ ] Performance budget met
- [ ] Staging deployment successful
- [ ] No console errors in staging

### Phase 11 QA Checklist

- [ ] Free plan blocked from studio (403)
- [ ] Starter plan can access but not save templates
- [ ] Pro plan can save up to 10 templates
- [ ] Enterprise plan unlimited templates
- [ ] Trial gets all features with trial limits
- [ ] Rate limits enforced (429)
- [ ] Plan features endpoint returns correct values
- [ ] Upgrade prompts shown correctly
- [ ] Database migrations run successfully
- [ ] No data loss during migration

---

## 15. CI/CD Integration

### 15.1 GitHub Actions Workflow

```yaml
# .github/workflows/wallet-studio-tests.yml
name: Wallet Pass Studio Tests

on:
  push:
    branches: [PASS-DESIGNER, main]
    paths:
      - 'frontend/src/components/wallet/**'
      - 'backend/apps/wallet/**'
      - 'backend/apps/ai/**'
      - 'backend/common/plan_enforcement.py'
      - 'backend/common/rate_limit.py'
  pull_request:
    branches: [PASS-DESIGNER, main]
    paths:
      - 'frontend/src/components/wallet/**'
      - 'backend/apps/wallet/**'
      - 'backend/apps/ai/**'

jobs:
  frontend-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:wallet-studio:unit --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/lcov.info
          flags: wallet-studio-unit

  frontend-component:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:wallet-studio:component --coverage

  frontend-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm exec playwright install
      - run: pnpm test:wallet-studio:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/

  backend-unit:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest apps/wallet/tests/ apps/ai/tests/ -v --cov --cov-report=xml
      - uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml
          flags: wallet-studio-backend

  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm chromatic --project-token=${{ secrets.CHROMATIC_TOKEN }}

  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build-storybook
      - run: pnpm axe-storybook

  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - run: pnpm lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### 15.2 Pre-Commit Hooks

```yaml
# .pre-commit-config.yaml (additions)
- repo: local
  hooks:
    - id: wallet-studio-lint
      name: Wallet Studio Lint
      entry: pnpm eslint frontend/src/components/wallet/
      language: system
      files: ^frontend/src/components/wallet/
    
    - id: wallet-studio-types
      name: Wallet Studio Type Check
      entry: pnpm tsc --noEmit --project frontend/tsconfig.json
      language: system
      files: ^frontend/src/components/wallet/.*\.tsx?$
    
    - id: wallet-studio-tests
      name: Wallet Studio Unit Tests
      entry: pnpm jest --testPathPattern=wallet --passWithNoTests
      language: system
      files: ^frontend/src/components/wallet/
      pass_filenames: false
```

---

## 16. Bug Reporting Workflow

### 16.1 Bug Severity Levels

| Level | Definition | Examples | SLA |
|-------|-----------|----------|-----|
| **P0 — Critical** | Studio unusable, data loss, security | Crash on open, can't save, unauthorized access | 4 hours |
| **P1 — High** | Major feature broken, workaround difficult | AI generation fails, template save fails, images not uploading | 24 hours |
| **P2 — Medium** | Feature partially broken, workaround exists | Contrast check inaccurate, field drag glitchy | 3 days |
| **P3 — Low** | Cosmetic, minor inconvenience | Button misaligned, tooltip typo, color slightly off | 1 week |
| **P4 — Trivial** | Visual polish, nice-to-have | Animation could be smoother, padding could be better | Next sprint |

### 16.2 Bug Report Template

```markdown
## Bug Report: [Short Description]

### Environment
- Branch: PASS-DESIGNER
- Browser: [Chrome/Safari/Firefox] Version: [x]
- OS: [macOS/Windows/iOS/Android] Version: [x]
- Screen: [desktop/mobile/tablet]
- Plan: [Free/Starter/Pro/Enterprise/Trial]

### Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll to '...'
4. See error

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshots / Videos
[Attach media]

### Console Errors
```
[Paste console errors]
```

### Network Requests (if relevant)
```
[Paste HAR or request/response]
```

### Severity
[P0/P1/P2/P3/P4]
```

### 16.3 Regression Testing Protocol

When a bug is fixed:
1. Write a test that reproduces the bug
2. Fix the bug
3. Verify test passes
4. Run full suite to ensure no regressions
5. QA verifies fix in staging
6. Close bug ticket

---

## 17. Test Ownership Matrix

| Component/Feature | Unit Tests | Component Tests | Integration Tests | E2E Tests | Visual Tests | Owner |
|-------------------|:----------:|:---------------:|:-----------------:|:---------:|:------------:|-------|
| Color utilities | ✅ | — | — | — | — | Engineer |
| Contrast utilities | ✅ | — | — | — | — | Engineer |
| Field mappers | ✅ | — | — | — | — | Engineer |
| Field validation | ✅ | — | — | — | — | Engineer |
| useUndoRedo | ✅ | — | — | — | — | Engineer |
| useAutoSave | ✅ | — | — | — | — | Engineer |
| useDesignScore | ✅ | — | — | — | — | Engineer |
| useWalletStudio | ✅ | — | — | — | — | Engineer |
| WalletStudio | — | ✅ | — | ✅ | ✅ | Engineer + QA |
| StudioToolbar | — | ✅ | — | — | — | Engineer |
| StudioCanvas | — | ✅ | — | ✅ | ✅ | Engineer + QA |
| ImagesTab | — | ✅ | — | ✅ | — | Engineer |
| FieldStudio | — | ✅ | — | ✅ | — | Engineer + QA |
| FieldCard | — | ✅ | — | — | — | Engineer |
| BarcodeTab | — | ✅ | — | — | — | Engineer |
| ColorsTab | — | ✅ | — | — | ✅ | Engineer |
| BackDesignTab | — | ✅ | — | ✅ | — | Engineer |
| DesignScore | — | ✅ | — | — | — | Engineer |
| TemplateGallery | — | ✅ | — | ✅ | ✅ | Engineer + QA |
| MyTemplatesTab | — | ✅ | — | ✅ | — | Engineer |
| AI Button/Modal | — | ✅ | — | ✅ | — | Engineer + QA |
| All Card Type Tabs | — | ✅ | — | — | ✅ | Engineer |
| Backend API | — | — | ✅ | — | — | Engineer |
| Plan Enforcement | — | — | ✅ | ✅ | — | Engineer |
| AI Service | ✅ | — | ✅ | — | — | Engineer |
| Migration v1→v2 | ✅ | — | — | ✅ | — | Engineer |
| Accessibility | — | ✅ | — | ✅ | — | QA |
| Mobile Responsive | — | — | — | ✅ | — | QA |
| Cross-browser | — | — | — | ✅ | — | QA |
| Performance | ✅ | — | — | ✅ | — | Engineer + QA |

---

*End of Testing & QA Strategy*
*This document ensures the Wallet Pass Studio is thoroughly tested at every layer.*
*NO CODE will be written until user explicitly approves and says "PROCEED".*
