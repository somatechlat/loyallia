# SRS-007: AI Integration Specification — Groq API

> **ISO/IEC/IEEE 29148:2018 — Software Requirements Specification**
> Document ID: SRS-LOY-WPS-007 | Version: 1.1.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Groq API Configuration & Security](#2-groq-api-configuration--security)
3. [Architecture](#3-architecture)
4. [AI Features in Wallet Pass Studio](#4-ai-features-in-wallet-pass-studio)
5. [Prompt Engineering](#5-prompt-engineering)
6. [Backend Integration (Django)](#6-backend-integration-django)
7. [Frontend Integration (Next.js)](#7-frontend-integration-nextjs)
8. [Error Handling & Fallbacks](#8-error-handling--fallbacks)
9. [Rate Limiting & Cost Management](#9-rate-limiting--cost-management)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Overview

The Loyallia Wallet Pass Studio integrates the **Groq API** (OpenAI-compatible) as the AI engine for design assistance, template generation, and intelligent suggestions. This document specifies the complete integration architecture.

### AI Capabilities

| Feature | Description | User Value |
|---------|-------------|------------|
| **Magic Template** | Generate complete pass designs from natural language | Zero design effort |
| **Smart Color** | Suggest color palettes based on brand/industry | Professional aesthetics |
| **Auto-Layout** | Recommend optimal field arrangement | Platform compliance |
| **Design Critique** | Analyze design and suggest improvements | Quality assurance |
| **Image Guidance** | Recommend image types, sizes, and crops | Technical correctness |
| **Stamp Icon Suggestions** | Suggest stamp icons based on business type | Brand consistency |

### API Provider

| Property | Value |
|----------|-------|
| **Provider** | Groq (OpenAI-compatible) |
| **Model** | openai/gpt-oss-120b (configurable via Vault) |
| **Base URL** | `https://api.groq.com/openai/v1` |
| **Authentication** | Bearer token (API key) |
| **Key Storage** | HashiCorp Vault (`ai_api_key`) |

---

## 2. Groq API Configuration & Security

### Vault Secret Path

```
secret/data/loyallia/production
├── ai_api_key            ← Groq API Key (gsk-...)
├── ai_agent_api_key      ← Same key (alias for compatibility)
└── ai_agent_base_url     ← https://api.groq.com/openai/v1
```

### Vault Injection Script

```python
# scripts/inject_kimi_ai_key.py
# Already executed and verified ✓

# The key was injected via:
# VAULT_ADDR=https://localhost:33908
# PATCH /v1/secret/data/loyallia/production
# Body: {"data": {"ai_api_key": "gsk-..."}}
```

### Backend Secret Retrieval

```python
# backend/common/vault.py
from common.vault import get_secret

AI_API_KEY = get_secret("ai_api_key", strict=True)
AI_BASE_URL = get_secret("ai_agent_base_url", default="https://api.groq.com/openai/v1")
```

### Security Rules

| Rule | Implementation |
|------|----------------|
| **Never commit key to git** | Key only in Vault, never in code |
| **Never expose key to frontend** | All AI calls go through backend proxy |
| **Key rotation support** | Vault secret rotation with cache invalidation |
| **Access logging** | All AI requests logged with user ID, timestamp, tokens used |
| **No key in logs** | Key redacted from all log output |

---

## 3. Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Next.js Frontend (Wallet Pass Studio)                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │ AI Button   │  │ AI Chat     │  │ AI Suggestions│                  │  │
│  │  │ (Toolbar)   │  │ (Modal)     │  │ (Inline)      │                  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                   │  │
│  │         │                │                │                          │  │
│  │         └────────────────┴────────────────┘                          │  │
│  │                          │                                           │  │
│  │                    POST /api/v1/ai/design                             │  │
│  │                    (No API key exposed)                               │  │
│  └──────────────────────────┼───────────────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DJANGO BACKEND                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  AI Service Layer (apps/ai/services.py)                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │ Rate Limiter│  │ Prompt Builder│  │ Response Parser│               │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                   │  │
│  │         │                │                │                          │  │
│  │         └────────────────┴────────────────┘                          │  │
│  │                          │                                           │  │
│  │                    POST https://api.groq.com/openai/v1/chat/completions   │  │
│  │                    Authorization: Bearer <kimi_api_key from Vault>    │  │
│  └──────────────────────────┼───────────────────────────────────────────┘  │
│                             │                                               │
│  ┌──────────────────────────┼───────────────────────────────────────────┐  │
│  │  Vault Client            │                                           │  │
│  │  GET /v1/secret/data/loyallia/production                             │  │
│  │  → Retrieves kimi_api_key                                            │  │
│  └──────────────────────────┴───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GROQ API (OpenAI-compatible)                        │
│                         https://api.groq.com/openai/v1                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Backend Proxy?

| Approach | Risk | Our Solution |
|----------|------|-------------|
| Frontend → Groq directly | API key exposed in browser | ❌ Rejected |
| Frontend → Groq via env var | Key bundled in JS bundle | ❌ Rejected |
| **Frontend → Django → Groq** | Key stays server-side only | ✅ **Selected** |

---

## 4. AI Features in Wallet Pass Studio

### Feature 1: Magic Template Generation

**Trigger:** User clicks "✨ Diseñar con IA" in template gallery

**Flow:**
```
User Input → Frontend → POST /api/v1/ai/generate-template
                ↓
         Backend: Build prompt with:
           - Card type (stamp, cashback, etc.)
           - Industry (café, gym, etc.)
           - User description
           - Platform constraints (Apple + Google)
                ↓
         Groq API: Generate JSON design spec
                ↓
         Backend: Validate JSON structure
                ↓
         Frontend: Render 3 design variations
```

**Prompt Structure:**
```
You are an expert wallet pass designer for Loyallia. 
Generate a complete pass design specification as JSON.

Context:
- Business: {business_description}
- Card type: {card_type} (e.g., stamp, cashback, coupon)
- Industry: {industry}
- Platforms: Apple Wallet + Google Wallet

Generate a design with:
1. Color palette (background, text, accent, labels)
2. Image recommendations (logo style, hero image description)
3. Field configuration (labels, values, layout)
4. Stamp/icon suggestions (if applicable)
5. Barcode configuration

Output format:
{
  "design_name": "...",
  "description": "...",
  "colors": {
    "background": "#RRGGBB",
    "foreground": "#RRGGBB",
    "accent": "#RRGGBB",
    "labels": "#RRGGBB"
  },
  "images": {
    "logo_style": "...",
    "hero_description": "..."
  },
  "fields": [...],
  "stamp_icon": "..." (if stamp card),
  "barcode": "QR_CODE"
}
```

### Feature 2: Smart Color Suggestions

**Trigger:** User clicks "✨ Sugerir colores" in Colors tab

**Flow:**
```
User has uploaded logo/hero image
                ↓
Frontend sends: uploaded images + card type + industry
                ↓
Backend extracts dominant colors (node-vibrant)
                ↓
Backend sends to Groq: "Suggest accessible color palette"
                ↓
Groq returns: 3 color palettes with WCAG contrast ratios
                ↓
Frontend displays: 3 palette swatches + contrast scores
```

### Feature 3: Design Critique

**Trigger:** Design Score < 7.0 or user clicks score badge

**Flow:**
```
Current design state sent to backend
                ↓
Backend builds critique prompt:
  - Current colors + contrast ratios
  - Field configuration
  - Image presence/absence
  - Platform compliance checks
                ↓
Groq analyzes and returns:
  - Issues found (e.g., "Low contrast: 2.1:1")
  - Suggested fixes (e.g., "Change text to #FFFFFF")
  - Estimated score improvement
                ↓
Frontend shows: Inline suggestions with "Apply" buttons
```

### Feature 4: Stamp Icon Suggestions

**Trigger:** User is configuring a stamp card

**Flow:**
```
User in Stamp Card configuration
                ↓
Backend sends: business type + industry + brand colors
                ↓
Groq returns: 8-12 icon recommendations with reasoning
  e.g., "Coffee cup ☕ for café (matches warm tones)"
                ↓
Frontend shows: Icon grid with "Why this icon?" tooltip
```

### Feature 5: Auto-Layout

**Trigger:** User adds/removes fields

**Flow:**
```
Field configuration changes
                ↓
Backend validates against platform limits:
  - Apple: max fields per type
  - Google: row structure feasibility
                ↓
If violation detected:
  Groq suggests optimal layout rearrangement
                ↓
Frontend shows: "💡 Sugerencia de IA" with preview
```

---

## 5. Prompt Engineering

### Prompt Categories

| Category | Purpose | Example |
|----------|---------|---------|
| **Generation** | Create new designs | "Generate a gym membership pass..." |
| **Suggestion** | Recommend improvements | "Suggest better colors for..." |
| **Validation** | Check design compliance | "Is this design WCAG compliant?" |
| **Explanation** | Explain design choices | "Why is this color combination good?" |
| **Conversion** | Convert between formats | "Convert these colors to rgb()..." |

### System Prompt (Base)

```python
SYSTEM_PROMPT = """
You are Loyallia AI, an expert digital wallet pass designer powered by Groq.
You help small business owners create beautiful Apple Wallet and Google Wallet passes.

Your expertise includes:
- Apple PassKit design guidelines (5 pass styles, field limits, image specs)
- Google Wallet API design (cardTemplateOverride, row layouts)
- WCAG 2.1 color contrast requirements
- Brand identity and visual hierarchy
- Small business marketing best practices

Rules:
1. Always design for BOTH Apple and Google Wallet simultaneously
2. Respect platform limits (e.g., Apple: max 3 header fields, 1 primary field)
3. Ensure WCAG AA contrast (4.5:1 minimum for text)
4. Suggest professional, clean designs (not cluttered)
5. Use Spanish for all user-facing content (labels, descriptions)
6. Return structured JSON when generating designs
7. Explain your reasoning in simple terms

When suggesting colors, prefer:
- Dark backgrounds (#1a1a2e, #0f172a) with light text for luxury
- Warm backgrounds (#fef3c7, #fff7ed) with dark text for cafés
- Energetic backgrounds (#dc2626, #ea580c) with white text for gyms
- Clean backgrounds (#ffffff, #f8fafc) with dark text for retail
"""
```

### Response Format

All AI responses should be structured JSON:

```json
{
  "success": true,
  "type": "design_generation",
  "variations": [
    {
      "id": "var_1",
      "name": "Clásico Cálido",
      "description": "Diseño acogedor con tonos café y crema",
      "confidence": 0.92,
      "design": { ... }
    }
  ],
  "suggestions": [
    {
      "type": "color",
      "issue": "Contraste bajo",
      "current": "#333333 sobre #444444",
      "suggested": "#FFFFFF sobre #444444",
      "reason": "El contraste actual es 1.2:1, necesita 4.5:1 mínimo"
    }
  ],
  "explanation": "Este diseño usa colores cálidos porque..."
}
```

---

## 6. Backend Integration (Django)

### API Endpoints

```python
# apps/ai/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('generate-template/', views.GenerateTemplateView.as_view(), name='ai_generate_template'),
    path('suggest-colors/', views.SuggestColorsView.as_view(), name='ai_suggest_colors'),
    path('critique-design/', views.CritiqueDesignView.as_view(), name='ai_critique_design'),
    path('suggest-stamp-icons/', views.SuggestStampIconsView.as_view(), name='ai_suggest_stamp_icons'),
    path('suggest-layout/', views.SuggestLayoutView.as_view(), name='ai_suggest_layout'),
]
```

### Service Layer

```python
# apps/ai/services/kimi_service.py
import json
import logging
from typing import Dict, List, Optional
import requests
from django.conf import settings
from common.vault import get_secret

logger = logging.getLogger(__name__)

class KimiService:
    """Service for interacting with Groq API (OpenAI-compatible)."""
    
    BASE_URL = "https://api.groq.com/openai/v1"
    MODEL = "openai/gpt-oss-120b"
    TIMEOUT = 30
    MAX_TOKENS = 4096
    
    def __init__(self):
        self.api_key = get_secret("ai_api_key", strict=True)
        self.base_url = get_secret("ai_agent_base_url", default=self.BASE_URL)
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        })
    
    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = None,
    ) -> Dict:
        """Send a chat completion request to Groq API."""
        
        payload = {
            "model": self.MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens or self.MAX_TOKENS,
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                timeout=self.TIMEOUT,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Groq API error: {e}")
            raise KimiAPIError(f"Failed to communicate with AI service: {e}")
    
    def generate_template(
        self,
        business_description: str,
        card_type: str,
        industry: str,
        language: str = "es",
    ) -> Dict:
        """Generate a pass template design using AI."""
        
        system_prompt = self._get_system_prompt()
        user_prompt = self._build_template_prompt(
            business_description, card_type, industry, language
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        
        response = self.chat_completion(messages, temperature=0.8)
        
        # Parse and validate the design JSON
        design_json = self._extract_json(response)
        validated_design = self._validate_design(design_json, card_type)
        
        return {
            "success": True,
            "variations": validated_design,
            "tokens_used": response.get("usage", {}),
        }
    
    def suggest_colors(
        self,
        current_colors: Dict,
        dominant_image_colors: List[str],
        card_type: str,
    ) -> Dict:
        """Suggest color palettes based on context."""
        
        prompt = f"""
        Suggest 3 color palettes for a {card_type} wallet pass.
        
        Current colors: {json.dumps(current_colors)}
        Dominant image colors: {json.dumps(dominant_image_colors)}
        
        For each palette, provide:
        - background, foreground, accent, label colors
        - WCAG contrast ratios
        - Brief explanation
        
        Return as JSON array.
        """
        
        messages = [
            {"role": "system", "content": self._get_system_prompt()},
            {"role": "user", "content": prompt},
        ]
        
        response = self.chat_completion(messages, temperature=0.6)
        return self._extract_json(response)
    
    def critique_design(self, design_state: Dict) -> Dict:
        """Analyze a design and suggest improvements."""
        
        prompt = f"""
        Analyze this wallet pass design and suggest improvements:
        
        {json.dumps(design_state, indent=2)}
        
        Check:
        1. Color contrast (WCAG 2.1 AA)
        2. Field count vs platform limits
        3. Visual hierarchy
        4. Brand consistency
        5. Mobile readability
        
        Return a list of issues with severity (critical, warning, info) 
        and suggested fixes.
        """
        
        messages = [
            {"role": "system", "content": self._get_system_prompt()},
            {"role": "user", "content": prompt},
        ]
        
        response = self.chat_completion(messages, temperature=0.4)
        return self._extract_json(response)
    
    def suggest_stamp_icons(
        self,
        business_type: str,
        industry: str,
        brand_colors: List[str],
    ) -> List[Dict]:
        """Suggest stamp icons for stamp cards."""
        
        prompt = f"""
        Suggest 12 stamp icons for a {business_type} in the {industry} industry.
        Brand colors: {json.dumps(brand_colors)}
        
        For each icon, provide:
        - emoji representation
        - name (in Spanish)
        - category (food, drink, retail, service, generic)
        - why it fits this business
        
        Return as JSON array.
        """
        
        messages = [
            {"role": "system", "content": self._get_system_prompt()},
            {"role": "user", "content": prompt},
        ]
        
        response = self.chat_completion(messages, temperature=0.7)
        return self._extract_json(response)
    
    def _get_system_prompt(self) -> str:
        """Return the base system prompt."""
        return SYSTEM_PROMPT  # Defined above
    
    def _build_template_prompt(
        self,
        business_description: str,
        card_type: str,
        industry: str,
        language: str,
    ) -> str:
        """Build the template generation prompt."""
        return f"""
        Generate 3 distinct wallet pass design variations for:
        
        Business: {business_description}
        Card Type: {card_type}
        Industry: {industry}
        Language: {language}
        
        For each variation, return a complete design specification.
        """
    
    def _extract_json(self, response: Dict) -> Dict:
        """Extract and parse JSON from Groq response."""
        content = response["choices"][0]["message"]["content"]
        
        # Try to find JSON in the response
        try:
            # Direct JSON parse
            return json.loads(content)
        except json.JSONDecodeError:
            # Extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```(?:json)?\n(.*?)\n```', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            raise ValueError("Could not extract JSON from AI response")
    
    def _validate_design(self, design: Dict, card_type: str) -> Dict:
        """Validate AI-generated design against platform constraints."""
        # Implementation: check field limits, color formats, etc.
        # Return validated design or raise ValidationError
        return design


class KimiAPIError(Exception):
    """Raised when Groq API communication fails."""
    pass
```

### Rate Limiting Middleware

```python
# apps/ai/middleware.py
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework import status
import time

class AIRateLimitMiddleware:
    """Rate limit AI requests per user."""
    
    # Limits per user per hour
    LIMITS = {
        "generate-template": 10,
        "suggest-colors": 30,
        "critique-design": 50,
        "suggest-stamp-icons": 20,
        "suggest-layout": 30,
    }
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if not request.path.startswith("/api/v1/ai/"):
            return self.get_response(request)
        
        user_id = request.user.id if request.user.is_authenticated else request.META.get("REMOTE_ADDR")
        endpoint = request.path.split("/")[-2]
        
        cache_key = f"ai_rate_limit:{user_id}:{endpoint}"
        current_count = cache.get(cache_key, 0)
        limit = self.LIMITS.get(endpoint, 10)
        
        if current_count >= limit:
            return JsonResponse(
                {
                    "error": "Rate limit exceeded",
                    "message": f"Has alcanzado el límite de {limit} solicitudes por hora.",
                    "retry_after": 3600,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        
        cache.set(cache_key, current_count + 1, 3600)  # 1 hour TTL
        return self.get_response(request)
```

---

## 7. Frontend Integration (Next.js)

### React Hook for AI

```typescript
// frontend/src/hooks/useAI.ts
import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface AIRequestOptions {
  endpoint: 'generate-template' | 'suggest-colors' | 'critique-design' | 'suggest-stamp-icons';
  payload: Record<string, unknown>;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const { toast } = useToast();

  const callAI = useCallback(async (options: AIRequestOptions) => {
    setIsLoading(true);
    setProgress('Iniciando...');

    try {
      const response = await fetch(`/api/v1/ai/${options.endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options.payload),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const error = await response.json();
          toast({
            title: 'Límite alcanzado',
            description: error.message,
            variant: 'destructive',
          });
          throw new Error(error.message);
        }
        throw new Error('AI service error');
      }

      const data = await response.json();
      options.onSuccess?.(data);
      return data;
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  }, [toast]);

  return { callAI, isLoading, progress };
}
```

### AI Button Component

```typescript
// frontend/src/components/wallet/AIAssistButton.tsx
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIAssistButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'toolbar' | 'inline' | 'small';
}

export function AIAssistButton({
  onClick,
  isLoading,
  disabled,
  variant = 'toolbar',
}: AIAssistButtonProps) {
  const variants = {
    toolbar: 'bg-gradient-to-r from-violet-600 to-indigo-400 text-white px-6 py-2.5',
    inline: 'bg-gradient-to-r from-violet-600 to-indigo-400 text-white px-4 py-2',
    small: 'bg-violet-100 text-violet-700 px-3 py-1.5 text-sm',
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'font-medium transition-all hover:scale-105 hover:shadow-lg',
        'disabled:opacity-50 disabled:hover:scale-100',
        variants[variant],
      )}
    >
      <Sparkles className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
      {isLoading ? 'Generando...' : 'Diseñar con IA'}
    </Button>
  );
}
```

### AI Suggestion Inline Component

```typescript
// frontend/src/components/wallet/AISuggestion.tsx
import { Lightbulb, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AISuggestionProps {
  type: 'color' | 'layout' | 'field' | 'image' | 'stamp';
  message: string;
  improvement?: string;
  onApply: () => void;
  onDismiss: () => void;
}

export function AISuggestion({
  type,
  message,
  improvement,
  onApply,
  onDismiss,
}: AISuggestionProps) {
  const typeColors = {
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    layout: 'bg-blue-50 border-blue-200 text-blue-800',
    field: 'bg-green-50 border-green-200 text-green-800',
    image: 'bg-purple-50 border-purple-200 text-purple-800',
    stamp: 'bg-rose-50 border-rose-200 text-rose-800',
  };

  return (
    <div className={cn('rounded-lg border p-3 mb-3', typeColors[type])}>
      <div className="flex items-start gap-2">
        <Lightbulb className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          {improvement && (
            <p className="text-xs mt-1 opacity-80">{improvement}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onApply}
          className="flex items-center gap-1 text-xs font-medium bg-white/50 hover:bg-white/80 rounded px-2 py-1 transition-colors"
        >
          <Check className="h-3 w-3" /> Aplicar
        </button>
        <button
          onClick={onDismiss}
          className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 rounded px-2 py-1 transition-colors"
        >
          <X className="h-3 w-3" /> Ignorar
        </button>
      </div>
    </div>
  );
}
```

---

## 8. Error Handling & Fallbacks

### Error Scenarios

| Scenario | User Message | Fallback Action |
|----------|-------------|----------------|
| Groq API timeout | "El servicio de IA está tardando demasiado. Intenta de nuevo." | Retry 2×, then show manual design options |
| Groq API error (5xx) | "El servicio de IA no está disponible. Diseña manualmente o usa una plantilla." | Show template gallery as fallback |
| Rate limit (429) | "Has alcanzado el límite de solicitudes. Espera 1 hora o diseña manualmente." | Disable AI button, show countdown |
| Invalid JSON from AI | "La IA generó una respuesta inesperada. Intenta con una descripción diferente." | Retry once with stricter prompt |
| Network error | "Error de conexión. Verifica tu internet e intenta de nuevo." | Queue request, retry on reconnect |

### Fallback Design Generator

If Groq is unavailable, use a rule-based fallback:

```python
# apps/ai/services/fallback_designer.py
class FallbackDesigner:
    """Rule-based design generator when AI is unavailable."""
    
    COLOR_PRESETS = {
        "cafe": {"bg": "#3E2723", "fg": "#FFFFFF", "accent": "#D7CCC8"},
        "gym": {"bg": "#0A0A0A", "fg": "#FFFFFF", "accent": "#EF4444"},
        "retail": {"bg": "#1E3A5F", "fg": "#FFFFFF", "accent": "#F59E0B"},
        "salon": {"bg": "#FDF2F8", "fg": "#831843", "accent": "#F472B6"},
        "hotel": {"bg": "#0F172A", "fg": "#F8FAFC", "accent": "#C9A227"},
    }
    
    @classmethod
    def generate(cls, card_type: str, industry: str) -> Dict:
        """Generate a basic design using rules."""
        colors = cls.COLOR_PRESETS.get(industry, cls.COLOR_PRESETS["retail"])
        
        return {
            "design_name": f"{industry.title()} Básico",
            "description": "Diseño generado automáticamente",
            "colors": colors,
            "fields": cls._default_fields(card_type),
            "barcode": "QR_CODE",
        }
```

---

## 9. Rate Limiting & Cost Management

### Rate Limits

| Endpoint | Per User / Hour | Per User / Day | Burst |
|----------|:---------------:|:--------------:|:-----:|
| generate-template | 10 | 50 | 3/min |
| suggest-colors | 30 | 200 | 5/min |
| critique-design | 50 | 300 | 10/min |
| suggest-stamp-icons | 20 | 100 | 5/min |
| suggest-layout | 30 | 200 | 5/min |

### Cost Estimates (Groq)

| Operation | Avg Input Tokens | Avg Output Tokens | Est. Cost (USD) |
|-----------|:----------------:|:-----------------:|:---------------:|
| generate-template | 800 | 1200 | ~$0.015 |
| suggest-colors | 300 | 400 | ~$0.005 |
| critique-design | 600 | 800 | ~$0.010 |
| suggest-stamp-icons | 400 | 600 | ~$0.008 |
| suggest-layout | 500 | 300 | ~$0.006 |

### Monthly Budget Projection

| Scenario | Requests/Month | Est. Cost |
|----------|:--------------:|:---------:|
| Light (10 users, 5 designs each) | 50 | $0.75 |
| Medium (100 users, 5 designs each) | 500 | $7.50 |
| Heavy (1000 users, 5 designs each) | 5000 | $75.00 |
| Enterprise (10k users, 5 designs each) | 50000 | $750.00 |

### Cost Controls

```python
# apps/ai/services/cost_tracker.py
from django.core.cache import cache
from django.conf import settings

class AICostTracker:
    """Track and limit AI usage costs."""
    
    DAILY_BUDGET_USD = 50.0  # Configurable
    COST_PER_1K_TOKENS = 0.006  # Groq pricing
    
    @classmethod
    def track_usage(cls, tokens_used: int):
        """Track token usage against daily budget."""
        cost = (tokens_used / 1000) * cls.COST_PER_1K_TOKENS
        
        today_key = f"ai_cost:{datetime.now().strftime('%Y-%m-%d')}"
        current_cost = cache.get(today_key, 0.0)
        new_cost = current_cost + cost
        
        cache.set(today_key, new_cost, 86400)  # 24h TTL
        
        if new_cost > cls.DAILY_BUDGET_USD:
            logger.warning(f"AI daily budget exceeded: ${new_cost:.2f}")
            return False  # Block further requests
        
        return True
    
    @classmethod
    def get_daily_usage(cls) -> float:
        """Get today's AI cost so far."""
        today_key = f"ai_cost:{datetime.now().strftime('%Y-%m-%d')}"
        return cache.get(today_key, 0.0)
```

---

## 10. Testing Strategy

### Unit Tests

```python
# apps/ai/tests/test_kimi_service.py
import pytest
from unittest.mock import patch, Mock
from apps.ai.services.kimi_service import KimiService

class TestKimiService:
    @patch('apps.ai.services.kimi_service.requests.Session')
    def test_generate_template_success(self, mock_session):
        service = KimiService()
        mock_response = Mock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": '{"design_name": "Test"}'}}],
            "usage": {"total_tokens": 500},
        }
        mock_session.return_value.post.return_value = mock_response
        
        result = service.generate_template(
            "A coffee shop", "stamp", "cafe"
        )
        
        assert result["success"] is True
        assert "variations" in result
    
    def test_extract_json_from_markdown(self):
        service = KimiService()
        response = {
            "choices": [{"message": {"content": '```json\n{"key": "value"}\n```'}}]
        }
        result = service._extract_json(response)
        assert result == {"key": "value"}
    
    def test_rate_limit_enforcement(self):
        # Test that rate limiting blocks excessive requests
        pass
```

### Integration Tests

```python
# apps/ai/tests/test_ai_endpoints.py
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class TestAIEndpoints(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com", password="testpass"
        )
        self.client.force_login(self.user)
    
    @patch('apps.ai.services.kimi_service.KimiService.generate_template')
    def test_generate_template_endpoint(self, mock_generate):
        mock_generate.return_value = {
            "success": True,
            "variations": [{"id": "1", "name": "Test"}],
        }
        
        response = self.client.post(
            '/api/v1/ai/generate-template/',
            {
                "business_description": "A gym",
                "card_type": "vip_membership",
                "industry": "gym",
            },
            content_type='application/json',
        )
        
        assert response.status_code == 200
        assert response.json()["success"] is True
```

### Frontend Tests

```typescript
// frontend/src/hooks/__tests__/useAI.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAI } from '../useAI';

describe('useAI', () => {
  it('should handle successful AI request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, variations: [] }),
    });

    const { result } = renderHook(() => useAI());

    await act(async () => {
      await result.current.callAI({
        endpoint: 'generate-template',
        payload: { business_description: 'Test' },
      });
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should handle rate limit error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ message: 'Rate limit exceeded' }),
    });

    const { result } = renderHook(() => useAI());

    await expect(
      result.current.callAI({
        endpoint: 'generate-template',
        payload: {},
      })
    ).rejects.toThrow('Rate limit exceeded');
  });
});
```

---

## Appendix: Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `AI_API_KEY` | Vault (`ai_api_key`) | Groq API key |
| `AI_AGENT_BASE_URL` | Vault (`ai_agent_base_url`) | Groq API base URL |
| `AI_DAILY_BUDGET` | Env / settings.py | Max daily AI spend in USD |
| `AI_RATE_LIMIT_ENABLED` | Env / settings.py | Toggle rate limiting |
| `AI_CACHE_TTL` | Env / settings.py | Cache AI responses (seconds) |

---

*End of Document SRS-007*
